-- SEO entry for the /view page (Linktree-style showcase page)
INSERT INTO page_seo_settings (
  page_slug,
  meta_title,
  meta_description,
  robots_index,
  robots_follow
)
VALUES (
  'view',
  'View',
  'Ma vitrine digitale',
  true,
  true
)
ON CONFLICT (page_slug) DO NOTHING;
