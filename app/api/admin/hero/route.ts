import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin, getHeaderForPage } from '../../../../lib/supabaseAdmin'

function normalizeSlug(s: string): string {
  return (s || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || '';
}

/** Synchronise le hero galeries-<slug> vers gallery_pages (image de couverture + focus). */
async function syncHeroToGalleryPages(page: string, mode: string | undefined, settings: any): Promise<void> {
  if (!supabaseAdmin || typeof page !== 'string' || !page.startsWith('galeries-')) return;
  const slug = normalizeSlug(page.slice('galeries-'.length));
  if (!slug) return;
  try {
    const { data: row } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'gallery_pages').maybeSingle();
    if (!row?.value || typeof row.value !== 'string') return;
    const parsed = JSON.parse(row.value);
    const pages = Array.isArray(parsed?.pages) ? parsed.pages : [];
    const idx = pages.findIndex((p: any) => normalizeSlug(String(p?.slug || '')) === slug);
    if (idx < 0) return;
    if (mode === 'image' && settings?.url) {
      pages[idx] = { ...pages[idx], headerImageUrl: settings.url, headerImagePath: settings.path ?? pages[idx].headerImagePath, headerImageFocus: settings?.focus ?? pages[idx].headerImageFocus };
    } else {
      pages[idx] = { ...pages[idx], headerImageUrl: undefined, headerImagePath: undefined, headerImageFocus: undefined };
    }
    await supabaseAdmin.from('site_settings').upsert({ key: 'gallery_pages', value: JSON.stringify({ pages }) }, { onConflict: 'key' });
  } catch (e) {
    console.warn('syncHeroToGalleryPages failed', e);
  }
}

