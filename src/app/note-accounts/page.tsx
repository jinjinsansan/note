import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NoteAccountManager } from "@/components/note-accounts/note-account-manager";
import type { NoteAccountSummary } from "@/types/note-account";

export default async function NoteAccountsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("note_accounts")
    .select("id,note_user_id,note_username,is_primary,created_at,last_synced_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  const noteAccounts = (data ?? []) as NoteAccountSummary[];

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
          Note Account Integration
        </p>
        <h1 className="text-3xl font-semibold text-zinc-900">noteアカウント管理</h1>
        <p className="text-zinc-600">
          セッショントークンを安全に保存し、記事の自動投稿に利用するnoteアカウントを管理します。
        </p>
      </div>
      <NoteAccountManager initialNoteAccounts={noteAccounts} />
    </section>
  );
}
