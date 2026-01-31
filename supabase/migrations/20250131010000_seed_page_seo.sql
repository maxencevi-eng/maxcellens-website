-- =============================================================================
-- Seed SEO par défaut pour toutes les pages (pré-remplissage).
-- Accueil (home): INSERT ON CONFLICT DO NOTHING → ne remplace pas si déjà rempli.
-- Autres pages: INSERT ON CONFLICT DO UPDATE → mise à jour ou insertion.
-- =============================================================================

-- Accueil : insérer seulement si pas encore de ligne (préserve votre saisie)
INSERT INTO public.page_seo_settings (
  page_slug, meta_title, meta_description, h1, canonical_url,
  robots_index, robots_follow, og_title, og_description, og_image_path,
  og_type, og_site_name, twitter_card, twitter_title, twitter_description, twitter_image_path, json_ld
) VALUES (
  'home',
  'Maxcellens | Photographe professionnel — Portrait, Événement, Corporate',
  'Photographe professionnel à Paris et en Île-de-France. Portrait, événementiel, corporate et réalisation. Missions en France et à l''étranger.',
  'Maxcellens',
  NULL, true, true,
  'Maxcellens | Photographe professionnel — Portrait, Événement, Corporate',
  'Photographe professionnel à Paris et en Île-de-France. Portrait, événementiel, corporate et réalisation.',
  NULL, 'website', 'Maxcellens', 'summary_large_image',
  'Maxcellens | Photographe professionnel',
  'Photographe professionnel à Paris et en Île-de-France. Portrait, événementiel, corporate et réalisation.',
  NULL, NULL
)
ON CONFLICT (page_slug) DO NOTHING;

