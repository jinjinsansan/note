-- 0001_initial_schema.sql
-- Base schema for Note Auto Post AI per specification

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  profile_picture_url TEXT,
  stripe_customer_id VARCHAR(255),
  subscription_plan VARCHAR(50) NOT NULL DEFAULT 'free',
  subscription_status VARCHAR(50) DEFAULT 'inactive',
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  api_quota_monthly INT DEFAULT 0,
  api_quota_used INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.note_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note_user_id VARCHAR(255) NOT NULL,
  note_username VARCHAR(255),
  auth_token TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, note_user_id)
);

CREATE TABLE IF NOT EXISTS public.style_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  profile_name VARCHAR(100),
  tone VARCHAR(50),
  text_style VARCHAR(50),
  vocabulary_level VARCHAR(50),
  average_sentence_length INT,
  average_paragraph_length INT,
  punctuation_frequency FLOAT,
  formal_language_ratio FLOAT,
  learning_articles JSONB,
  analysis_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cta_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cta_name VARCHAR(150) NOT NULL,
  cta_content TEXT,
  cta_link VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note_account_id UUID REFERENCES public.note_accounts(id) ON DELETE SET NULL,
  style_profile_id UUID REFERENCES public.style_profiles(id) ON DELETE SET NULL,
  cta_id UUID REFERENCES public.cta_settings(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  content TEXT NOT NULL,
  word_count INT,
  seo_keywords JSONB,
  seo_difficulty_score FLOAT,
  meta_description VARCHAR(160),
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  scheduled_publish_at TIMESTAMPTZ,
  note_article_url VARCHAR(500),
  note_article_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.article_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  heading_id VARCHAR(100),
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  image_prompt TEXT,
  generated_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id VARCHAR(100) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INT,
  response_time_ms INT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cta_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own row" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own row" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own row" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete own row" ON public.users
  FOR DELETE USING (auth.uid() = id);

CREATE POLICY "Users manage their note accounts" ON public.note_accounts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their style profiles" ON public.style_profiles
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their CTA settings" ON public.cta_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their articles" ON public.articles
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their article images" ON public.article_images
  USING (EXISTS (
    SELECT 1 FROM public.articles a
    WHERE a.id = article_images.article_id AND a.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.articles a
    WHERE a.id = article_images.article_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "Users manage their subscriptions" ON public.subscriptions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their API logs" ON public.api_usage_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
