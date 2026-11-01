import { NextResponse } from 'next/server';
import { db } from '@/lib/clientGalleries/db';
import { cookieOptions, guardPublic } from '@/lib/clientGalleries/public';
import { makeVisitorCookie, visitorCookieName } from '@/lib/clientGalleries/security';
import { normalizeReview } from '@/lib/clientGalleries/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ slug: string }> };

/**
 * POST { name, email, purpose? } — identifie le visiteur (favoris, inscription
 * e-mail, review). Pour une review dont l'e-mail est facultatif
 * (purpose: 'review'), le nom seul suffit.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const r = await guardPublic(req, slug);
  if ('error' in r) return r.error;
  const { g } = r;

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
  const name = String(body.name || '').trim().slice(0, 120) || null;
  const review = normalizeReview(g.review);
  const emailOptional = body.purpose === 'review' && review.enabled && !review.requireEmail;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Adresse e-mail invalide' }, { status: 400 });
  }
  if (!email && !emailOptional) return NextResponse.json({ error: 'Adresse e-mail requise' }, { status: 400 });
  if (!email && !name) return NextResponse.json({ error: 'Indiquez au moins votre nom' }, { status: 400 });

  // Même e-mail = même visiteur : ses favoris le suivent d'un appareil à l'autre.
  // Sans e-mail, chaque identification crée un visiteur (reconnu ensuite par son cookie).
  const { data: existing } = email
    ? await db.from('client_gallery_visitors').select('id').eq('gallery_id', g.id).eq('email', email).maybeSingle()
    : { data: null };
  let id = existing?.id as string | undefined;
  if (!id) {
    const { data, error } = await db.from('client_gallery_visitors').insert({ gallery_id: g.id, email: email || null, name }).select('id').single();
    if (error) { console.error('client visitor', error); return NextResponse.json({ error: 'Enregistrement impossible, réessayez' }, { status: 500 }); }
    id = data.id;
  } else if (name) {
    await db.from('client_gallery_visitors').update({ name }).eq('id', id);
  }

  const { data: favs } = await db.from('client_gallery_favorites').select('photo_id').eq('visitor_id', id);
  const res = NextResponse.json({ ok: true, favorites: (favs || []).map((f: any) => f.photo_id) });
  res.cookies.set(visitorCookieName(g.id), makeVisitorCookie(g.id, id!), { ...cookieOptions, maxAge: 365 * 86400 });
  return res;
}
