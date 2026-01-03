"use client";

import { useMemo, useState } from "react";

import type { ApiUsageLogSummary } from "@/types/api-log";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  logs: ApiUsageLogSummary[];
};

type StatusFilter = "all" | "success" | "client_error" | "server_error";

const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "success", label: "成功 (2xx)" },
  { value: "client_error", label: "クライアントエラー (4xx)" },
  { value: "server_error", label: "サーバーエラー (5xx)" },
];

const statusMatches = (statusCode: number, filter: StatusFilter) => {
  if (filter === "all") return true;
  if (filter === "success") return statusCode >= 200 && statusCode < 300;
  if (filter === "client_error") return statusCode >= 400 && statusCode < 500;
  if (filter === "server_error") return statusCode >= 500;
  return true;
};

export function ApiUsageLogTable({ logs }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesStatus = statusMatches(log.status_code ?? 0, statusFilter);
      if (!matchesStatus) return false;

      if (!term) return true;
      const haystack = `${log.endpoint} ${log.method}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [logs, search, statusFilter]);

  const avgResponseTime = useMemo(() => {
    if (filteredLogs.length === 0) return 0;
    const total = filteredLogs.reduce((sum, log) => sum + (log.response_time_ms ?? 0), 0);
    return Math.round(total / filteredLogs.length);
  }, [filteredLogs]);

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="space-y-2">
          <CardTitle>API利用ログ</CardTitle>
          <CardDescription>
            Supabaseに記録された API 呼び出し履歴です。レスポンス遅延やエラーの傾向を素早く把握できます。
          </CardDescription>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-2 text-sm text-zinc-600">
            <span>エンドポイント検索</span>
            <Input
              placeholder="例: /api/articles"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm text-zinc-600">
            <span>ステータス</span>
            <select
              className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-1 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-sm text-zinc-700">
            <p className="text-xs uppercase tracking-wide text-zinc-500">平均レスポンス</p>
            <p className="text-lg font-semibold text-zinc-900">{avgResponseTime} ms</p>
            <p className="text-xs text-zinc-500">表示中 {filteredLogs.length} 件</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="pb-2">時刻</th>
                <th className="pb-2">メソッド</th>
                <th className="pb-2">エンドポイント</th>
                <th className="pb-2">ステータス</th>
                <th className="pb-2">応答時間</th>
                <th className="pb-2">エラー</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="py-3 text-xs text-zinc-500">
                    {new Date(log.created_at).toLocaleString("ja-JP", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3 font-mono text-xs uppercase text-zinc-700">{log.method}</td>
                  <td className="py-3 font-medium text-zinc-900">{log.endpoint}</td>
                  <td className="py-3">
                    <span
                      className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700"
                    >
                      {log.status_code}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-700">{log.response_time_ms ?? 0} ms</td>
                  <td className="py-3 text-xs text-red-500">
                    {log.error_message ? log.error_message.slice(0, 80) : "-"}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-zinc-500">
                    該当するログがありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardHeader>
    </Card>
  );
}
