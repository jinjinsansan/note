import type { Database } from "@/types/supabase";

export type ArticleSummary = Pick<
  Database["public"]["Tables"]["articles"]["Row"],
  | "id"
  | "title"
  | "category"
  | "status"
  | "word_count"
  | "meta_description"
  | "created_at"
  | "updated_at"
  | "cta_id"
  | "scheduled_publish_at"
  | "note_account_id"
  | "note_article_url"
>;

export type ArticleDetail = Pick<
  Database["public"]["Tables"]["articles"]["Row"],
  | "id"
  | "title"
  | "category"
  | "content"
  | "meta_description"
  | "status"
  | "cta_id"
  | "note_account_id"
  | "created_at"
  | "updated_at"
>;

export type ArticleImage = Pick<
  Database["public"]["Tables"]["article_images"]["Row"],
  | "id"
  | "article_id"
  | "heading_id"
  | "image_url"
  | "alt_text"
  | "image_prompt"
  | "generated_by"
  | "created_at"
>;
