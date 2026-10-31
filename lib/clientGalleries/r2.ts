import crypto from 'crypto';
import type { RenditionKind } from './types';

/**
 * Accès à Cloudflare R2 via des URL pré-signées (AWS Signature V4).
 *
 * Pas de SDK AWS : on n'a besoin que de signer des URL GET / PUT / DELETE, ce
 * qui tient en quelques lignes. Les fichiers ne transitent jamais par Vercel :
 * le navigateur envoie et télécharge directement chez R2.
 *
 * Variables d'environnement : R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, R2_BUCKET. Le bucket reste privé ; sa règle CORS doit
 * autoriser GET/PUT/HEAD depuis le site (voir docs/GALERIES-CLIENTS-2026.md).
 */

const ACCOUNT = process.env.R2_ACCOUNT_ID || '';
const KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const SECRET = process.env.R2_SECRET_ACCESS_KEY || '';
const BUCKET = process.env.R2_BUCKET || '';
const HOST = ACCOUNT ? `${ACCOUNT}.r2.cloudflarestorage.com` : '';
const REGION = 'auto';
const SERVICE = 's3';

export const r2Configured = !!(ACCOUNT && KEY_ID && SECRET && BUCKET);

function rfc3986(s: string) {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}
function hmac(key: Buffer | string, data: string) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}
function sha256hex(data: string) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

const signingKeys = new Map<string, Buffer>();
function signingKey(date: string) {
  let k = signingKeys.get(date);
  if (!k) {
    k = hmac(hmac(hmac(hmac('AWS4' + SECRET, date), REGION), SERVICE), 'aws4_request');
    signingKeys.clear();
    signingKeys.set(date, k);
  }
  return k;
}

function amzDate(d: Date) {
  return d.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

/**
 * URL pré-signée.
 *
 * `stableWindowSec` : la date de signature est arrondie à cette fenêtre, ce
 * qui rend l'URL identique d'un chargement de page à l'autre pendant la
 * fenêtre — le navigateur réutilise alors son cache au lieu de retélécharger
 * chaque vignette à chaque visite.
 */
export function presign(
  method: 'GET' | 'PUT' | 'DELETE' | 'HEAD',
  key: string,
  opts: { expires?: number; query?: Record<string, string>; stableWindowSec?: number } = {}
): string {
  if (!r2Configured) throw new Error('R2 non configuré (variables R2_* manquantes)');
  let now = Date.now();
  if (opts.stableWindowSec) now = Math.floor(now / (opts.stableWindowSec * 1000)) * opts.stableWindowSec * 1000;
  const t = amzDate(new Date(now));
  const date = t.slice(0, 8);
  const scope = `${date}/${REGION}/${SERVICE}/aws4_request`;
  const expires = Math.min(604800, Math.max(1, Math.round(opts.expires ?? 3600)));

  const path = `/${BUCKET}/${key.split('/').map(rfc3986).join('/')}`;
  const params: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${KEY_ID}/${scope}`,
    'X-Amz-Date': t,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host',
    ...(opts.query || {}),
  };
  const qs = Object.keys(params)
    .sort()
    .map((k) => `${rfc3986(k)}=${rfc3986(params[k])}`)
    .join('&');
  const canonical = [method, path, qs, `host:${HOST}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', t, scope, sha256hex(canonical)].join('\n');
  const sig = crypto.createHmac('sha256', signingKey(date)).update(toSign, 'utf8').digest('hex');
  return `https://${HOST}${path}?${qs}&X-Amz-Signature=${sig}`;
}

/* ── Clés de stockage ──────────────────────────────────────────────────── */

export function objectKey(galleryId: string, photoId: string, kind: RenditionKind, ext = 'jpg'): string {
  return kind === 'original' ? `${galleryId}/${photoId}/original.${ext}` : `${galleryId}/${photoId}/${kind}.webp`;
}

/** URL d'affichage (cache navigateur stable 6 h, valable 12 h). */
export function displayUrl(key: string): string {
  return presign('GET', key, { expires: 12 * 3600, stableWindowSec: 6 * 3600 });
}

/** URL de téléchargement « pièce jointe » avec le nom de fichier voulu. */
export function attachmentUrl(key: string, filename: string, expires = 3600): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  return presign('GET', key, {
    expires,
    query: {
      'response-content-disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${rfc3986(filename)}`,
    },
  });
}

export function uploadUrl(key: string): string {
  return presign('PUT', key, { expires: 3 * 3600 });
}

/** Supprime des objets (requêtes DELETE en parallèle, par lots). */
export async function deleteObjects(keys: string[]): Promise<number> {
  if (!r2Configured || keys.length === 0) return 0;
  let ok = 0;
  for (let i = 0; i < keys.length; i += 24) {
    const slice = keys.slice(i, i + 24);
    const res = await Promise.all(
      slice.map((k) =>
        fetch(presign('DELETE', k, { expires: 300 }), { method: 'DELETE' })
          .then((r) => r.ok || r.status === 404)
          .catch(() => false)
      )
    );
    ok += res.filter(Boolean).length;
  }
  return ok;
}

export function allKeysForPhoto(galleryId: string, p: { id: string; ext: string }): string[] {
  return (['original', 'thumb', 'screen', 'web', 'thumb-wm', 'screen-wm'] as RenditionKind[]).map((k) =>
    objectKey(galleryId, p.id, k, p.ext)
  );
}
