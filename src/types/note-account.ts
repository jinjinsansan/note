import type { Database } from "@/types/supabase";

export type NoteAccountSummary = Pick<
  Database["public"]["Tables"]["note_accounts"]["Row"],
  "id" | "note_user_id" | "note_username" | "is_primary" | "created_at" | "last_synced_at"
>;
