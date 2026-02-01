-- Custom Web Analytics: sessions + events (GDPR-friendly, internal only)
-- Run this in Supabase SQL Editor or via Supabase CLI.

-- 1. Table: analytics_sessions (one row per visitor session)
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  ip_hash text,
  device text,
  os text,
  browser text,
  country text,
  city text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session_id ON public.analytics_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_created_at ON public.analytics_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_ip_hash ON public.analytics_sessions(ip_hash);

COMMENT ON TABLE public.analytics_sessions IS 'One row per visitor session; IP stored hashed for privacy.';

-- 2. Table: analytics_events (page views, clicks, custom events)
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES public.analytics_sessions(session_id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('pageview', 'click', 'custom')),
  path text,
  element_id text,
  metadata jsonb DEFAULT '{}',
  duration integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_path ON public.analytics_events(path);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_element_id ON public.analytics_events(element_id) WHERE element_id IS NOT NULL;

COMMENT ON TABLE public.analytics_events IS 'Events: pageview (with optional duration), click (element_id), custom.';
COMMENT ON COLUMN public.analytics_events.duration IS 'Time on page in seconds (for pageview).';

-- 3. RLS: anyone can INSERT (collector); only service_role / authenticated admin can SELECT
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insert for collector (public anon key)
CREATE POLICY "analytics_sessions_insert_anon" ON public.analytics_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "analytics_events_insert_anon" ON public.analytics_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- No public read: only service_role used by API admin will read (bypasses RLS)
-- Optional: allow authenticated users (your app checks admin in API) to read
CREATE POLICY "analytics_sessions_select_service" ON public.analytics_sessions
  FOR SELECT TO service_role USING (true);

CREATE POLICY "analytics_events_select_service" ON public.analytics_events
  FOR SELECT TO service_role USING (true);

-- Allow update for upsert session (e.g. update updated_at)
CREATE POLICY "analytics_sessions_update_anon" ON public.analytics_sessions
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Trigger: updated_at on sessions
CREATE OR REPLACE FUNCTION public.set_analytics_sessions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS analytics_sessions_updated_at ON public.analytics_sessions;
CREATE TRIGGER analytics_sessions_updated_at
  BEFORE UPDATE ON public.analytics_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_analytics_sessions_updated_at();
