import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../supabaseAdmin';
import { getAuthUser } from '../adminAuth';
import { decrypt, encrypt, generatePassword, generatePin, magicToken, previewToken } from './security';
import { displayUrl, objectKey, r2Configured } from './r2';
import {
  normalizeDesign,
  normalizeDownload,
  normalizeFavorites,
  slugify,
  type AdminGallery,
  type TemplateSettings,
} from './types';

export const db = supabaseAdmin;

/** Garde commune des routes admin : renvoie une réponse d'erreur ou null. */
export async function guardAdmin(req: Request): Promise<NextResponse | null> {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase non configuré' }, { status: 503 });
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  return null;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function rowToAdminGallery(row: any): AdminGallery {
  // La couverture admin utilise la vignette propre, même si un filigrane est actif
  const coverKey = row.cover_photo_id && r2Configured ? objectKey(row.id, row.cover_photo_id, 'thumb') : null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    client_name: row.client_name,
    client_email: row.client_email,
    event_date: row.event_date,
    folder_id: row.folder_id,
    template_id: row.template_id,
    tags: row.tags || [],
    status: row.status,
    access_mode: row.access_mode,
    password: decrypt(row.password_enc),
    magic_link_enabled: !!row.magic_link_enabled,
    magic_token: row.magic_link_enabled ? magicToken(row.id, row.access_version) : null,
    preview_token: previewToken(row.id, row.access_version),
    email_gate: !!row.email_gate,
    expires_at: row.expires_at,
    watermark_id: row.watermark_id,
    download: normalizeDownload(row.download),
    download_pin: decrypt(row.download_pin_enc),
    favorites: normalizeFavorites(row.favorites),
    design: normalizeDesign(row.design),
    share_message: row.share_message,
    intro: row.intro ?? null,
    cover_photo_id: row.cover_photo_id,
    cover_url: coverKey ? displayUrl(coverKey) : null,
    photo_count: row.photo_count || 0,
    bytes_total: Number(row.bytes_total || 0),
    stored_bytes: Number(row.stored_bytes || 0),
    view_count: row.view_count || 0,
    download_count: row.download_count || 0,
    first_viewed_at: row.first_viewed_at,
    last_viewed_at: row.last_viewed_at,
    last_download_at: row.last_download_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at,
    deleted_at: row.deleted_at,
  };
}

/** Slug libre : ajoute -2, -3… si besoin. `exceptId` pour un renommage. */
export async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  const root = slugify(base);
  const { data } = await db.from('client_galleries').select('id, slug').like('slug', `${root}%`);
  const taken = new Set((data || []).filter((r: any) => r.id !== exceptId).map((r: any) => r.slug));
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`;
  return `${root}-${Date.now().toString(36)}`;
}

/** Filigrane par défaut (le premier créé) — pour les modèles « watermark: true ». */
async function defaultWatermarkId(): Promise<string | null> {
  const { data } = await db.from('client_gallery_watermarks').select('id').order('created_at').limit(1);
  return data?.[0]?.id ?? null;
}

/** Traduit les réglages d'un modèle en colonnes de galerie. */
export async function columnsFromTemplate(settings: TemplateSettings | null | undefined) {
  const s = settings || {};
  let watermark_id: string | null = s.watermark_id ?? null;
  if (!watermark_id && s.watermark) watermark_id = await defaultWatermarkId();
  const months = Number(s.expiry_months);
  const expires_at =
    Number.isFinite(months) && months > 0
      ? (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + months);
          d.setHours(23, 59, 0, 0);
          return d.toISOString();
        })()
      : null;
  const download = normalizeDownload(s.download);
  return {
    access_mode: s.access_mode || 'password',
    magic_link_enabled: s.magic_link_enabled !== false,
    email_gate: !!s.email_gate,
    expires_at,
    watermark_id,
    download,
    download_pin_enc: download.pin ? encrypt(generatePin()) : null,
    favorites: normalizeFavorites(s.favorites),
    design: normalizeDesign(s.design),
    share_message: s.share_message || null,
    tags: Array.isArray(s.tags) ? s.tags : [],
  };
}

export type NewGalleryInput = {
  title: string;
  client_name?: string | null;
  client_email?: string | null;
  event_date?: string | null;
  folder_id?: string | null;
  template_id?: string | null;
  slug?: string | null;
  password?: string | null;
  status?: 'draft' | 'published';
};

export async function getTemplate(id: string | null | undefined) {
  if (id) {
    const { data } = await db.from('client_gallery_templates').select('*').eq('id', id).maybeSingle();
    if (data) return data;
  }
  const { data } = await db.from('client_gallery_templates').select('*').order('is_default', { ascending: false }).order('position').limit(1);
  return data?.[0] ?? null;
}

export async function createGallery(input: NewGalleryInput, template?: any) {
  const tpl = template === undefined ? await getTemplate(input.template_id) : template;
  const cols = await columnsFromTemplate(tpl?.settings);
  const slug = await uniqueSlug(input.slug || input.title);
  const status = input.status || 'draft';
  const row = {
    ...cols,
    title: input.title.trim().slice(0, 200) || 'Sans titre',
    slug,
    client_name: input.client_name?.trim() || null,
    client_email: input.client_email?.trim() || null,
    event_date: input.event_date || null,
    folder_id: input.folder_id || null,
    template_id: tpl?.id ?? null,
    password_enc: encrypt(input.password?.trim() || generatePassword()),
    status,
    published_at: status === 'published' ? new Date().toISOString() : null,
  };
  const { data, error } = await db.from('client_galleries').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return data;
}

export async function logEvent(
  galleryId: string,
  type: string,
  extra: { photo_id?: string | null; visitor_id?: string | null; ip_hash?: string | null; meta?: any } = {}
) {
  try {
    await db.from('client_gallery_events').insert({ gallery_id: galleryId, type, ...extra });
  } catch {
    /* journal best-effort */
  }
}

export async function bump(galleryId: string, views: number, downloads: number) {
  try {
    await db.rpc('client_gallery_bump', { p_id: galleryId, p_views: views, p_downloads: downloads });
  } catch {
    /* compteur best-effort */
  }
}

export async function refreshCounts(galleryId: string) {
  await db.rpc('client_gallery_refresh_counts', { p_id: galleryId });
}

