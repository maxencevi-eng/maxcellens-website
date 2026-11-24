import { NextResponse } from 'next/server';
import { db, guardAdmin, jsonError, rowToAdminGallery } from '@/lib/clientGalleries/db';
import { buildPatch, destroyGallery } from '@/lib/clientGalleries/mutations';
import { compareFilenames, sameName } from '@/lib/clientGalleries/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/client-galleries/bulk — actions groupées.
 *
 * { ids: string[], action: 'patch', patch: {...} }  → même format que PATCH /:id
 *   (publier, accès, nouveaux mots de passe, filigrane, modèle, expiration,
 *    dossier, tag, corbeille / restauration)
 * { ids: string[], action: 'destroy' }              → suppression définitive
 */
export async function POST(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: any) => typeof x === 'string') : [];
  if (!ids.length) return jsonError('Aucune galerie sélectionnée');

  if (body.action === 'destroy') {
    for (const id of ids) await destroyGallery(id);
    return NextResponse.json({ destroyed: ids.length });
  }

  if (body.action === 'sort_by_name') return sortByName(ids);

  // Remplacement groupé : où se trouvent les éléments portant ces noms ?
  if (body.action === 'find_by_names') {
    const names: string[] = Array.isArray(body.names) ? body.names.map((n: any) => sameName(String(n))).filter(Boolean) : [];
    const wanted = new Set(names);
    const matches: { galleryId: string; photoId: string; filename: string; key: string }[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from('client_gallery_photos')
        .select('id, gallery_id, filename')
        .in('gallery_id', ids)
        .eq('ready', true)
        .order('id')
        .range(from, from + PAGE - 1);
      if (error) return jsonError(error.message, 500);
      for (const p of data || []) {
        const key = sameName(p.filename);
        if (wanted.has(key)) matches.push({ galleryId: p.gallery_id, photoId: p.id, filename: p.filename, key });
      }
      if (!data || data.length < PAGE) break;
    }
    return NextResponse.json({ matches });
  }

  if (body.action !== 'patch' || !body.patch || typeof body.patch !== 'object') return jsonError('Action inconnue');

  const { data: rows, error } = await db.from('client_galleries').select('*').in('id', ids);
  if (error) return jsonError(error.message, 500);

  const updated = [];
  for (const row of rows || []) {
    // Chaque galerie reçoit son propre mot de passe généré
    const patch = await buildPatch(body.patch, row);
    if (!Object.keys(patch).length) continue;
    const { data, error: e } = await db.from('client_galleries').update(patch).eq('id', row.id).select('*').single();
    if (!e && data) updated.push(rowToAdminGallery(data));
  }
  return NextResponse.json({ galleries: updated });
}

/**
 * Trie les éléments de chaque galerie par nom de fichier (tri naturel) et
 * prend la première photo comme couverture. Une couverture importée hors
 * galerie (élément masqué) est conservée.
 */
async function sortByName(ids: string[]) {
  const { data: rows, error } = await db.from('client_galleries').select('id, cover_photo_id').in('id', ids);
  if (error) return jsonError(error.message, 500);

  const updated = [];
  for (const row of rows || []) {
    const { data: photos } = await db
      .from('client_gallery_photos')
      .select('id, filename, kind, hidden, ready, position')
      .eq('gallery_id', row.id);
    if (!photos?.length) continue;
    const sorted = [...photos].sort((a: any, b: any) => compareFilenames(a.filename, b.filename));
    await Promise.all(
      sorted.map((p: any, i: number) =>
        p.position === i ? null : db.from('client_gallery_photos').update({ position: i }).eq('gallery_id', row.id).eq('id', p.id)
      )
    );
    const current = photos.find((p: any) => p.id === row.cover_photo_id);
    const keepImported = current?.hidden;
    const first = sorted.find((p: any) => p.kind === 'image' && p.ready && !p.hidden);
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (!keepImported && first) patch.cover_photo_id = first.id;
    const { data } = await db.from('client_galleries').update(patch).eq('id', row.id).select('*').single();
    if (data) updated.push(rowToAdminGallery(data));
  }
  return NextResponse.json({ galleries: updated });
}
