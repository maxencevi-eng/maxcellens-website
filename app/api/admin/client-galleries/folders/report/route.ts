import { NextResponse } from 'next/server';
import { db, guardAdmin, jsonError } from '@/lib/clientGalleries/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/client-galleries/folders/report?folder=<id>&sub=1
 *
 * Bilan d'un dossier : pour chaque galerie (sous-dossiers compris si sub=1),
 * ce qui a été téléchargé, par qui, et ce qui reste à faire. Les visites
 * viennent des compteurs de la galerie ; le reste est recalculé depuis le
 * journal, sur toute la durée de vie des galeries.
 *
 * Toutes les lectures sont paginées : avec des dizaines de galeries, le
 * journal dépasse vite la limite de 1 000 lignes par requête de Supabase.
 */

/** Même forme que `ReportRow` dans components/admin/ClientGalleries/FolderReport.tsx. */
type FolderReportRow = {
  /** Éléments téléchargeables (prêts et non masqués). */
  total: number;
  /** Éléments distincts téléchargés au moins une fois (unitaire ou ZIP). */
  downloaded: number;
  /** Au moins un ZIP « tout » a été récupéré. */
  zipAll: boolean;
  photoDownloads: number;
  zipDownloads: number;
  hd: number;
  web: number;
  lastDownloadAt: string | null;
  /** Photos distinctes mises en favori. */
  favorites: number;
  /** Visiteurs identifiés (nom ou e-mail laissé à l'entrée). */
  visitors: { name: string | null; email: string | null }[];
  /** Personnes distinctes ayant téléchargé (visiteurs identifiés). */
  downloaders: number;
  reviewsSubmitted: number;
  reviewsUnseen: number;
  comments: number;
};

const PAGE = 1000;
const CHUNK = 80;

function chunks<T>(arr: T[], n = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/** Lit toutes les lignes d'une requête, page par page, par paquets d'ids de galeries. */
async function fetchAll<T = any>(ids: string[], build: (ids: string[]) => any, optional = false): Promise<T[]> {
  const out: T[] = [];
  for (const part of chunks(ids)) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await build(part).range(from, from + PAGE - 1);
      if (error) {
        // Tables des reviews : absentes tant que la migration n'est pas passée
        if (optional) return out;
        throw new Error(error.message);
      }
      out.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }
  }
  return out;
}

