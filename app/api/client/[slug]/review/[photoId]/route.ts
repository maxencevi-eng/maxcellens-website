import { NextResponse } from 'next/server';
import { db, logEvent } from '@/lib/clientGalleries/db';
import { notifyReviewSubmitted } from '@/lib/clientGalleries/notify';
import { guardPublic, visitorId } from '@/lib/clientGalleries/public';
import { cleanBody, cleanTimecode, isMissingTable, listComments, REVIEW_MIGRATION_HINT } from '@/lib/clientGalleries/review';
import { ipHash } from '@/lib/clientGalleries/security';
import { normalizeReview } from '@/lib/clientGalleries/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ slug: string; photoId: string }> };

/** Charge galerie + vidéo et vérifie que la review est ouverte. */
async function guard(req: Request, slug: string, photoId: string) {
  const r = await guardPublic(req, slug);
  if ('error' in r) return r;
  if (!normalizeReview(r.g.review).enabled && !r.preview) {
    return { error: NextResponse.json({ error: 'Review désactivée pour cette galerie' }, { status: 403 }) };
  }
  const { data: photo } = await db
    .from('client_gallery_photos')
    .select('id, filename, kind')
    .eq('gallery_id', r.g.id)
    .eq('id', photoId)
    .eq('ready', true)
    .eq('hidden', false)
    .maybeSingle();
  if (!photo || photo.kind !== 'video') return { error: NextResponse.json({ error: 'Vidéo introuvable' }, { status: 404 }) };
  return { ...r, photo, vid: visitorId(r.g, r.cookies) };
}

/** GET — commentaires de la vidéo et dernière validation du visiteur. */
export async function GET(req: Request, ctx: Ctx) {
  const { slug, photoId } = await ctx.params;
  const r = await guard(req, slug, photoId);
  if ('error' in r) return r.error;
  try {
    const comments = await listComments(r.g.id, photoId, r.vid);
    let lastSubmission: string | null = null;
    if (r.vid) {
      const { data } = await db
        .from('client_gallery_review_submissions')
        .select('created_at')
        .eq('photo_id', photoId)
        .eq('visitor_id', r.vid)
        .order('created_at', { ascending: false })
        .limit(1);
      lastSubmission = data?.[0]?.created_at ?? null;
    }
    return NextResponse.json({ comments, identified: !!r.vid, lastSubmission });
  } catch (e: any) {
    return NextResponse.json({ error: isMissingTable(e.message) ? REVIEW_MIGRATION_HINT : e.message }, { status: 500 });
  }
}

/**
 * POST { action: 'comment', body, timecode?, parent_id? }
 *      { action: 'delete', id }             (ses propres commentaires)
 *      { action: 'submit', message? }       « J'ai terminé ma review » → e-mail
 */
export async function POST(req: Request, ctx: Ctx) {
  const { slug, photoId } = await ctx.params;
  const r = await guard(req, slug, photoId);
  if ('error' in r) return r.error;
  const { g, photo, vid } = r;
  if (!vid) return NextResponse.json({ error: 'identify' }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const { data: visitor } = await db.from('client_gallery_visitors').select('name, email').eq('id', vid).maybeSingle();

  try {
    if (body.action === 'comment') {
      const text = cleanBody(body.body);
      if (!text) return NextResponse.json({ error: 'Commentaire vide' }, { status: 400 });
      // Garde-fou anti-abus : 300 commentaires par heure et par visiteur
      const { count } = await db
        .from('client_gallery_comments')
        .select('id', { count: 'exact', head: true })
        .eq('visitor_id', vid)
        .gte('created_at', new Date(Date.now() - 3600000).toISOString());
      if ((count || 0) >= 300) return NextResponse.json({ error: 'Trop de commentaires, réessayez plus tard' }, { status: 429 });
      const { error } = await db.from('client_gallery_comments').insert({
        gallery_id: g.id,
        photo_id: photoId,
        visitor_id: vid,
        author_role: 'client',
        author_name: visitor?.name || visitor?.email || 'Client',
        body: text,
        timecode: cleanTimecode(body.timecode),
        parent_id: body.parent_id || null,
      });
      if (error) throw new Error(error.message);
      if (!r.preview) await logEvent(g.id, 'comment', { photo_id: photoId, visitor_id: vid, ip_hash: ipHash(req) });
    } else if (body.action === 'delete') {
      await db.from('client_gallery_comments').delete().eq('id', String(body.id || '')).eq('visitor_id', vid).eq('photo_id', photoId);
    } else if (body.action === 'submit') {
      // Une validation à la fois : pas de double envoi en moins de 2 minutes
      const { data: recent } = await db
        .from('client_gallery_review_submissions')
        .select('created_at')
        .eq('photo_id', photoId)
        .eq('visitor_id', vid)
        .order('created_at', { ascending: false })
        .limit(1);
      const prev = recent?.[0]?.created_at as string | undefined;
      if (prev && Date.now() - new Date(prev).getTime() < 120000) {
        return NextResponse.json({ error: 'Review déjà envoyée à l’instant' }, { status: 409 });
      }
      // Commentaires du visiteur depuis sa validation précédente
      let q = db
        .from('client_gallery_comments')
        .select('body, timecode, created_at')
        .eq('photo_id', photoId)
        .eq('visitor_id', vid)
        .order('timecode', { ascending: true, nullsFirst: false })
        .order('created_at');
      if (prev) q = q.gt('created_at', prev);
      const { data: mine } = await q;
      const message = cleanBody(body.message) || null;
      const { data: sub, error } = await db
        .from('client_gallery_review_submissions')
        .insert({ gallery_id: g.id, photo_id: photoId, visitor_id: vid, message, comment_count: mine?.length || 0 })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      const sent = await notifyReviewSubmitted({
        galleryId: g.id,
        galleryTitle: g.title,
        photoId,
        videoName: photo.filename,
        reviewer: { name: visitor?.name ?? null, email: visitor?.email ?? null },
        message,
        comments: mine || [],
      });
      if (sent) await db.from('client_gallery_review_submissions').update({ notified: true }).eq('id', sub.id);
      if (!r.preview) await logEvent(g.id, 'review_submitted', { photo_id: photoId, visitor_id: vid, meta: { count: mine?.length || 0 } });
    } else {
      return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
    }
    return NextResponse.json({ comments: await listComments(g.id, photoId, vid) });
  } catch (e: any) {
    return NextResponse.json({ error: isMissingTable(e.message) ? REVIEW_MIGRATION_HINT : e.message }, { status: 500 });
  }
}
