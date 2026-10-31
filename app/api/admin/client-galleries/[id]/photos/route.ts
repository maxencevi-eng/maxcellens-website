import { NextResponse } from 'next/server';
import { db, guardAdmin, jsonError, refreshCounts } from '@/lib/clientGalleries/db';
import { allKeysForPhoto, deleteObjects, objectKey, presign, r2Configured, uploadUrl } from '@/lib/clientGalleries/r2';
import { MAX_FILE_BYTES, MAX_IMAGE_BYTES, mediaKindOf, type RenditionKind } from '@/lib/clientGalleries/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/tiff': 'tif',
  'image/heic': 'heic',
  'image/avif': 'avif',
};

function extOf(name: string, type: string): string {
  const m = /\.([a-z0-9]{2,5})$/i.exec(name || '');
  const e = (m?.[1] || EXT[type] || 'jpg').toLowerCase();
  return e === 'jpeg' ? 'jpg' : e;
}

/**
 * POST /api/admin/client-galleries/:id/photos — { action, ... }
 *
 * prepare  : crée les lignes et renvoie les URL d'envoi (original + rendus)
 * complete : marque les photos comme prêtes après l'envoi
 * sign     : URL GET/PUT de rendus (régénération du filigrane)
 * update   : set, masquage
 * reorder  : ordre complet
 * delete   : suppression (fichiers + lignes)
 */
