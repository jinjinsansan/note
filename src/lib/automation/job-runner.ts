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

export type AutomationSupabase = SupabaseClient<Database>;
type AutomationJobUpdate = Database["public"]["Tables"]["automation_jobs"]["Update"];

const fetchNextQueuedJob = async (supabase: AutomationSupabase) => {
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

const claimJob = async (supabase: AutomationSupabase, job: AutomationJobRow) => {
  const claimUpdate: AutomationJobUpdate = {
    status: "processing",
    started_at: nowIso(),
    attempts: (job.attempts ?? 0) + 1,
  };
  const claimed = await supabase
    .from("automation_jobs")
    .update(claimUpdate as never)
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

  const claimedData = claimed.data as { attempts: number } | null;
  return { ...job, attempts: claimedData?.attempts ?? job.attempts ?? 1 } satisfies AutomationJobRow;
};

const markCompleted = async (
  supabase: AutomationSupabase,
  job: AutomationJobRow,
  resultUrl: string | null,
) => {
  const finishedAt = nowIso();
  const jobUpdate: AutomationJobUpdate = {
    status: "completed",
    finished_at: finishedAt,
    error_message: null,
    result_url: resultUrl,
    updated_at: finishedAt,
  };
  await supabase
    .from("automation_jobs")
    .update(jobUpdate as never)
    .eq("id", job.id);

  const articleUpdate: Database["public"]["Tables"]["articles"]["Update"] = {
    status: "published",
    published_at: finishedAt,
    note_article_url: resultUrl ?? job.articles?.note_article_url ?? null,
    updated_at: finishedAt,
  };
  await supabase
    .from("articles")
    .update(articleUpdate as never)
    .eq("id", job.article_id);
};

const markFailed = async (
  supabase: AutomationSupabase,
  job: AutomationJobRow,
  reason: string,
) => {
  const attempts = job.attempts ?? 1;
  const finishedAt = nowIso();
  const shouldRetry = attempts < MAX_ATTEMPTS;
  const failureUpdate: AutomationJobUpdate = {
    status: shouldRetry ? "queued" : "failed",
    error_message: reason,
    started_at: shouldRetry ? null : job.started_at,
    finished_at: shouldRetry ? null : finishedAt,
    updated_at: finishedAt,
  };
  await supabase
    .from("automation_jobs")
    .update(failureUpdate as never)
    .eq("id", job.id);
};

export const runNextAutomationJob = async (supabase: AutomationSupabase): Promise<RunResult> => {
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
