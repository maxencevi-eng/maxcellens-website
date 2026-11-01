import { db, uniqueSlug, columnsFromTemplate } from './db';
import { encrypt, generatePassword, generatePin } from './security';
import { allKeysForPhoto, deleteObjects } from './r2';
import { normalizeDesign, normalizeDownload, normalizeFavorites } from './types';

/**
 * Traduit une demande de modification (admin) en colonnes à écrire.
 * Partagé par PATCH /:id et les actions groupées.
 */
export async function buildPatch(body: any, current: any): Promise<Record<string, any>> {
  const p: Record<string, any> = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(body, k);
  let revoke = false;

  if (has('title') && String(body.title).trim()) p.title = String(body.title).trim().slice(0, 200);
  if (has('slug') && String(body.slug).trim()) p.slug = await uniqueSlug(String(body.slug), current.id);
  for (const k of ['client_name', 'client_email', 'event_date', 'folder_id', 'share_message', 'intro', 'cover_photo_id', 'watermark_id']) {
    if (has(k)) p[k] = body[k] === '' ? null : body[k];
  }
  if (has('expires_at')) p.expires_at = body.expires_at || null;
  if (has('tags')) p.tags = Array.isArray(body.tags) ? body.tags.map((t: any) => String(t).trim()).filter(Boolean) : [];
  if (has('add_tag') && body.add_tag) p.tags = Array.from(new Set([...(current.tags || []), String(body.add_tag).trim()]));

  if (has('status') && (body.status === 'draft' || body.status === 'published')) {
    p.status = body.status;
    if (body.status === 'published' && !current.published_at) p.published_at = new Date().toISOString();
  }
  if (has('access_mode') && ['password', 'link', 'public'].includes(body.access_mode)) {
    p.access_mode = body.access_mode;
    if (body.access_mode === 'password' && !current.password_enc && !has('password')) p.password_enc = encrypt(generatePassword());
  }
  if (has('password')) {
    const pw = String(body.password || '').trim();
    if (pw) {
      p.password_enc = encrypt(pw);
      revoke = true;
    }
  }
  if (body.regenerate_password) {
    p.password_enc = encrypt(generatePassword());
    revoke = true;
  }
  if (body.revoke) revoke = true;
  if (has('magic_link_enabled')) p.magic_link_enabled = !!body.magic_link_enabled;
  if (has('email_gate')) p.email_gate = !!body.email_gate;

  if (has('download')) {
    p.download = normalizeDownload({ ...(current.download || {}), ...(body.download || {}) });
    if (p.download.pin && !current.download_pin_enc && !has('download_pin')) p.download_pin_enc = encrypt(generatePin());
  }
  if (has('download_pin')) p.download_pin_enc = body.download_pin ? encrypt(String(body.download_pin).replace(/\D/g, '').slice(0, 8)) : null;
  if (body.regenerate_pin) p.download_pin_enc = encrypt(generatePin());
  if (has('favorites')) p.favorites = normalizeFavorites({ ...(current.favorites || {}), ...(body.favorites || {}) });
  if (has('design')) p.design = normalizeDesign({ ...(current.design || {}), ...(body.design || {}) });

  if (has('apply_template') && body.apply_template) {
    const { data: tpl } = await db.from('client_gallery_templates').select('*').eq('id', body.apply_template).maybeSingle();
    if (tpl) {
      const cols = await columnsFromTemplate(tpl.settings);
      // L'expiration d'un modèle est relative : on la recalcule seulement si demandé
      const { expires_at, tags, download_pin_enc, intro, share_message, ...rest } = cols;
      Object.assign(p, rest, { template_id: tpl.id });
      // Textes : un modèle sans texte ne vide pas celui déjà écrit pour la galerie
      if (intro) p.intro = intro;
      if (share_message) p.share_message = share_message;
      // La couverture et son point d'intérêt sont propres à chaque galerie
      if (current.design?.focus) p.design = { ...p.design, focus: current.design.focus };
      if (cols.download.pin && !current.download_pin_enc) p.download_pin_enc = download_pin_enc;
      if (tags.length) p.tags = Array.from(new Set([...(current.tags || []), ...tags]));
      if (!current.expires_at && expires_at) p.expires_at = expires_at;
    }
  }

  if (has('deleted')) p.deleted_at = body.deleted ? new Date().toISOString() : null;
  if (revoke) p.access_version = (current.access_version || 1) + 1;
  if (Object.keys(p).length) p.updated_at = new Date().toISOString();
  return p;
}

/** Suppression définitive : fichiers R2 puis lignes (cascade). */
export async function destroyGallery(id: string): Promise<void> {
  const { data: photos } = await db.from('client_gallery_photos').select('id, ext').eq('gallery_id', id);
  const keys = (photos || []).flatMap((p: any) => allKeysForPhoto(id, p));
  await deleteObjects(keys);
  await db.from('client_galleries').delete().eq('id', id);
}
