import type { Database } from "@/types/supabase";

export type CtaSummary = Pick<
  Database["public"]["Tables"]["cta_settings"]["Row"],
  "id" | "cta_name" | "cta_content" | "cta_link" | "created_at"
>;
