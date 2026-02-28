// app/bac/api/auth/route.ts — Login / Logout
import { NextRequest, NextResponse } from 'next/server';
import { loginBac, BAC_COOKIE_NAME, BAC_COOKIE_MAX_AGE, getBacSession } from '../../../../lib/bac/auth';

export async function POST(request: NextRequest) {
  try {
    const { slug, password } = await request.json();
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
      path: '/bac',
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
    path: '/bac',
  });
  return response;
}
