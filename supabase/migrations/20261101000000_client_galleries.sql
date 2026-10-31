-- ─────────────────────────────────────────────────────────────────────────
-- Galeries clients (livraison photo).
--
-- Les fichiers vivent sur Cloudflare R2 ; ces tables ne portent que les
-- métadonnées. Toutes les lectures et écritures passent par les routes
-- serveur (service role) : RLS activée, aucune policy pour anon/authenticated.
-- Voir docs/GALERIES-CLIENTS-2026.md.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists client_gallery_folders (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  event_date  date,
  created_at  timestamptz not null default now()
);

create table if not exists client_gallery_watermarks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  kind        text not null default 'text' check (kind in ('text','image')),
  text        text,
  image_data  text,                 -- PNG en data URL (logo, < 300 Ko)
  position    text not null default 'br' check (position in ('tl','tc','tr','cl','c','cr','bl','bc','br','tile')),
  scale       real not null default 0.18,   -- largeur relative à l'image
  opacity     real not null default 0.7,
  margin      real not null default 0.03,
  color       text not null default '#ffffff',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists client_gallery_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  is_default  boolean not null default false,
  settings    jsonb not null default '{}',
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists client_galleries (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  title              text not null,
  client_name        text,
  client_email       text,
  event_date         date,
  folder_id          uuid references client_gallery_folders(id) on delete set null,
  template_id        uuid references client_gallery_templates(id) on delete set null,
  tags               text[] not null default '{}',

  status             text not null default 'draft' check (status in ('draft','published')),
  access_mode        text not null default 'password' check (access_mode in ('password','link','public')),
  password_enc       text,
  access_version     int  not null default 1,
  magic_link_enabled boolean not null default true,
  email_gate         boolean not null default false,
  expires_at         timestamptz,

  watermark_id       uuid references client_gallery_watermarks(id) on delete set null,
  download           jsonb not null default '{"enabled":true,"sizes":["original","web"],"scopes":["photo","set","all","favorites"],"pin":false}',
  download_pin_enc   text,
  favorites          jsonb not null default '{"enabled":false,"limit":null}',
  design             jsonb not null default '{}',
  share_message      text,
  intro              text,             -- mot d'accueil affiché sous la couverture
  cover_photo_id     uuid,

  photo_count        int not null default 0,
  bytes_total        bigint not null default 0,   -- originaux
  stored_bytes       bigint not null default 0,   -- originaux + rendus (espace R2 réel)
  view_count         int not null default 0,
  download_count     int not null default 0,
  first_viewed_at    timestamptz,
  last_viewed_at     timestamptz,
  last_download_at   timestamptz,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  published_at       timestamptz,
  deleted_at         timestamptz
);
create index if not exists client_galleries_folder_idx on client_galleries(folder_id);
create index if not exists client_galleries_deleted_idx on client_galleries(deleted_at);

create table if not exists client_gallery_sets (
  id          uuid primary key default gen_random_uuid(),
  gallery_id  uuid not null references client_galleries(id) on delete cascade,
  name        text not null,
  position    int not null default 0
);
create index if not exists client_gallery_sets_gallery_idx on client_gallery_sets(gallery_id);

create table if not exists client_gallery_photos (
  id            uuid primary key default gen_random_uuid(),
  gallery_id    uuid not null references client_galleries(id) on delete cascade,
  set_id        uuid references client_gallery_sets(id) on delete set null,
  position      int not null default 0,
  kind          text not null default 'image' check (kind in ('image','video','file')),
  filename      text not null,
  ext          text not null default 'jpg',
  content_type  text not null default 'image/jpeg',
  width         int,
  height        int,
  bytes         bigint not null default 0,      -- original
  stored_bytes  bigint not null default 0,      -- original + rendus
  has_preview   boolean not null default true,  -- vignettes présentes (vidéo : image extraite)
  duration      real,                           -- secondes (vidéo)
  placeholder   text,               -- data URL ~16 px pour le flou de chargement
  has_web       boolean not null default true,   -- rendu 2560 px présent
  wm_key        text,               -- signature du filigrane incrusté dans les rendus *-wm
  hidden        boolean not null default false,
  ready         boolean not null default false,  -- tous les fichiers envoyés
  created_at    timestamptz not null default now()
);
create index if not exists client_gallery_photos_gallery_idx on client_gallery_photos(gallery_id, position);

create table if not exists client_gallery_visitors (
  id          uuid primary key default gen_random_uuid(),
  gallery_id  uuid not null references client_galleries(id) on delete cascade,
  name        text,
  email       text,
  created_at  timestamptz not null default now()
);
create index if not exists client_gallery_visitors_gallery_idx on client_gallery_visitors(gallery_id);

