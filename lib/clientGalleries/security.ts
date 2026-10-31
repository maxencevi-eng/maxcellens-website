import crypto from 'crypto';

/**
 * Secrets, chiffrement et jetons d'accès des galeries clients.
 *
 * GALLERY_SECRET (variable d'environnement, 32+ caractères aléatoires) sert à
 * chiffrer les mots de passe et PIN en base et à signer les cookies d'accès.
 * À défaut, on dérive un secret de la clé service Supabase pour que le module
 * fonctionne dès l'installation — mais définir GALLERY_SECRET reste conseillé :
 * changer de clé Supabase invaliderait sinon tous les accès ouverts.
 */

function rootSecret(): string {
  const s = process.env.GALLERY_SECRET || '';
  if (s.length >= 16) return s;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!fallback) throw new Error('GALLERY_SECRET manquant');
  return crypto.createHash('sha256').update('client-galleries:' + fallback).digest('hex');
}

function derive(label: string): Buffer {
  return crypto.createHmac('sha256', rootSecret()).update(label).digest();
}

/* ── Chiffrement réversible (mots de passe : ré-affichables et exportables) ── */

export function encrypt(plain: string | null | undefined): string | null {
  if (!plain) return null;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', derive('enc'), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), enc.toString('base64url')].join('.');
}

export function decrypt(blob: string | null | undefined): string | null {
  if (!blob) return null;
  try {
    const [v, iv, tag, data] = blob.split('.');
    if (v !== 'v1') return null;
    const d = crypto.createDecipheriv('aes-256-gcm', derive('enc'), Buffer.from(iv, 'base64url'));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([d.update(Buffer.from(data, 'base64url')), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** Comparaison tolérante : casse, espaces et tirets ignorés. */
export function samePassword(input: string, expected: string | null): boolean {
  if (!expected) return false;
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[\s\-_.]/g, '');
  const a = Buffer.from(norm(input));
  const b = Buffer.from(norm(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ── Jetons signés ─────────────────────────────────────────────────────── */

function sign(payload: string, label: string): string {
  return crypto.createHmac('sha256', derive(label)).update(payload).digest('base64url');
}
function safeEq(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Jeton du lien magique : change quand la version d'accès change. */
export function magicToken(galleryId: string, accessVersion: number): string {
  return sign(`${galleryId}|${accessVersion}`, 'magic').slice(0, 22);
}
export function checkMagicToken(galleryId: string, accessVersion: number, token: string | null | undefined): boolean {
  return !!token && safeEq(token, magicToken(galleryId, accessVersion));
}

export const ACCESS_COOKIE_DAYS = 30;
export function accessCookieName(galleryId: string) {
  return `cga_${galleryId.replace(/-/g, '').slice(0, 16)}`;
}
export function visitorCookieName(galleryId: string) {
  return `cgv_${galleryId.replace(/-/g, '').slice(0, 16)}`;
}

export function makeAccessCookie(galleryId: string, accessVersion: number): string {
  const exp = Math.floor(Date.now() / 1000) + ACCESS_COOKIE_DAYS * 86400;
  const body = `${galleryId}|${accessVersion}|${exp}`;
  return `${Buffer.from(body).toString('base64url')}.${sign(body, 'access')}`;
}
export function checkAccessCookie(value: string | undefined, galleryId: string, accessVersion: number): boolean {
  if (!value) return false;
  const [b64, s] = value.split('.');
  if (!b64 || !s) return false;
  let body: string;
  try {
    body = Buffer.from(b64, 'base64url').toString('utf8');
  } catch {
    return false;
  }
  if (!safeEq(s, sign(body, 'access'))) return false;
  const [g, v, exp] = body.split('|');
  return g === galleryId && Number(v) === accessVersion && Number(exp) > Date.now() / 1000;
}

export function makeVisitorCookie(galleryId: string, visitorId: string): string {
  const body = `${galleryId}|${visitorId}`;
  return `${Buffer.from(body).toString('base64url')}.${sign(body, 'visitor')}`;
}
export function readVisitorCookie(value: string | undefined, galleryId: string): string | null {
  if (!value) return null;
  const [b64, s] = value.split('.');
  if (!b64 || !s) return null;
  try {
    const body = Buffer.from(b64, 'base64url').toString('utf8');
    if (!safeEq(s, sign(body, 'visitor'))) return null;
    const [g, v] = body.split('|');
    return g === galleryId ? v : null;
  } catch {
    return null;
  }
}

export function ipHash(req: Request): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  return sign(ip, 'ip').slice(0, 24);
}

/* ── Générateurs ───────────────────────────────────────────────────────── */

// Mots courts, sans accent ni lettre ambiguë à l'oral : dictables au téléphone.
const WORDS = [
  'sable', 'orage', 'phare', 'brume', 'colline', 'rivage', 'cedre', 'lagune', 'sommet', 'galet',
  'aurore', 'falaise', 'prairie', 'torrent', 'glacier', 'bambou', 'corail', 'ambre', 'ocre', 'jade',
  'lotus', 'olive', 'menthe', 'cannelle', 'vanille', 'saphir', 'opale', 'cobalt', 'indigo', 'perle',
  'atlas', 'zenith', 'nuage', 'soleil', 'comete', 'etoile', 'meteore', 'horizon', 'boussole', 'escale',
  'voilier', 'ancre', 'balise', 'rocher', 'vallon', 'bosquet', 'verger', 'jardin', 'tilleul', 'erable',
];

export function generatePassword(): string {
  const w = WORDS[crypto.randomInt(WORDS.length)];
  return `${w}-${crypto.randomInt(1000, 10000)}`;
}
export function generatePin(): string {
  return String(crypto.randomInt(0, 10000)).padStart(4, '0');
}

/** Jeton d'aperçu admin : ouvre aussi les brouillons et galeries expirées, sans compter de vue. */
export function previewToken(galleryId: string, accessVersion: number): string {
  return sign(`${galleryId}|${accessVersion}`, 'preview').slice(0, 22);
}
export function checkPreviewToken(galleryId: string, accessVersion: number, token: string | null | undefined): boolean {
  return !!token && safeEq(token, previewToken(galleryId, accessVersion));
}
