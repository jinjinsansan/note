CREATE TABLE IF NOT EXISTS public.keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category VARCHAR(120),
  search_volume INT,
  competition_difficulty FLOAT,
  trend_score FLOAT,
  difficulty_level VARCHAR(20),
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, keyword, category)
);

CREATE TABLE IF NOT EXISTS public.seo_titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  keywords JSONB,
  difficulty_level VARCHAR(20),
  difficulty_score FLOAT,
  seo_score FLOAT,
  estimated_search_volume INT,
  is_selected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their keywords" ON public.keywords
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their seo_titles" ON public.seo_titles
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
