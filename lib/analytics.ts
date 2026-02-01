/**
 * Server-side helpers for Custom Web Analytics.
 * IP hashing for privacy (GDPR); same algorithm for collect and filter.
 */
import { createHash } from 'crypto';

const SALT = process.env.ANALYTICS_IP_SALT || 'maxcellens-analytics-v1';

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip || typeof ip !== 'string') return null;
  const trimmed = ip.trim();
  if (!trimmed) return null;
  try {
    return createHash('sha256').update(trimmed + SALT).digest('hex');
  } catch {
    return null;
  }
}

export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = headers.get('x-real-ip');
  if (real) return real.trim();
  return null;
}

export function getGeoFromHeaders(headers: Headers): { country: string | null; city: string | null } {
  const country = headers.get('x-vercel-ip-country')?.trim() || headers.get('cf-ipcountry')?.trim() || null;
  const city = headers.get('x-vercel-ip-city')?.trim() || headers.get('cf-ipcity')?.trim() || null;
  return { country: country || null, city: city || null };
}

export type AnalyticsIpFilter = {
  include?: string[] | null;
  exclude?: string[] | null;
};

export function parseIpFilter(value: unknown): AnalyticsIpFilter {
  if (!value || typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value) as { include?: string[]; exclude?: string[] };
    return {
      include: Array.isArray(parsed.include) ? parsed.include.filter((x) => typeof x === 'string') : null,
      exclude: Array.isArray(parsed.exclude) ? parsed.exclude.filter((x) => typeof x === 'string') : null,
    };
  } catch {
    return {};
  }
}

/** Returns list of hashed IPs for filtering (include or exclude). */
export function hashedIpList(ips: string[]): string[] {
  return ips.map((ip) => hashIp(ip)).filter((h): h is string => h != null);
}
