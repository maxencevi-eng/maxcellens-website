// proxy.ts — Protects /bac/admin/* routes (formerly middleware.ts)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /bac/admin/* routes (not /bac/admin login page itself)
  if (pathname.startsWith('/bac/admin') && pathname !== '/bac/admin') {
    const sessionCookie = request.cookies.get('bac_session');
    if (!sessionCookie?.value) {
      return NextResponse.redirect(new URL('/bac/admin', request.url));
    }

    // Basic validation — full verification happens server-side
    try {
      const parts = sessionCookie.value.split('.');
      if (parts.length !== 2) {
        return NextResponse.redirect(new URL('/bac/admin', request.url));
      }
      const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
      if (payload.profil_type !== 'admin' || payload.exp < Math.floor(Date.now() / 1000)) {
        return NextResponse.redirect(new URL('/bac/admin', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/bac/admin', request.url));
    }
  }

  // Protect /bac/technique/*
  if (pathname.startsWith('/bac/technique')) {
    const sessionCookie = request.cookies.get('bac_session');
    if (!sessionCookie?.value) {
      return NextResponse.redirect(new URL('/bac/connexion?profil=technique', request.url));
    }
  }

  // Protect /bac/groupe/*
  if (pathname.startsWith('/bac/groupe')) {
    const sessionCookie = request.cookies.get('bac_session');
    if (!sessionCookie?.value) {
      return NextResponse.redirect(new URL('/bac/connexion', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/bac/admin/:path+', '/bac/technique/:path*', '/bac/groupe/:path*'],
};