-- Autres pages : upsert (remplissage ou mise à jour)
INSERT INTO public.page_seo_settings (
  page_slug,
  meta_title,
  meta_description,
  h1,
  canonical_url,
  robots_index,
  robots_follow,
  og_title,
  og_description,
  og_image_path,
  og_type,
  og_site_name,
  twitter_card,
  twitter_title,
  twitter_description,
  twitter_image_path,
  json_ld
) VALUES
-- Contact
(
  'contact',
  'Contact | Maxcellens — Photographe professionnel',
  'Contactez Maxcellens pour vos projets photo : portrait, événement, corporate. Basé à Clamart (92), interventions en Île-de-France et partout en France.',
  'Contact',
  NULL,
  true,
  true,
  'Contact | Maxcellens — Photographe professionnel',
  'Contactez Maxcellens pour vos projets photo : portrait, événement, corporate. Basé à Clamart (92).',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Contact | Maxcellens',
  'Contactez Maxcellens pour vos projets photo. Basé à Clamart (92).',
  NULL,
  NULL
),
-- Animation
(
  'animation',
  'Animation & Formation photo | Maxcellens',
  'Ateliers et formations photo par Maxcellens : apprendre la photo, animation de groupes et team building. Sur mesure pour entreprises et particuliers.',
  'Animation & Formation',
  NULL,
  true,
  true,
  'Animation & Formation photo | Maxcellens',
  'Ateliers et formations photo. Animation de groupes et team building. Sur mesure pour entreprises et particuliers.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Animation & Formation photo | Maxcellens',
  'Ateliers et formations photo. Animation de groupes et team building.',
  NULL,
  NULL
),
-- Réalisation
(
  'realisation',
  'Réalisation | Maxcellens — Reportages et projets photo',
  'Réalisation de reportages photo et projets sur mesure : corporate, événementiel, portrait. Photographe professionnel en Île-de-France et en France.',
  'Réalisation',
  NULL,
  true,
  true,
  'Réalisation | Maxcellens — Reportages et projets photo',
  'Réalisation de reportages photo et projets sur mesure : corporate, événementiel, portrait.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Réalisation | Maxcellens',
  'Réalisation de reportages photo et projets sur mesure.',
  NULL,
  NULL
),
-- Événement
(
  'evenement',
  'Photographe Événementiel | Maxcellens — Mariages, séminaires, soirées',
  'Photographe d''événements à Paris et en France : mariages, séminaires, soirées, conférences. Reportages vivants et discrétion professionnelle.',
  'Événement',
  NULL,
  true,
  true,
  'Photographe Événementiel | Maxcellens — Mariages, séminaires, soirées',
  'Photographe d''événements : mariages, séminaires, soirées, conférences. Paris et France.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Photographe Événementiel | Maxcellens',
  'Mariages, séminaires, soirées, conférences. Paris et France.',
  NULL,
  NULL
),
-- Corporate
(
  'corporate',
  'Photographe Corporate | Maxcellens — Communication et entreprise',
  'Photographe corporate pour entreprises : portraits, équipes, locaux, reportages. Renforcez votre image de marque avec des visuels professionnels.',
  'Corporate',
  NULL,
  true,
  true,
  'Photographe Corporate | Maxcellens — Communication et entreprise',
  'Photographe corporate : portraits, équipes, locaux, reportages. Image de marque professionnelle.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Photographe Corporate | Maxcellens',
  'Portraits, équipes, locaux, reportages. Image de marque professionnelle.',
  NULL,
  NULL
),
-- Portrait
(
  'portrait',
  'Photographe Portrait | Maxcellens — Portraits professionnels et personnels',
  'Séances portrait à Paris et en Île-de-France : portraits professionnels, personnels, headshots. Cadre naturel ou studio selon votre projet.',
  'Portrait',
  NULL,
  true,
  true,
  'Photographe Portrait | Maxcellens — Portraits professionnels et personnels',
  'Séances portrait : professionnels, personnels, headshots. Paris et Île-de-France.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Photographe Portrait | Maxcellens',
  'Portraits professionnels et personnels. Paris et Île-de-France.',
  NULL,
  NULL
),
-- Galeries
(
  'galeries',
  'Galeries photo | Maxcellens — Portrait, Événement, Corporate',
  'Découvrez les galeries photo Maxcellens : portrait, événementiel, corporate et réalisation. Aperçu du travail et des univers photographiques.',
  'Galeries',
  NULL,
  true,
  true,
  'Galeries photo | Maxcellens — Portrait, Événement, Corporate',
  'Galeries : portrait, événementiel, corporate et réalisation. Aperçu des univers photographiques.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Galeries photo | Maxcellens',
  'Portrait, événementiel, corporate et réalisation.',
  NULL,
  NULL
),
-- Services
(
  'services',
  'Services photo | Maxcellens — Portrait, Événement, Corporate, Réalisation',
  'Services de photographie professionnelle : portrait, événement, corporate, réalisation et animation. Devis et projets sur mesure.',
  'Services',
  NULL,
  true,
  true,
  'Services photo | Maxcellens — Portrait, Événement, Corporate',
  'Services : portrait, événement, corporate, réalisation et animation. Devis sur mesure.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Services photo | Maxcellens',
  'Portrait, événement, corporate, réalisation et animation.',
  NULL,
  NULL
),
-- Admin (noindex pour ne pas indexer l’interface d’administration)
(
  'admin',
  'Administration | Maxcellens',
  'Espace d''administration du site Maxcellens.',
  'Administration',
  NULL,
  false,
  true,
  'Administration | Maxcellens',
  'Espace d''administration du site Maxcellens.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Administration | Maxcellens',
  'Espace d''administration.',
  NULL,
  NULL
)
ON CONFLICT (page_slug) DO UPDATE SET
  meta_title         = EXCLUDED.meta_title,
  meta_description   = EXCLUDED.meta_description,
  h1                 = EXCLUDED.h1,
  canonical_url      = EXCLUDED.canonical_url,
  robots_index       = EXCLUDED.robots_index,
  robots_follow      = EXCLUDED.robots_follow,
  og_title           = EXCLUDED.og_title,
  og_description     = EXCLUDED.og_description,
  og_image_path      = EXCLUDED.og_image_path,
  og_type            = EXCLUDED.og_type,
  og_site_name       = EXCLUDED.og_site_name,
  twitter_card       = EXCLUDED.twitter_card,
  twitter_title      = EXCLUDED.twitter_title,
  twitter_description = EXCLUDED.twitter_description,
  twitter_image_path = EXCLUDED.twitter_image_path,
  json_ld            = EXCLUDED.json_ld,
  updated_at         = now();
