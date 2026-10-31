import { NextResponse } from 'next/server';
import { db, guardAdmin } from '@/lib/clientGalleries/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET — journal, visiteurs et favoris (avec noms de fichiers pour la retouche). */
export async function GET(req: Request, ctx: Ctx) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;

  const [ev, vis, fav, photos] = await Promise.all([
    db.from('client_gallery_events').select('*').eq('gallery_id', id).order('created_at', { ascending: false }).limit(400),
    db.from('client_gallery_visitors').select('*').eq('gallery_id', id).order('created_at', { ascending: false }),
    db.from('client_gallery_favorites').select('visitor_id, photo_id, created_at').eq('gallery_id', id),
    db.from('client_gallery_photos').select('id, filename').eq('gallery_id', id),
  ]);

  const names = new Map((photos.data || []).map((p: any) => [p.id, p.filename]));
  const favByVisitor: Record<string, string[]> = {};
  for (const f of fav.data || []) {
    (favByVisitor[f.visitor_id] ||= []).push(names.get(f.photo_id) || f.photo_id);
  }
  const counts: Record<string, number> = {};
  for (const e of ev.data || []) counts[e.type] = (counts[e.type] || 0) + 1;

  return NextResponse.json({
    events: (ev.data || []).map((e: any) => ({ ...e, filename: e.photo_id ? names.get(e.photo_id) : null })),
    visitors: (vis.data || []).map((v: any) => ({ ...v, favorites: (favByVisitor[v.id] || []).sort() })),
    counts,
  });
}
