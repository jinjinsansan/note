import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StyleProfileManager } from "@/components/style-profiles/style-profile-manager";
import type { StyleProfileSummary } from "@/types/style-profile";

export default async function StyleProfilesPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("style_profiles")
    .select("id,profile_name,tone,text_style,vocabulary_level,learning_articles,created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  const profiles = (data ?? []) as StyleProfileSummary[];

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
          Style Intelligence
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">スタイルプロフィール</h1>
        <p className="text-zinc-600">
          過去のnote記事をベースに、AIが再利用できるライティングスタイルを構築します。
        </p>
      </div>
      <StyleProfileManager initialProfiles={profiles} />
    </section>
  );
}
