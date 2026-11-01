import { db } from './db';
import type { ReviewComment, ReviewSubmission } from './types';

/**
 * Lecture des commentaires et validations de review (serveur).
 * Migration requise : 20261103000000_client_gallery_reviews.sql
 */

export async function listComments(galleryId: string, photoId: string, visitorId?: string | null): Promise<ReviewComment[]> {
  const { data, error } = await db
    .from('client_gallery_comments')
    .select('id, photo_id, visitor_id, author_role, author_name, body, timecode, parent_id, resolved, created_at')
    .eq('gallery_id', galleryId)
    .eq('photo_id', photoId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data || []).map((c: any) => ({
    id: c.id,
    photo_id: c.photo_id,
    author_role: c.author_role,
    author_name: c.author_name,
    mine: !!visitorId && c.visitor_id === visitorId,
    body: c.body,
    timecode: c.timecode,
    parent_id: c.parent_id,
    resolved: c.resolved,
    created_at: c.created_at,
  }));
}

export async function listSubmissions(galleryId: string, photoId?: string | null): Promise<ReviewSubmission[]> {
  let q = db
    .from('client_gallery_review_submissions')
    .select('id, photo_id, visitor_id, message, comment_count, notified, seen_at, created_at')
    .eq('gallery_id', galleryId)
    .order('created_at', { ascending: false });
  if (photoId) q = q.eq('photo_id', photoId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const ids = Array.from(new Set((data || []).map((s: any) => s.visitor_id).filter(Boolean)));
  const { data: visitors } = ids.length
    ? await db.from('client_gallery_visitors').select('id, name, email').in('id', ids)
    : { data: [] as any[] };
  const v = new Map<string, { name: string | null; email: string | null }>((visitors || []).map((x: any) => [x.id, x]));
  return (data || []).map((s: any) => ({
    id: s.id,
    photo_id: s.photo_id,
    visitor_name: v.get(s.visitor_id)?.name ?? null,
    visitor_email: v.get(s.visitor_id)?.email ?? null,
    message: s.message,
    comment_count: s.comment_count,
    notified: s.notified,
    seen_at: s.seen_at,
    created_at: s.created_at,
  }));
}

export function cleanBody(v: any): string {
  return String(v ?? '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, 2000);
}

export function cleanTimecode(v: any): number | null {
  const n = Number(v);
  return v === null || v === undefined || v === '' || !Number.isFinite(n) || n < 0 ? null : Math.round(n * 10) / 10;
}

export const REVIEW_MIGRATION_HINT =
  'Mode review indisponible : exécutez la migration 20261103000000_client_gallery_reviews.sql dans Supabase';

export function isMissingTable(message: string) {
  return /client_gallery_comments|client_gallery_review_submissions|review/.test(message) && /does not exist|Could not find/i.test(message);
}
