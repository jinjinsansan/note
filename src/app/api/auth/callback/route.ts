import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/types/supabase";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const nextPath = next.startsWith("/") ? next : "/";
  const redirectUrl = new URL(nextPath, requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}
