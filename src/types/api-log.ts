import type { Database } from "@/types/supabase";

export type ApiUsageLogSummary = Pick<
  Database["public"]["Tables"]["api_usage_logs"]["Row"],
  "id" | "endpoint" | "method" | "status_code" | "response_time_ms" | "error_message" | "created_at"
>;
