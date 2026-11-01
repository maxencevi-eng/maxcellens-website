-- Mode « review » des galeries clients : commentaires horodatés sur les
-- vidéos, réponses de Maxcellens, et validation de review par le client
-- (qui déclenche l'e-mail de notification).

alter table client_galleries
  add column if not exists review jsonb not null default '{"enabled":false}';

create table if not exists client_gallery_comments (
  id           uuid primary key default gen_random_uuid(),
  gallery_id   uuid not null references client_galleries(id) on delete cascade,
  photo_id     uuid not null references client_gallery_photos(id) on delete cascade,
  visitor_id   uuid references client_gallery_visitors(id) on delete set null,
  author_role  text not null default 'client' check (author_role in ('client','admin')),
  author_name  text,
  body         text not null,
  timecode     real,                -- secondes ; null = commentaire général
  parent_id    uuid references client_gallery_comments(id) on delete cascade,
  resolved     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists client_gallery_comments_photo_idx on client_gallery_comments(photo_id, created_at);
create index if not exists client_gallery_comments_gallery_idx on client_gallery_comments(gallery_id);

-- « J'ai terminé ma review » : une ligne par validation
create table if not exists client_gallery_review_submissions (
  id             uuid primary key default gen_random_uuid(),
  gallery_id     uuid not null references client_galleries(id) on delete cascade,
  photo_id       uuid not null references client_gallery_photos(id) on delete cascade,
  visitor_id     uuid references client_gallery_visitors(id) on delete set null,
  message        text,
  comment_count  int not null default 0,
  notified       boolean not null default false,
  seen_at        timestamptz,       -- consultée par Maxcellens dans l'admin
  created_at     timestamptz not null default now()
);
create index if not exists client_gallery_review_submissions_gallery_idx on client_gallery_review_submissions(gallery_id, created_at desc);

alter table client_gallery_comments            enable row level security;
alter table client_gallery_review_submissions  enable row level security;
