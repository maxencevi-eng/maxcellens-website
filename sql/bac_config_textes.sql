-- ============================================================
-- Bureau à la Carte — Table de configuration des textes éditables
-- Utilisée pour stocker les overrides de textes statiques
-- (bonnes pratiques et déroulé de l'animation)
-- ============================================================

CREATE TABLE IF NOT EXISTS bac_config_textes (
  cle  TEXT PRIMARY KEY,          -- ex: 'deroule.etapes', 'pratiques.roles'
  valeur TEXT NOT NULL,           -- JSON stringifié
  updated_at TIMESTAMPTZ DEFAULT now()
);
