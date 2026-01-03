import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

type LogOptions = {
  supabase: SupabaseClient<Database>;
  userId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  startedAt: number;
  errorMessage?: string;
};

export async function logApiUsage({
  supabase,
  userId,
  endpoint,
  method,
  statusCode,
  startedAt,
  errorMessage,
}: LogOptions) {
  try {
    await supabase.from("api_usage_logs").insert({
      user_id: userId,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: Math.max(0, Date.now() - startedAt),
      error_message: errorMessage ?? null,
    });
  } catch (error) {
    console.error("Failed to log API usage", error);
  }
}
