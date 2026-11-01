// app/bac/api/auth/route.ts — Login / Logout / SSO
import { NextRequest, NextResponse } from 'next/server';
import { loginBac, createBacSession, BAC_COOKIE_NAME, BAC_COOKIE_MAX_AGE, getBacSession } from '../../../../lib/bac/auth';
import { getAuthUser } from '../../../../lib/adminAuth';
import { clientIp, rateLimit } from '../../../../lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // 10 tentatives par quart d'heure et par IP
    if (!rateLimit(`bac-login:${clientIp(request)}`, 10, 15 * 60_000)) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, { status: 429 });
    }

    const body = await request.json();

    // SSO: if site admin is already logged in via Supabase Auth
    if (body.sso && body.access_token) {
      const user = await getAuthUser(new Request(request.url, { headers: { authorization: `Bearer ${body.access_token}` } }));
      if (!user) {
        return NextResponse.json({ error: 'Token Supabase invalide' }, { status: 401 });
      }
      // Valid Supabase user → auto-create BAC admin session
      const token = await createBacSession('admin', 'admin');
      const response = NextResponse.json({ success: true, type: 'admin', slug: 'admin' });
      response.cookies.set(BAC_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: BAC_COOKIE_MAX_AGE,
        path: '/',
      });
      return response;
    }

    const { slug, password } = body;
    if (!slug || !password) {
      return NextResponse.json({ error: 'Identifiant et mot de passe requis' }, { status: 400 });
    }

    const result = await loginBac(slug, password);
    if (!result) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, type: result.type, slug });
    response.cookies.set(BAC_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: BAC_COOKIE_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET() {
  const session = await getBacSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({ authenticated: true, ...session });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(BAC_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
