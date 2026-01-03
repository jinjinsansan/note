import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/types/supabase";
import { logApiUsage } from "@/lib/api-logger";
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
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const supabase = createRouteHandlerClient<Database>({ cookies });
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

  if (userProfileError || !userProfile) {
    return NextResponse.json({ error: "ユーザー情報が見つかりません" }, { status: 400 });
  }

  const plan = getPlanDefinition(userProfile.subscription_plan);
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

  type StyleProfileRow = Pick<
    Database["public"]["Tables"]["style_profiles"]["Row"],
    "id" | "profile_name" | "tone" | "text_style" | "vocabulary_level" | "analysis_data"
  >;

  type CtaRow = Pick<
    Database["public"]["Tables"]["cta_settings"]["Row"],
    "id" | "cta_name" | "cta_content" | "cta_link"
  >;

  let styleProfile: StyleProfileRow | null = null;
  if (styleProfileId) {
    const { data, error } = await supabase
      .from("style_profiles")
      .select("id,profile_name,tone,text_style,vocabulary_level,analysis_data")
      .eq("user_id", session.user.id)
      .eq("id", styleProfileId)
      .single();
    if (error || !data) {
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
    styleProfile = data;
  }

  let cta: CtaRow | null = null;
  if (ctaId) {
    const { data, error } = await supabase
      .from("cta_settings")
      .select("id,cta_name,cta_content,cta_link")
      .eq("user_id", session.user.id)
      .eq("id", ctaId)
      .single();
    if (error || !data) {
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
    cta = data;
  }

  const { data: primaryAccount } = await supabase
    .from("note_accounts")
    .select("id,is_primary")
    .eq("user_id", session.user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const defaultNoteAccountId = primaryAccount?.id ?? null;

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

  const { data, error } = await supabase
    .from("articles")
    .insert({
      user_id: session.user.id,
      title,
      category,
      content,
      word_count: wordCount,
      status: "draft",
      meta_description: metaDescription,
      seo_keywords: keywordList.length ? keywordList : null,
      note_account_id: defaultNoteAccountId,
      style_profile_id: styleProfile?.id ?? null,
      cta_id: cta?.id ?? null,
    })
    .select(
      "id,title,category,status,word_count,meta_description,created_at,updated_at",
    )
    .single();

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
    await supabase
      .from("users")
      .update({
        api_quota_used: usageThisMonth + 1,
        api_quota_monthly: plan.monthlyArticleQuota,
      })
      .eq("id", userId);
  }

  if (generateImages && plan.id !== "free") {
    try {
      const prompts = [
        { headingId: "hero", prompt: draft.heroImagePrompt },
        ...draft.sections.slice(0, 3).map((section, index) => ({
          headingId: `section-${index + 1}`,
          prompt: section.imagePrompt,
        })),
      ];
      const generatedImages = await generateImagesForArticle(prompts);
      if (generatedImages.length) {
        await supabase.from("article_images").insert(
          generatedImages.map((image) => ({
            article_id: data.id,
            heading_id: image.headingId ?? null,
            image_url: image.imageUrl,
            alt_text: image.altText,
            image_prompt: image.prompt,
            generated_by: "openai",
          })),
        );
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
