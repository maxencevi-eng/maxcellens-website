-- Purge des données analytics de plus de 3 mois (économie d'espace).
-- Les événements sont supprimés en cascade (FK ON DELETE CASCADE).

-- Fonction appelable depuis l'API ou un cron Supabase
CREATE OR REPLACE FUNCTION public.analytics_purge_older_than_3_months()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff timestamptz;
  deleted_count bigint;
BEGIN
  cutoff := now() - interval '3 months';

  -- Supprimer les sessions de plus de 3 mois (les events sont supprimés en CASCADE)
  WITH deleted AS (
    DELETE FROM public.analytics_sessions
    WHERE created_at < cutoff
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.analytics_purge_older_than_3_months() IS
  'Supprime les sessions analytics de plus de 3 mois. À exécuter quotidiennement via cron (Supabase Dashboard > Database > Cron) ou via POST /api/admin/analytics/purge.';

-- Pour planifier en base (Supabase : activer pg_cron si besoin) :
-- SELECT cron.schedule('analytics-purge', '0 4 * * *', $$SELECT public.analytics_purge_older_than_3_months()$$);
-- (tous les jours à 4h UTC)
