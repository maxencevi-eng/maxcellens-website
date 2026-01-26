import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const network = String(form.get('network') || '') || 'unknown';
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const allowed = ['image/png','image/svg+xml','image/jpeg','image/webp'];
    if (!allowed.includes((file as any).type)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });

    // accept uploads up to 5MB then compress to target size (best-effort)
    const uploadLimit = 5 * 1024 * 1024; // 5MB
    const rawBuf = Buffer.from(await (file as any).arrayBuffer());
    if (rawBuf.length > uploadLimit) return NextResponse.json({ error: 'File too large' }, { status: 400 });

    // target maximum size after compression (5 KB as requested)
    const targetMax = 5 * 1024; // bytes

    let buf = rawBuf;
    let finalContentType = (file as any).type;

    // Try to compress using sharp when available (best-effort to reach targetMax)
    try {
      const sharpImport = await import('sharp');
      const sharp = (sharpImport?.default || sharpImport) as any;
      if (sharp) {
        // We'll try converting to webp and progressively reduce size by resizing and lowering quality
        const tryWidths = [800, 400, 200, 128, 96, 64, 48, 32];
        const tryQualities = [80, 60, 40, 30, 20, 10];
        let processed: Buffer | null = null;
        outer: for (const q of tryQualities) {
          for (const w of tryWidths) {
            try {
              const out = await sharp(rawBuf).resize({ width: w, withoutEnlargement: true }).webp({ quality: q }).toBuffer();
              if (out && out.length > 0) {
                processed = out;
                if (out.length <= targetMax) break outer;
              }
            } catch (_) {
              // ignore and continue
            }
          }
        }
        // if we didn't get processed small enough, try a lower-quality single step
        if (!processed) {
          try {
            processed = await sharp(rawBuf).webp({ quality: 30 }).toBuffer();
          } catch (_) { processed = null; }
        }
        if (processed && processed.length > 0) {
          buf = processed;
          finalContentType = 'image/webp';
        }
      }
    } catch (e) {
      // sharp not available or failed — proceed with original buffer
      console.warn('sharp not available or compression failed', e);
    }

    const ext = finalContentType === 'image/svg+xml' ? 'svg' : finalContentType === 'image/png' ? 'png' : finalContentType === 'image/webp' ? 'webp' : 'jpg';
    const name = `${network}-${Date.now()}.${ext}`;
    const path = `icons/${name}`;

    // try to remove previous uploaded icons for this network by listing 'icons/' and deleting matches
    try {
      const { data: listData, error: listErr } = await supabaseAdmin.storage.from('site-assets').list('icons');
      if (!listErr && Array.isArray(listData)) {
        const toRemove: string[] = [];
        for (const f of listData) {
          if (!f.name) continue;
          if (f.name.startsWith(`${network}-`)) {
            toRemove.push(`icons/${f.name}`);
          }
        }
        if (toRemove.length) {
          try {
            await supabaseAdmin.storage.from('site-assets').remove(toRemove);
          } catch (e) {
            console.warn('Failed to remove previous icons', toRemove, e);
          }
        }
      }
    } catch (e) {
      console.warn('Error while attempting to list/remove previous icons', e);
    }

    const { data, error: uploadError } = await supabaseAdmin.storage.from('site-assets').upload(path, buf, { contentType: (file as any).type, upsert: true });
    console.log('upload result', { data, uploadError });
    if (uploadError) {
      console.error('upload error', uploadError);
      return NextResponse.json({ url: null, uploadOk: false, uploadError: String(uploadError) }, { status: 500 });
    }

    // list objects in icons/ to help diagnose presence
    try {
      const { data: listData, error: listErr } = await supabaseAdmin.storage.from('site-assets').list('icons');
      console.log('post-upload list icons:', { listErr, listData });
    } catch (e) { console.warn('list icons failed', e); }

    // getPublicUrl may return different shapes depending on supabase client version
    const gp = supabaseAdmin.storage.from('site-assets').getPublicUrl(path);
    let publicUrl: string | null = null;
    try {
      // prefer data.publicUrl (v2) or publicUrl (older shapes)
      publicUrl = (gp && (gp as any).data && ((gp as any).data.publicUrl || (gp as any).data.publicURL)) || (gp as any).publicUrl || (gp as any).publicURL || null;
    } catch (_) { publicUrl = null; }

    // fallback: construct public URL from NEXT_PUBLIC_SUPABASE_URL if missing
    const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const fallbackPublicUrl = supabaseBase ? `${supabaseBase}/storage/v1/object/public/site-assets/${path}` : null;
    if (!publicUrl && fallbackPublicUrl) {
      console.warn('getPublicUrl did not return a value, using fallbackPublicUrl', { fallbackPublicUrl });
      publicUrl = fallbackPublicUrl;
    }

    console.log('getPublicUrl result', { path, publicUrl, raw: gp });

    // verify the public URL is accessible
    let publicUrlOk = false;
    let publicUrlStatus: number | null = null;
    try {
      const fetchRes = await fetch(String(publicUrl), { method: 'HEAD' });
      publicUrlOk = fetchRes.ok;
      publicUrlStatus = fetchRes.status;
      if (!publicUrlOk) console.warn('publicUrl HEAD returned non-ok', publicUrlStatus, publicUrl);
    } catch (e) {
      console.warn('Failed to HEAD publicUrl', publicUrl, e);
    }

    // persist the new public url into site_settings for this network so DB reflects latest
    let upsertOk = true;
    let upsertError: any = null;
    try {
      const key = `socialIcon_${network}`;
      const { data: upsertData, error: upsertErr } = await supabaseAdmin.from('site_settings').upsert({ key, value: String(publicUrl || '') }, { onConflict: 'key' });
      if (upsertErr) {
        upsertOk = false;
        upsertError = upsertErr;
        console.warn('Failed to upsert site_settings for uploaded icon', upsertErr);
      }
    } catch (e) {
      upsertOk = false;
      upsertError = e;
      console.warn('Failed to upsert site_settings for uploaded icon', e);
    }

    return NextResponse.json({
      url: publicUrl || null,
      uploadOk: true,
      publicUrlOk: publicUrlOk,
      publicUrlStatus: publicUrlStatus,
      upsertOk,
      upsertError: upsertError ? String(upsertError) : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
