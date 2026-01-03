import { NextResponse } from "next/server";
import { z } from "zod";
import type { NoteAccountSummary } from "@/types/note-account";
import { encryptToken } from "@/lib/security";
import { logApiUsage } from "@/lib/api-logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

const selectFields =
  "id,note_user_id,note_username,is_primary,created_at,last_synced_at" as const;

const createSchema = z.object({
  noteUserId: z.string().min(1),
  noteUsername: z.string().min(1),
  authToken: z.string().min(10),
  isPrimary: z.boolean().optional().default(false),
});

export async function GET() {
  const supabase = createServerSupabaseClient();
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const { data, error } = await supabase
    .from("note_accounts")
    .select(selectFields)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/note-accounts",
      method: "GET",
      statusCode: 500,
      startedAt,
      errorMessage: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logApiUsage({
    supabase,
    userId,
    endpoint: "/api/note-accounts",
    method: "GET",
    statusCode: 200,
    startedAt,
  });

  return NextResponse.json({ noteAccounts: (data ?? []) as NoteAccountSummary[] });
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/note-accounts",
      method: "POST",
      statusCode: 400,
      startedAt,
      errorMessage: "validation_error",
    });
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { authToken, noteUserId, noteUsername, isPrimary } = parsed.data;
  const encryptedToken = encryptToken(authToken);

  if (isPrimary) {
    const demotePayload: Database["public"]["Tables"]["note_accounts"]["Update"] = {
      is_primary: false,
    };
    await supabase
      .from("note_accounts")
      .update(demotePayload as never)
      .eq("user_id", session.user.id);
  }

  const insertPayload: Database["public"]["Tables"]["note_accounts"]["Insert"] = {
    user_id: session.user.id,
    note_user_id: noteUserId,
    note_username: noteUsername,
    auth_token: encryptedToken,
    is_primary: isPrimary,
  };

  const { data, error } = await supabase
    .from("note_accounts")
    .insert(insertPayload as never)
    .select(selectFields)
    .single();

  if (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/note-accounts",
      method: "POST",
      statusCode: 500,
      startedAt,
      errorMessage: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logApiUsage({
    supabase,
    userId,
    endpoint: "/api/note-accounts",
    method: "POST",
    statusCode: 201,
    startedAt,
  });

  return NextResponse.json({ noteAccount: data as NoteAccountSummary }, { status: 201 });
}
