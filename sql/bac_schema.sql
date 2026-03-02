-- ============================================================
-- Bureau à la Carte — Schema complet
-- Toutes les tables préfixées bac_
-- ============================================================

-- 1. Profils d'accès
CREATE TABLE IF NOT EXISTS bac_profils_acces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('admin', 'technique', 'groupe-acteur')),
  couleur TEXT DEFAULT '#6366f1',
  mot_de_passe_hash TEXT,
  actif BOOLEAN DEFAULT true,
  ordre_affichage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert les profils fixes
INSERT INTO bac_profils_acces (slug, nom, type, couleur, actif, ordre_affichage)
VALUES
  ('technique', 'Équipe technique', 'technique', '#06b6d4', true, 2),
  ('managers', 'Managers', 'groupe-acteur', '#f59e0b', true, 10),
  ('assistants', 'Assistants', 'groupe-acteur', '#10b981', true, 11),
  ('chefs-de-projet', 'Chefs de projet', 'groupe-acteur', '#3b82f6', true, 12),
  ('directeurs', 'Directeurs', 'groupe-acteur', '#ef4444', true, 13)
ON CONFLICT (slug) DO NOTHING;

-- 2. Rôles
CREATE TABLE IF NOT EXISTS bac_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  groupe_slug TEXT NOT NULL REFERENCES bac_profils_acces(slug) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  description TEXT DEFAULT '',
  couleur TEXT DEFAULT '#6366f1',
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Variants
CREATE TABLE IF NOT EXISTS bac_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES bac_roles(id) ON DELETE CASCADE,
  lettre TEXT NOT NULL CHECK (lettre IN ('A', 'B', 'C')),
  nom TEXT NOT NULL,
  description TEXT DEFAULT '',
  emoji TEXT DEFAULT '🎭',
  UNIQUE(role_id, lettre)
);

-- 4. Thèmes
CREATE TABLE IF NOT EXISTS bac_themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  description TEXT DEFAULT '',
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Révélations
CREATE TABLE IF NOT EXISTS bac_revelations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  description TEXT DEFAULT '',
  delai_suggere TEXT DEFAULT '',
  note_interne TEXT DEFAULT '',
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Scènes
CREATE TABLE IF NOT EXISTS bac_scenes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  acte TEXT NOT NULL CHECK (acte IN ('1', '2', '3', '4', 'intro', 'final')),
  ton_principal TEXT DEFAULT '',
  ton_secondaire TEXT DEFAULT '',
  duree_min INTEGER DEFAULT 1,
  duree_max INTEGER DEFAULT 3,
  difficulte INTEGER DEFAULT 1 CHECK (difficulte BETWEEN 1 AND 3),
  groupes_concernes TEXT[] DEFAULT '{}',
  nb_intervenants_min INTEGER DEFAULT 1,
  nb_intervenants_max INTEGER DEFAULT 5,
  fil_rouge TEXT DEFAULT '',
  champ_perso_label TEXT,
  champ_perso_exemple TEXT,
  champ_perso_replique_cible INTEGER,
  script_json JSONB DEFAULT '[]'::jsonb,
  itw_json JSONB DEFAULT '[]'::jsonb,
  notes_real_json JSONB DEFAULT '{}'::jsonb,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bac_scenes_acte ON bac_scenes(acte);
CREATE INDEX IF NOT EXISTS idx_bac_scenes_actif ON bac_scenes(actif);

-- 7. Sessions
CREATE TABLE IF NOT EXISTS bac_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom_entreprise TEXT NOT NULL,
  date_jour_j DATE,
  lieu TEXT DEFAULT '',
  nb_participants INTEGER DEFAULT 10,
  theme_id UUID REFERENCES bac_themes(id),
  revelation_id UUID REFERENCES bac_revelations(id),
  groupes_actifs TEXT[] DEFAULT '{}',
  statut TEXT DEFAULT 'en-preparation' CHECK (statut IN ('en-preparation', 'en-cours', 'terminee', 'archivee')),
  snapshot_scenes_json JSONB DEFAULT '[]'::jsonb,
  documents_generes_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Casting groupes
