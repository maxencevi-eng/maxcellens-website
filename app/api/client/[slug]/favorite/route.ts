import { NextResponse } from 'next/server';
import { db, logEvent } from '@/lib/clientGalleries/db';
import { guardPublic, visitorId } from '@/lib/clientGalleries/public';
import { normalizeFavorites } from '@/lib/clientGalleries/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ slug: string }> };

/** POST { photoId, on } — ajoute / retire un favori du visiteur identifié. */
export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const r = await guardPublic(req, slug);
  if ('error' in r) return r.error;
  const { g, cookies } = r;

  const fav = normalizeFavorites(g.favorites);
  if (!fav.enabled) return NextResponse.json({ error: 'Favoris désactivés' }, { status: 403 });
  const vid = visitorId(g, cookies);
  if (!vid) return NextResponse.json({ error: 'identify' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const photoId = String(body.photoId || '');
  const { data: photo } = await db.from('client_gallery_photos').select('id').eq('gallery_id', g.id).eq('id', photoId).maybeSingle();
  if (!photo) return NextResponse.json({ error: 'Photo introuvable' }, { status: 404 });

  if (body.on) {
    if (fav.limit) {
      const { count } = await db.from('client_gallery_favorites').select('photo_id', { count: 'exact', head: true }).eq('visitor_id', vid);
      if ((count || 0) >= fav.limit) {
        return NextResponse.json({ error: `Sélection limitée à ${fav.limit} photos` }, { status: 409 });
      }
    }
    await db.from('client_gallery_favorites').upsert({ gallery_id: g.id, visitor_id: vid, photo_id: photoId });
    await logEvent(g.id, 'favorite', { photo_id: photoId, visitor_id: vid });
  } else {
    await db.from('client_gallery_favorites').delete().eq('visitor_id', vid).eq('photo_id', photoId);
  }
  return NextResponse.json({ ok: true });
}
