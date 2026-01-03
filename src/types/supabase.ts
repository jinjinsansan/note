export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      api_usage_logs: {
        Row: {
          created_at: string;
          endpoint: string | null;
          error_message: string | null;
          id: string;
          method: string | null;
          response_time_ms: number | null;
          status_code: number | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          endpoint?: string | null;
          error_message?: string | null;
          id?: string;
          method?: string | null;
          response_time_ms?: number | null;
          status_code?: number | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          endpoint?: string | null;
          error_message?: string | null;
          id?: string;
          method?: string | null;
          response_time_ms?: number | null;
          status_code?: number | null;
          user_id?: string;
        };
      };
      automation_jobs: {
        Row: {
          article_id: string;
          attempts: number;
          created_at: string;
          cta_id: string | null;
          error_message: string | null;
          finished_at: string | null;
          id: string;
          note_account_id: string;
          payload: Json | null;
          result_url: string | null;
          scheduled_for: string | null;
          started_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          article_id: string;
          attempts?: number;
          created_at?: string;
          cta_id?: string | null;
          error_message?: string | null;
          finished_at?: string | null;
          id?: string;
          note_account_id: string;
          payload?: Json | null;
          result_url?: string | null;
          scheduled_for?: string | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          article_id?: string;
          attempts?: number;
          created_at?: string;
          cta_id?: string | null;
          error_message?: string | null;
          finished_at?: string | null;
          id?: string;
          note_account_id?: string;
          payload?: Json | null;
          result_url?: string | null;
          scheduled_for?: string | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      articles: {
        Row: {
          category: string | null;
          content: string;
          created_at: string;
          cta_id: string | null;
          id: string;
          meta_description: string | null;
          note_account_id: string | null;
          note_article_id: string | null;
          note_article_url: string | null;
          published_at: string | null;
          scheduled_publish_at: string | null;
          seo_difficulty_score: number | null;
          seo_keywords: Json | null;
          status: string;
          style_profile_id: string | null;
          title: string;
          updated_at: string;
          user_id: string;
          word_count: number | null;
        };
        Insert: {
          category?: string | null;
          content: string;
          created_at?: string;
          cta_id?: string | null;
          id?: string;
          meta_description?: string | null;
          note_account_id?: string | null;
          note_article_id?: string | null;
          note_article_url?: string | null;
          published_at?: string | null;
          scheduled_publish_at?: string | null;
          seo_difficulty_score?: number | null;
          seo_keywords?: Json | null;
          status?: string;
          style_profile_id?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
          word_count?: number | null;
        };
        Update: {
          category?: string | null;
          content?: string;
          created_at?: string;
          cta_id?: string | null;
          id?: string;
          meta_description?: string | null;
          note_account_id?: string | null;
          note_article_id?: string | null;
          note_article_url?: string | null;
          published_at?: string | null;
          scheduled_publish_at?: string | null;
          seo_difficulty_score?: number | null;
          seo_keywords?: Json | null;
          status?: string;
          style_profile_id?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
          word_count?: number | null;
        };
      };
      article_images: {
        Row: {
          alt_text: string | null;
          article_id: string;
          created_at: string;
          generated_by: string | null;
          heading_id: string | null;
          id: string;
          image_prompt: string | null;
          image_url: string;
        };
        Insert: {
          alt_text?: string | null;
          article_id: string;
          created_at?: string;
          generated_by?: string | null;
          heading_id?: string | null;
          id?: string;
          image_prompt?: string | null;
          image_url: string;
        };
        Update: {
          alt_text?: string | null;
          article_id?: string;
          created_at?: string;
          generated_by?: string | null;
          heading_id?: string | null;
          id?: string;
          image_prompt?: string | null;
          image_url?: string;
        };
      };
      cta_settings: {
        Row: {
          created_at: string;
          cta_content: string | null;
          cta_link: string | null;
          cta_name: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          cta_content?: string | null;
          cta_link?: string | null;
          cta_name: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          cta_content?: string | null;
          cta_link?: string | null;
          cta_name?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      keywords: {
        Row: {
          category: string | null;
          competition_difficulty: number | null;
          created_at: string;
          difficulty_level: string | null;
          id: string;
          keyword: string;
          rationale: string | null;
          search_volume: number | null;
          trend_score: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string | null;
          competition_difficulty?: number | null;
          created_at?: string;
          difficulty_level?: string | null;
          id?: string;
          keyword: string;
          rationale?: string | null;
          search_volume?: number | null;
          trend_score?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string | null;
          competition_difficulty?: number | null;
          created_at?: string;
          difficulty_level?: string | null;
          id?: string;
          keyword?: string;
          rationale?: string | null;
          search_volume?: number | null;
          trend_score?: number | null;
          updated_at?: string;
          user_id?: string;
        };
      };
      note_accounts: {
        Row: {
          auth_token: string;
          created_at: string;
          id: string;
          is_primary: boolean;
          last_synced_at: string | null;
          note_user_id: string;
          note_username: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          auth_token: string;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          last_synced_at?: string | null;
          note_user_id: string;
          note_username?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          auth_token?: string;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          last_synced_at?: string | null;
          note_user_id?: string;
          note_username?: string | null;
          updated_at?: string;
          user_id?: string;
        };
      };
      seo_titles: {
        Row: {
          created_at: string;
          difficulty_level: string | null;
          difficulty_score: number | null;
          estimated_search_volume: number | null;
          id: string;
          is_selected: boolean;
          keywords: Json | null;
          seo_score: number | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          difficulty_level?: string | null;
          difficulty_score?: number | null;
          estimated_search_volume?: number | null;
          id?: string;
          is_selected?: boolean;
          keywords?: Json | null;
          seo_score?: number | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          difficulty_level?: string | null;
          difficulty_score?: number | null;
          estimated_search_volume?: number | null;
          id?: string;
          is_selected?: boolean;
          keywords?: Json | null;
          seo_score?: number | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      style_profiles: {
        Row: {
          analysis_data: Json | null;
          average_paragraph_length: number | null;
          average_sentence_length: number | null;
          created_at: string;
          formal_language_ratio: number | null;
          id: string;
          learning_articles: Json | null;
          profile_name: string | null;
          text_style: string | null;
          tone: string | null;
          updated_at: string;
          user_id: string;
          vocabulary_level: string | null;
        };
        Insert: {
          analysis_data?: Json | null;
          average_paragraph_length?: number | null;
          average_sentence_length?: number | null;
          created_at?: string;
          formal_language_ratio?: number | null;
          id?: string;
          learning_articles?: Json | null;
          profile_name?: string | null;
          text_style?: string | null;
          tone?: string | null;
          updated_at?: string;
          user_id: string;
          vocabulary_level?: string | null;
        };
        Update: {
          analysis_data?: Json | null;
          average_paragraph_length?: number | null;
          average_sentence_length?: number | null;
          created_at?: string;
          formal_language_ratio?: number | null;
          id?: string;
          learning_articles?: Json | null;
          profile_name?: string | null;
          text_style?: string | null;
          tone?: string | null;
          updated_at?: string;
          user_id?: string;
          vocabulary_level?: string | null;
        };
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          plan_id: string;
          status: string | null;
          stripe_subscription_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan_id: string;
          status?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan_id?: string;
          status?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
      };
      users: {
        Row: {
          api_quota_monthly: number | null;
          api_quota_used: number | null;
          created_at: string;
          deleted_at: string | null;
          email: string;
          id: string;
          password_hash: string;
          profile_picture_url: string | null;
          stripe_customer_id: string | null;
          subscription_plan: string;
          subscription_start_date: string | null;
          subscription_status: string | null;
          subscription_end_date: string | null;
          updated_at: string;
          username: string;
        };
        Insert: {
          api_quota_monthly?: number | null;
          api_quota_used?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          email: string;
          id?: string;
          password_hash: string;
          profile_picture_url?: string | null;
          stripe_customer_id?: string | null;
          subscription_plan?: string;
          subscription_start_date?: string | null;
          subscription_status?: string | null;
          subscription_end_date?: string | null;
          updated_at?: string;
          username: string;
        };
        Update: {
          api_quota_monthly?: number | null;
          api_quota_used?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string;
          id?: string;
          password_hash?: string;
          profile_picture_url?: string | null;
          stripe_customer_id?: string | null;
          subscription_plan?: string;
          subscription_start_date?: string | null;
          subscription_status?: string | null;
          subscription_end_date?: string | null;
          updated_at?: string;
          username?: string;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
