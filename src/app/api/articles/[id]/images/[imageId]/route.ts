import { NextResponse } from "next/server";
import { logApiUsage } from "@/lib/api-logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string; imageId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id, imageId } = await context.params;
  const supabase = createServerSupabaseClient();
  const startedAt = Date.now();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const { error } = await supabase
    .from("article_images")
    .delete()
    .eq("article_id", id)
    .eq("id", imageId);

  if (error) {
    await logApiUsage({
      supabase,
      userId,
      endpoint: "/api/articles/:id/images/:imageId",
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
    endpoint: "/api/articles/:id/images/:imageId",
    method: "DELETE",
    statusCode: 200,
    startedAt,
  });

  return NextResponse.json({ success: true });
}
