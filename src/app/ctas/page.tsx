import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CtaManager } from "@/components/ctas/cta-manager";
import type { CtaSummary } from "@/types/cta";

export default async function CtasPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("cta_settings")
    .select("id,cta_name,cta_content,cta_link,created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  const ctas = (data ?? []) as CtaSummary[];

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
          CTA Templates
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">CTA管理</h1>
        <p className="text-zinc-600">
          記事生成で繰り返し使うCTA文面とリンクをまとめて管理します。
        </p>
      </div>
      <CtaManager initialCtas={ctas} />
    </section>
  );
}
