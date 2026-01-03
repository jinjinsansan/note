import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/types/supabase";
import { logApiUsage } from "@/lib/api-logger";

type Params = {
  params: {
    id: string;
  };
};

export async function DELETE(_request: Request, { params }: Params) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const { error } = await supabase
    .from("cta_settings")
    .delete()
    .eq("user_id", session.user.id)
    .eq("id", params.id);

  if (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/ctas/:id",
      method: "DELETE",
      statusCode: 500,
      startedAt,
      errorMessage: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logApiUsage({
    supabase,
    userId,
    endpoint: "/api/ctas/:id",
    method: "DELETE",
    statusCode: 200,
    startedAt,
  });

  return NextResponse.json({ success: true });
}