export async function GET(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    const url = new URL(req.url);
    const slug = String(url.searchParams.get('slug') || '');
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    const raw = url.searchParams.get('raw');
    if (raw) {
      try {
        const existing = await supabaseAdmin.from('headers').select('*').eq('page', slug).limit(1).maybeSingle();
        if (existing && (existing as any).data) return NextResponse.json({ ok: true, data: (existing as any).data });
        // fallback to site_settings if headers row not present
        const data = await getHeaderForPage(slug);
        return NextResponse.json({ ok: true, data: data || null });
      } catch (e) {
        console.error('GET /api/admin/hero raw read error', e);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
    }

    // Default behavior: prefer site_settings fallback via getHeaderForPage so the editor can load heroes stored there
    const data = await getHeaderForPage(slug);
    return NextResponse.json({ ok: true, data: data || null });
  } catch (err) {
    console.error('GET /api/admin/hero error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { page, mode: incomingMode, settings, settings_site } = body || {};
    if (!page) return NextResponse.json({ error: 'page required' }, { status: 400 });
    const payload: any = { page };
    if (typeof incomingMode !== 'undefined') payload.mode = incomingMode;
    // Only include `settings` if caller provided it — avoid overwriting existing media data
    if (typeof settings !== 'undefined') payload.settings = settings;
    if (typeof settings_site !== 'undefined') payload.settings_site = settings_site;
    // Keep backward-compatible columns like image_path/public_url if provided
    if (body.image_path) payload.image_path = body.image_path;
    if (body.public_url) payload.public_url = body.public_url;

    // NOTE: do not inject an empty string for `image_path` here — some
    // schemas enforce a check constraint forbidding empty values. If the
    // database requires a non-null/non-empty `image_path`, fix the schema
    // instead (see guidance below). Only include `image_path` when it is
    // explicitly provided by the caller.

    // read the previous row so we can delete previous files after successful upsert
    let prevPaths: string[] = [];
    try {
      const existing = await supabaseAdmin.from('headers').select('*').eq('page', page).limit(1).maybeSingle();
      if (existing && (existing as any).data) {
        const prev = (existing as any).data;
        if (prev.image_path) prevPaths.push(prev.image_path);
        if (prev.public_url && typeof prev.public_url === 'string' && !/^https?:\/\//i.test(prev.public_url)) prevPaths.push(prev.public_url);
        try {
          const prevSettings = prev.settings || {};
          if (prevSettings.image_path) prevPaths.push(prevSettings.image_path);
          if (prevSettings.path) prevPaths.push(prevSettings.path);
          if (Array.isArray(prevSettings.slides)) prevPaths.push(...prevSettings.slides);
        } catch (_) {}
      }
    } catch (e) { console.warn('Could not read existing header before upsert', e); }

    let { data, error } = await supabaseAdmin.from('headers').upsert(payload, { onConflict: 'page' });
    if (error) {
      console.error('hero upsert error', { error, payload });
      const msg = (error as any)?.message || String(error);
      const details = (error as any)?.details || null;

      // Common issue: some schemas may not have `settings` or `mode` columns – try fallbacks
      if (
        msg.toLowerCase().includes('settings') ||
        msg.toLowerCase().includes('column "settings"') ||
        msg.toLowerCase().includes('mode') ||
        msg.toLowerCase().includes('column "mode"') ||
        msg.toLowerCase().includes('could not find') ||
        msg.toLowerCase().includes('schema cache')
      ) {
        try {
          // First attempt: upsert without settings (if settings column missing)
          if (msg.toLowerCase().includes('settings') || msg.toLowerCase().includes('column "settings"')) {
            const fallbackPayload = { ...payload };
            delete (fallbackPayload as any).settings;
            const r = await supabaseAdmin.from('headers').upsert(fallbackPayload, { onConflict: 'page' });
            if (!r.error) return NextResponse.json({ ok: true, data: r.data, warning: 'settings column not present, settings omitted' });
          }

          // If mode or other columns are missing, fallback to site_settings storage under key `hero_{page}`
          const storeKey = `hero_${page}`;

          // attempt to remove previous files referenced in existing store (best-effort)
          try {
            const { data: existing, error: existingErr } = await supabaseAdmin.from('site_settings').select('value').eq('key', storeKey).limit(1).maybeSingle();
            if (!existingErr && existing && typeof existing.value === 'string') {
              try {
                const prev = JSON.parse(existing.value);
                const prevSettings = prev?.settings || {};
                const toRemove: string[] = [];
                if (prevSettings.image_path) toRemove.push(prevSettings.image_path);
                if (Array.isArray(prevSettings.slides)) toRemove.push(...prevSettings.slides);
                if (prevSettings.path) toRemove.push(prevSettings.path);
                // remove best-effort
                if (toRemove.length) {
                  try { await supabaseAdmin.storage.from('medias').remove(toRemove); } catch (e) { console.warn('Failed to remove previous hero files from medias', e); }
                }
              } catch (e) { console.warn('Failed to parse previous hero site_settings for cleanup', e); }
            }
          } catch (e) { console.warn('Failed checking previous site_settings for hero', e); }

          const val = JSON.stringify({ mode: incomingMode, settings });
          const up = await supabaseAdmin.from('site_settings').upsert({ key: storeKey, value: val }, { onConflict: 'key' });
          if (up.error) {
            console.error('hero upsert to site_settings failed', up.error);
            return NextResponse.json({ error: up.error?.message || String(up.error) }, { status: 500 });
          }
          await syncHeroToGalleryPages(page, incomingMode, settings);
          // Revalidate the page so the server-rendered version picks up the new image immediately
          try {
            const pagePath = page === 'home' ? '/' : `/${page}`;
            revalidatePath(pagePath);
          } catch (_) {}
          return NextResponse.json({ ok: true, data: up.data, warning: 'headers table missing columns, stored hero configuration in site_settings' });
        } catch (fallbackErr: any) {
          console.error('hero upsert fallback exception', fallbackErr);
          return NextResponse.json({ error: fallbackErr?.message || String(fallbackErr) }, { status: 500 });
        }
      }

      return NextResponse.json({ error: msg, details }, { status: 500 });
    }

    // upsert succeeded; attempt to remove any previous storage paths that are no longer referenced (best-effort)
    try {
      // build new referenced paths from payload
      const newPaths: string[] = [];
      // Only collect new paths from fields that were explicitly included in the upsert payload.
      if (Object.prototype.hasOwnProperty.call(payload, 'image_path') && payload.image_path) newPaths.push(payload.image_path);
      if (Object.prototype.hasOwnProperty.call(payload, 'public_url') && payload.public_url && typeof payload.public_url === 'string' && !/^https?:\/\//i.test(payload.public_url)) newPaths.push(payload.public_url);
      try {
        if (Object.prototype.hasOwnProperty.call(payload, 'settings') && payload.settings) {
          const s = payload.settings || {};
          if (s.path) newPaths.push(s.path);
          if (Array.isArray(s.slides)) newPaths.push(...s.slides);
        }
      } catch (_) {}

      // normalize: only storage-like paths (not http urls)
      // If we didn't receive any explicit new paths from the payload, skip cleanup to avoid deleting existing media.
      const normPrev = prevPaths.filter((p) => typeof p === 'string' && p && !/^https?:\/\//i.test(p));
      const normNew = newPaths.filter((p) => typeof p === 'string' && p && !/^https?:\/\//i.test(p));
      const toRemove = (normNew.length > 0) ? normPrev.filter(p => !normNew.includes(p)) : [];
      if (toRemove.length) {
        try {
          const rem = await supabaseAdmin.storage.from('medias').remove(toRemove);
          if (rem?.error) console.warn('Failed to remove previous hero files', rem.error, toRemove);
        } catch (e) { console.warn('Error removing previous hero files', e); }
      }
    } catch (_) {}

    // If we successfully upserted into `headers`, remove any fallback stored
    // in `site_settings` for this hero so future reads prefer the headers row.
    try {
      const storeKey = `hero_${page}`;
      const del = await supabaseAdmin.from('site_settings').delete().eq('key', storeKey);
      if (del?.error) {
        // not fatal, just log
        console.warn('Failed to remove hero fallback from site_settings', del.error);
      }
    } catch (e) { console.warn('Error removing hero site_settings fallback', e); }

    await syncHeroToGalleryPages(page, payload.mode, payload.settings);

    // Revalidate the page so the server-rendered version picks up the new image immediately
    try {
      const pagePath = page === 'home' ? '/' : `/${page}`;
      revalidatePath(pagePath);
    } catch (_) {}

    return NextResponse.json({ ok: true, data });
  } catch (err:any) {
    console.error('POST /api/admin/hero error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}