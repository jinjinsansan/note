import { NextResponse } from "next/server";
import { z } from "zod";

import { logApiUsage } from "@/lib/api-logger";
import type { Database } from "@/types/supabase";
import {
  getMonthlyArticleUsage,
  getPlanDefinition,
} from "@/lib/billing/plans";
import {
  buildCtaContext,
  buildStyleProfileContext,
  composeMarkdownFromDraft,
  generateArticleDraft,
} from "@/lib/ai/article-generator";
import { generateImagesForArticle } from "@/lib/ai/image-generator";
import { ensureOpenAIConfigured } from "@/lib/ai/openai";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type UserProfileRow = Pick<Database["public"]["Tables"]["users"]["Row"], "subscription_plan">;
type NoteAccountRow = Pick<Database["public"]["Tables"]["note_accounts"]["Row"], "id">;
type ArticleInsert = Database["public"]["Tables"]["articles"]["Insert"];

const ArticleLength = {
  short: 2000,
  medium: 4000,
  long: 6000,
} as const;

const createSchema = z.object({
  title: z.string().min(5, "タイトルは5文字以上で入力してください"),
  category: z.string().min(2, "カテゴリーを入力してください"),
  tone: z.string().min(2, "トーンを入力してください"),
  brief: z.string().min(30, "生成したい記事の概要を30文字以上で記載してください"),
  length: z.enum(["short", "medium", "long"]),
  styleProfileId: z.string().uuid().optional(),
  ctaId: z.string().uuid().optional(),
  keywords: z.array(z.string().min(2)).max(5).optional(),
  generateImages: z.boolean().optional(),
});

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const { data, error } = await supabase
    .from("articles")
    .select(
      "id,title,category,status,word_count,meta_description,created_at,updated_at",
    )
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/articles",
      method: "GET",
      statusCode: 500,
      startedAt,
      errorMessage: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logApiUsage({
    supabase,
    userId,
    endpoint: "/api/articles",
    method: "GET",
    statusCode: 200,
    startedAt,
  });

  return NextResponse.json({ articles: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const {
    data: userProfile,
    error: userProfileError,
  } = await supabase
    .from("users")
    .select("subscription_plan")
    .eq("id", userId)
    .single();

  const profileData = userProfile as UserProfileRow | null;

  if (userProfileError || !profileData) {
    return NextResponse.json({ error: "ユーザー情報が見つかりません" }, { status: 400 });
  }

  const plan = getPlanDefinition(profileData.subscription_plan);
  const usageThisMonth = await getMonthlyArticleUsage(supabase, userId);

  if (plan.monthlyArticleQuota !== null && usageThisMonth >= plan.monthlyArticleQuota) {
    return NextResponse.json(
      {
        error: "今月の生成可能数に達しました。プランのアップグレードをご検討ください。",
        plan: plan.id,
      },
      { status: 402 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/articles",
      method: "POST",
      statusCode: 400,
      startedAt,
      errorMessage: "validation_error",
    });
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { title, category, tone, brief, length, styleProfileId, ctaId, keywords, generateImages } = parsed.data;
  const targetWords = ArticleLength[length];

  type StyleProfileRow = Database["public"]["Tables"]["style_profiles"]["Row"];

  type CtaRow = Database["public"]["Tables"]["cta_settings"]["Row"];

  let styleProfile: StyleProfileRow | null = null;
  if (styleProfileId) {
    const { data, error } = await supabase
      .from("style_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("id", styleProfileId)
      .single();
    const styleProfileData = data as StyleProfileRow | null;
    if (error || !styleProfileData) {
      await logApiUsage({
        supabase,
        userId,
        endpoint: "/api/articles",
        method: "POST",
        statusCode: 400,
        startedAt,
        errorMessage: "style_profile_not_found",
      });
      return NextResponse.json({ error: "スタイルプロファイルが見つかりません" }, { status: 400 });
    }
    styleProfile = styleProfileData;
  }

  let cta: CtaRow | null = null;
  if (ctaId) {
    const { data, error } = await supabase
      .from("cta_settings")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("id", ctaId)
      .single();
    const ctaData = data as CtaRow | null;
    if (error || !ctaData) {
      await logApiUsage({
        supabase,
        userId,
        endpoint: "/api/articles",
        method: "POST",
        statusCode: 400,
        startedAt,
        errorMessage: "cta_not_found",
      });
      return NextResponse.json({ error: "CTAが見つかりません" }, { status: 400 });
    }
    cta = ctaData;
  }

  const { data: primaryAccount } = await supabase
    .from("note_accounts")
    .select("id,is_primary")
    .eq("user_id", session.user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const noteAccountData = primaryAccount as NoteAccountRow | null;
  const defaultNoteAccountId = noteAccountData?.id ?? null;

  const keywordList = keywords?.map((keyword) => keyword.trim()).filter(Boolean) ?? [];

  let draft;
  try {
    ensureOpenAIConfigured();
    draft = await generateArticleDraft({
      title,
      category,
      tone,
      brief,
      targetWords,
      keywords: keywordList,
      styleProfile: buildStyleProfileContext(styleProfile),
      cta: buildCtaContext(cta ?? undefined),
    });
  } catch (error) {
    console.error("article_generation_failed", error);
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/articles",
      method: "POST",
      statusCode: 502,
      startedAt,
      errorMessage: "openai_generation_failed",
    });
    return NextResponse.json({ error: "記事生成で問題が発生しました" }, { status: 502 });
  }

  const { markdown: content, wordCount } = composeMarkdownFromDraft(
    draft,
    title,
    buildCtaContext(cta ?? undefined),
  );
  const metaDescription = draft.metaDescription.slice(0, 150);

  const articlePayload: ArticleInsert = {
    user_id: session.user.id,
    title,
    category,
    content,
    word_count: wordCount,
    status: "draft",
    meta_description: metaDescription,
    seo_keywords: keywordList.length ? (keywordList as ArticleInsert["seo_keywords"]) : null,
    note_account_id: defaultNoteAccountId,
    style_profile_id: styleProfile?.id ?? null,
    cta_id: cta?.id ?? null,
  };

  const { data, error } = await supabase
    .from("articles")
    .insert(articlePayload as never)
    .select(
      "id,title,category,status,word_count,meta_description,created_at,updated_at",
    )
    .single();

  const articleRecord = data as Database["public"]["Tables"]["articles"]["Row"] | null;

  if (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/articles",
      method: "POST",
      statusCode: 500,
      startedAt,
      errorMessage: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (plan.monthlyArticleQuota !== null) {
    const userUpdate: Database["public"]["Tables"]["users"]["Update"] = {
      api_quota_used: usageThisMonth + 1,
      api_quota_monthly: plan.monthlyArticleQuota,
    };
    await supabase
      .from("users")
      .update(userUpdate as never)
      .eq("id", userId);
  }

  if (generateImages && plan.id !== "free") {
    try {
      if (!articleRecord?.id) {
        throw new Error("article insertion did not return an id");
      }
      const prompts = [
        { headingId: "hero", prompt: draft.heroImagePrompt },
        ...draft.sections.slice(0, 3).map((section, index) => ({
          headingId: `section-${index + 1}`,
          prompt: section.imagePrompt,
        })),
      ];
      const generatedImages = await generateImagesForArticle(prompts);
      if (generatedImages.length) {
        const imagePayloads: Database["public"]["Tables"]["article_images"]["Insert"][] =
          generatedImages.map((image) => ({
            article_id: articleRecord.id,
            heading_id: image.headingId ?? null,
            image_url: image.imageUrl,
            alt_text: image.altText,
            image_prompt: image.prompt,
            generated_by: "openai",
          }));
        await supabase.from("article_images").insert(imagePayloads as never);
      }
    } catch (imageError) {
      console.error("image_generation_failed", imageError);
    }
  }

  await logApiUsage({
    supabase,
    userId,
    endpoint: "/api/articles",
    method: "POST",
    statusCode: 201,
    startedAt,
  });

  const outline = draft.sections.map((section) => ({
    heading: section.heading,
    summary: section.summary,
    keywords: section.keywords,
  }));

  return NextResponse.json({ article: data, outline }, { status: 201 });
}
