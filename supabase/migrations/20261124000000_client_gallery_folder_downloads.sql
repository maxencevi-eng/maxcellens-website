-- Les téléchargements globaux depuis un dossier partagé (événements download_zip
-- avec meta.scope = 'folder') ne comptent plus dans les compteurs des galeries.
-- Rattrapage des compteurs déjà gonflés : on retire ces téléchargements de
-- download_count et on recalcule last_download_at sans eux.
-- À n'exécuter qu'une seule fois (la soustraction n'est pas idempotente).

update client_galleries g set
  download_count = greatest(0, g.download_count - f.n),
  last_download_at = (
    select max(e.created_at)
    from client_gallery_events e
    where e.gallery_id = g.id
      and e.type in ('download_photo', 'download_zip')
      and coalesce(e.meta->>'scope', '') <> 'folder'
  )
from (
  select gallery_id, count(*)::int as n
  from client_gallery_events
  where type = 'download_zip' and meta->>'scope' = 'folder'
  group by gallery_id
) f
where f.gallery_id = g.id;
