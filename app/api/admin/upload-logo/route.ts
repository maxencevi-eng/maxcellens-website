import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import sharp from 'sharp';

// POST handler: expects form-data with 'file' and 'category' (e.g. 'logos' or 'favicons')
export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    const form = await req.formData();
    const file = form.get('file') as any;
    const category = (form.get('category') as string) || 'other';
    const oldPath = String(form.get('old_path') || '').trim();

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arr = await file.arrayBuffer();
    const inputBuf = Buffer.from(arr);

    // Normalize category to safe folder name
    const folder = category.replace(/[^a-z0-9-_]/gi, '').toLowerCase() || 'uploads';

    // Determine deterministic base filename for common categories so we replace previous files
    let baseName = `${folder}/${Date.now()}`;
    if (folder === 'logos') baseName = `${folder}/site-logo`;
    if (folder === 'favicons') baseName = `${folder}/favicon`;
    // allow a dedicated footer logo stored under logos/footer-logo
    if (folder === 'footer') baseName = `logos/footer-logo`;
    // store footer banner under banners/footer-banner and treat it like a 'contact' quality upload
    if (folder === 'footer-banner') baseName = `banners/footer-banner`;

    // Use sharp to create a compressed WebP only and attempt to keep it under maxSize
    try {
      // Default target is tiny for logos/favicons to keep them extremely small.
      // For the contact photo and footer banner we allow up to 200 KB so they retain quality.
      const MAX_BYTES = (folder === 'contact' || folder === 'footer-banner') ? 500 * 1024 : 5 * 1024; // 500 KB or 5 KB

      // helper: try different sizes and quality to get under MAX_BYTES
      async function generateWebpWithinSize(input: Buffer, maxBytes: number) {
        // Use more generous sizes/qualities for contact photos to keep them visually good
        const highQualityImage = folder === 'contact' || folder === 'footer-banner';
        const widthCandidates = highQualityImage
          ? [2400, 2000, 1600, 1200, 900, 800, 600, 400, 200, 100]
          : [1600, 1200, 800, 400, 200, 100, 64, 48, 32, 24];
        const qualityCandidates = highQualityImage
          ? [92, 86, 80, 72, 64, 56, 48, 40, 32, 24]
          : [82, 72, 62, 52, 42, 32, 22, 12, 8];

        let bestBuf: Buffer | null = null;
        let bestSize = Infinity;

        for (const w of widthCandidates) {
          for (const q of qualityCandidates) {
            try {
              const buf = await sharp(input).resize({ width: w }).webp({ quality: q }).toBuffer();
              const size = buf.length;
              if (size <= maxBytes) return buf; // success
              if (size < bestSize) {
                bestSize = size;
                bestBuf = buf;
              }
            } catch (e) {
              // ignore individual failures and continue
            }
          }
        }

        // If we couldn't reach the target, return the smallest produced buffer
        return bestBuf ?? Buffer.from([]);
      }

      const webpBuf = await generateWebpWithinSize(inputBuf, MAX_BYTES);
      if (!webpBuf.length) {
        return NextResponse.json({ error: 'Format d’image non pris en charge ou fichier invalide' }, { status: 400 });
      }

      // Upload file to bucket 'site-assets'
      const bucket = 'site-assets';
      const webpPath = `${baseName}.webp`;

      // Remove previous files (old webp and png if present)
      try {
        const removePaths: string[] = [];
        if (folder === 'logos') {
          removePaths.push('logos/site-logo.webp', 'logos/site-logo.png');
        } else if (folder === 'favicons') {
          removePaths.push('favicons/favicon.webp', 'favicons/favicon.png');
        } else if (folder === 'footer') {
          removePaths.push('logos/footer-logo.webp', 'logos/footer-logo.png');
        } else if (folder === 'footer-banner') {
          removePaths.push('banners/footer-banner.webp', 'banners/footer-banner.png');
        } else {
          removePaths.push(webpPath);
        }
        if (removePaths.length) {
          try {
            const rem = await supabaseAdmin.storage.from(bucket).remove(removePaths);
            if (rem?.error) console.warn('remove existing files result', rem.error);
          } catch (re) {
            console.warn('remove existing files error', re);
          }
        }
      } catch (remErr: any) {
        console.warn('error removing existing storage objects', remErr);
      }

      const upWebp = await supabaseAdmin.storage.from(bucket).upload(webpPath, webpBuf, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: 'no-cache, no-store, max-age=0'
      });
      if (upWebp.error) {
        console.error('upload webp error', upWebp.error);
        return NextResponse.json({ error: upWebp.error.message || String(upWebp.error) }, { status: 500 });
      }

      if (oldPath && oldPath !== webpPath) {
        await supabaseAdmin.storage.from(bucket).remove([oldPath]).catch((e) => console.warn('upload-logo: remove old failed', e));
      }

      const gp = supabaseAdmin.storage.from(bucket).getPublicUrl(webpPath);
      const webpUrl = gp?.data?.publicUrl || '';
      const version = String(Date.now());

      return NextResponse.json({ webp: webpUrl, path: webpPath, version });
    } catch (err: any) {
      console.error('image processing/upload error', err);
      return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
    }
  } catch (err: any) {
    console.error('upload-logo route error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
