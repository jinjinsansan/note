"use client";

import { useCallback, useEffect, useState } from "react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AutomationJobSummary } from "@/types/automation";

type Props = {
  refreshToken?: number;
};

const statusMap: Record<string, { label: string; className: string }> = {
  queued: { label: "キュー待ち", className: "bg-zinc-100 text-zinc-700" },
  processing: { label: "処理中", className: "bg-blue-100 text-blue-700" },
  completed: { label: "完了", className: "bg-emerald-100 text-emerald-700" },
  failed: { label: "失敗", className: "bg-red-100 text-red-700" },
};

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("ja-JP") : "-";

export function AutomationJobFeed({ refreshToken }: Props) {
  const [jobs, setJobs] = useState<AutomationJobSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/automation/jobs", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "自動投稿キューの取得に失敗しました");
      }
      setJobs(payload.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "自動投稿キューの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 15000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  useEffect(() => {
    if (refreshToken) {
      fetchJobs();
    }
  }, [refreshToken, fetchJobs]);

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>投稿キューの進行状況</CardTitle>
          <CardDescription>直近25件の自動投稿ジョブが表示されます。15秒ごとに自動更新されます。</CardDescription>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="pb-2">記事</th>
                <th className="pb-2">ステータス</th>
                <th className="pb-2">スケジュール</th>
                <th className="pb-2">開始</th>
                <th className="pb-2">完了</th>
                <th className="pb-2">結果</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-zinc-500">
                    読み込み中...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-zinc-500">
                    まだ自動投稿ジョブはありません。
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const statusDetails = statusMap[job.status] ?? {
                    label: job.status,
                    className: "bg-zinc-100 text-zinc-700",
                  };
                  return (
                    <tr key={job.id} className="align-top">
                      <td className="py-3">
                        <p className="font-medium text-zinc-900">{job.articleTitle}</p>
                        <p className="text-xs text-zinc-500">
                          受付: {new Date(job.createdAt).toLocaleString("ja-JP")}
                        </p>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusDetails.className}`}
                        >
                          {statusDetails.label}
                        </span>
                        {job.errorMessage && (
                          <p className="mt-2 text-xs text-red-500">{job.errorMessage}</p>
                        )}
                      </td>
                      <td className="py-3 text-sm text-zinc-600">{formatDateTime(job.scheduledFor)}</td>
                      <td className="py-3 text-sm text-zinc-600">{formatDateTime(job.startedAt)}</td>
                      <td className="py-3 text-sm text-zinc-600">{formatDateTime(job.finishedAt)}</td>
                      <td className="py-3 text-sm text-zinc-600">
                        {job.resultUrl || job.noteArticleUrl ? (
                          <a
                            href={(job.resultUrl ?? job.noteArticleUrl) as string}
                            target="_blank"
                            rel="noreferrer"
                            className="text-zinc-900 underline"
                          >
                            noteで確認
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardHeader>
    </Card>
  );
}
