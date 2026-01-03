import type { Database } from "@/types/supabase";

export type StyleProfileSummary = Pick<
  Database["public"]["Tables"]["style_profiles"]["Row"],
  "id" | "profile_name" | "tone" | "text_style" | "vocabulary_level" | "learning_articles" | "created_at"
>;
