import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

const BUCKET = 'seo-assets';
const MAX_BYTES = 500 * 1024; // 500 KB pour OG / Twitter

/** POST — upload d’une image OG ou Twitter pour une page (admin). */
export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    }
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const slug = String(form.get('slug') ?? '').trim();
    const type = String(form.get('type') ?? 'og').toLowerCase() === 'twitter' ? 'twitter' : 'og';
    const oldPath = String(form.get('old_path') ?? '').trim();

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }

    const arr = await file.arrayBuffer();
    let buf: Buffer = Buffer.from(arr);
    const contentType = (file as any).type || 'image/webp';

    try {
      const sharp = (await import('sharp')).default;
      const meta = await sharp(buf).metadata();
      const w = meta.width ?? 1200;
      const out = await sharp(buf)
        .resize({ width: Math.min(w, 1200), withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
      if (out.length <= MAX_BYTES) buf = Buffer.from(out);
    } catch {
      // pas de sharp ou échec: on envoie tel quel (attention à la taille)
    }

    const ext = 'webp';
    const safeSlug = slug.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
    const path = `${type}/${safeSlug}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buf, { contentType: `image/${ext}`, upsert: true });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    if (oldPath && oldPath !== path) {
      await supabaseAdmin.storage.from(BUCKET).remove([oldPath]).catch((e) => console.warn('upload-seo-image: remove old failed', e));
    }

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const url = base ? `${base.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${path}` : '';

    return NextResponse.json({ path, url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 });
  }
}
