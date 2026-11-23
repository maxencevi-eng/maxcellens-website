import { NextResponse } from 'next/server';
import { cookieOptions, sharedFolderLookup } from '@/lib/clientGalleries/public';
import { decrypt, folderCookieName, ipHash, makeFolderCookie, samePassword } from '@/lib/clientGalleries/security';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ slug: string }> };

const MAX_FAILS = 8;
const WINDOW_MS = 15 * 60000;
// Limiteur en mémoire (par instance) : suffisant avec des mots de passe aléatoires de 8 caractères
const fails = new Map<string, number[]>();

/** POST { password } — ouvre l'accès au dossier partagé (cookie signé 30 jours). */
export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const f = await sharedFolderLookup(slug);
  if (!f) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });

  const key = `${f.id}|${ipHash(req)}`;
  const now = Date.now();
  const recent = (fails.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_FAILS) {
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  if (f.share_password_enc && !samePassword(String(body.password || ''), decrypt(f.share_password_enc))) {
    fails.set(key, [...recent, now]);
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 });
  }
  fails.delete(key);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(folderCookieName(f.id), makeFolderCookie(f.id, f.share_access_version), cookieOptions);
  return res;
}
