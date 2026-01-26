import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    const body = await req.json();
    const page = String(body?.page || '').trim();
    const paths = Array.isArray(body?.paths) ? body.paths.map((p: any) => String(p).trim()).filter(Boolean) : null;
    if (!page) return NextResponse.json({ error: 'page required' }, { status: 400 });

    // read existing header (or site_settings fallback)
    let prevPaths: string[] = [];
    try {
      const { data: headerRow, error } = await supabaseAdmin.from('headers').select('*').eq('page', page).limit(1).maybeSingle();
      if (error) {
        // proceed to site_settings fallback
        console.warn('delete-hero-media: headers read error', error);
      }
      const row = headerRow as any;
      if (row) {
        if (row.image_path) prevPaths.push(row.image_path);
        if (row.public_url && typeof row.public_url === 'string' && !/^https?:\/\//i.test(row.public_url)) prevPaths.push(row.public_url);
        try {
          const s = row.settings || {};
          if (s.image_path) prevPaths.push(s.image_path);
          if (s.path) prevPaths.push(s.path);
          if (Array.isArray(s.slides)) prevPaths.push(...s.slides);
        } catch (_) {}
      } else {
        // site_settings fallback
        try {
          const key = `hero_${page}`;
          const { data: ss, error: sErr } = await supabaseAdmin.from('site_settings').select('value').eq('key', key).limit(1).maybeSingle();
          if (!sErr && ss && typeof ss.value === 'string') {
            try {
              const parsed = JSON.parse(ss.value);
              const s = parsed?.settings || {};
              if (s.image_path) prevPaths.push(s.image_path);
              if (s.path) prevPaths.push(s.path);
              if (Array.isArray(s.slides)) prevPaths.push(...s.slides);
            } catch (e) { console.warn('delete-hero-media: failed parse site_settings', e); }
          }
        } catch (e) { console.warn('delete-hero-media: site_settings read error', e); }
      }
    } catch (e) {
      console.warn('delete-hero-media: read existing header failed', e);
    }

    // Normalize candidates: accept either storage paths or public URLs
    const supabaseBase = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
    function urlToStoragePath(p: string) {
      if (!p) return null;
      // match supabase public storage shape: /storage/v1/object/public/medias/{path}
      const m = p.match(/storage\/v1\/object\/public\/medias\/(.+)$/i);
      if (m && m[1]) return m[1];
      // if full URL includes our supabase base + storage path
      if (supabaseBase) {
        const prefix = supabaseBase.replace(/\/$/, '') + '/storage/v1/object/public/medias/';
        if (p.startsWith(prefix)) return p.slice(prefix.length);
      }
      return null;
    }

    const candidates = (paths && paths.length) ? paths : prevPaths;
    const toDelete = Array.from(new Set(candidates.map((p: string) => {
      if (!p || typeof p !== 'string') return '';
      const trimmed = p.trim();
      // if it's an http(s) url, try to convert to storage path
      if (/^https?:\/\//i.test(trimmed)) {
        const conv = urlToStoragePath(trimmed);
        return conv || '';
      }
      return trimmed;
    }).filter(Boolean)));

    if (!toDelete.length) return NextResponse.json({ ok: true, removed: [] });

    try {
      const rem = await supabaseAdmin.storage.from('medias').remove(toDelete);
      if (rem?.error) {
        console.warn('delete-hero-media: remove error', rem.error);
        return NextResponse.json({ error: rem.error, removed: [] }, { status: 500 });
      }
      console.info('delete-hero-media: removed', toDelete);
      return NextResponse.json({ ok: true, removed: toDelete });
    } catch (e) {
      console.warn('delete-hero-media: unexpected remove error', e);
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  } catch (err) {
    console.error('POST /api/admin/delete-hero-media error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
