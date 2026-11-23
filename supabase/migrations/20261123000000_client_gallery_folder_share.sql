-- ─────────────────────────────────────────────────────────────────────────
-- Dossiers partageables : un lien (et un mot de passe facultatif) donne
-- accès à toutes les galeries publiées du dossier et de ses sous-dossiers,
-- avec un téléchargement groupé.
-- ─────────────────────────────────────────────────────────────────────────

alter table client_gallery_folders
  add column if not exists share_enabled        boolean not null default false,
  add column if not exists share_slug           text,
  add column if not exists share_password_enc   text,   -- null = lien seul, sans mot de passe
  add column if not exists share_access_version int not null default 1;

create unique index if not exists client_gallery_folders_share_slug_idx
  on client_gallery_folders(share_slug) where share_slug is not null;
