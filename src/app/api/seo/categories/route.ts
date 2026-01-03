import { NextResponse } from "next/server";

import { SEO_CATEGORIES } from "@/lib/seo-data";
import { logApiUsage } from "@/lib/api-logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
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
