import { NextResponse } from "next/server";
import { z } from "zod";

import { logApiUsage } from "@/lib/api-logger";
import { generateTitleIdeas } from "@/lib/ai/seo-generator";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type SeoTitleInsert = Database["public"]["Tables"]["seo_titles"]["Insert"];

const schema = z.object({
  keyword: z.string().min(2, "キーワードを入力してください"),
  tone: z.string().optional(),
  difficulty: z.enum(["low", "medium", "high"]).optional(),
});

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

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/seo/generate-titles",
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

  const { keyword, tone, difficulty } = parsed.data;

  let titles;
  try {
    titles = await generateTitleIdeas({ keyword, tone, difficulty });
  } catch (error) {
    console.error("seo_title_generation_failed", error);
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/seo/generate-titles",
      method: "POST",
      statusCode: 502,
      startedAt,
      errorMessage: "openai_generation_failed",
    });
    return NextResponse.json({ error: "タイトル生成で問題が発生しました" }, { status: 502 });
  }

  try {
    if (titles.length) {
      const titlePayloads: SeoTitleInsert[] = titles.map((title) => ({
        user_id: userId,
        title: title.title,
        keywords: { keyword } as SeoTitleInsert["keywords"],
        difficulty_level: title.difficultyLevel,
        difficulty_score: title.difficultyScore,
        seo_score: title.seoScore,
        estimated_search_volume: null,
        is_selected: false,
      }));
      await supabase.from("seo_titles").insert(titlePayloads as never);
    }
  } catch (dbError) {
    console.error("seo_titles_insert_failed", dbError);
  }

  await logApiUsage({
    supabase,
    userId,
    endpoint: "/api/seo/generate-titles",
    method: "POST",
    statusCode: 200,
    startedAt,
  });

  return NextResponse.json({ titles });
}
