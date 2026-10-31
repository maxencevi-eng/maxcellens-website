import { NextResponse } from 'next/server';
import { db, guardAdmin, jsonError, rowToAdminGallery } from '@/lib/clientGalleries/db';
import { buildPatch, destroyGallery } from '@/lib/clientGalleries/mutations';
import { displayUrl, objectKey, r2Configured } from '@/lib/clientGalleries/r2';
import type { AdminPhoto } from '@/lib/clientGalleries/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET — galerie, sets et photos (vignettes signées). */
export async function GET(req: Request, ctx: Ctx) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;

  const [g, s, p] = await Promise.all([
    db.from('client_galleries').select('*').eq('id', id).maybeSingle(),
    db.from('client_gallery_sets').select('*').eq('gallery_id', id).order('position'),
    db.from('client_gallery_photos').select('*').eq('gallery_id', id).eq('ready', true).order('position').order('created_at'),
  ]);
  if (g.error) return jsonError(g.error.message, 500);
  if (!g.data) return jsonError('Galerie introuvable', 404);

  const photos: AdminPhoto[] = (p.data || []).map((r: any) => ({
    id: r.id,
    kind: r.kind || 'image',
    set_id: r.set_id,
    position: r.position,
    filename: r.filename,
    ext: r.ext,
    content_type: r.content_type,
    width: r.width,
    height: r.height,
    bytes: Number(r.bytes || 0),
    stored_bytes: Number(r.stored_bytes || 0),
    duration: r.duration,
    placeholder: r.placeholder,
    hidden: r.hidden,
    wm_key: r.wm_key,
    has_web: r.has_web,
    has_preview: r.has_preview,
    thumb_url: r2Configured && r.has_preview ? displayUrl(objectKey(id, r.id, 'thumb')) : '',
  }));

  return NextResponse.json({ gallery: rowToAdminGallery(g.data), sets: s.data || [], photos });
}

/** PATCH — réglages (voir lib/clientGalleries/mutations.ts#buildPatch). */
export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const { data: current } = await db.from('client_galleries').select('*').eq('id', id).maybeSingle();
  if (!current) return jsonError('Galerie introuvable', 404);

  const patch = await buildPatch(body, current);
  if (!Object.keys(patch).length) return NextResponse.json({ gallery: rowToAdminGallery(current) });
  const { data, error } = await db.from('client_galleries').update(patch).eq('id', id).select('*').single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ gallery: rowToAdminGallery(data) });
}

/** DELETE — corbeille ; `?permanent=1` supprime fichiers et données. */
export async function DELETE(req: Request, ctx: Ctx) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (new URL(req.url).searchParams.get('permanent') === '1') {
    await destroyGallery(id);
    return NextResponse.json({ ok: true });
  }
  const { error } = await db.from('client_galleries').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
