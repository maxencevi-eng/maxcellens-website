-- Exclure les utilisateurs connectés des statistiques : flag is_authenticated sur la session.
-- Run in Supabase SQL Editor if you already applied the previous analytics migration.

ALTER TABLE public.analytics_sessions
  ADD COLUMN IF NOT EXISTS is_authenticated boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.analytics_sessions.is_authenticated IS 'True when the visitor was logged in; these sessions are excluded from stats.';

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_is_authenticated
  ON public.analytics_sessions(is_authenticated);
