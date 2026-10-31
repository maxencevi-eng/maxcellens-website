"use client";

import { RENDITION_SIZES, type Watermark } from '../../../lib/clientGalleries/types';

/**
 * Rendus générés dans le navigateur de l'admin, au moment de l'envoi.
 *
 * Le serveur (Vercel) ne voit jamais les fichiers : il n'a ni le temps ni la
 * mémoire pour redimensionner 1 000 photos. Le canvas du navigateur, si.
 */

export type Rendered = {
  width: number;
  height: number;
  placeholder: string | null;
  duration?: number;
  blobs: Partial<Record<'thumb' | 'screen' | 'web' | 'thumb-wm' | 'screen-wm', Blob>>;
};

function canvasOf(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function toBlob(c: HTMLCanvasElement, type = 'image/webp', q = 0.84): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Encodage impossible'))), type, q));
}

function fit(w: number, h: number, max: number) {
  const s = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * s), h: Math.round(h * s) };
}

function draw(src: CanvasImageSource, sw: number, sh: number, max: number) {
  const { w, h } = fit(sw, sh, max);
  const c = canvasOf(w, h);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  return c;
}

const logoCache = new Map<string, Promise<HTMLImageElement>>();
function loadLogo(dataUrl: string) {
  if (!logoCache.has(dataUrl)) {
    logoCache.set(
      dataUrl,
      new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = dataUrl;
      })
    );
  }
  return logoCache.get(dataUrl)!;
}

/** Incruste le filigrane dans un canvas (même rendu pour l'aperçu et l'envoi). */
export async function applyWatermark(c: HTMLCanvasElement, wm: Watermark) {
  const ctx = c.getContext('2d')!;
  const W = c.width;
  const H = c.height;
  const margin = Math.round(Math.min(W, H) * wm.margin);
  ctx.save();
  ctx.globalAlpha = wm.opacity;

  let logo: HTMLImageElement | null = null;
  if (wm.kind === 'image' && wm.image_data) logo = await loadLogo(wm.image_data).catch(() => null);

  // Mesure de l'élément à une largeur cible = scale × largeur image
  const targetW = Math.max(24, W * wm.scale);
  let ew: number;
  let eh: number;
  let fontPx = 0;
  if (logo) {
    ew = targetW;
    eh = (logo.naturalHeight / logo.naturalWidth) * ew;
  } else {
    const text = wm.text || '© Maxcellens';
    fontPx = 100;
    ctx.font = `500 ${fontPx}px "Playfair Display", Georgia, serif`;
    const m = ctx.measureText(text);
    fontPx = Math.max(8, (fontPx * targetW) / Math.max(1, m.width));
    ctx.font = `500 ${fontPx}px "Playfair Display", Georgia, serif`;
    ew = ctx.measureText(text).width;
    eh = fontPx;
  }

  const drawAt = (x: number, y: number) => {
    if (logo) ctx.drawImage(logo, x, y, ew, eh);
    else {
      ctx.fillStyle = wm.color || '#ffffff';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = Math.max(2, fontPx * 0.12);
      ctx.fillText(wm.text || '© Maxcellens', x, y);
    }
  };

  if (wm.position === 'tile') {
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 7);
    const stepX = ew * 1.6;
    const stepY = eh * 3.2;
    const R = Math.hypot(W, H);
    for (let y = -R; y < R; y += stepY) {
      const off = (Math.round(y / stepY) % 2) * (stepX / 2);
      for (let x = -R; x < R; x += stepX) drawAt(x + off, y);
    }
  } else {
    const p = wm.position;
    const x = p.endsWith('l') ? margin : p.endsWith('r') ? W - margin - ew : (W - ew) / 2;
    const y = p.startsWith('t') ? margin : p.startsWith('b') ? H - margin - eh : (H - eh) / 2;
    drawAt(x, y);
  }
  ctx.restore();
}

async function placeholderOf(src: CanvasImageSource, sw: number, sh: number) {
  const c = draw(src, sw, sh, 16);
  return c.toDataURL('image/jpeg', 0.5);
}

/** Photo → vignette 640, écran 1600, web 2560 (si plus grande), variantes filigranées. */
export async function renderImage(file: File, wm: Watermark | null): Promise<Rendered> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
  try {
    const { width, height } = bmp;
    const blobs: Rendered['blobs'] = {};
    const thumb = draw(bmp, width, height, RENDITION_SIZES.thumb);
    const screen = draw(bmp, width, height, RENDITION_SIZES.screen);
    blobs.thumb = await toBlob(thumb, 'image/webp', 0.8);
    blobs.screen = await toBlob(screen);
    if (Math.max(width, height) > RENDITION_SIZES.screen * 1.15) {
      blobs.web = await toBlob(draw(bmp, width, height, RENDITION_SIZES.web), 'image/webp', 0.86);
    }
    if (wm) {
      await applyWatermark(thumb, wm);
      await applyWatermark(screen, wm);
      blobs['thumb-wm'] = await toBlob(thumb, 'image/webp', 0.8);
      blobs['screen-wm'] = await toBlob(screen);
    }
    return { width, height, placeholder: await placeholderOf(bmp, width, height), blobs };
  } finally {
    bmp.close?.();
  }
}

/** Vidéo → image extraite (vignette + écran) et durée. Échec silencieux : sans aperçu. */
export async function renderVideo(file: File): Promise<Rendered | null> {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'metadata';
    v.src = url;
    await new Promise<void>((res, rej) => {
      v.onloadedmetadata = () => res();
      v.onerror = () => rej(new Error('vidéo illisible'));
      setTimeout(() => rej(new Error('délai')), 15000);
    });
    const duration = v.duration;
    v.currentTime = Math.min(Math.max(0.5, duration * 0.1), Math.max(0, duration - 0.1));
    await new Promise<void>((res, rej) => {
      v.onseeked = () => res();
      setTimeout(() => rej(new Error('délai')), 15000);
    });
    const width = v.videoWidth;
    const height = v.videoHeight;
    if (!width || !height) return null;
    const thumb = draw(v, width, height, RENDITION_SIZES.thumb);
    const screen = draw(v, width, height, RENDITION_SIZES.screen);
    return {
      width,
      height,
      duration,
      placeholder: await placeholderOf(v, width, height),
      blobs: { thumb: await toBlob(thumb, 'image/webp', 0.8), screen: await toBlob(screen) },
    };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Recharge une image distante (rendu propre) pour y apposer un nouveau filigrane. */
export async function watermarkFromUrl(url: string, wm: Watermark): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Lecture impossible (${res.status})`);
  const bmp = await createImageBitmap(await res.blob());
  try {
    const c = draw(bmp, bmp.width, bmp.height, Math.max(bmp.width, bmp.height));
    await applyWatermark(c, wm);
    return toBlob(c);
  } finally {
    bmp.close?.();
  }
}
