import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BulkPublishWorkspace } from "@/components/articles/bulk-publish-workspace";
import type { ArticleSummary } from "@/types/article";
import type { CtaSummary } from "@/types/cta";

export default async function BulkPublishPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const [articlesResponse, ctasResponse] = await Promise.all([
    supabase
      .from("articles")
      .select(
        "id,title,status,created_at,cta_id,scheduled_publish_at,note_account_id,note_article_url",
      )
      .eq("user_id", session.user.id)
      .in("status", ["ready", "approved"])
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("cta_settings")
      .select("id,cta_name,cta_content,cta_link,created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false }),
  ]);

  const articles = (articlesResponse.data ?? []) as ArticleSummary[];
  const ctas = (ctasResponse.data ?? []) as CtaSummary[];

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
          Automation
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">一括投稿</h1>
        <p className="text-zinc-600">
          承認済みの記事を最大30件まで選択し、CTAと投稿スケジュールをまとめて設定します。
        </p>
      </div>
      <BulkPublishWorkspace articles={articles} ctas={ctas} />
    </section>
  );
}
