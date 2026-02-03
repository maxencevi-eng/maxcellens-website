-- Store raw IP in analytics_sessions for admin display only (list visitors, add to exclude).
-- Only used server-side by admin API; not exposed to public.
ALTER TABLE public.analytics_sessions
  ADD COLUMN IF NOT EXISTS ip text;

COMMENT ON COLUMN public.analytics_sessions.ip IS 'Client IP for admin visitor list and exclude; only visible to admin API.';
