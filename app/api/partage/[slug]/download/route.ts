import { NextResponse } from 'next/server';
import { db, logEvent } from '@/lib/clientGalleries/db';
import { hasFolderAccess, requestCookies, sharedFolderGalleries, sharedFolderLookup } from '@/lib/clientGalleries/public';
import { objectKey, presign, r2Configured } from '@/lib/clientGalleries/r2';
import { ipHash } from '@/lib/clientGalleries/security';
import { normalizeDownload } from '@/lib/clientGalleries/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ slug: string }> };

const baseName = (filename: string) => filename.replace(/\.[^.]+$/, '');
const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Galerie';

/**
 * POST { size: 'original'|'web', galleryIds?: string[] }
 *
 * URL signées de tous les fichiers des galeries du dossier partagé, rangés
 * dans un sous-dossier par galerie. Les réglages de chaque galerie restent
 * appliqués : téléchargement désactivé ou protégé par PIN → galerie ignorée ;
 * taille non autorisée → l'autre taille permise est utilisée.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const f = await sharedFolderLookup(slug);
  if (!f) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
  if (!hasFolderAccess(f, requestCookies(req))) return NextResponse.json({ error: 'Accès expiré : rechargez la page' }, { status: 401 });
  if (!r2Configured) return NextResponse.json({ error: 'Stockage indisponible' }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const wanted = body.size === 'web' ? 'web' : 'original';
  const only: string[] | null = Array.isArray(body.galleryIds) ? body.galleryIds.map(String) : null;

  const galleries = (await sharedFolderGalleries(f.id)).filter((g) => !only || only.includes(g.id));
  const skipped: string[] = [];
  const plan: { g: any; size: 'original' | 'web'; dir: string }[] = [];
  const dirs = new Map<string, number>();
  for (const g of galleries) {
    const dl = normalizeDownload(g.download);
    if (!dl.enabled || dl.pin || !dl.sizes.length) {
      skipped.push(g.title);
      continue;
    }
    const size = dl.sizes.includes(wanted) ? wanted : dl.sizes[0];
    let dir = safe(g.title);
    const n = dirs.get(dir) || 0;
    dirs.set(dir, n + 1);
    if (n) dir = `${dir} (${n + 1})`;
    plan.push({ g, size, dir });
  }
  if (!plan.length) return NextResponse.json({ error: 'Aucune galerie téléchargeable dans ce dossier' }, { status: 404 });

  // Lecture par pages : Supabase plafonne chaque réponse à 1 000 lignes
  const photos: any[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('client_gallery_photos')
      .select('id, gallery_id, kind, filename, ext, bytes, has_web')
      .in('gallery_id', plan.map((p) => p.g.id))
      .eq('ready', true)
      .eq('hidden', false)
      .order('position')
      .order('created_at')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('folder download', error);
      return NextResponse.json({ error: 'Téléchargement momentanément impossible' }, { status: 500 });
    }
    photos.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }

  const files: { name: string; size: number | null; url: string }[] = [];
  for (const p of plan) {
    const used = new Map<string, number>();
    for (const ph of photos.filter((x) => x.gallery_id === p.g.id)) {
      const useWeb = p.size === 'web' && ph.kind === 'image';
      const kind = useWeb ? (ph.has_web ? 'web' : 'screen') : 'original';
      const ext = useWeb ? 'webp' : ph.ext;
      let name = `${baseName(ph.filename)}.${ext}`;
      const n = used.get(name) || 0;
      used.set(name, n + 1);
      if (n) name = `${baseName(ph.filename)}-${n + 1}.${ext}`;
      files.push({
        name: `${p.dir}/${name}`,
        size: useWeb ? null : Number(ph.bytes || 0),
        url: presign('GET', objectKey(p.g.id, ph.id, kind as any, ph.ext), { expires: 6 * 3600 }),
      });
    }
  }
  if (!files.length) return NextResponse.json({ error: 'Aucune photo' }, { status: 404 });

  // Trace dans le journal de chaque galerie (scope « folder »), mais sans
  // toucher au compteur de téléchargements : le lien du dossier sert au
  // responsable pour une sauvegarde globale, pas au client de la galerie.
  const ip = ipHash(req);
  await Promise.all(
    plan.map((p) => logEvent(p.g.id, 'download_zip', { ip_hash: ip, meta: { scope: 'folder', folder: f.id, size: p.size } }))
  );

  return NextResponse.json({ files, skipped });
}
