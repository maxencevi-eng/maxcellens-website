import { NextResponse } from 'next/server';
import { db, guardAdmin, jsonError, rowToAdminGallery } from '@/lib/clientGalleries/db';
import { buildPatch, destroyGallery } from '@/lib/clientGalleries/mutations';

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
