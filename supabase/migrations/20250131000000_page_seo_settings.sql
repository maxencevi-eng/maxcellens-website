-- =============================================================================
-- Table: page_seo_settings
-- Usage: stockage des métadonnées SEO par page (éditées via SEO Command Center).
-- Crawlabilité: ces données sont lues côté serveur (generateMetadata) pour
-- peupler <head> avant envoi au client — aucun fetch client pour le SEO.
-- =============================================================================

-- Table principale
CREATE TABLE IF NOT EXISTS public.page_seo_settings (
  page_slug          text PRIMARY KEY,
  -- Basic
  meta_title         text,
  meta_description   text,
  h1                 text,
  -- Technique
  canonical_url      text,
  robots_index       boolean DEFAULT true,
  robots_follow      boolean DEFAULT true,
  -- Open Graph (Facebook, LinkedIn)
  og_title           text,
  og_description     text,
  og_image_path      text,
  og_type            text DEFAULT 'website',
  og_site_name       text,
  -- Twitter
  twitter_card       text DEFAULT 'summary_large_image',
  twitter_title      text,
  twitter_description text,
  twitter_image_path text,
  -- Structured Data (JSON-LD)
  json_ld            text,
  -- Audit
  updated_at         timestamptz DEFAULT now()
);

-- Index pour les listes admin (optionnel)
CREATE INDEX IF NOT EXISTS idx_page_seo_settings_updated_at
  ON public.page_seo_settings (updated_at DESC);

-- RLS: lecture publique (pour le serveur qui génère les métadonnées),
-- écriture réservée au service role (API admin).
ALTER TABLE public.page_seo_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for page_seo_settings"
  ON public.page_seo_settings FOR SELECT
  USING (true);

CREATE POLICY "Allow service role full access to page_seo_settings"
  ON public.page_seo_settings FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_page_seo_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS page_seo_settings_updated_at ON public.page_seo_settings;
CREATE TRIGGER page_seo_settings_updated_at
  BEFORE UPDATE ON public.page_seo_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_page_seo_updated_at();

-- =============================================================================
-- Bucket Storage: seo-assets
-- Créer le bucket depuis le dashboard Supabase (Storage > New bucket > seo-assets, public).
-- Ou via SQL (si votre projet a l’extension storage) :
-- INSERT INTO storage.buckets (id, name, public) VALUES ('seo-assets', 'seo-assets', true)
-- ON CONFLICT (id) DO NOTHING;
-- Politique: lecture publique pour les images OG/Twitter, écriture via service role.
-- =============================================================================

COMMENT ON TABLE public.page_seo_settings IS 'Métadonnées SEO par page (title, description, OG, Twitter, JSON-LD). Rempli par le SEO Command Center.';
