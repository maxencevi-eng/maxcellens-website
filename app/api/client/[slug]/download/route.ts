import { NextResponse } from 'next/server';
import { bump, db, logEvent } from '@/lib/clientGalleries/db';
import { guardPublic, visitorId } from '@/lib/clientGalleries/public';
import { attachmentUrl, objectKey, presign, r2Configured } from '@/lib/clientGalleries/r2';
import { decrypt, ipHash } from '@/lib/clientGalleries/security';
import { normalizeDownload } from '@/lib/clientGalleries/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ slug: string }> };

function baseName(filename: string) {
  return filename.replace(/\.[^.]+$/, '');
}

/**
 * POST { scope: 'photo'|'set'|'all'|'favorites', photoId?, setId?, size, pin? }
 *
 * Renvoie les URL signées des fichiers demandés. Le serveur applique les
 * réglages de la galerie : un téléchargement désactivé est refusé ici, pas
 * seulement masqué dans l'interface.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const r = await guardPublic(req, slug);
  if ('error' in r) return r.error;
  const { g, cookies } = r;
  if (!r2Configured) return NextResponse.json({ error: 'Stockage indisponible' }, { status: 503 });

  const dl = normalizeDownload(g.download);
  const body = await req.json().catch(() => ({}));
  const scope = String(body.scope || 'photo');
  const size = body.size === 'web' ? 'web' : 'original';

  if (!dl.enabled) return NextResponse.json({ error: 'Téléchargement désactivé' }, { status: 403 });
  if (!dl.scopes.includes(scope as any)) return NextResponse.json({ error: 'Option de téléchargement non autorisée' }, { status: 403 });
  if (!dl.sizes.includes(size)) return NextResponse.json({ error: 'Taille non autorisée' }, { status: 403 });
  if (dl.pin) {
    const pin = decrypt(g.download_pin_enc);
    if (!pin || String(body.pin || '').trim() !== pin) return NextResponse.json({ error: 'pin' }, { status: 401 });
  }

  let q = db
    .from('client_gallery_photos')
    .select('id, kind, filename, ext, bytes, has_web, set_id')
    .eq('gallery_id', g.id)
    .eq('ready', true)
    .eq('hidden', false)
    .order('position');
  if (scope === 'photo') q = q.eq('id', String(body.photoId || ''));
  if (scope === 'set') q = body.setId ? q.eq('set_id', String(body.setId)) : q.is('set_id', null);
  if (scope === 'favorites') {
    const vid = visitorId(g, cookies);
    if (!vid) return NextResponse.json({ error: 'Aucun favori' }, { status: 400 });
    const { data: favs } = await db.from('client_gallery_favorites').select('photo_id').eq('visitor_id', vid);
    if (!favs?.length) return NextResponse.json({ error: 'Aucun favori' }, { status: 400 });
    q = q.in('id', favs.map((f: any) => f.photo_id));
  }
  const { data: photos, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!photos?.length) return NextResponse.json({ error: 'Aucune photo' }, { status: 404 });

  // Noms uniques dans le ZIP
  const used = new Map<string, number>();
  const files = photos.map((p: any) => {
    // Vidéos et documents : toujours le fichier d'origine
    const useWeb = size === 'web' && p.kind === 'image';
    const kind = useWeb ? (p.has_web ? 'web' : 'screen') : 'original';
    const ext = useWeb ? 'webp' : p.ext;
    let name = `${baseName(p.filename)}.${ext}`;
    const n = used.get(name) || 0;
    used.set(name, n + 1);
    if (n) name = `${baseName(p.filename)}-${n + 1}.${ext}`;
    const key = objectKey(g.id, p.id, kind as any, p.ext);
    return {
      id: p.id,
      name,
      size: useWeb ? null : Number(p.bytes || 0),
      // Unitaire : pièce jointe directe ; ZIP : lecture CORS par le navigateur
      url: scope === 'photo' ? attachmentUrl(key, name) : presign('GET', key, { expires: 6 * 3600 }),
    };
  });

  const vid = visitorId(g, cookies);
  // L'aperçu admin ne fausse pas les statistiques du client
  if (!r.preview) await Promise.all([
    logEvent(g.id, scope === 'photo' ? 'download_photo' : 'download_zip', {
      photo_id: scope === 'photo' ? files[0].id : null,
      visitor_id: vid,
      ip_hash: ipHash(req),
      meta: { scope, size, count: files.length, setId: body.setId || null },
    }),
    bump(g.id, 0, 1),
  ]);

  return NextResponse.json({ files });
}
