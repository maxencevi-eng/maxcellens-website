import { NextResponse } from 'next/server';
import { db, guardAdmin, jsonError } from '@/lib/clientGalleries/db';

export const dynamic = 'force-dynamic';

const POSITIONS = ['tl', 'tc', 'tr', 'cl', 'c', 'cr', 'bl', 'bc', 'br', 'tile'];

function clean(b: any) {
  const num = (v: any, min: number, max: number, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d;
  };
  const out: any = {};
  if ('name' in b) out.name = String(b.name || 'Filigrane').trim().slice(0, 60);
  if ('kind' in b) out.kind = b.kind === 'image' ? 'image' : 'text';
  if ('text' in b) out.text = String(b.text || '').slice(0, 80);
  if ('image_data' in b) {
    const d = String(b.image_data || '');
    if (d && (!d.startsWith('data:image/') || d.length > 400_000)) throw new Error('Logo invalide ou trop lourd (300 Ko max)');
    out.image_data = d || null;
  }
  if ('position' in b) out.position = POSITIONS.includes(b.position) ? b.position : 'br';
  if ('scale' in b) out.scale = num(b.scale, 0.03, 0.9, 0.18);
  if ('opacity' in b) out.opacity = num(b.opacity, 0.05, 1, 0.7);
  if ('margin' in b) out.margin = num(b.margin, 0, 0.2, 0.03);
  if ('color' in b) out.color = /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : '#ffffff';
  return out;
}

export async function POST(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  try {
    const body = clean({ name: 'Nouveau filigrane', kind: 'text', text: '© Maxcellens', ...(await req.json().catch(() => ({}))) });
    const { data, error } = await db.from('client_gallery_watermarks').insert(body).select('*').single();
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ watermark: data });
  } catch (e: any) {
    return jsonError(e.message);
  }
}

export async function PATCH(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.id) return jsonError('id manquant');
    const patch = { ...clean(body), updated_at: new Date().toISOString() };
    const { data, error } = await db.from('client_gallery_watermarks').update(patch).eq('id', body.id).select('*').single();
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ watermark: data });
  } catch (e: any) {
    return jsonError(e.message);
  }
}

export async function DELETE(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return jsonError('id manquant');
  await db.from('client_gallery_watermarks').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
