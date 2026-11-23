import { NextResponse } from 'next/server';
import { db } from './db';
import {
  ACCESS_COOKIE_DAYS,
  accessCookieName,
  checkAccessCookie,
  checkFolderCookie,
  checkPreviewToken,
  folderCookieName,
  readVisitorCookie,
  visitorCookieName,
} from './security';

/**
 * Accès public aux galeries (pages /client/* et routes /api/client/*).
 */

export type PublicGalleryRow = any;

export type Availability = 'ok' | 'missing' | 'draft' | 'expired';

export async function gallerySlugLookup(slug: string): Promise<PublicGalleryRow | null> {
  if (!db) return null;
  const { data } = await db
    .from('client_galleries')
    .select('*')
    .eq('slug', String(slug || '').toLowerCase())
    .is('deleted_at', null)
    .maybeSingle();
  return data ?? null;
}

export function availability(g: PublicGalleryRow | null): Availability {
  if (!g) return 'missing';
  if (g.status !== 'published') return 'draft';
  if (g.expires_at && new Date(g.expires_at).getTime() < Date.now()) return 'expired';
  return 'ok';
}

type CookieReader = { get(name: string): { value: string } | undefined };

/**
 * Accès à une galerie : mode sans mot de passe, cookie de la galerie, ou
 * accès ouvert à un dossier partagé qui la contient (même indirectement).
 */
export async function hasAccess(g: PublicGalleryRow, cookies: CookieReader): Promise<boolean> {
  if (g.access_mode !== 'password') return true;
  if (checkAccessCookie(cookies.get(accessCookieName(g.id))?.value, g.id, g.access_version)) return true;
  return g.folder_id ? accessViaSharedFolder(g.folder_id, cookies) : false;
}

/* ── Dossiers partagés ─────────────────────────────────────────────────── */

export type SharedFolderRow = {
  id: string;
  name: string;
  event_date: string | null;
  parent_id: string | null;
  share_enabled: boolean;
  share_slug: string | null;
  share_password_enc: string | null;
  share_access_version: number;
};

const FOLDER_COLS = 'id, name, event_date, parent_id, share_enabled, share_slug, share_password_enc, share_access_version';

/** Tous les dossiers (table courte). Vide si la migration du partage n'est pas passée. */
async function allFoldersForShare(): Promise<SharedFolderRow[]> {
  if (!db) return [];
  const { data, error } = await db.from('client_gallery_folders').select(FOLDER_COLS);
  return error ? [] : ((data || []) as SharedFolderRow[]);
}

export async function sharedFolderLookup(slug: string): Promise<SharedFolderRow | null> {
  if (!db || !slug) return null;
  const { data, error } = await db
    .from('client_gallery_folders')
    .select(FOLDER_COLS)
    .eq('share_slug', String(slug).toLowerCase())
    .eq('share_enabled', true)
    .maybeSingle();
  return error ? null : ((data as SharedFolderRow) ?? null);
}

export function hasFolderAccess(f: SharedFolderRow, cookies: CookieReader): boolean {
  if (!f.share_password_enc) return true;
  return checkFolderCookie(cookies.get(folderCookieName(f.id))?.value, f.id, f.share_access_version);
}

async function accessViaSharedFolder(folderId: string, cookies: CookieReader): Promise<boolean> {
  const folders = await allFoldersForShare();
  const byId = new Map(folders.map((f) => [f.id, f]));
  let cur = byId.get(folderId);
  for (let guard = 0; cur && guard < 50; guard++) {
    if (cur.share_enabled && cur.share_slug && hasFolderAccess(cur, cookies)) return true;
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return false;
}

/** Galeries visibles d'un dossier partagé : publiées, non expirées, sous-dossiers compris. */
export async function sharedFolderGalleries(folderId: string): Promise<PublicGalleryRow[]> {
  const folders = await allFoldersForShare();
  const ids = new Set([folderId]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const f of folders) {
      if (f.parent_id && ids.has(f.parent_id) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }
  const { data } = await db
    .from('client_galleries')
    .select('*')
    .in('folder_id', Array.from(ids))
    .is('deleted_at', null)
    .eq('status', 'published')
    .order('title');
  return (data || []).filter((g: any) => availability(g) === 'ok');
}

export function visitorId(g: PublicGalleryRow, cookies: CookieReader): string | null {
  return readVisitorCookie(cookies.get(visitorCookieName(g.id))?.value, g.id);
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: ACCESS_COOKIE_DAYS * 86400,
};

/** Lit les cookies d'une requête d'API (sans dépendre de next/headers). */
export function requestCookies(req: Request): CookieReader {
  const raw = req.headers.get('cookie') || '';
  const map = new Map<string, string>();
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) map.set(part.slice(0, i).trim(), decodeURIComponent(part.slice(i + 1).trim()));
  }
  return { get: (n) => (map.has(n) ? { value: map.get(n)! } : undefined) };
}

/** En-tête porté par les appels faits depuis l'aperçu admin. */
export const PREVIEW_HEADER = 'x-cg-preview';

/**
 * Charge la galerie d'une route d'API publique et vérifie disponibilité +
 * accès. Renvoie soit la galerie, soit la réponse d'erreur à retourner.
 *
 * Un jeton d'aperçu admin valide (en-tête x-cg-preview) ouvre aussi les
 * brouillons et galeries expirées : l'aperçu doit permettre de tout tester.
 */
export async function guardPublic(
  req: Request,
  slug: string,
  opts: { requireAccess?: boolean } = { requireAccess: true }
): Promise<{ g: PublicGalleryRow; cookies: CookieReader; preview: boolean } | { error: NextResponse }> {
  const g = await gallerySlugLookup(slug);
  const cookies = requestCookies(req);
  if (g && checkPreviewToken(g.id, g.access_version, req.headers.get(PREVIEW_HEADER))) {
    return { g, cookies, preview: true };
  }
  const av = availability(g);
  if (av !== 'ok') {
    const msg = av === 'draft' ? 'Galerie non publiée' : av === 'expired' ? 'Galerie expirée' : 'Galerie introuvable';
    return { error: NextResponse.json({ error: msg }, { status: 404 }) };
  }
  if (opts.requireAccess !== false && !(await hasAccess(g, cookies))) {
    return { error: NextResponse.json({ error: 'Accès expiré : rechargez la page' }, { status: 401 }) };
  }
  return { g, cookies, preview: false };
}
