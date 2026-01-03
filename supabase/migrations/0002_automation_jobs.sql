CREATE TABLE IF NOT EXISTS public.automation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  note_account_id UUID NOT NULL REFERENCES public.note_accounts(id) ON DELETE CASCADE,
  cta_id UUID REFERENCES public.cta_settings(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  result_url VARCHAR(500),
  error_message TEXT,
  attempts INT NOT NULL DEFAULT 0,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS automation_jobs_user_idx ON public.automation_jobs(user_id);
CREATE INDEX IF NOT EXISTS automation_jobs_status_idx ON public.automation_jobs(status);
CREATE INDEX IF NOT EXISTS automation_jobs_schedule_idx ON public.automation_jobs(scheduled_for);

ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their automation jobs" ON public.automation_jobs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
