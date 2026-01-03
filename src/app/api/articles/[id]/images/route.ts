import { NextResponse } from "next/server";
import { z } from "zod";
import type { ArticleImage } from "@/types/article";
import { logApiUsage } from "@/lib/api-logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type ArticleImageInsert = Database["public"]["Tables"]["article_images"]["Insert"];

const schema = z.object({
  headingId: z.string().optional(),
  imageUrl: z.string().url("画像URLを入力してください"),
  altText: z.string().min(3, "ALTテキストを入力してください"),
  imagePrompt: z.string().optional(),
  generatedBy: z.string().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = createServerSupabaseClient();
  const db = supabase as SupabaseClient<Database>;
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const { data, error } = await db
    .from("article_images")
    .select("id,article_id,heading_id,image_url,alt_text,image_prompt,generated_by,created_at")
    .eq("article_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/articles/:id/images",
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
    endpoint: "/api/articles/:id/images",
    method: "GET",
    statusCode: 200,
    startedAt,
  });

  return NextResponse.json({ images: (data ?? []) as ArticleImage[] });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = createServerSupabaseClient();
  const db = supabase as SupabaseClient<Database>;
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
      endpoint: "/api/articles/:id/images",
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

  const { headingId, imageUrl, altText, imagePrompt, generatedBy } = parsed.data;

  const payload: ArticleImageInsert = {
    article_id: id,
    heading_id: headingId ?? null,
    image_url: imageUrl,
    alt_text: altText,
    image_prompt: imagePrompt ?? null,
    generated_by: generatedBy ?? "manual",
  };

  const { data, error } = await db
    .from("article_images")
    .insert(payload as never)
    .select("id,article_id,heading_id,image_url,alt_text,image_prompt,generated_by,created_at")
    .single();

  if (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/articles/:id/images",
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
    endpoint: "/api/articles/:id/images",
    method: "POST",
    statusCode: 201,
    startedAt,
  });

  return NextResponse.json({ image: data as ArticleImage }, { status: 201 });
}
