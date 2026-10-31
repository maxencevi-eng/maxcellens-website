import { NextResponse } from 'next/server';
import { db, logEvent } from '@/lib/clientGalleries/db';
import { cookieOptions, guardPublic } from '@/lib/clientGalleries/public';
import { accessCookieName, decrypt, ipHash, makeAccessCookie, samePassword } from '@/lib/clientGalleries/security';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ slug: string }> };

const MAX_FAILS = 8;
const WINDOW_MIN = 15;

/** POST { password } — ouvre l'accès (cookie signé 30 jours). */
export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const r = await guardPublic(req, slug, { requireAccess: false });
  if ('error' in r) return r.error;
  const { g } = r;

  const ip = ipHash(req);
  const since = new Date(Date.now() - WINDOW_MIN * 60000).toISOString();
  const { count } = await db
    .from('client_gallery_events')
    .select('id', { count: 'exact', head: true })
    .eq('gallery_id', g.id)
    .eq('type', 'unlock_fail')
    .eq('ip_hash', ip)
    .gte('created_at', since);
  if ((count || 0) >= MAX_FAILS) {
    return NextResponse.json({ error: `Trop de tentatives. Réessayez dans ${WINDOW_MIN} minutes.` }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  if (!samePassword(String(body.password || ''), decrypt(g.password_enc))) {
    await logEvent(g.id, 'unlock_fail', { ip_hash: ip });
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
  }

  await logEvent(g.id, 'unlock', { ip_hash: ip });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(accessCookieName(g.id), makeAccessCookie(g.id, g.access_version), cookieOptions);
  return res;
}
