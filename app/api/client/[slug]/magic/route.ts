import { NextResponse } from 'next/server';
import { logEvent } from '@/lib/clientGalleries/db';
import { availability, cookieOptions, gallerySlugLookup } from '@/lib/clientGalleries/public';
import { accessCookieName, checkMagicToken, ipHash, makeAccessCookie } from '@/lib/clientGalleries/security';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ slug: string }> };

/**
 * GET ?k= — lien magique. Pose le cookie d'accès puis redirige vers l'URL
 * propre, pour que le jeton ne reste ni dans la barre d'adresse ni dans
 * l'historique partagé.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const target = new URL(`/client/${encodeURIComponent(slug)}`, url.origin);
  const res = NextResponse.redirect(target, 303);

  const g = await gallerySlugLookup(slug);
  if (g && availability(g) === 'ok' && g.magic_link_enabled && checkMagicToken(g.id, g.access_version, url.searchParams.get('k'))) {
    res.cookies.set(accessCookieName(g.id), makeAccessCookie(g.id, g.access_version), cookieOptions);
    await logEvent(g.id, 'unlock', { ip_hash: ipHash(req), meta: { via: 'magic' } });
  }
  return res;
}
