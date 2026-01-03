import { NextResponse } from "next/server";
import { z } from "zod";
import type { StyleProfileSummary } from "@/types/style-profile";
import { logApiUsage } from "@/lib/api-logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type StyleProfileInsert = Database["public"]["Tables"]["style_profiles"]["Insert"];

const insertSchema = z.object({
  profileName: z.string().min(2, "プロフィール名を入力してください"),
  tone: z.string().min(2, "トーンを入力してください"),
  textStyle: z.string().min(2, "文体を入力してください"),
  vocabularyLevel: z.string().min(2, "語彙レベルを入力してください"),
  notes: z.string().optional(),
  sourceUrls: z.array(z.string().url("URL形式で入力してください")).min(1, "少なくとも1つのURLが必要です"),
  analysis: z.record(z.string(), z.any()).optional(),
});

const selectFields =
  "id,profile_name,tone,text_style,vocabulary_level,learning_articles,created_at" as const;

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const { data, error } = await supabase
    .from("style_profiles")
    .select(selectFields)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/style-profiles",
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
    endpoint: "/api/style-profiles",
    method: "GET",
    statusCode: 200,
    startedAt,
  });

  return NextResponse.json({ profiles: (data ?? []) as StyleProfileSummary[] });
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const json = await request.json().catch(() => null);
  const parsed = insertSchema.safeParse(json);
  if (!parsed.success) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/style-profiles",
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

  const { profileName, tone, textStyle, vocabularyLevel, notes, sourceUrls, analysis } = parsed.data;

  const profilePayload: StyleProfileInsert = {
    user_id: session.user.id,
    profile_name: profileName,
    tone,
    text_style: textStyle,
    vocabulary_level: vocabularyLevel,
    learning_articles: { sourceUrls } as StyleProfileInsert["learning_articles"],
    analysis_data: (analysis ?? (notes ? { notes } : null)) as StyleProfileInsert["analysis_data"],
  };

  const { data, error } = await supabase
    .from("style_profiles")
    .insert(profilePayload as never)
    .select(selectFields)
    .single();

  if (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/style-profiles",
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
    endpoint: "/api/style-profiles",
    method: "POST",
    statusCode: 201,
    startedAt,
  });

  return NextResponse.json({ profile: data as StyleProfileSummary }, { status: 201 });
}
