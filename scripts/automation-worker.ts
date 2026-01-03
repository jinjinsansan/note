import { createClient } from "@supabase/supabase-js";

import { runNextAutomationJob, type AutomationSupabase } from "@/lib/automation/job-runner";
import type { Database } from "@/types/supabase";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not configured`);
  }
  return value;
};

async function main() {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const idleDelayMs = Number(process.env.AUTOMATION_WORKER_INTERVAL_MS ?? 5000);
  const activeDelayMs = Number(process.env.AUTOMATION_WORKER_ACTIVE_DELAY_MS ?? 500);

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as unknown as AutomationSupabase;

  let running = true;
  const shutdown = (signal: string) => {
    console.log(`[automation-worker] Received ${signal}, draining loop...`);
    running = false;
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  while (running) {
    try {
      const result = await runNextAutomationJob(supabase);
      console.log(
        `[automation-worker] ${new Date().toISOString()} status=${result.status} job=${result.jobId ??
          "-"} message="${result.message}"`,
      );
      if (result.status === "no_job") {
        await sleep(idleDelayMs);
      } else {
        await sleep(activeDelayMs);
      }
    } catch (error) {
      console.error("[automation-worker] error", error);
      await sleep(idleDelayMs);
    }
  }

  console.log("[automation-worker] exited");
  process.exit(0);
}

main().catch((error) => {
  console.error("[automation-worker] fatal", error);
  process.exit(1);
});
