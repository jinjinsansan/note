import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import { SEO_CATEGORIES } from "@/lib/seo-data";
import type { Database } from "@/types/supabase";
import { logApiUsage } from "@/lib/api-logger";

export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await logApiUsage({
    supabase,
    userId: session.user.id,
    endpoint: "/api/seo/categories",
    method: "GET",
    statusCode: 200,
    startedAt,
  });

  return NextResponse.json({ categories: SEO_CATEGORIES });
}