create table if not exists client_gallery_favorites (
  gallery_id  uuid not null references client_galleries(id) on delete cascade,
  visitor_id  uuid not null references client_gallery_visitors(id) on delete cascade,
  photo_id    uuid not null references client_gallery_photos(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (visitor_id, photo_id)
);
create index if not exists client_gallery_favorites_gallery_idx on client_gallery_favorites(gallery_id);

create table if not exists client_gallery_events (
  id          bigserial primary key,
  gallery_id  uuid not null references client_galleries(id) on delete cascade,
  type        text not null,        -- view | unlock | unlock_fail | download_photo | download_zip | favorite
  photo_id    uuid,
  visitor_id  uuid,
  ip_hash     text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists client_gallery_events_gallery_idx on client_gallery_events(gallery_id, created_at desc);
create index if not exists client_gallery_events_fail_idx on client_gallery_events(ip_hash, created_at) where type = 'unlock_fail';

-- Compteurs atomiques (évite le lire-puis-écrire depuis les routes)
create or replace function client_gallery_bump(p_id uuid, p_views int, p_downloads int)
returns void language sql security definer set search_path = public as $$
  update client_galleries set
    view_count       = view_count + p_views,
    download_count   = download_count + p_downloads,
    first_viewed_at  = case when p_views > 0 then coalesce(first_viewed_at, now()) else first_viewed_at end,
    last_viewed_at   = case when p_views > 0 then now() else last_viewed_at end,
    last_download_at = case when p_downloads > 0 then now() else last_download_at end
  where id = p_id;
$$;

-- Recalcule nombre de photos / poids total d'une galerie
create or replace function client_gallery_refresh_counts(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update client_galleries g set
    photo_count = (select count(*) from client_gallery_photos p where p.gallery_id = g.id and p.ready),
    bytes_total = (select coalesce(sum(bytes),0) from client_gallery_photos p where p.gallery_id = g.id and p.ready),
    stored_bytes = (select coalesce(sum(stored_bytes),0) from client_gallery_photos p where p.gallery_id = g.id),
    updated_at  = now()
  where g.id = p_id;
$$;

revoke all on function client_gallery_bump(uuid,int,int) from public, anon, authenticated;
revoke all on function client_gallery_refresh_counts(uuid) from public, anon, authenticated;
grant execute on function client_gallery_bump(uuid,int,int) to service_role;
grant execute on function client_gallery_refresh_counts(uuid) to service_role;

alter table client_gallery_folders     enable row level security;
alter table client_gallery_watermarks  enable row level security;
alter table client_gallery_templates   enable row level security;
alter table client_galleries           enable row level security;
alter table client_gallery_sets        enable row level security;
alter table client_gallery_photos      enable row level security;
alter table client_gallery_visitors    enable row level security;
alter table client_gallery_favorites   enable row level security;
alter table client_gallery_events      enable row level security;

-- ── Données de départ ──────────────────────────────────────────────────
insert into client_gallery_watermarks (name, kind, text, position, scale, opacity)
select 'Signature', 'text', '© Maxcellens', 'br', 0.2, 0.75
where not exists (select 1 from client_gallery_watermarks);

insert into client_gallery_watermarks (name, kind, text, position, scale, opacity)
select 'Mosaïque', 'text', '© Maxcellens', 'tile', 0.16, 0.22
where (select count(*) from client_gallery_watermarks) = 1;

insert into client_gallery_templates (name, description, is_default, position, settings)
select * from (values
  ('Portrait — livraison finale', 'Portraits retouchés, téléchargement HD photo par photo ou en ZIP.', true, 0,
   '{"access_mode":"password","magic_link_enabled":true,"email_gate":false,"expiry_months":6,"watermark":false,
     "download":{"enabled":true,"sizes":["original","web"],"scopes":["photo","all"],"pin":false},
     "favorites":{"enabled":false,"limit":null},
     "design":{"cover":"split","theme":"light","font":"serif","grid":"justified","gap":8}}'::jsonb),
  ('Corporate — livraison HD', 'Évènement d''entreprise : tout en haute définition.', false, 1,
   '{"access_mode":"password","magic_link_enabled":true,"email_gate":false,"expiry_months":6,"watermark":false,
     "download":{"enabled":true,"sizes":["original","web"],"scopes":["photo","set","all","favorites"],"pin":false},
     "favorites":{"enabled":true,"limit":null},
     "design":{"cover":"full","theme":"light","font":"serif","grid":"justified","gap":8}}'::jsonb),
  ('Évènement — soirée', 'Partage large aux invités, ambiance Nuit, web seulement.', false, 2,
   '{"access_mode":"link","magic_link_enabled":true,"email_gate":false,"expiry_months":3,"watermark":false,
     "download":{"enabled":true,"sizes":["web"],"scopes":["photo","set","all","favorites"],"pin":false},
     "favorites":{"enabled":true,"limit":null},
     "design":{"cover":"full","theme":"night","font":"serif","grid":"justified","gap":6}}'::jsonb),
  ('Épreuves — sélection client', 'Le client choisit ses photos ; pas de téléchargement, filigrane.', false, 3,
   '{"access_mode":"password","magic_link_enabled":true,"email_gate":true,"expiry_months":2,"watermark":true,
     "download":{"enabled":false,"sizes":["web"],"scopes":["photo"],"pin":false},
     "favorites":{"enabled":true,"limit":30},
     "design":{"cover":"center","theme":"sand","font":"serif","grid":"justified","gap":8}}'::jsonb)
) as t(name, description, is_default, position, settings)
where not exists (select 1 from client_gallery_templates);
