import { NextResponse } from 'next/server';
import { db, guardAdmin, jsonError } from '@/lib/clientGalleries/db';
import { normalizeDesign, normalizeDownload, normalizeFavorites, type TemplateSettings } from '@/lib/clientGalleries/types';

export const dynamic = 'force-dynamic';

function cleanSettings(s: any): TemplateSettings {
  const months = Number(s?.expiry_months);
  return {
    access_mode: ['password', 'link', 'public'].includes(s?.access_mode) ? s.access_mode : 'password',
    magic_link_enabled: s?.magic_link_enabled !== false,
    email_gate: !!s?.email_gate,
    expiry_months: Number.isFinite(months) && months > 0 ? Math.round(months) : null,
    watermark_id: s?.watermark_id || null,
    watermark: !s?.watermark_id && !!s?.watermark,
    download: normalizeDownload(s?.download),
    favorites: normalizeFavorites(s?.favorites),
    design: normalizeDesign(s?.design),
    share_message: s?.share_message || null,
    tags: Array.isArray(s?.tags) ? s.tags.filter(Boolean) : [],
  };
}

/** Modèle déduit d'une galerie existante (« Enregistrer comme modèle »). */
async function settingsFromGallery(galleryId: string): Promise<TemplateSettings | null> {
  const { data: g } = await db.from('client_galleries').select('*').eq('id', galleryId).maybeSingle();
  if (!g) return null;
  let expiry_months: number | null = null;
  if (g.expires_at) {
    const ms = new Date(g.expires_at).getTime() - new Date(g.created_at).getTime();
    expiry_months = Math.max(1, Math.round(ms / (30.4 * 86400000)));
  }
  return cleanSettings({
    access_mode: g.access_mode,
    magic_link_enabled: g.magic_link_enabled,
    email_gate: g.email_gate,
    expiry_months,
    watermark_id: g.watermark_id,
    download: g.download,
    favorites: g.favorites,
    design: g.design,
    share_message: g.share_message,
    tags: g.tags,
  });
}

export async function GET(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { data, error } = await db.from('client_gallery_templates').select('*').order('position');
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ templates: data });
}

/** POST { name, description?, settings? | fromGalleryId? } */
export async function POST(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return jsonError('Nom requis');
  const settings = body.fromGalleryId ? await settingsFromGallery(body.fromGalleryId) : cleanSettings(body.settings || {});
  if (!settings) return jsonError('Galerie introuvable', 404);
  const { data: last } = await db.from('client_gallery_templates').select('position').order('position', { ascending: false }).limit(1);
  const { data, error } = await db
    .from('client_gallery_templates')
    .insert({ name, description: body.description || null, settings, position: (last?.[0]?.position ?? -1) + 1 })
    .select('*')
    .single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ template: data });
}

/** PATCH { id, name?, description?, settings? | fromGalleryId?, is_default? } */
export async function PATCH(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  if (!body.id) return jsonError('id manquant');
  const patch: any = { updated_at: new Date().toISOString() };
  if (body.name?.trim()) patch.name = body.name.trim();
  if ('description' in body) patch.description = body.description || null;
  if (body.settings) patch.settings = cleanSettings(body.settings);
  if (body.fromGalleryId) {
    // « Mettre à jour le modèle avec les réglages de cette galerie »
    const fromGallery = await settingsFromGallery(body.fromGalleryId);
    if (!fromGallery) return jsonError('Galerie introuvable', 404);
    patch.settings = fromGallery;
  }
  if (body.is_default) {
    await db.from('client_gallery_templates').update({ is_default: false }).neq('id', body.id);
    patch.is_default = true;
  }
  const { data, error } = await db.from('client_gallery_templates').update(patch).eq('id', body.id).select('*').single();
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ template: data });
}

export async function DELETE(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return jsonError('id manquant');
  await db.from('client_gallery_templates').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
