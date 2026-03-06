-- Ajout des colonnes de configuration min/max de scènes par session
alter table public.bac_sessions
  add column if not exists min_scenes integer,
  add column if not exists max_scenes integer;

