import { NextResponse } from 'next/server';
import { bump, logEvent } from '@/lib/clientGalleries/db';
import { guardPublic, visitorId } from '@/lib/clientGalleries/public';
import { ipHash } from '@/lib/clientGalleries/security';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ slug: string }> };

/** POST — une visite (envoyée une fois par session de navigation). */
export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const r = await guardPublic(req, slug);
  if ('error' in r) return r.error;
  const ua = req.headers.get('user-agent') || '';
  if (/bot|crawl|spider|preview|facebookexternalhit|slackbot|whatsapp/i.test(ua)) return NextResponse.json({ ok: true });
  await Promise.all([
    logEvent(r.g.id, 'view', { ip_hash: ipHash(req), visitor_id: visitorId(r.g, r.cookies), meta: { ua: ua.slice(0, 160) } }),
    bump(r.g.id, 1, 0),
  ]);
  return NextResponse.json({ ok: true });
}
