import { NextResponse } from "next/server";
import { z } from "zod";
import type { CtaSummary } from "@/types/cta";
import { logApiUsage } from "@/lib/api-logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type CtaInsert = Database["public"]["Tables"]["cta_settings"]["Insert"];

const schema = z.object({
  name: z.string().min(2, "CTA名を入力してください"),
  content: z.string().min(10, "本文を入力してください"),
  link: z.string().url("有効なURLを入力してください"),
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
    .from("cta_settings")
    .select("id,cta_name,cta_content,cta_link,created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/ctas",
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
    endpoint: "/api/ctas",
    method: "GET",
    statusCode: 200,
    startedAt,
  });

  return NextResponse.json({ ctas: (data ?? []) as CtaSummary[] });
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
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/ctas",
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

  const { name, content, link } = parsed.data;
  const payload: CtaInsert = {
    user_id: session.user.id,
    cta_name: name,
    cta_content: content,
    cta_link: link,
  };
  const { data, error } = await supabase
    .from("cta_settings")
    .insert(payload as never)
    .select("id,cta_name,cta_content,cta_link,created_at")
    .single();

  if (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/ctas",
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
    endpoint: "/api/ctas",
    method: "POST",
    statusCode: 201,
    startedAt,
  });

  return NextResponse.json({ cta: data as CtaSummary }, { status: 201 });
}
