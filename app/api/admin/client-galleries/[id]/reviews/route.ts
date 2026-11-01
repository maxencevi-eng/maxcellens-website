import { NextResponse } from 'next/server';
import { db, guardAdmin, jsonError } from '@/lib/clientGalleries/db';
import { cleanBody, cleanTimecode, isMissingTable, listComments, listSubmissions, REVIEW_MIGRATION_HINT } from '@/lib/clientGalleries/review';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const fail = (e: any) => jsonError(isMissingTable(e?.message || '') ? REVIEW_MIGRATION_HINT : e?.message || 'Erreur', 500);

/**
 * GET              → vidéos de la galerie avec compteurs de commentaires et validations
 * GET ?video=ID    → commentaires + validations de cette vidéo
 */
export async function GET(req: Request, ctx: Ctx) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const video = new URL(req.url).searchParams.get('video');
  try {
    if (video) {
      const [comments, submissions] = await Promise.all([listComments(id, video), listSubmissions(id, video)]);
      return NextResponse.json({ comments, submissions });
    }
    const [{ data: videos }, { data: comments, error }, submissions] = await Promise.all([
      db.from('client_gallery_photos').select('id, filename, duration').eq('gallery_id', id).eq('kind', 'video').eq('ready', true).order('position'),
      db.from('client_gallery_comments').select('photo_id, author_role, resolved, created_at').eq('gallery_id', id),
      listSubmissions(id),
    ]);
    if (error) throw new Error(error.message);
    const stats = (videos || []).map((v: any) => {
      const cs = (comments || []).filter((c: any) => c.photo_id === v.id);
      const subs = submissions.filter((s) => s.photo_id === v.id);
      return {
        id: v.id,
        filename: v.filename,
        duration: v.duration,
        comments: cs.length,
        unresolved: cs.filter((c: any) => c.author_role === 'client' && !c.resolved).length,
        last_comment_at: cs.reduce((m: string | null, c: any) => (!m || c.created_at > m ? c.created_at : m), null),
        submissions: subs.length,
        unseen: subs.filter((s) => !s.seen_at).length,
      };
    });
    return NextResponse.json({ videos: stats, submissions });
  } catch (e: any) {
    return fail(e);
  }
}

/**
 * POST { action: 'reply', photoId, body, timecode?, parent_id? }
 *      { action: 'resolve', id, resolved }
 *      { action: 'delete', id }
 *      { action: 'seen', photoId }   → marque les validations comme consultées
 */
export async function POST(req: Request, ctx: Ctx) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    if (body.action === 'reply') {
      const text = cleanBody(body.body);
      if (!text || !body.photoId) return jsonError('Commentaire vide');
      const { error } = await db.from('client_gallery_comments').insert({
        gallery_id: id,
        photo_id: body.photoId,
        author_role: 'admin',
        author_name: 'Maxcellens',
        body: text,
        timecode: cleanTimecode(body.timecode),
        parent_id: body.parent_id || null,
      });
      if (error) throw new Error(error.message);
    } else if (body.action === 'resolve') {
      await db
        .from('client_gallery_comments')
        .update({ resolved: !!body.resolved, updated_at: new Date().toISOString() })
        .eq('gallery_id', id)
        .eq('id', body.id);
    } else if (body.action === 'delete') {
      await db.from('client_gallery_comments').delete().eq('gallery_id', id).eq('id', body.id);
    } else if (body.action === 'seen') {
      await db
        .from('client_gallery_review_submissions')
        .update({ seen_at: new Date().toISOString() })
        .eq('gallery_id', id)
        .eq('photo_id', body.photoId)
        .is('seen_at', null);
      return NextResponse.json({ ok: true });
    } else {
      return jsonError('Action inconnue');
    }
    const photoId = body.photoId || (await db.from('client_gallery_comments').select('photo_id').eq('id', body.id).maybeSingle()).data?.photo_id;
    return NextResponse.json({ comments: photoId ? await listComments(id, photoId) : [] });
  } catch (e: any) {
    return fail(e);
  }
}
