import { NextResponse } from 'next/server';
import { db, guardAdmin, jsonError } from '@/lib/clientGalleries/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return jsonError('Nom requis');
  const { data, error } = await db
    .from('client_gallery_folders')
    .insert({ name: name.slice(0, 120), event_date: body.event_date || null })
    .select('*')
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ folder: data });
}

export async function PATCH(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  if (!body.id || !String(body.name || '').trim()) return jsonError('Paramètres manquants');
  const { data, error } = await db
    .from('client_gallery_folders')
    .update({ name: String(body.name).trim().slice(0, 120) })
    .eq('id', body.id)
    .select('*')
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ folder: data });
}

/** DELETE ?id= — supprime le dossier ; ses galeries restent (sans dossier). */
export async function DELETE(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return jsonError('id manquant');
  await db.from('client_gallery_folders').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
