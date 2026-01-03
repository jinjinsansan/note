import { NextResponse } from "next/server";
import type { Database } from "@/types/supabase";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("automation_jobs")
    .select(
      "id,status,scheduled_for,started_at,finished_at,error_message,created_at,result_url,articles(title,note_article_url)",
    )
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type JobWithArticle = Database["public"]["Tables"]["automation_jobs"]["Row"] & {
    articles: { title: string | null; note_article_url: string | null } | null;
  };
  const jobs = ((data ?? []) as JobWithArticle[]).map((job) => ({
    id: job.id,
    status: job.status,
    scheduledFor: job.scheduled_for,
    startedAt: job.started_at,
    finishedAt: job.finished_at,
    createdAt: job.created_at,
    errorMessage: job.error_message,
    resultUrl: job.result_url,
    articleTitle: job.articles?.title ?? "Untitled",
    noteArticleUrl: job.articles?.note_article_url ?? null,
  }));

  return NextResponse.json({ jobs });
}
