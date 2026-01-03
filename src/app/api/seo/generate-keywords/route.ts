import { NextResponse } from "next/server";
import { z } from "zod";
import { SEO_CATEGORIES } from "@/lib/seo-data";
import { logApiUsage } from "@/lib/api-logger";
import { generateKeywordIdeas } from "@/lib/ai/seo-generator";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type KeywordInsert = Database["public"]["Tables"]["keywords"]["Insert"];

const schema = z.object({
  category: z.string(),
  seed: z.string().optional(),
});

const allowedCategories = new Set(SEO_CATEGORIES);

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/seo/generate-keywords",
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

  const { category, seed } = parsed.data;
  if (!allowedCategories.has(category as (typeof SEO_CATEGORIES)[number])) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/seo/generate-keywords",
      method: "POST",
      statusCode: 400,
      startedAt,
      errorMessage: "invalid_category",
    });
    return NextResponse.json({ error: "サポート対象外のカテゴリーです" }, { status: 400 });
  }

  let keywords;
  try {
    keywords = await generateKeywordIdeas({ category, seed, audience: "noteクリエイター" });
  } catch (error) {
    console.error("seo_keyword_generation_failed", error);
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/seo/generate-keywords",
      method: "POST",
      statusCode: 502,
      startedAt,
      errorMessage: "openai_generation_failed",
    });
    return NextResponse.json({ error: "キーワード生成で問題が発生しました" }, { status: 502 });
  }

  try {
    if (keywords.length) {
      const keywordPayloads: KeywordInsert[] = keywords.map((keyword) => ({
        user_id: userId,
        keyword: keyword.keyword,
        category,
        search_volume: keyword.searchVolume,
        competition_difficulty: keyword.difficultyScore,
        trend_score: keyword.trendScore,
        difficulty_level: keyword.difficultyLevel,
        rationale: keyword.rationale,
      }));
      await supabase
        .from("keywords")
        .upsert(keywordPayloads as never, { onConflict: "user_id,keyword,category" });
    }
  } catch (dbError) {
    console.error("keyword_upsert_failed", dbError);
  }

  await logApiUsage({
    supabase,
    userId,
    endpoint: "/api/seo/generate-keywords",
    method: "POST",
    statusCode: 200,
    startedAt,
  });

  return NextResponse.json({ keywords });
}
