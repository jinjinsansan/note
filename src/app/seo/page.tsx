import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SeoWorkspace } from "@/components/seo/seo-workspace";

export default async function SeoPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
          SEO Research Lab
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">キーワード & タイトル生成</h1>
        <p className="text-zinc-600">
          カテゴリー別のSEOキーワードと難易度を把握し、note向けタイトルを素早く作成します。
        </p>
      </div>
      <SeoWorkspace />
    </section>
  );
}
