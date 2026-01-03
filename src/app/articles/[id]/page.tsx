import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ArticleDetailClient } from "@/components/articles/article-detail-client";
import type { ArticleDetail, ArticleImage } from "@/types/article";
import type { CtaSummary } from "@/types/cta";
import type { NoteAccountSummary } from "@/types/note-account";

type Params = {
  params: {
    id: string;
  };
};

export default async function ArticleDetailPage({ params }: Params) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const [{ data: articleData }, { data: ctaData }, { data: imageData }, { data: noteAccountData }] = await Promise.all([
    supabase
      .from("articles")
      .select(
        "id,title,category,content,meta_description,status,cta_id,note_account_id,created_at,updated_at",
      )
      .eq("user_id", session.user.id)
      .eq("id", params.id)
      .single(),
    supabase
      .from("cta_settings")
      .select("id,cta_name,cta_content,cta_link,created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("article_images")
      .select("id,article_id,heading_id,image_url,alt_text,image_prompt,generated_by,created_at")
      .eq("article_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("note_accounts")
      .select("id,note_user_id,note_username,is_primary,created_at,last_synced_at")
      .eq("user_id", session.user.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (!articleData) {
    redirect("/articles");
  }

  const article = articleData as ArticleDetail;
  const ctas = (ctaData ?? []) as CtaSummary[];
  const images = (imageData ?? []) as ArticleImage[];
  const noteAccounts = (noteAccountData ?? []) as NoteAccountSummary[];

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
          Draft Preview
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">記事プレビュー</h1>
        <p className="text-zinc-600">CTAやメタ情報を設定して公開準備を整えます。</p>
      </div>
      <ArticleDetailClient article={article} ctas={ctas} images={images} noteAccounts={noteAccounts} />
    </section>
  );
}
