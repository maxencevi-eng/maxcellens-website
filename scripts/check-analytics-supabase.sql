-- =============================================================================
-- Vérification analytics Supabase — exécuter dans Supabase SQL Editor
-- Vérifie tables, colonnes, RLS, et dernières données.
-- =============================================================================

-- 1. Tables existantes
SELECT 'Tables' AS check_type, table_name AS result
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('analytics_sessions', 'analytics_events')
ORDER BY table_name;

-- 2. Colonnes analytics_sessions (attendu: session_id, ip_hash, device, os, browser, country, city, created_at, updated_at, referrer?, ip?, is_authenticated?)
SELECT 'Colonnes analytics_sessions' AS check_type, string_agg(column_name, ', ' ORDER BY ordinal_position) AS result
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'analytics_sessions';

-- 3. Colonnes analytics_events
SELECT 'Colonnes analytics_events' AS check_type, string_agg(column_name, ', ' ORDER BY ordinal_position) AS result
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'analytics_events';

-- 4. RLS activé
SELECT 'RLS analytics_sessions' AS check_type, CASE WHEN relrowsecurity THEN 'Oui' ELSE 'Non' END AS result
FROM pg_class WHERE oid = 'public.analytics_sessions'::regclass;
SELECT 'RLS analytics_events' AS check_type, CASE WHEN relrowsecurity THEN 'Oui' ELSE 'Non' END AS result
FROM pg_class WHERE oid = 'public.analytics_events'::regclass;

-- 5. Politiques RLS (au moins INSERT pour anon/service_role)
SELECT 'Politiques RLS' AS check_type, policyname AS result
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('analytics_sessions', 'analytics_events')
ORDER BY tablename, policyname;

-- 6. Comptages
SELECT 'Sessions total' AS metric, COUNT(*)::text AS value FROM public.analytics_sessions
UNION ALL
SELECT 'Sessions (7 derniers jours)', COUNT(*)::text FROM public.analytics_sessions WHERE created_at >= now() - interval '7 days'
UNION ALL
SELECT 'Sessions (24 h)', COUNT(*)::text FROM public.analytics_sessions WHERE created_at >= now() - interval '24 hours'
UNION ALL
SELECT 'Events total', COUNT(*)::text FROM public.analytics_events
UNION ALL
SELECT 'Events (7 derniers jours)', COUNT(*)::text FROM public.analytics_events WHERE created_at >= now() - interval '7 days'
UNION ALL
SELECT 'Events (24 h)', COUNT(*)::text FROM public.analytics_events WHERE created_at >= now() - interval '24 hours'
UNION ALL
SELECT 'Pageviews (7 j)', COUNT(*)::text FROM public.analytics_events WHERE event_type = 'pageview' AND created_at >= now() - interval '7 days';

-- 7. Dernières sessions (pour voir si des données récentes arrivent)
SELECT session_id, ip_hash, country, city, created_at, updated_at
FROM public.analytics_sessions
ORDER BY created_at DESC
LIMIT 5;

-- 8. Derniers événements
SELECT id, session_id, event_type, path, duration, created_at
FROM public.analytics_events
ORDER BY created_at DESC
LIMIT 10;

-- 9. Résumé « tout est ok » (colonnes optionnelles referrer, ip, is_authenticated)
DO $$
DECLARE
  has_sessions boolean;
  has_events boolean;
  has_referrer boolean;
  has_ip boolean;
  has_is_auth boolean;
  msg text := 'Vérif Supabase analytics: ';
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_sessions') INTO has_sessions;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'analytics_events') INTO has_events;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'analytics_sessions' AND column_name = 'referrer') INTO has_referrer;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'analytics_sessions' AND column_name = 'ip') INTO has_ip;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'analytics_sessions' AND column_name = 'is_authenticated') INTO has_is_auth;

  IF NOT has_sessions OR NOT has_events THEN
    RAISE NOTICE '% ERREUR: tables manquantes (sessions=%, events=%)', msg, has_sessions, has_events;
    RETURN;
  END IF;

  RAISE NOTICE '% Tables OK. Colonnes optionnelles: referrer=%, ip=%, is_authenticated=%', msg, has_referrer, has_ip, has_is_auth;

  IF NOT has_referrer THEN
    RAISE NOTICE '  → Exécuter la migration 20250202100000_analytics_sessions_referrer.sql si besoin.';
  END IF;
  IF NOT has_ip THEN
    RAISE NOTICE '  → Exécuter la migration 20250203100000_analytics_sessions_ip.sql si besoin.';
  END IF;
  IF NOT has_is_auth THEN
    RAISE NOTICE '  → Exécuter la migration 20250131130000_analytics_sessions_is_authenticated.sql si besoin.';
  END IF;
END $$;
