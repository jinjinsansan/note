export type AutomationJobSummary = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed" | string;
  articleTitle: string;
  noteArticleUrl: string | null;
  resultUrl?: string | null;
  createdAt: string;
  scheduledFor: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
};
