-- Met à jour la contrainte de clé étrangère sur bac_roles.groupe_slug
-- pour autoriser le renommage de bac_profils_acces.slug avec ON UPDATE CASCADE.

ALTER TABLE public.bac_roles
  DROP CONSTRAINT IF EXISTS bac_roles_groupe_slug_fkey;

ALTER TABLE public.bac_roles
  ADD CONSTRAINT bac_roles_groupe_slug_fkey
  FOREIGN KEY (groupe_slug)
  REFERENCES public.bac_profils_acces(slug)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