export async function POST(req: Request, ctx: Ctx) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const { data: gallery } = await db.from('client_galleries').select('id, cover_photo_id').eq('id', id).maybeSingle();
  if (!gallery) return jsonError('Galerie introuvable', 404);

  switch (body.action) {
    case 'prepare': {
      if (!r2Configured) return jsonError('Stockage R2 non configuré', 503);
      const files: any[] = Array.isArray(body.files) ? body.files : [];
      if (!files.length) return jsonError('Aucun fichier');
      for (const f of files) {
        const kind = mediaKindOf(String(f.type || ''), String(f.name || ''));
        const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
        if (Number(f.size) > max) return jsonError(`${f.name} : trop lourd (${kind === 'image' ? '40 Mo' : '2 Go'} max)`);
      }

      // Ménage : envois interrompus de plus de 6 h
      const stale = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
      const { data: old } = await db.from('client_gallery_photos').select('id, ext').eq('gallery_id', id).eq('ready', false).lt('created_at', stale);
      if (old?.length) {
        await deleteObjects(old.flatMap((p: any) => allKeysForPhoto(id, p)));
        await db.from('client_gallery_photos').delete().in('id', old.map((p: any) => p.id));
      }

      const { data: last } = await db.from('client_gallery_photos').select('position').eq('gallery_id', id).order('position', { ascending: false }).limit(1);
      let pos = (last?.[0]?.position ?? -1) + 1;
      const rows = files.map((f) => {
        const kind = mediaKindOf(String(f.type || ''), String(f.name || ''));
        const duration = Number(f.duration);
        return {
          gallery_id: id,
          set_id: f.setId || null,
          position: pos++,
          kind,
          filename: String(f.name || 'fichier').slice(0, 200),
          ext: extOf(f.name, f.type),
          content_type: String(f.type || 'application/octet-stream').slice(0, 120),
          width: Math.round(Number(f.width)) || null,
          height: Math.round(Number(f.height)) || null,
          bytes: Math.round(Number(f.size)) || 0,
          stored_bytes: Math.round(Number(f.storedBytes) || Number(f.size)) || 0,
          duration: Number.isFinite(duration) && duration > 0 ? duration : null,
          placeholder: typeof f.placeholder === 'string' && f.placeholder.length < 4000 ? f.placeholder : null,
          has_web: kind === 'image' && !!f.hasWeb,
          has_preview: kind !== 'file' && !!f.hasPreview,
          ready: false,
        };
      });
      const { data: inserted, error } = await db.from('client_gallery_photos').insert(rows).select('id, ext');
      if (error) return jsonError(error.message, 500);

      const uploads = (inserted || []).map((p: any, i: number) => {
        const k: RenditionKind[] = ['original'];
        if (rows[i].has_preview) {
          k.push('thumb', 'screen');
          if (rows[i].has_web) k.push('web');
          if (body.wm && rows[i].kind === 'image') k.push('thumb-wm', 'screen-wm');
        }
        return { id: p.id, put: Object.fromEntries(k.map((kind) => [kind, uploadUrl(objectKey(id, p.id, kind, p.ext))])) };
      });
      return NextResponse.json({ uploads });
    }

    case 'complete': {
      const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
      if (ids.length) {
        await db
          .from('client_gallery_photos')
          .update({ ready: true, wm_key: body.wm_key || null })
          .eq('gallery_id', id)
          .in('id', ids);
      }
      // Les rendus du filigrane s'ajoutent au poids réel (renvoyé par le navigateur)
      if (body.stored && typeof body.stored === 'object') {
        await Promise.all(
          Object.entries(body.stored as Record<string, number>).map(([pid, n]) =>
            db.from('client_gallery_photos').update({ stored_bytes: Math.round(Number(n)) || 0 }).eq('gallery_id', id).eq('id', pid)
          )
        );
      }
      if (!gallery.cover_photo_id && ids.length) {
        const { data: firstImg } = await db
          .from('client_gallery_photos')
          .select('id')
          .eq('gallery_id', id)
          .in('id', ids)
          .eq('kind', 'image')
          .order('position')
          .limit(1);
        if (firstImg?.[0]) await db.from('client_galleries').update({ cover_photo_id: firstImg[0].id }).eq('id', id);
      }
      await refreshCounts(id);
      return NextResponse.json({ ok: true });
    }

    case 'sign': {
      if (!r2Configured) return jsonError('Stockage R2 non configuré', 503);
      const ids: string[] = Array.isArray(body.ids) ? body.ids.slice(0, 500) : [];
      const method = body.method === 'PUT' ? 'PUT' : 'GET';
      const kinds: RenditionKind[] = (Array.isArray(body.kinds) ? body.kinds : []).filter((k: string) =>
        method === 'PUT' ? k === 'thumb-wm' || k === 'screen-wm' : ['thumb', 'screen', 'web', 'original', 'thumb-wm', 'screen-wm'].includes(k)
      );
      const { data: photos } = await db.from('client_gallery_photos').select('id, ext').eq('gallery_id', id).in('id', ids);
      const urls: Record<string, Record<string, string>> = {};
      for (const p of photos || []) {
        urls[p.id] = Object.fromEntries(
          kinds.map((k) => {
            const key = objectKey(id, p.id, k, p.ext);
            return [k, method === 'PUT' ? uploadUrl(key) : presign('GET', key, { expires: 3600 })];
          })
        );
      }
      return NextResponse.json({ urls });
    }

    case 'set_wm_key': {
      const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
      if (ids.length) await db.from('client_gallery_photos').update({ wm_key: body.wm_key || null }).eq('gallery_id', id).in('id', ids);
      if (body.stored && typeof body.stored === 'object') {
        await Promise.all(
          Object.entries(body.stored as Record<string, number>).map(([pid, n]) =>
            db.from('client_gallery_photos').update({ stored_bytes: Math.round(Number(n)) || 0 }).eq('gallery_id', id).eq('id', pid)
          )
        );
        await refreshCounts(id);
      }
      return NextResponse.json({ ok: true });
    }

    case 'update': {
      const updates: any[] = Array.isArray(body.updates) ? body.updates : [];
      // Regroupe les mises à jour identiques pour limiter les requêtes
      const groups = new Map<string, { patch: any; ids: string[] }>();
      for (const u of updates) {
        const patch: any = {};
        if ('set_id' in u) patch.set_id = u.set_id || null;
        if ('hidden' in u) patch.hidden = !!u.hidden;
        const key = JSON.stringify(patch);
        if (key === '{}') continue;
        if (!groups.has(key)) groups.set(key, { patch, ids: [] });
        groups.get(key)!.ids.push(u.id);
      }
      for (const { patch, ids } of groups.values()) {
        await db.from('client_gallery_photos').update(patch).eq('gallery_id', id).in('id', ids);
      }
      return NextResponse.json({ ok: true });
    }

    case 'reorder': {
      const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
      await Promise.all(
        ids.map((pid, i) => db.from('client_gallery_photos').update({ position: i }).eq('gallery_id', id).eq('id', pid))
      );
      return NextResponse.json({ ok: true });
    }

    case 'delete': {
      const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
      const { data: photos } = await db.from('client_gallery_photos').select('id, ext').eq('gallery_id', id).in('id', ids);
      await deleteObjects((photos || []).flatMap((p: any) => allKeysForPhoto(id, p)));
      await db.from('client_gallery_photos').delete().eq('gallery_id', id).in('id', ids);
      if (gallery.cover_photo_id && ids.includes(gallery.cover_photo_id)) {
        const { data: first } = await db
          .from('client_gallery_photos')
          .select('id')
          .eq('gallery_id', id)
          .eq('ready', true)
          .eq('kind', 'image')
          .order('position')
          .limit(1);
        await db.from('client_galleries').update({ cover_photo_id: first?.[0]?.id ?? null }).eq('id', id);
      }
      await refreshCounts(id);
      return NextResponse.json({ ok: true });
    }
  }
  return jsonError('Action inconnue');
}
