import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { runNextAutomationJob } from "@/lib/automation/job-runner";

export async function POST() {
  const secret = process.env.AUTOMATION_RUNNER_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "AUTOMATION_RUNNER_SECRET not configured" }, { status: 500 });
  }

  const authHeader = headers().get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase admin client unavailable" }, { status: 500 });
  }

  const result = await runNextAutomationJob(supabaseAdmin);
  const statusCode = result.status === "failed" ? 500 : 200;
  return NextResponse.json(result, { status: statusCode });
}
