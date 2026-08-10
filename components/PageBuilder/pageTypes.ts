/**
 * Modèle des pages et blocs pilotés depuis l'administration.
 *
 * Utilisable côté serveur : aucune dépendance React.
 */

export type PageStatus = 'draft' | 'published';

export type PageHeaderConfig = {
  /** Affiche un bandeau d'en-tête au-dessus des blocs. */
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  image?: { url: string; path?: string } | null;
  /** Hauteur du bandeau, en % de la hauteur de la fenêtre. */
  heightPercent?: number;
  overlayColor?: string;
  overlayOpacity?: number;
};

export type PageSeoConfig = {
  title?: string;
  description?: string;
  image?: string;
  noindex?: boolean;
};

export type PageBlock<T = Record<string, unknown>> = {
  id: string;
  pageId: string;
  /** Clé dans le registre de blocs. */
  type: string;
  position: number;
  visible: boolean;
  widthMode: 'full' | 'max1600';
  data: T;
};

export type SitePage = {
  id: string;
  slug: string;
  title: string;
  status: PageStatus;
  position: number;
  showInMenu: boolean;
  header: PageHeaderConfig | null;
  seo: PageSeoConfig | null;
  blocks: PageBlock[];
  updatedAt?: string;
};

/** Version allégée servie aux listes (tableau de bord, gestionnaire). */
export type SitePageSummary = {
  id: string;
  slug: string;
  title: string;
  status: PageStatus;
  position: number;
  showInMenu: boolean;
  blockCount: number;
  updatedAt?: string;
};

/**
 * Slugs réservés : ce sont les routes déjà câblées dans `app/`.
 *
 * Next.js donne la priorité aux segments statiques sur la route attrape-tout,
 * donc une page dynamique portant l'un de ces slugs serait créée sans jamais
 * être atteignable. On refuse la création plutôt que de laisser une page
 * fantôme en base.
 */
/**
 * Préfixe des slugs mis à la corbeille.
 *
 * `site_pages.slug` porte une contrainte `UNIQUE` sur TOUTES les lignes, y
 * compris celles marquées supprimées : une page en corbeille continuait donc
 * d'occuper son slug, rendant impossible la recréation d'une page au même
 * nom. À la suppression douce, le slug est réécrit sous cette forme —
 * l'adresse redevient libre, et la page reste récupérable puisque son slug
 * d'origine est conservé dans le préfixe.
 *
 * Forme : `__trash/<horodatage>/<slug d'origine>`
 */
export const TRASH_PREFIX = '__trash/';

/** Slug de corbeille pour une page supprimée. */
export function toTrashSlug(slug: string): string {
  return `${TRASH_PREFIX}${Date.now()}/${slug}`;
}

/** Slug d'origine d'une page en corbeille, ou `null` si ce n'en est pas une. */
export function fromTrashSlug(slug: string): string | null {
  if (!slug.startsWith(TRASH_PREFIX)) return null;
  // On retire le préfixe et l'horodatage ; le reste est le slug d'origine,
  // qui peut lui-même contenir des barres obliques.
  const rest = slug.slice(TRASH_PREFIX.length);
  const separator = rest.indexOf('/');
  return separator < 0 ? null : rest.slice(separator + 1);
}

export function isTrashSlug(slug: string): boolean {
  return typeof slug === 'string' && slug.startsWith(TRASH_PREFIX);
}

export const RESERVED_SLUGS = new Set([
  'admin',
  // Réservés au système : pages hôtes des pages historiques et corbeille
  '__builtin',
  '__trash',
  'animation',
  'api',
  'bac',
  'contact',
  'corporate',
  'evenement',
  'galeries',
  'mentions-legales',
  'politique-de-confidentialite',
  'portrait',
  'realisation',
  'view',
  'sitemap.xml',
  'robots.txt',
  'opengraph-image',
  'favicon.ico',
]);

/** Convertit un titre libre en slug d'URL. */
export function slugify(input: string): string {
  return String(input || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    // U+0300–U+036F : marques diacritiques combinantes
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s/-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^[-/]+|[-/]+$/g, '');
}

/**
 * `reason?: undefined` sur la branche valide : sans lui, TypeScript refuse
 * l'accès à `.reason` dans les expressions où le discriminant n'est pas
 * directement narrowé (ternaires, chaînes `&&`).
 */
export type SlugCheck = { ok: true; reason?: undefined } | { ok: false; reason: string };

/** Valide un slug avant création ou renommage. */
export function validateSlug(slug: string): SlugCheck {
  if (!slug) return { ok: false, reason: 'Le slug ne peut pas être vide.' };
  if (slug.length > 120) return { ok: false, reason: 'Le slug est trop long (120 caractères max).' };
  if (!/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(slug)) {
    return {
      ok: false,
      reason: 'Le slug ne peut contenir que des minuscules, des chiffres, des tirets et des barres obliques.',
    };
  }
  const root = slug.split('/')[0];
  if (RESERVED_SLUGS.has(root)) {
    return {
      ok: false,
      reason: `« ${root} » est une page existante du site : choisissez un autre slug.`,
    };
  }
  return { ok: true };
}

/** Ligne Supabase → objet applicatif. */
export function rowToPage(row: any, blocks: PageBlock[] = []): SitePage {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title ?? ''),
    status: row.status === 'published' ? 'published' : 'draft',
    position: Number(row.position ?? 0),
    showInMenu: Boolean(row.show_in_menu),
    header: (row.header as PageHeaderConfig) ?? null,
    seo: (row.seo as PageSeoConfig) ?? null,
    blocks,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export function rowToBlock(row: any): PageBlock {
  return {
    id: String(row.id),
    pageId: String(row.page_id),
    type: String(row.type),
    position: Number(row.position ?? 0),
    visible: row.visible !== false,
    widthMode: row.width_mode === 'max1600' ? 'max1600' : 'full',
    data: (row.data as Record<string, unknown>) ?? {},
  };
}
