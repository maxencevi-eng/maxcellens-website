import { NextResponse } from 'next/server';
import { db, guardAdmin, jsonError } from '@/lib/clientGalleries/db';

export const dynamic = 'force-dynamic';

const TYPES = ['view', 'unlock', 'unlock_fail', 'download_photo', 'download_zip', 'favorite', 'comment', 'review_submitted'] as const;

/**
 * GET /api/admin/client-galleries/activity?days=30&type=&gallery=&limit=300
 *
 * Suivi global : compteurs exacts sur la période (par type d'événement),
 * journal des derniers événements enrichi (galerie, fichier, visiteur) et
 * galeries publiées jamais ouvertes.
 */
export async function GET(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const url = new URL(req.url);
  const days = Math.max(0, Math.min(3650, Number(url.searchParams.get('days') ?? 30) || 0));
  const type = url.searchParams.get('type') || '';
  const galleryId = url.searchParams.get('gallery') || '';
  const limit = Math.max(20, Math.min(1000, Number(url.searchParams.get('limit') ?? 300) || 300));
  const since = days ? new Date(Date.now() - days * 86400000).toISOString() : null;

  // Compteurs exacts par type (requêtes « head » : aucun transfert de lignes)
  const countFor = async (t: string) => {
    let q = db.from('client_gallery_events').select('id', { count: 'exact', head: true }).eq('type', t);
    if (since) q = q.gte('created_at', since);
    if (galleryId) q = q.eq('gallery_id', galleryId);
    const { count } = await q;
    return [t, count || 0] as const;
  };

  let evQ = db
    .from('client_gallery_events')
    .select('id, gallery_id, type, photo_id, visitor_id, meta, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (since) evQ = evQ.gte('created_at', since);
  if (galleryId) evQ = evQ.eq('gallery_id', galleryId);
  if (type === 'download') evQ = evQ.in('type', ['download_photo', 'download_zip']);
  else if (type === 'access') evQ = evQ.in('type', ['unlock', 'unlock_fail']);
  else if (type === 'review') evQ = evQ.in('type', ['comment', 'review_submitted']);
  else if (type) evQ = evQ.eq('type', type);

  const [countsArr, evRes, never] = await Promise.all([
    Promise.all(TYPES.map(countFor)),
    evQ,
    db
      .from('client_galleries')
      .select('id, title, slug, folder_id, published_at, client_name, client_email')
      .eq('status', 'published')
      .is('deleted_at', null)
      .is('first_viewed_at', null)
      .order('published_at', { ascending: false })
      .limit(100),
  ]);
  if (evRes.error) return jsonError(evRes.error.message, 500);
  const events = evRes.data || [];

  // Enrichissement : noms de fichiers et visiteurs identifiés
  const photoIds = Array.from(new Set(events.map((e: any) => e.photo_id).filter(Boolean)));
  const visitorIds = Array.from(new Set(events.map((e: any) => e.visitor_id).filter(Boolean)));
  const [photos, visitors] = await Promise.all([
    photoIds.length ? db.from('client_gallery_photos').select('id, filename').in('id', photoIds) : Promise.resolve({ data: [] as any[] }),
    visitorIds.length ? db.from('client_gallery_visitors').select('id, name, email').in('id', visitorIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const fileName = new Map((photos.data || []).map((p: any) => [p.id, p.filename]));
  const visitor = new Map((visitors.data || []).map((v: any) => [v.id, v]));

  // Galeries les plus actives sur la période (à partir du journal chargé)
  const perGallery = new Map<string, { views: number; downloads: number; favorites: number }>();
  for (const e of events as any[]) {
    const c = perGallery.get(e.gallery_id) || { views: 0, downloads: 0, favorites: 0 };
    if (e.type === 'view') c.views++;
    if (e.type === 'download_photo' || e.type === 'download_zip') c.downloads++;
    if (e.type === 'favorite') c.favorites++;
    perGallery.set(e.gallery_id, c);
  }

  return NextResponse.json({
    days,
    counts: Object.fromEntries(countsArr),
    events: events.map((e: any) => ({
      ...e,
      filename: e.photo_id ? fileName.get(e.photo_id) || null : null,
      visitor: e.visitor_id ? visitor.get(e.visitor_id) || null : null,
    })),
    top: Array.from(perGallery.entries())
      .map(([id, c]) => ({ id, ...c }))
      .sort((a, b) => b.downloads - a.downloads || b.views - a.views)
      .slice(0, 8),
    neverOpened: never.data || [],
    truncated: events.length >= limit,
  });
}
