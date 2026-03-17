/**
 * SEO par page — lecture serveur uniquement (SSR).
 * Utilisé par generateMetadata dans l'App Router. Aucun fetch client.
 */

import type { Metadata } from 'next';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

export type PageSeoRow = {
  page_slug: string;
  meta_title: string | null;
  meta_description: string | null;
  h1: string | null;
  canonical_url: string | null;
  robots_index: boolean | null;
  robots_follow: boolean | null;
  og_title: string | null;
  og_description: string | null;
  og_image_path: string | null;
  og_type: string | null;
  og_site_name: string | null;
  twitter_card: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image_path: string | null;
  json_ld: string | null;
  updated_at?: string | null;
};

function toPublicSeoImageUrl(path: string | null | undefined): string | undefined {
  if (!path || !SUPABASE_URL) return undefined;
  const base = SUPABASE_URL.replace(/\/$/, '');
  const clean = path.replace(/^\//, '');
  return `${base}/storage/v1/object/public/seo-assets/${clean}`;
}

/**
 * Récupère les paramètres SEO d'une page via fetch direct PostgREST (côté serveur uniquement).
 * Utilise cache: 'no-store' pour toujours lire les données fraîches depuis Supabase.
 */
export async function getPageSeo(slug: string): Promise<PageSeoRow | null> {
  if (!slug || !SUPABASE_URL) return null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const apiKey = serviceKey || anonKey;
  if (!apiKey) return null;
  try {
    const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/page_seo_settings?select=*&page_slug=eq.${encodeURIComponent(slug)}&limit=1`;
    const resp = await fetch(url, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      cache: 'no-store',
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return Array.isArray(data) && data.length > 0 ? (data[0] as PageSeoRow) : null;
  } catch {
    return null;
  }
}

/**
 * Construit l'objet Metadata Next.js à partir d'une ligne page_seo_settings.
 * Retourne null si pas de données (la page utilisera ses métadonnées par défaut).
 */
export function buildMetadataFromSeo(
  seo: PageSeoRow | null,
  baseUrl?: string
): Metadata | null {
  if (!seo) return null;
  const base = baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const canonical = seo.canonical_url
    ? seo.canonical_url
    : base ? `${base.replace(/\/$/, '')}/${seo.page_slug === 'home' ? '' : seo.page_slug}` : undefined;
  const ogImage = toPublicSeoImageUrl(seo.og_image_path);
  const twitterImage = toPublicSeoImageUrl(seo.twitter_image_path);

  // Meta description : max 300 caractères (reco SEO) pour affichage Google
  const rawDesc = (seo.meta_description ?? '').trim();
  const description = rawDesc.length > 300 ? rawDesc.slice(0, 297).trim() + '…' : rawDesc || undefined;
  const rawOgDesc = (seo.og_description ?? seo.meta_description ?? '').trim();
  const ogDescription = rawOgDesc.length > 300 ? rawOgDesc.slice(0, 297).trim() + '…' : rawOgDesc || description;
  const rawTwDesc = (seo.twitter_description ?? seo.og_description ?? seo.meta_description ?? '').trim();
  const twitterDescription = rawTwDesc.length > 300 ? rawTwDesc.slice(0, 297).trim() + '…' : rawTwDesc || description;

  const metadata: Metadata = {
    title: seo.meta_title ? { absolute: seo.meta_title } : undefined,
    description,
    alternates: canonical ? { canonical } : undefined,
    robots: {
      index: seo.robots_index ?? true,
      follow: seo.robots_follow ?? true,
    },
    openGraph: {
      title: seo.og_title ?? seo.meta_title ?? undefined,
      description: ogDescription,
      type: (seo.og_type as 'website' | 'article') ?? 'website',
      siteName: (seo.og_site_name && String(seo.og_site_name).trim()) ? String(seo.og_site_name).trim() : 'Maxcellens',
      url: canonical,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: (seo.twitter_card as 'summary_large_image' | 'summary') ?? 'summary_large_image',
      title: seo.twitter_title ?? seo.og_title ?? seo.meta_title ?? undefined,
      description: twitterDescription,
      images: twitterImage ? [twitterImage] : undefined,
    },
  };

  return metadata;
}

/** Slugs des pages éditables dans le SEO Command Center. */
export const PAGE_SEO_SLUGS = [
  'home',
  'contact',
  'animation',
  'realisation',
  'evenement',
  'corporate',
  'portrait',
  'galeries',
  'admin',
] as const;

export type PageSeoSlug = (typeof PAGE_SEO_SLUGS)[number];
