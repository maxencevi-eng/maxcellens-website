import { NextResponse } from 'next/server';
import { db, guardAdmin, jsonError } from '@/lib/clientGalleries/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** POST — créer un set { name } ; ou réordonner { order: string[] }. */
export async function POST(req: Request, ctx: Ctx) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  if (Array.isArray(body.order)) {
    await Promise.all(
      body.order.map((sid: string, i: number) => db.from('client_gallery_sets').update({ position: i }).eq('gallery_id', id).eq('id', sid))
    );
    return NextResponse.json({ ok: true });
  }

  const name = String(body.name || '').trim();
  if (!name) return jsonError('Nom requis');
  const { data: last } = await db.from('client_gallery_sets').select('position').eq('gallery_id', id).order('position', { ascending: false }).limit(1);
  const { data, error } = await db
    .from('client_gallery_sets')
    .insert({ gallery_id: id, name: name.slice(0, 80), position: (last?.[0]?.position ?? -1) + 1 })
    .select('*')
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ set: data });
}

/** PATCH — renommer { setId, name }. */
export async function PATCH(req: Request, ctx: Ctx) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!body.setId || !name) return jsonError('Paramètres manquants');
  const { error } = await db.from('client_gallery_sets').update({ name: name.slice(0, 80) }).eq('gallery_id', id).eq('id', body.setId);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

/** DELETE ?setId= — supprime le set ; ses photos restent, sans set. */
export async function DELETE(req: Request, ctx: Ctx) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const setId = new URL(req.url).searchParams.get('setId');
  if (!setId) return jsonError('setId manquant');
  await db.from('client_gallery_sets').delete().eq('gallery_id', id).eq('id', setId);
  return NextResponse.json({ ok: true });
}
