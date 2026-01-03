import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";
import { decryptNoteToken, publishArticleToNote } from "@/lib/automation/note-publisher";

const MAX_ATTEMPTS = 3;

type AutomationJobRow = Database["public"]["Tables"]["automation_jobs"]["Row"] & {
  articles?: {
    title: string | null;
    content: string | null;
    note_article_url: string | null;
    status: string;
  } | null;
  note_accounts?: {
    auth_token: string;
    note_username: string | null;
  } | null;
};

type RunResult = {
  status: "no_job" | "completed" | "failed";
  jobId?: string;
  message: string;
};

const nowIso = () => new Date().toISOString();

const fetchNextQueuedJob = async (supabase: SupabaseClient<Database>) => {
  const currentTime = nowIso();
  const { data, error } = await supabase
    .from("automation_jobs")
    .select("*, articles(id,title,content,note_article_url,status), note_accounts(auth_token,note_username)")
    .eq("status", "queued")
    .or(`scheduled_for.is.null,scheduled_for.lte.${currentTime}`)
    .order("scheduled_for", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data?.[0] as AutomationJobRow | undefined) ?? null;
};

const claimJob = async (supabase: SupabaseClient<Database>, job: AutomationJobRow) => {
  const claimed = await supabase
    .from("automation_jobs")
    .update({
      status: "processing",
      started_at: nowIso(),
      attempts: (job.attempts ?? 0) + 1,
    })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("id,attempts")
    .single();

  if (claimed.error) {
    if (claimed.error.code === "PGRST116") {
      return null;
    }
    throw new Error(claimed.error.message);
  }

  return { ...job, attempts: claimed.data.attempts } satisfies AutomationJobRow;
};

const markCompleted = async (
  supabase: SupabaseClient<Database>,
  job: AutomationJobRow,
  resultUrl: string | null,
) => {
  const finishedAt = nowIso();
  await supabase
    .from("automation_jobs")
    .update({
      status: "completed",
      finished_at: finishedAt,
      error_message: null,
      result_url: resultUrl,
      updated_at: finishedAt,
    })
    .eq("id", job.id);

  await supabase
    .from("articles")
    .update({
      status: "published",
      published_at: finishedAt,
      note_article_url: resultUrl ?? job.articles?.note_article_url ?? null,
      updated_at: finishedAt,
    })
    .eq("id", job.article_id);
};

const markFailed = async (
  supabase: SupabaseClient<Database>,
  job: AutomationJobRow,
  reason: string,
) => {
  const attempts = job.attempts ?? 1;
  const finishedAt = nowIso();
  const shouldRetry = attempts < MAX_ATTEMPTS;
  await supabase
    .from("automation_jobs")
    .update({
      status: shouldRetry ? "queued" : "failed",
      error_message: reason,
      started_at: shouldRetry ? null : job.started_at,
      finished_at: shouldRetry ? null : finishedAt,
      updated_at: finishedAt,
    })
    .eq("id", job.id);
};

export const runNextAutomationJob = async (
  supabase: SupabaseClient<Database>,
): Promise<RunResult> => {
  const jobCandidate = await fetchNextQueuedJob(supabase);
  if (!jobCandidate) {
    return { status: "no_job", message: "No queued automation jobs" };
  }

  const claimedJob = await claimJob(supabase, jobCandidate);
  if (!claimedJob) {
    return { status: "no_job", message: "Job was claimed by another worker" };
  }

  try {
    if (!claimedJob.articles?.title || !claimedJob.articles?.content) {
      throw new Error("記事本文が存在しません");
    }
    if (!claimedJob.note_accounts?.auth_token) {
      throw new Error("noteアカウントの資格情報がありません");
    }

    const authToken = decryptNoteToken(claimedJob.note_accounts.auth_token);
    const result = await publishArticleToNote({
      authToken,
      article: {
        id: claimedJob.article_id,
        title: claimedJob.articles.title,
        content: claimedJob.articles.content,
      },
    });

    await markCompleted(supabase, claimedJob, result?.url ?? claimedJob.articles.note_article_url ?? null);
    return { status: "completed", jobId: claimedJob.id, message: result?.url ?? "published" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "automation_error";
    await markFailed(supabase, claimedJob, reason);
    return { status: "failed", jobId: claimedJob.id, message: reason };
  }
};
