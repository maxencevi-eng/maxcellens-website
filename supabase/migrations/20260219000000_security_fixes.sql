-- =============================================================================
-- Security fixes based on Supabase linter warnings
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Fix: Function Search Path Mutable (lint: 0011)
--    Add SET search_path = '' to all trigger functions to prevent
--    search_path injection attacks.
-- -----------------------------------------------------------------------------

-- set_page_seo_updated_at
CREATE OR REPLACE FUNCTION public.set_page_seo_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY INVOKER
   SET search_path = '';

-- set_analytics_sessions_updated_at
CREATE OR REPLACE FUNCTION public.set_analytics_sessions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY INVOKER
   SET search_path = '';

-- set_updated_at (generic, may have been created outside migrations)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY INVOKER
   SET search_path = '';

-- profiles_set_updated_at (may have been created outside migrations)
CREATE OR REPLACE FUNCTION public.profiles_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY INVOKER
   SET search_path = '';

-- -----------------------------------------------------------------------------
-- 2. Fix: RLS Policy Always True (lint: 0024)
--
--    The analytics collect API uses supabaseAdmin (service_role), which bypasses
--    RLS entirely. The permissive anon INSERT/UPDATE policies are therefore not
--    needed and can be dropped safely.
-- -----------------------------------------------------------------------------

-- Drop overly permissive INSERT policy on analytics_events
DROP POLICY IF EXISTS "analytics_events_insert_anon" ON public.analytics_events;

-- Drop overly permissive INSERT policy on analytics_sessions
DROP POLICY IF EXISTS "analytics_sessions_insert_anon" ON public.analytics_sessions;

-- Drop overly permissive UPDATE policy on analytics_sessions
DROP POLICY IF EXISTS "analytics_sessions_update_anon" ON public.analytics_sessions;

-- -----------------------------------------------------------------------------
-- 3. Fix: RLS Enabled No Policy (lint: 0008)
--
--    Table public.profiles has RLS enabled but zero policies.
--    Add standard ownership-based policies:
--      - Users can read their own row
--      - Users can update their own row
--      - Service role retains full access (bypasses RLS automatically)
-- -----------------------------------------------------------------------------

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- NOTE — Leaked Password Protection (auth_leaked_password_protection)
-- This setting must be enabled manually in the Supabase Dashboard:
--   Authentication → Providers → Email → "Enable HaveIBeenPwned protection"
-- It cannot be configured via SQL migrations.
-- =============================================================================
