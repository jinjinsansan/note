import { NextResponse } from "next/server";
import { logApiUsage } from "@/lib/api-logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createServerSupabaseClient();
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const resetPayload: Database["public"]["Tables"]["note_accounts"]["Update"] = {
    is_primary: false,
  };
  const { error: resetError } = await supabase
    .from("note_accounts")
    .update(resetPayload as never)
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

  const setPrimaryPayload: Database["public"]["Tables"]["note_accounts"]["Update"] = {
    is_primary: true,
  };
  const { data, error } = await supabase
    .from("note_accounts")
    .update(setPrimaryPayload as never)
    .eq("user_id", userId)
    .eq("id", id)
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
