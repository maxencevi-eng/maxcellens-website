import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 503 });
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const page = String(form.get('page') || 'unknown');
    const kind = String(form.get('kind') || 'image'); // 'image' or 'video'
    const oldPathRaw = String(form.get('old_path') || '').trim();

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    function toStoragePath(p: string): string | null {
      if (!p) return null;
      const m = p.match(/storage\/v1\/object\/public\/medias\/(.+)$/i);
      if (m?.[1]) return m[1];
      const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
      if (base && p.startsWith(base + '/storage/v1/object/public/medias/')) return p.slice((base + '/storage/v1/object/public/medias/').length);
      if (!/^https?:\/\//i.test(p)) return p;
      return null;
    }
    const oldPathToDelete = oldPathRaw ? (toStoragePath(oldPathRaw) || oldPathRaw) : null;

    // size checks
    const buf = Buffer.from(await (file as any).arrayBuffer());
    const rawSize = buf.length;

    // allow optional folder override (e.g. 'Portrait/Galerie1')
    const folder = String(form.get('folder') || '').replace(/^\/+/, '').replace(/\.+/g, '.');
    if (kind === 'image') {
      // We'll attempt to convert to webp and ensure final <= 200KB
      const targetBytes = 200 * 1024; // 200KB strict target
      let outBuf = buf;
      let finalContentType = (file as any).type || 'image/webp';

      try {
        const sharpImport = await import('sharp');
        const sharp = (sharpImport?.default || sharpImport) as any;

        // try combinations of widths and qualities to reach targetBytes
        const widths = [1920, 1600, 1280, 1024, 800, 600, 400, 300];
        const qualities = [95, 85, 75, 65, 55, 45, 35, 25];
        let best: Buffer | null = null;
        let bestSize = Infinity;

        for (const w of widths) {
          for (const q of qualities) {
            try {
              const p = await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: q }).toBuffer();
              if (!p || p.length === 0) continue;
              if (p.length <= targetBytes) {
                outBuf = p;
                finalContentType = 'image/webp';
                best = p;
                bestSize = p.length;
                break;
              }
              if (p.length < bestSize) { best = p; bestSize = p.length; }
            } catch (_) {
              // ignore individual failures
            }
          }
          if (best && best.length <= targetBytes) break;
        }

        if (!best || best.length > targetBytes) {
          // if we have a best result but still too large, return error
          if (best && best.length > targetBytes) {
            return NextResponse.json({ error: 'Unable to reduce image below 200KB. Try a smaller image.' }, { status: 400 });
          }
        } else {
          outBuf = best as Buffer;
          finalContentType = 'image/webp';
        }
      } catch (e) {
        console.warn('sharp not available or conversion failed', e);
        return NextResponse.json({ error: 'Server does not support image processing' }, { status: 500 });
      }

      const name = `image-${page}-${Date.now()}.webp`;
      const path = folder ? `${folder.replace(/\/+$|^\/+/, '')}/${name}` : `headers/${page}/images/${name}`;
      const { data, error: uploadError } = await supabaseAdmin.storage.from('medias').upload(path, outBuf, { contentType: finalContentType, upsert: true });
      if (uploadError) return NextResponse.json({ error: String(uploadError) }, { status: 500 });

      if (oldPathToDelete && oldPathToDelete !== path) {
        await supabaseAdmin.storage.from('medias').remove([oldPathToDelete]).catch((e) => console.warn('upload-hero-media: remove old image failed', e));
      }

      const gp = supabaseAdmin.storage.from('medias').getPublicUrl(path);
      const publicUrl = (gp && (gp as any).data && ((gp as any).data.publicUrl || (gp as any).data.publicURL)) || (gp as any).publicUrl || (gp as any).publicURL || null;
      const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const fallback = supabaseBase ? `${supabaseBase}/storage/v1/object/public/medias/${path}` : null;
      const url = publicUrl || fallback;

      return NextResponse.json({ kind: 'image', path, url, size: outBuf.length, uploadOk: true });
    }

    // video handling
    if (kind === 'video') {
      const maxVideo = 70 * 1024 * 1024; // 70MB
      if (rawSize > maxVideo) return NextResponse.json({ error: 'Video exceeds 70MB upload limit' }, { status: 400 });

      const extMatch = (file as any).name?.match(/\.([a-z0-9]+)$/i);
      const ext = extMatch ? extMatch[1] : 'mp4';
      const name = `video-${page}-${Date.now()}.${ext}`;
      const path = folder ? `${folder.replace(/\/+$|^\/+/, '')}/${name}` : `headers/${page}/videos/${name}`;

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage.from('medias').upload(path, buf, { contentType: (file as any).type || `video/${ext}`, upsert: true });
      if (uploadError) return NextResponse.json({ error: String(uploadError) }, { status: 500 });

      if (oldPathToDelete && oldPathToDelete !== path) {
        await supabaseAdmin.storage.from('medias').remove([oldPathToDelete]).catch((e) => console.warn('upload-hero-media: remove old video failed', e));
      }

      // build public URL immediately and return it; transcode in background to avoid blocking client
      const gp = supabaseAdmin.storage.from('medias').getPublicUrl(path);
      const url = (gp && (gp as any).data && ((gp as any).data.publicUrl || (gp as any).data.publicURL)) || (gp as any).publicUrl || null;

      // attempt to transcode/poster in the background (do not block response)
      (async () => {
        let transcodes: { mp4?: string; webm?: string; poster?: string } = {};
      try {
        const { spawn } = await import('child_process');
        const tmp = await import('os');
        const tmpdir = tmp.tmpdir();
        const fs = await import('fs/promises');
        const inPath = `${tmpdir}/${name}`;
        await fs.writeFile(inPath, buf);
        const outMp4 = `${tmpdir}/${name}.mp4`;
        const outWebm = `${tmpdir}/${name}.webm`;
        const posterPath = `${tmpdir}/${name}.poster.jpg`;

        // mp4 h264
        await new Promise((resolve, reject) => {
          const p = spawn('ffmpeg', ['-y', '-i', inPath, '-c:v', 'libx264', '-preset', 'fast', '-crf', '28', '-c:a', 'aac', '-movflags', '+faststart', outMp4]);
          p.on('close', (code) => code === 0 ? resolve(null) : reject(new Error('ffmpeg mp4 failed')));
        }).catch(() => null);

        // webm
        await new Promise((resolve, reject) => {
          const p = spawn('ffmpeg', ['-y', '-i', inPath, '-c:v', 'libvpx-vp9', '-b:v', '1M', '-c:a', 'libopus', outWebm]);
          p.on('close', (code) => code === 0 ? resolve(null) : reject(new Error('ffmpeg webm failed')));
        }).catch(() => null);

        // poster
        await new Promise((resolve, reject) => {
          const p = spawn('ffmpeg', ['-y', '-i', inPath, '-ss', '00:00:01.000', '-vframes', '1', posterPath]);
          p.on('close', (code) => code === 0 ? resolve(null) : reject(new Error('ffmpeg poster failed')));
        }).catch(() => null);

        // upload transcodes if they exist
        const fsSync = await import('fs');
        if (fsSync.existsSync(outMp4)) {
          const mp4Buf = await fs.readFile(outMp4);
          const mp4Path = `headers/${page}/videos/${name}.mp4`;
          await supabaseAdmin.storage.from('medias').upload(mp4Path, mp4Buf, { contentType: 'video/mp4', upsert: true });
          const mp4Url = supabaseAdmin.storage.from('medias').getPublicUrl(mp4Path);
          transcodes.mp4 = (mp4Url && (mp4Url as any).data && ((mp4Url as any).data.publicUrl || (mp4Url as any).data.publicURL)) || (mp4Url as any).publicUrl || null;
        }
        if (fsSync.existsSync(outWebm)) {
          const webmBuf = await fs.readFile(outWebm);
          const webmPath = `headers/${page}/videos/${name}.webm`;
          await supabaseAdmin.storage.from('medias').upload(webmPath, webmBuf, { contentType: 'video/webm', upsert: true });
          const webmUrl = supabaseAdmin.storage.from('medias').getPublicUrl(webmPath);
          transcodes.webm = (webmUrl && (webmUrl as any).data && ((webmUrl as any).data.publicUrl || (webmUrl as any).data.publicURL)) || (webmUrl as any).publicUrl || null;
        }
        if (fsSync.existsSync(posterPath)) {
          const posterBuf = await fs.readFile(posterPath);
          // convert poster to webp via sharp if available
          let posterWebp = posterBuf;
          try {
            const sharpImport = await import('sharp');
            const sharp = (sharpImport?.default || sharpImport) as any;
            posterWebp = await sharp(posterBuf).webp({ quality: 80 }).toBuffer();
          } catch (_) {}
          const posterName = `headers/${page}/videos/${name}.poster.webp`;
          await supabaseAdmin.storage.from('medias').upload(posterName, posterWebp, { contentType: 'image/webp', upsert: true });
          const posterUrl = supabaseAdmin.storage.from('medias').getPublicUrl(posterName);
          transcodes.poster = (posterUrl && (posterUrl as any).data && ((posterUrl as any).data.publicUrl || (posterUrl as any).data.publicURL)) || (posterUrl as any).publicUrl || null;
        }

        // cleanup tmp files (best-effort)
        try { await fs.unlink(inPath).catch(()=>{}); await fs.unlink(outMp4).catch(()=>{}); await fs.unlink(outWebm).catch(()=>{}); await fs.unlink(posterPath).catch(()=>{}); } catch(_){ }

        // optionally: could update headers/site_settings with poster/transcode URLs (omitted)
        } catch (e) {
          console.warn('background transcode failed', e);
        }
      })();

      return NextResponse.json({ kind: 'video', path, url, transcodes: {} });
    }

    return NextResponse.json({ error: 'Unknown kind' }, { status: 400 });
  } catch (err) {
    console.error('upload-hero-media error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}