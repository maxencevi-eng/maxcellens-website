-- =============================================================================
-- Ajouter les colonnes manquantes à analytics_sessions (referrer, ip)
-- À exécuter dans Supabase SQL Editor si le script check-analytics-supabase.sql
-- a montré que ces colonnes n'existent pas.
-- =============================================================================

-- 1. Colonne referrer (source de trafic)
ALTER TABLE public.analytics_sessions
  ADD COLUMN IF NOT EXISTS referrer text;

COMMENT ON COLUMN public.analytics_sessions.referrer IS 'HTTP Referer / document.referrer at first pageview (traffic source).';

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_referrer ON public.analytics_sessions(referrer) WHERE referrer IS NOT NULL;

-- 2. Colonne ip (pour liste visiteurs et filtre exclure)
ALTER TABLE public.analytics_sessions
  ADD COLUMN IF NOT EXISTS ip text;

COMMENT ON COLUMN public.analytics_sessions.ip IS 'Client IP for admin visitor list and exclude; only visible to admin API.';

-- 3. Colonne user_agent (détection bots / filtrage stats / purge bots)
ALTER TABLE public.analytics_sessions
  ADD COLUMN IF NOT EXISTS user_agent text;

COMMENT ON COLUMN public.analytics_sessions.user_agent IS 'HTTP User-Agent for bot detection and purge; used when analytics_exclude_bots is enabled.';
