// Bureau à la Carte — Auth utilities
// Cookie-based auth with signed tokens (no external JWT lib needed)
import { cookies } from 'next/headers';
import { supabaseAdmin } from '../supabaseAdmin';
import type { BacAuthPayload, ProfilType } from './types';

const COOKIE_NAME = 'bac_session';
const COOKIE_MAX_AGE = 12 * 60 * 60; // 12h in seconds
const PBKDF2_ITERATIONS = 210_000;

/**
 * Secret de signature des sessions. Plus de valeur par défaut : un secret
 * connu permettrait de forger un cookie admin.
 */
function getSecret(): string {
  const s = process.env.BAC_SESSION_SECRET || process.env.BAC_ADMIN_PASSWORD;
  if (!s) throw new Error('BAC_SESSION_SECRET manquant');
  return s;
}

const toHex = (buf: ArrayBuffer | Uint8Array) =>
  Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

/** Comparaison en temps constant de deux chaînes. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Simple HMAC-like signing using Web Crypto (Edge-compatible)
async function sign(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const sigHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${Buffer.from(payload).toString('base64url')}.${sigHex}`;
}

async function verify(token: string): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigHex] = parts;
  if (!/^[0-9a-f]{64}$/i.test(sigHex)) return null;
  const payload = Buffer.from(payloadB64, 'base64url').toString('utf-8');
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payload));
  return valid ? payload : null;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return toHex(bits);
}

/** Hachage PBKDF2-SHA256 salé : `pbkdf2$<itérations>$<sel>$<empreinte>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${await pbkdf2(password, salt, PBKDF2_ITERATIONS)}`;
}

/** Ancien format (SHA-256 + secret global), conservé pour les profils existants. */
async function legacyHash(password: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password + getSecret())));
}

export function isLegacyHash(hash: string): boolean {
  return !hash.startsWith('pbkdf2$');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (isLegacyHash(hash)) return safeEqual(await legacyHash(password), hash);
  const [, iter, saltHex, expected] = hash.split('$');
  const salt = new Uint8Array((saltHex.match(/.{2}/g) || []).map((h) => parseInt(h, 16)));
  return safeEqual(await pbkdf2(password, salt, Number(iter)), expected);
}

// Create session cookie
export async function createBacSession(profilSlug: string, profilType: ProfilType): Promise<string> {
  const payload: BacAuthPayload = {
    profil_slug: profilSlug,
    profil_type: profilType,
    exp: Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE,
  };
  return sign(JSON.stringify(payload));
}

// Get current session from cookie
export async function getBacSession(): Promise<BacAuthPayload | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;

  const payload = await verify(cookie.value);
  if (!payload) return null;

  try {
    const data: BacAuthPayload = JSON.parse(payload);
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

// Verify admin access
export async function requireBacAdmin(): Promise<boolean> {
  const session = await getBacSession();
  return session?.profil_type === 'admin';
}

// Verify a specific profil type
export async function requireBacProfil(...types: ProfilType[]): Promise<BacAuthPayload | null> {
  const session = await getBacSession();
  if (!session || !types.includes(session.profil_type)) return null;
  return session;
}

// Login flow
export async function loginBac(slug: string, password: string): Promise<{ token: string; type: ProfilType } | null> {
  // Admin special case
  if (slug === 'admin') {
    const adminPw = process.env.BAC_ADMIN_PASSWORD;
    if (!adminPw || !safeEqual(password, adminPw)) return null;
    const token = await createBacSession('admin', 'admin');
    return { token, type: 'admin' };
  }

  // All other profils from DB
  if (!supabaseAdmin) return null;
  const { data: profil } = await supabaseAdmin
    .from('bac_profils_acces')
    .select('*')
    .eq('slug', slug)
    .eq('actif', true)
    .single();

  if (!profil || !profil.mot_de_passe_hash) return null;

  const valid = await verifyPassword(password, profil.mot_de_passe_hash);
  if (!valid) return null;

  // Migration transparente vers PBKDF2 à la première connexion réussie
  if (isLegacyHash(profil.mot_de_passe_hash)) {
    try {
      await supabaseAdmin.from('bac_profils_acces').update({ mot_de_passe_hash: await hashPassword(password) }).eq('slug', profil.slug);
    } catch (e) {
      console.error('BAC: migration du hachage impossible', e);
    }
  }

  const token = await createBacSession(profil.slug, profil.type);
  return { token, type: profil.type };
}

export const BAC_COOKIE_NAME = COOKIE_NAME;
export const BAC_COOKIE_MAX_AGE = COOKIE_MAX_AGE;
