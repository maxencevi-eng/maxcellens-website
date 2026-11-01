import { NextResponse } from 'next/server';
import { db, guardAdmin, jsonError } from '@/lib/clientGalleries/db';

export const dynamic = 'force-dynamic';

/**
 * Dossiers de galeries : arborescence (parent_id) et ordre (position).
 * Migration requise : 20261102000000_client_gallery_folders_tree.sql
 */

async function allFolders() {
  const { data } = await db.from('client_gallery_folders').select('id, parent_id, position');
  return (data || []) as { id: string; parent_id: string | null; position: number }[];
}

/** Vrai si `candidate` est `id` lui-même ou l'un de ses descendants. */
function isSelfOrDescendant(folders: { id: string; parent_id: string | null }[], id: string, candidate: string | null) {
  const parent = new Map(folders.map((f) => [f.id, f.parent_id]));
  let cur: string | null | undefined = candidate;
  for (let guard = 0; cur && guard < 100; guard++) {
    if (cur === id) return true;
    cur = parent.get(cur);
  }
  return false;
}

/** POST { name, parent_id?, event_date? } */
export async function POST(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return jsonError('Nom requis');
  const parent = body.parent_id || null;
  const siblings = (await allFolders()).filter((f) => (f.parent_id || null) === parent);
  const { data, error } = await db
    .from('client_gallery_folders')
    .insert({
      name: name.slice(0, 120),
      event_date: body.event_date || null,
      parent_id: parent,
      position: siblings.reduce((m, f) => Math.max(m, f.position + 1), 0),
    })
    .select('*')
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ folder: data });
}

/**
 * PATCH { id, name?, parent_id?, order? }
 * - name : renommer
 * - parent_id : déplacer (null = racine) ; refuse un déplacement dans soi-même
 * - order : ids des dossiers frères dans l'ordre voulu (après déplacement)
 */
export async function PATCH(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  if (!body.id) return jsonError('id manquant');

  const patch: Record<string, any> = {};
  if ('name' in body) {
    const name = String(body.name || '').trim();
    if (!name) return jsonError('Nom requis');
    patch.name = name.slice(0, 120);
  }
  if ('parent_id' in body) {
    const parent = body.parent_id || null;
    if (parent && isSelfOrDescendant(await allFolders(), body.id, parent)) {
      return jsonError('Impossible de placer un dossier dans lui-même ou dans un de ses sous-dossiers');
    }
    patch.parent_id = parent;
  }
  if (Object.keys(patch).length) {
    const { error } = await db.from('client_gallery_folders').update(patch).eq('id', body.id);
    if (error) return jsonError(error.message, 500);
  }
  if (Array.isArray(body.order)) {
    await Promise.all(
      body.order.map((fid: string, i: number) => db.from('client_gallery_folders').update({ position: i }).eq('id', fid))
    );
  }
  // Tri par date seulement : l'ordre « position » est appliqué côté navigateur (et reste valable sans la migration)
  const { data } = await db.from('client_gallery_folders').select('*').order('created_at');
  return NextResponse.json({ folders: data || [] });
}

/**
 * DELETE ?id= — supprime le dossier. Ses sous-dossiers et ses galeries
 * remontent d'un niveau (dans son parent, ou à la racine).
 */
export async function DELETE(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return jsonError('id manquant');
  const { data: folder } = await db.from('client_gallery_folders').select('parent_id').eq('id', id).maybeSingle();
  const parent = folder?.parent_id || null;
  await db.from('client_gallery_folders').update({ parent_id: parent }).eq('parent_id', id);
  await db.from('client_galleries').update({ folder_id: parent }).eq('folder_id', id);
  await db.from('client_gallery_folders').delete().eq('id', id);
  return NextResponse.json({ ok: true, parent_id: parent });
}
