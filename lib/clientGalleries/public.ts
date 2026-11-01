import { NextResponse } from 'next/server';
import { db } from './db';
import {
  ACCESS_COOKIE_DAYS,
  accessCookieName,
  checkAccessCookie,
  checkPreviewToken,
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

export function hasAccess(g: PublicGalleryRow, cookies: CookieReader): boolean {
  if (g.access_mode !== 'password') return true;
  return checkAccessCookie(cookies.get(accessCookieName(g.id))?.value, g.id, g.access_version);
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
  if (opts.requireAccess !== false && !hasAccess(g, cookies)) {
    return { error: NextResponse.json({ error: 'Accès expiré : rechargez la page' }, { status: 401 }) };
  }
  return { g, cookies, preview: false };
}
