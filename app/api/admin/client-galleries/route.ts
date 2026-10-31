import { NextResponse } from 'next/server';
import { createGallery, db, guardAdmin, jsonError, rowToAdminGallery } from '@/lib/clientGalleries/db';
import { r2Configured } from '@/lib/clientGalleries/r2';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/client-galleries — tout ce qu'il faut à l'écran de liste :
 * galeries (corbeille comprise, filtrée côté client), dossiers, modèles,
 * filigranes et état de la configuration.
 */
export async function GET(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;

  const [g, f, t, w] = await Promise.all([
    db.from('client_galleries').select('*').order('created_at', { ascending: false }),
    db.from('client_gallery_folders').select('*').order('created_at', { ascending: false }),
    db.from('client_gallery_templates').select('*').order('position'),
    db.from('client_gallery_watermarks').select('*').order('created_at'),
  ]);
  if (g.error) {
    const missing = /relation .* does not exist|Could not find the table/i.test(g.error.message);
    return NextResponse.json(
      { error: missing ? 'Tables absentes : appliquez la migration 20261101000000_client_galleries.sql' : g.error.message, setup: missing },
      { status: missing ? 503 : 500 }
    );
  }

  let galleries;
  try {
    galleries = (g.data || []).map(rowToAdminGallery);
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur de déchiffrement', 500);
  }

  return NextResponse.json({
    galleries,
    folders: f.data || [],
    templates: t.data || [],
    watermarks: w.data || [],
    config: { r2: r2Configured, secret: (process.env.GALLERY_SECRET || '').length >= 16 },
  });
}

/** POST /api/admin/client-galleries — crée une galerie depuis un modèle. */
export async function POST(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  if (!body?.title?.trim()) return jsonError('Titre requis');
  try {
    const row = await createGallery(body);
    return NextResponse.json({ gallery: rowToAdminGallery(row) });
  } catch (e: any) {
    return jsonError(e?.message || 'Création impossible', 500);
  }
}