CREATE TABLE IF NOT EXISTS bac_casting_groupes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES bac_sessions(id) ON DELETE CASCADE,
  groupe_slug TEXT NOT NULL,
  prenom TEXT NOT NULL,
  role_id UUID REFERENCES bac_roles(id),
  variant_id UUID REFERENCES bac_variants(id),
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bac_casting_session_groupe ON bac_casting_groupes(session_id, groupe_slug);

-- 9. Choix de scènes
CREATE TABLE IF NOT EXISTS bac_choix_scenes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES bac_sessions(id) ON DELETE CASCADE,
  groupe_slug TEXT NOT NULL,
  acte TEXT NOT NULL CHECK (acte IN ('1', '2', '3', '4')),
  scene_id UUID NOT NULL,
  statut TEXT DEFAULT 'choisi' CHECK (statut IN ('choisi', 'valide')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, groupe_slug, acte)
);

CREATE INDEX IF NOT EXISTS idx_bac_choix_session_groupe ON bac_choix_scenes(session_id, groupe_slug);

-- 10. Saisies acteurs
CREATE TABLE IF NOT EXISTS bac_saisies_acteurs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES bac_sessions(id) ON DELETE CASCADE,
  groupe_slug TEXT NOT NULL,
  scene_id UUID NOT NULL,
  bloc_index INTEGER NOT NULL,
  texte_saisi TEXT DEFAULT '',
  acteur_id UUID REFERENCES bac_casting_groupes(id),
  champ_perso_valeur TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, groupe_slug, scene_id, bloc_index)
);

CREATE INDEX IF NOT EXISTS idx_bac_saisies_composite ON bac_saisies_acteurs(session_id, groupe_slug, scene_id, bloc_index);

-- ============================================================
-- Activer Realtime sur les tables nécessaires
-- (idempotent — ignore si déjà ajoutées)
-- ============================================================
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE bac_casting_groupes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE bac_choix_scenes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE bac_saisies_acteurs; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE bac_profils_acces ENABLE ROW LEVEL SECURITY;
ALTER TABLE bac_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bac_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE bac_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bac_revelations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bac_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bac_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bac_casting_groupes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bac_choix_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bac_saisies_acteurs ENABLE ROW LEVEL SECURITY;

-- Service role a accès à tout (admin)
-- Pour les lectures publiques des tables de bibliothèque via anon key
CREATE POLICY "anon_read_profils" ON bac_profils_acces FOR SELECT USING (true);
CREATE POLICY "anon_read_roles" ON bac_roles FOR SELECT USING (true);
CREATE POLICY "anon_read_variants" ON bac_variants FOR SELECT USING (true);
CREATE POLICY "anon_read_themes" ON bac_themes FOR SELECT USING (true);
CREATE POLICY "anon_read_revelations" ON bac_revelations FOR SELECT USING (true);
CREATE POLICY "anon_read_scenes" ON bac_scenes FOR SELECT USING (true);
CREATE POLICY "anon_read_sessions" ON bac_sessions FOR SELECT USING (true);
CREATE POLICY "anon_read_casting" ON bac_casting_groupes FOR SELECT USING (true);
CREATE POLICY "anon_read_choix" ON bac_choix_scenes FOR SELECT USING (true);
CREATE POLICY "anon_read_saisies" ON bac_saisies_acteurs FOR SELECT USING (true);

-- Écriture sur les tables interactives (casting, choix, saisies) via anon
CREATE POLICY "anon_write_casting" ON bac_casting_groupes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_write_choix" ON bac_choix_scenes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_write_saisies" ON bac_saisies_acteurs FOR ALL USING (true) WITH CHECK (true);

-- Note: La sécurité inter-groupe est gérée côté application via les cookies de session
-- et les API routes qui vérifient le profil connecté avant d'exposer les données.
