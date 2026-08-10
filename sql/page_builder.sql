-- ============================================================
-- Page builder — pages et blocs pilotés depuis l'administration
--
-- Les pages historiques (accueil, contact, portrait…) restent câblées dans
-- app/ ; ces tables portent les pages créées depuis l'admin, servies par la
-- route attrape-tout app/[...slug]/page.tsx.
-- ============================================================

CREATE TABLE IF NOT EXISTS site_pages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- UNIQUE porte sur toutes les lignes, corbeille comprise. Une page
  -- supprimée voit donc son slug réécrit en « __trash/<horodatage>/<slug> »
  -- par la route DELETE, ce qui libère l'adresse d'origine tout en gardant la
  -- page récupérable.
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  position     INTEGER NOT NULL DEFAULT 0,
  show_in_menu BOOLEAN NOT NULL DEFAULT false,
  header       JSONB,
  seo          JSONB,
  -- Corbeille : une page supprimée reste récupérable 30 jours
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS page_blocks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id    UUID NOT NULL REFERENCES site_pages(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  visible    BOOLEAN NOT NULL DEFAULT true,
  width_mode TEXT NOT NULL DEFAULT 'full' CHECK (width_mode IN ('full', 'max1600')),
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lecture des blocs d'une page dans l'ordre : index couvrant
CREATE INDEX IF NOT EXISTS page_blocks_page_position_idx
  ON page_blocks (page_id, position);

-- Résolution d'une page par son slug (route attrape-tout) : seules les pages
-- non supprimées sont concernées.
CREATE INDEX IF NOT EXISTS site_pages_slug_idx
  ON site_pages (slug) WHERE deleted_at IS NULL;

-- ── updated_at automatique ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS site_pages_updated_at ON site_pages;
CREATE TRIGGER site_pages_updated_at
  BEFORE UPDATE ON site_pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS page_blocks_updated_at ON page_blocks;
CREATE TRIGGER page_blocks_updated_at
  BEFORE UPDATE ON page_blocks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────
-- Lecture publique limitée aux pages publiées et non supprimées.
-- Toute écriture passe par les routes /api/pages/*, qui utilisent la clé de
-- service (laquelle contourne RLS) après vérification de la session admin.
ALTER TABLE site_pages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_pages_public_read ON site_pages;
CREATE POLICY site_pages_public_read ON site_pages
  FOR SELECT USING (status = 'published' AND deleted_at IS NULL);

DROP POLICY IF EXISTS page_blocks_public_read ON page_blocks;
CREATE POLICY page_blocks_public_read ON page_blocks
  FOR SELECT USING (
    visible = true
    AND EXISTS (
      SELECT 1 FROM site_pages p
      WHERE p.id = page_blocks.page_id
        AND p.status = 'published'
        AND p.deleted_at IS NULL
    )
  );

-- ── Purge de la corbeille ───────────────────────────────────────────────
-- À appeler depuis Maintenance, ou via un cron Supabase.
CREATE OR REPLACE FUNCTION purge_deleted_pages(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  removed INTEGER;
BEGIN
  WITH gone AS (
    DELETE FROM site_pages
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - (retention_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT count(*) INTO removed FROM gone;
  RETURN removed;
END;
$$ LANGUAGE plpgsql;
