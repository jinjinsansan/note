import { NextResponse } from "next/server";
import { z } from "zod";
import type { ArticleDetail } from "@/types/article";
import { logApiUsage } from "@/lib/api-logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

const updateSchema = z.object({
  title: z.string().min(5, "タイトルは5文字以上").optional(),
  content: z.string().min(50, "本文は50文字以上").optional(),
  metaDescription: z.string().max(160, "メタディスクリプションは160文字以内").optional(),
  status: z.enum(["draft", "ready", "approved", "published"]).optional(),
  ctaId: z.string().uuid().nullable().optional(),
  noteAccountId: z.string().uuid().nullable().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
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

  const { data, error } = await supabase
    .from("articles")
    .select(
      "id,title,category,content,meta_description,status,cta_id,created_at,updated_at",
    )
    .eq("user_id", session.user.id)
    .eq("id", id)
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/articles/:id",
      method: "GET",
      statusCode: status,
      startedAt,
      errorMessage: error.message,
    });
    return NextResponse.json({ error: error.message }, { status });
  }

  await logApiUsage({
    supabase,
    userId,
    endpoint: "/api/articles/:id",
    method: "GET",
    statusCode: 200,
    startedAt,
  });

  return NextResponse.json({ article: data as ArticleDetail });
}

export async function PUT(request: Request, context: RouteContext) {
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

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/articles/:id",
      method: "PUT",
      statusCode: 400,
      startedAt,
      errorMessage: "validation_error",
    });
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const updates: Database["public"]["Tables"]["articles"]["Update"] = {};
  const { title, content, metaDescription, status, ctaId, noteAccountId } = parsed.data;
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (metaDescription !== undefined) updates.meta_description = metaDescription;
  if (status !== undefined) updates.status = status;
  if (ctaId !== undefined) updates.cta_id = ctaId;
  if (noteAccountId !== undefined) {
    if (noteAccountId === null) {
      updates.note_account_id = null;
    } else {
      const { data: accountRecord, error: accountError } = await supabase
        .from("note_accounts")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("id", noteAccountId)
        .single();
      if (accountError || !accountRecord) {
        await logApiUsage({
          supabase,
          userId,
          endpoint: "/api/articles/:id",
          method: "PUT",
          statusCode: 400,
          startedAt,
          errorMessage: "note_account_not_found",
        });
        return NextResponse.json({ error: "noteアカウントが見つかりません" }, { status: 400 });
      }
      updates.note_account_id = noteAccountId;
    }
  }

  if (Object.keys(updates).length === 0) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/articles/:id",
      method: "PUT",
      statusCode: 400,
      startedAt,
      errorMessage: "no_updates",
    });
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("articles")
    .update(updates as never)
    .eq("user_id", session.user.id)
    .eq("id", id)
    .select(
      "id,title,category,content,meta_description,status,cta_id,created_at,updated_at",
    )
    .single();

  if (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/articles/:id",
      method: "PUT",
      statusCode: 500,
      startedAt,
      errorMessage: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logApiUsage({
    supabase,
    userId,
    endpoint: "/api/articles/:id",
    method: "PUT",
    statusCode: 200,
    startedAt,
  });

  return NextResponse.json({ article: data as ArticleDetail });
}
