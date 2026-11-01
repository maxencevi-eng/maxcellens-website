// proxy.ts — Protège les espaces privés du Bureau à la carte (ex-middleware.ts).
//
// Les pages vivent dans app/bac/* mais sont servies publiquement sous
// /animation/* (rewrite dans next.config.mjs). Le proxy voit l'URL demandée,
// avant réécriture : il doit donc surveiller les deux préfixes. La vérification
// complète de la signature est faite côté serveur (layout et routes API).
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function readSession(request: NextRequest): { profil_type?: string; exp?: number } | null {
  const value = request.cookies.get('bac_session')?.value;
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  try {
    return JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  // /animation/admin/x et /bac/admin/x → /admin/x
  const path = request.nextUrl.pathname.replace(/^\/(animation|bac)/, '');
  const to = (p: string) => NextResponse.redirect(new URL(`/animation${p}`, request.url));
  const session = readSession(request);
  const expired = !session || (session.exp ?? 0) < Math.floor(Date.now() / 1000);

  if (path.startsWith('/admin/')) {
    if (expired || session?.profil_type !== 'admin') return to('/admin');
  } else if (path.startsWith('/technique')) {
    if (expired) return to('/connexion?profil=technique');
  } else if (path.startsWith('/groupe')) {
    if (expired) return to('/connexion');
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/animation/admin/:path+', '/animation/technique/:path*', '/animation/groupe/:path*',
    '/bac/admin/:path+', '/bac/technique/:path*', '/bac/groupe/:path*',
  ],
};
