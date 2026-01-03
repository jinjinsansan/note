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

export async function POST(_request: Request, { params }: RouteParams) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const { error: resetError } = await supabase
    .from("note_accounts")
    .update({ is_primary: false })
    .eq("user_id", userId);

  if (resetError) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/note-accounts/:id/primary",
      method: "POST",
      statusCode: 500,
      startedAt,
      errorMessage: resetError.message,
    });
    return NextResponse.json({ error: resetError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("note_accounts")
    .update({ is_primary: true })
    .eq("user_id", userId)
    .eq("id", params.id)
    .select(
      "id,note_user_id,note_username,is_primary,created_at,last_synced_at",
    )
    .single();

  if (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/note-accounts/:id/primary",
      method: "POST",
      statusCode: 400,
      startedAt,
      errorMessage: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logApiUsage({
    supabase,
    userId,
    endpoint: "/api/note-accounts/:id/primary",
    method: "POST",
    statusCode: 200,
    startedAt,
  });

  return NextResponse.json({ noteAccount: data });
}
