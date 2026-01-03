import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiUsageLogTable } from "@/components/logs/api-usage-log-table";
import type { ApiUsageLogSummary } from "@/types/api-log";

export default async function LogsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("api_usage_logs")
    .select("id,endpoint,method,status_code,response_time_ms,error_message,created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
          Observability
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">API利用状況</h1>
        <p className="text-zinc-600">
          直近の API 呼び出しを確認し、異常なレスポンスやエラーを素早く発見します。
        </p>
      </div>
      <ApiUsageLogTable logs={(data ?? []) as ApiUsageLogSummary[]} />
    </section>
  );
}
