-- Dossiers de galeries clients : sous-dossiers et ordre d'affichage.
--
-- parent_id : dossier parent (null = racine). La suppression d'un dossier est
--             gérée par l'API, qui remonte son contenu d'un niveau ; la
--             contrainte « set null » n'est qu'un filet de sécurité.
-- position  : ordre parmi les dossiers du même parent.

alter table client_gallery_folders
  add column if not exists parent_id uuid references client_gallery_folders(id) on delete set null,
  add column if not exists position int not null default 0;

create index if not exists client_gallery_folders_parent_idx on client_gallery_folders(parent_id, position);

-- Ordre initial : celui de création
update client_gallery_folders f
set position = sub.rn
from (select id, row_number() over (order by created_at) - 1 as rn from client_gallery_folders) sub
where f.id = sub.id and f.position = 0;
