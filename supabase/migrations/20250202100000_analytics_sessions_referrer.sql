-- Add referrer (traffic source) to analytics_sessions
ALTER TABLE public.analytics_sessions
  ADD COLUMN IF NOT EXISTS referrer text;

COMMENT ON COLUMN public.analytics_sessions.referrer IS 'HTTP Referer / document.referrer at first pageview (traffic source).';

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_referrer ON public.analytics_sessions(referrer) WHERE referrer IS NOT NULL;