export async function GET(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const folderId = url.searchParams.get('folder');
  const withSub = url.searchParams.get('sub') !== '0';
  if (!folderId) return jsonError('Dossier manquant');

  // Arborescence : le dossier et, au besoin, tous ses descendants
  const { data: folders, error: fErr } = await db.from('client_gallery_folders').select('id, parent_id');
  if (fErr) return jsonError(fErr.message, 500);
  const tree = new Set<string>([folderId]);
  if (withSub) {
    let grew = true;
    while (grew) {
      grew = false;
      for (const f of (folders || []) as { id: string; parent_id: string | null }[]) {
        if (f.parent_id && tree.has(f.parent_id) && !tree.has(f.id)) {
          tree.add(f.id);
          grew = true;
        }
      }
    }
  }

  const { data: gals, error: gErr } = await db
    .from('client_galleries')
    .select('id')
    .in('folder_id', Array.from(tree))
    .is('deleted_at', null);
  if (gErr) return jsonError(gErr.message, 500);
  const ids = (gals || []).map((g: any) => g.id as string);
  if (!ids.length) return NextResponse.json({ rows: {} });

  try {
    const [photos, downloads, favorites, visitors, submissions, comments] = await Promise.all([
      fetchAll<{ id: string; gallery_id: string; set_id: string | null }>(ids, (p) =>
        db.from('client_gallery_photos').select('id, gallery_id, set_id').in('gallery_id', p).eq('ready', true).eq('hidden', false).order('id')
      ),
      fetchAll<{ id: number; gallery_id: string; type: string; photo_id: string | null; visitor_id: string | null; meta: any; created_at: string }>(ids, (p) =>
        db
          .from('client_gallery_events')
          .select('id, gallery_id, type, photo_id, visitor_id, meta, created_at')
          .in('gallery_id', p)
          .in('type', ['download_photo', 'download_zip'])
          .order('id')
      ),
      fetchAll<{ gallery_id: string; visitor_id: string; photo_id: string }>(ids, (p) =>
        db.from('client_gallery_favorites').select('gallery_id, visitor_id, photo_id').in('gallery_id', p).order('visitor_id').order('photo_id')
      ),
      fetchAll<{ id: string; gallery_id: string; name: string | null; email: string | null }>(ids, (p) =>
        db.from('client_gallery_visitors').select('id, gallery_id, name, email').in('gallery_id', p).order('created_at').order('id')
      ),
      fetchAll<{ gallery_id: string; seen_at: string | null }>(
        ids,
        (p) => db.from('client_gallery_review_submissions').select('gallery_id, seen_at').in('gallery_id', p).order('id'),
        true
      ),
      fetchAll<{ gallery_id: string }>(
        ids,
        (p) => db.from('client_gallery_comments').select('gallery_id').in('gallery_id', p).eq('author_role', 'client').order('id'),
        true
      ),
    ]);

    const rows: Record<string, FolderReportRow> = {};
    for (const id of ids) {
      rows[id] = {
        total: 0,
        downloaded: 0,
        zipAll: false,
        photoDownloads: 0,
        zipDownloads: 0,
        hd: 0,
        web: 0,
        lastDownloadAt: null,
        favorites: 0,
        visitors: [],
        downloaders: 0,
        reviewsSubmitted: 0,
        reviewsUnseen: 0,
        comments: 0,
      };
    }

    // Éléments par galerie et par section (setId null = photos hors section)
    const photosOf = new Map<string, string[]>();
    const photosOfSet = new Map<string, string[]>();
    for (const p of photos) {
      rows[p.gallery_id].total++;
      (photosOf.get(p.gallery_id) || photosOf.set(p.gallery_id, []).get(p.gallery_id)!).push(p.id);
      const k = `${p.gallery_id}:${p.set_id || ''}`;
      (photosOfSet.get(k) || photosOfSet.set(k, []).get(k)!).push(p.id);
    }

    // Favoris actuels de chaque visiteur (pour les ZIP « favoris »)
    const favsOf = new Map<string, string[]>();
    const favPhotos = new Map<string, Set<string>>();
    for (const f of favorites) {
      (favsOf.get(f.visitor_id) || favsOf.set(f.visitor_id, []).get(f.visitor_id)!).push(f.photo_id);
      (favPhotos.get(f.gallery_id) || favPhotos.set(f.gallery_id, new Set()).get(f.gallery_id)!).add(f.photo_id);
    }
    favPhotos.forEach((set, gid) => (rows[gid].favorites = set.size));

    const got = new Map<string, Set<string>>();
    const who = new Map<string, Set<string>>();
    for (const e of downloads) {
      const r = rows[e.gallery_id];
      const m = e.meta || {};
      // Téléchargement global depuis le dossier partagé : pas un téléchargement
      // de la galerie elle-même, on ne le compte nulle part dans le bilan
      if (m.scope === 'folder') continue;
      const done = got.get(e.gallery_id) || got.set(e.gallery_id, new Set()).get(e.gallery_id)!;
      if (e.type === 'download_photo') {
        r.photoDownloads++;
        if (e.photo_id) done.add(e.photo_id);
      } else {
        r.zipDownloads++;
        const scope = m.scope || 'all';
        let list: string[] = [];
        if (scope === 'all') {
          r.zipAll = true;
          list = photosOf.get(e.gallery_id) || [];
        } else if (scope === 'set') list = photosOfSet.get(`${e.gallery_id}:${m.setId || ''}`) || [];
        else if (scope === 'favorites' && e.visitor_id) list = favsOf.get(e.visitor_id) || [];
        for (const id of list) done.add(id);
      }
      if (m.size === 'web') r.web++;
      else r.hd++;
      if (!r.lastDownloadAt || e.created_at > r.lastDownloadAt) r.lastDownloadAt = e.created_at;
      if (e.visitor_id) (who.get(e.gallery_id) || who.set(e.gallery_id, new Set()).get(e.gallery_id)!).add(e.visitor_id);
    }
    got.forEach((set, gid) => {
      // Ne compte que les éléments encore présents dans la galerie
      const present = new Set(photosOf.get(gid) || []);
      let n = 0;
      set.forEach((id) => present.has(id) && n++);
      rows[gid].downloaded = n;
    });
    who.forEach((set, gid) => (rows[gid].downloaders = set.size));

    for (const v of visitors) {
      if (v.name || v.email) rows[v.gallery_id].visitors.push({ name: v.name, email: v.email });
    }
    for (const s of submissions) {
      rows[s.gallery_id].reviewsSubmitted++;
      if (!s.seen_at) rows[s.gallery_id].reviewsUnseen++;
    }
    for (const c of comments) rows[c.gallery_id].comments++;

    return NextResponse.json({ rows });
  } catch (e: any) {
    return jsonError(e?.message || 'Bilan indisponible', 500);
  }
}
