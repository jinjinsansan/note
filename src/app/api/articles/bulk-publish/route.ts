import { NextResponse } from "next/server";
import { z } from "zod";
import { logApiUsage } from "@/lib/api-logger";
import { queueNoteAutomationJobs } from "@/lib/automation/note-publisher";
import type { Database } from "@/types/supabase";

type ArticleRecord = Pick<Database["public"]["Tables"]["articles"]["Row"], "id" | "note_account_id">;
type NoteAccountRecord = Pick<Database["public"]["Tables"]["note_accounts"]["Row"], "id">;
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ArticlePayload = z.object({
  id: z.string().uuid(),
  ctaId: z.string().uuid().nullable().optional(),
  schedule: z.string().datetime().optional(),
});

const schema = z.object({
  articles: z.array(ArticlePayload).min(1).max(30),
});

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
      endpoint: "/api/articles/bulk-publish",
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

  const articleIds = parsed.data.articles.map((article) => article.id);
  const { data: articleRecords, error: articleError } = await supabase
    .from("articles")
    .select("id,note_account_id")
    .eq("user_id", userId)
    .in("id", articleIds);

  if (articleError) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/articles/bulk-publish",
      method: "POST",
      statusCode: 500,
      startedAt,
      errorMessage: articleError.message,
    });
    return NextResponse.json({ error: "記事情報の取得に失敗しました" }, { status: 500 });
  }

  if (!articleRecords || articleRecords.length !== articleIds.length) {
    return NextResponse.json({ error: "対象記事が見つかりません" }, { status: 404 });
  }

  const typedArticles = (articleRecords ?? []) as ArticleRecord[];
  const articleMap = new Map(typedArticles.map((record) => [record.id, record]));

  for (const payload of parsed.data.articles) {
    const article = articleMap.get(payload.id);
    if (!article || !article.note_account_id) {
      return NextResponse.json(
        { error: "noteアカウントが紐づいていない記事を含んでいます" },
        { status: 400 },
      );
    }
  }

  const noteAccountIds = Array.from(
    new Set(
      typedArticles
        .map((record) => record.note_account_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const { data: noteAccounts, error: noteAccountError } = await supabase
    .from("note_accounts")
    .select("id")
    .eq("user_id", userId)
    .in("id", noteAccountIds);

  if (noteAccountError) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/articles/bulk-publish",
      method: "POST",
      statusCode: 500,
      startedAt,
      errorMessage: noteAccountError.message,
    });
    return NextResponse.json({ error: "noteアカウントの取得に失敗しました" }, { status: 500 });
  }

  const typedNoteAccounts = (noteAccounts ?? []) as NoteAccountRecord[];
  if (!noteAccounts || noteAccounts.length !== noteAccountIds.length) {
    return NextResponse.json({ error: "noteアカウント情報が不足しています" }, { status: 400 });
  }

  const noteAccountMap = new Map(typedNoteAccounts.map((account) => [account.id, account]));

  let automationResult;
  try {
    const automationJobs = parsed.data.articles.map((payload) => {
      const article = articleMap.get(payload.id)!;
      const noteAccountId = article.note_account_id!;
      if (!noteAccountMap.has(noteAccountId)) {
        throw new Error("noteアカウント情報が不足しています");
      }
      return {
        articleId: payload.id,
        noteAccountId,
        schedule: payload.schedule ?? undefined,
        ctaId: payload.ctaId ?? null,
      };
    });

    automationResult = await queueNoteAutomationJobs({
      supabase,
      userId,
      jobs: automationJobs,
    });
  } catch (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/articles/bulk-publish",
      method: "POST",
      statusCode: 500,
      startedAt,
      errorMessage: error instanceof Error ? error.message : "automation_error",
    });
    return NextResponse.json({ error: "自動投稿キューの登録に失敗しました" }, { status: 500 });
  }

  await logApiUsage({
    supabase,
    userId,
    endpoint: "/api/articles/bulk-publish",
    method: "POST",
    statusCode: 202,
    startedAt,
  });

  return NextResponse.json(
    { message: "Bulk publish queued", queued: automationResult.queued, notes: automationResult.notes },
    { status: 202 },
  );
}
