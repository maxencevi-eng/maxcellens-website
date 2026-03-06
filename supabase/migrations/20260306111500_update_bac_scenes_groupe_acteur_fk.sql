-- Met à jour la contrainte de clé étrangère sur bac_scenes.groupe_acteur
-- pour autoriser le renommage de bac_profils_acces.slug avec ON UPDATE CASCADE.

ALTER TABLE public.bac_scenes
  DROP CONSTRAINT IF EXISTS bac_scenes_groupe_acteur_fkey;

ALTER TABLE public.bac_scenes
  ADD CONSTRAINT bac_scenes_groupe_acteur_fkey
  FOREIGN KEY (groupe_acteur)
  REFERENCES public.bac_profils_acces(slug)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

