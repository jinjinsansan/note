import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchNoteArticle } from "@/lib/scraping/note";
import { logApiUsage } from "@/lib/api-logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const schema = z.object({
  url: z.string().url("有効なURLを入力してください"),
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

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/learning/fetch-article",
      method: "POST",
      statusCode: 400,
      startedAt,
      errorMessage: "validation_error",
    });
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const article = await fetchNoteArticle(parsed.data.url);
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/learning/fetch-article",
      method: "POST",
      statusCode: 200,
      startedAt,
    });
    return NextResponse.json(article);
  } catch (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/learning/fetch-article",
      method: "POST",
      statusCode: 400,
      startedAt,
      errorMessage: error instanceof Error ? error.message : "fetch_failed",
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "note記事の取得に失敗しました",
      },
      { status: 400 },
    );
  }
}
