-- =============================================================================
-- Seed SEO — Maxcellens : Vidéaste (80% de l'activité) et Photographe, indépendant
-- Remplace ou complète les lignes page_seo_settings pour toutes les pages.
-- URL utilisée : https://maxcellens.vercel.app (à remplacer si autre domaine)
-- =============================================================================

INSERT INTO public.page_seo_settings (
  page_slug, meta_title, meta_description, h1, canonical_url,
  robots_index, robots_follow, og_title, og_description, og_image_path,
  og_type, og_site_name, twitter_card, twitter_title, twitter_description, twitter_image_path, json_ld
) VALUES
-- -----------------------------------------------------------------------------
-- Accueil
-- -----------------------------------------------------------------------------
(
  'home',
  'Maxcellens | Vidéaste & Photographe indépendant — Portrait, Événement, Corporate',
  'Vidéaste (80% de l''activité) et photographe indépendant. Portrait, événementiel, corporate et réalisation vidéo. Paris, Île-de-France et France. Missions sur mesure.',
  'Maxcellens',
  'https://maxcellens.vercel.app/',
  true,
  true,
  'Maxcellens | Vidéaste & Photographe indépendant — Portrait, Événement, Corporate',
  'Vidéaste et photographe indépendant. Portrait, événementiel, corporate et réalisation vidéo. Paris et France.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Maxcellens | Vidéaste & Photographe indépendant',
  'Vidéaste et photographe indépendant. Portrait, événementiel, corporate et réalisation vidéo.',
  NULL,
  '{"@context":"https://schema.org","@graph":[{"@type":"Organization","@id":"https://maxcellens.vercel.app/#organization","name":"Maxcellens","url":"https://maxcellens.vercel.app","description":"Vidéaste (80% de l''activité) et photographe indépendant. Portrait, événementiel, corporate et réalisation vidéo. Paris et France."},{"@type":"WebSite","@id":"https://maxcellens.vercel.app/#website","name":"Maxcellens","url":"https://maxcellens.vercel.app","description":"Vidéaste et photographe indépendant — portrait, événement, corporate, réalisation. Paris et France.","publisher":{"@id":"https://maxcellens.vercel.app/#organization"},"inLanguage":"fr-FR"}]}'
),
-- -----------------------------------------------------------------------------
-- Contact
-- -----------------------------------------------------------------------------
(
  'contact',
  'Contact | Maxcellens — Vidéaste & Photographe indépendant',
  'Contactez Maxcellens pour vos projets vidéo et photo : portrait, événement, corporate. Vidéaste et photographe indépendant. Basé en Île-de-France, interventions partout en France.',
  'Contact',
  'https://maxcellens.vercel.app/contact',
  true,
  true,
  'Contact | Maxcellens — Vidéaste & Photographe indépendant',
  'Contactez Maxcellens pour vos projets vidéo et photo. Vidéaste et photographe indépendant. Île-de-France et France.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Contact | Maxcellens',
  'Contactez Maxcellens pour vos projets vidéo et photo. Indépendant, Île-de-France et France.',
  NULL,
  NULL
),
-- -----------------------------------------------------------------------------
-- Animation (vidéo uniquement : ateliers, formation, animation de groupes)
-- -----------------------------------------------------------------------------
(
  'animation',
  'Animation & Formation vidéo | Maxcellens — Vidéaste & Photographe',
  'Ateliers et formations vidéo par Maxcellens : animation de groupes, team building, formation. Vidéaste indépendant. Sur mesure pour entreprises et particuliers.',
  'Animation & Formation',
  'https://maxcellens.vercel.app/animation',
  true,
  true,
  'Animation & Formation vidéo | Maxcellens — Vidéaste & Photographe',
  'Ateliers et formations vidéo. Animation de groupes et team building. Vidéaste indépendant.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Animation & Formation vidéo | Maxcellens',
  'Ateliers et formations vidéo. Animation et team building.',
  NULL,
  NULL
),
-- -----------------------------------------------------------------------------
-- Réalisation
-- -----------------------------------------------------------------------------
(
  'realisation',
  'Réalisation vidéo & photo | Maxcellens — Vidéaste & Photographe indépendant',
  'Réalisation de reportages vidéo et photo sur mesure : corporate, événementiel, portrait. Vidéaste (80% de l''activité) et photographe indépendant. Île-de-France et France.',
  'Réalisation',
  'https://maxcellens.vercel.app/realisation',
  true,
  true,
  'Réalisation vidéo & photo | Maxcellens — Vidéaste & Photographe indépendant',
  'Reportages vidéo et photo sur mesure : corporate, événementiel, portrait. Vidéaste et photographe indépendant.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Réalisation | Maxcellens',
  'Reportages vidéo et photo sur mesure. Vidéaste et photographe indépendant.',
  NULL,
  NULL
),
-- -----------------------------------------------------------------------------
-- Événement (vidéo & photo : séminaires, soirées, conférences, salons pro — pas mariages/naissances)
-- -----------------------------------------------------------------------------
(
  'evenement',
  'Vidéaste & Photographe Événementiel | Maxcellens — Séminaires, soirées, conférences',
  'Captation vidéo et photo d''événements : séminaires, soirées, conférences, salons professionnels. Vidéaste et photographe indépendant. Paris, Île-de-France et France. Reportages vivants et discrets.',
  'Événement',
  'https://maxcellens.vercel.app/evenement',
  true,
  true,
  'Vidéaste & Photographe Événementiel | Maxcellens — Séminaires, soirées, conférences',
  'Captation vidéo et photo d''événements : séminaires, soirées, conférences. Vidéaste et photographe indépendant.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Vidéaste & Photographe Événementiel | Maxcellens',
  'Séminaires, soirées, conférences. Vidéo et photo.',
  NULL,
  NULL
),
-- -----------------------------------------------------------------------------
-- Corporate
-- -----------------------------------------------------------------------------
(
  'corporate',
  'Vidéaste & Photographe Corporate | Maxcellens — Communication et entreprise',
  'Vidéaste et photographe corporate pour entreprises : portraits, équipes, locaux, reportages vidéo et photo. Image de marque professionnelle. Indépendant, Île-de-France et France.',
  'Corporate',
  'https://maxcellens.vercel.app/corporate',
  true,
  true,
  'Vidéaste & Photographe Corporate | Maxcellens — Communication et entreprise',
  'Vidéaste et photographe corporate : portraits, équipes, reportages vidéo et photo. Image de marque professionnelle.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Vidéaste & Photographe Corporate | Maxcellens',
  'Portraits, équipes, reportages vidéo et photo. Image de marque professionnelle.',
  NULL,
  NULL
),
-- -----------------------------------------------------------------------------
-- Portrait (photo uniquement — pas de vidéo)
-- -----------------------------------------------------------------------------
(
  'portrait',
  'Photographe Portrait | Maxcellens — Portraits professionnels et personnels',
  'Séances portrait photo à Paris et Île-de-France : portraits professionnels, personnels, headshots. Photographe indépendant. Cadre naturel ou studio.',
  'Portrait',
  'https://maxcellens.vercel.app/portrait',
  true,
  true,
  'Photographe Portrait | Maxcellens — Portraits professionnels et personnels',
  'Séances portrait photo : professionnels, personnels, headshots. Photographe indépendant. Paris et Île-de-France.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Photographe Portrait | Maxcellens',
  'Portraits professionnels et personnels. Paris et Île-de-France.',
  NULL,
  NULL
),
-- -----------------------------------------------------------------------------
-- Galeries
-- -----------------------------------------------------------------------------
(
  'galeries',
  'Galeries vidéo & photo | Maxcellens — Vidéaste & Photographe indépendant',
  'Découvrez les galeries Maxcellens : vidéo et photo — portrait, événementiel, corporate et réalisation. Aperçu du travail d''un vidéaste et photographe indépendant.',
  'Galeries',
  'https://maxcellens.vercel.app/galeries',
  true,
  true,
  'Galeries vidéo & photo | Maxcellens — Vidéaste & Photographe indépendant',
  'Galeries : portrait, événementiel, corporate et réalisation. Vidéo et photo. Vidéaste et photographe indépendant.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Galeries vidéo & photo | Maxcellens',
  'Portrait, événementiel, corporate et réalisation. Vidéo et photo.',
  NULL,
  NULL
),
-- -----------------------------------------------------------------------------
-- Services
-- -----------------------------------------------------------------------------
(
  'services',
  'Services vidéo & photo | Maxcellens — Vidéaste & Photographe indépendant',
  'Services de vidéaste et photographe indépendant : portrait, événement, corporate, réalisation et animation. Devis et projets sur mesure. Paris, Île-de-France et France.',
  'Services',
  'https://maxcellens.vercel.app/services',
  true,
  true,
  'Services vidéo & photo | Maxcellens — Vidéaste & Photographe indépendant',
  'Services : portrait, événement, corporate, réalisation et animation. Vidéaste et photographe indépendant. Devis sur mesure.',
  NULL,
  'website',
  'Maxcellens',
  'summary_large_image',
  'Services vidéo & photo | Maxcellens',
  'Portrait, événement, corporate, réalisation et animation. Devis sur mesure.',
  NULL,
  NULL
),
-- -----------------------------------------------------------------------------
-- Admin (noindex)
-- -----------------------------------------------------------------------------
(
  'admin',
  'Administration | Maxcellens',
  'Espace d''administration du site Maxcellens.',
  'Administration',
  'https://maxcellens.vercel.app/admin',
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
