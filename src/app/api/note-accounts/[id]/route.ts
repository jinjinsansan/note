import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

import type { Database } from "@/types/supabase";
import { logApiUsage } from "@/lib/api-logger";

type RouteParams = {
  params: {
    id: string;
  };
};

export async function DELETE(_request: Request, { params }: RouteParams) {
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
    .from("note_accounts")
    .delete()
    .eq("user_id", session.user.id)
    .eq("id", params.id);

  if (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/note-accounts/:id",
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
    endpoint: "/api/note-accounts/:id",
    method: "DELETE",
    statusCode: 200,
    startedAt,
  });

  return NextResponse.json({ success: true });
}
