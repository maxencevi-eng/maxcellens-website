-- =============================================================================
-- Fermeture de l'accès en lecture/écriture via la clé publique (anon)
--
-- La clé « anon » est publique (présente dans le JavaScript du site). Ces tables
-- étaient lisibles avec elle, dont bac_profils_acces (mots de passe des profils
-- Bureau à la carte, en clair et hachés) et site_settings (IP exclues des
-- statistiques).
--
-- Le site n'utilise plus la clé publique que pour l'authentification admin :
-- toutes les lectures/écritures passent par les routes serveur, qui emploient
-- la clé service_role (laquelle ignore RLS). On active donc RLS et on supprime
-- toutes les politiques existantes : anon et authenticated n'ont plus accès.
--
-- Seule exception : le tableau de bord coordinateur du Bureau à la carte suit
-- en temps réel trois tables (Supabase Realtime, clé publique) ; elles restent
-- lisibles, sans écriture.
-- =============================================================================

DO $$
DECLARE
  t text;
  p record;
  locked text[] := ARRAY[
    'site_settings', 'site_pages', 'page_blocks', 'page_seo_settings', 'headers',
    'bac_profils_acces', 'bac_sessions', 'bac_scenes', 'bac_roles', 'bac_themes',
    'bac_variants', 'bac_denouements', 'bac_revelations',
    'bac_saisies_acteurs', 'bac_choix_scenes', 'bac_casting_groupes'
  ];
BEGIN
  FOREACH t IN ARRAY locked LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Lecture seule pour le suivi en temps réel du coordinateur
CREATE POLICY "realtime_read_saisies" ON public.bac_saisies_acteurs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "realtime_read_choix" ON public.bac_choix_scenes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "realtime_read_casting" ON public.bac_casting_groupes FOR SELECT TO anon, authenticated USING (true);
