/**
 * Déclinaisons de taille des images du bucket Supabase « medias ».
 *
 * Chaque image WebP `dossier/nom.webp` (originale, 3200 px max) est
 * accompagnée de versions plus légères `dossier/nom.w480.webp`, `.w960`,
 * `.w1600` et `.w2400`, créées à l'envoi (et par `scripts/backfill-image-variants.mjs`
 * pour les images existantes). Le navigateur choisit la plus adaptée à l'écran
 * via `srcset` : un mobile ne télécharge plus une photo de 3200 px.
 *
 * Toutes les largeurs existent toujours (une image plus petite que la
 * déclinaison est simplement réencodée à sa taille), si bien qu'une URL de
 * déclinaison n'est jamais introuvable.
 */

export const VARIANT_WIDTHS = [480, 960, 1600, 2400] as const;

const MEDIAS_MARKER = '/storage/v1/object/public/medias/';

/** `a/b.webp` → `a/b.w960.webp` (chemin de stockage ou URL publique). */
export function variantPath(pathOrUrl: string, width: number): string {
  const q = pathOrUrl.indexOf('?');
  const base = q >= 0 ? pathOrUrl.slice(0, q) : pathOrUrl;
  const query = q >= 0 ? pathOrUrl.slice(q) : '';
  return base.replace(/\.webp$/i, `.w${width}.webp`) + query;
}

export function isVariantPath(path: string): boolean {
  return /\.w\d+\.webp$/i.test(path.split('?')[0]);
}

/** Vrai pour une image originale du bucket medias, qui possède des déclinaisons. */
export function hasVariants(url: string): boolean {
  const clean = url.split('?')[0];
  return clean.includes(MEDIAS_MARKER) && /\.webp$/i.test(clean) && !isVariantPath(clean);
}

/** Plus petite déclinaison couvrant `width` ; l'originale au-delà de la plus grande. */
export function variantUrlFor(url: string, width: number): string {
  if (!hasVariants(url)) return url;
  const w = VARIANT_WIDTHS.find((v) => v >= width);
  return w ? variantPath(url, w) : url;
}

/** Attribut `srcset` complet pour une balise `<img>` (undefined si l'image n'a pas de déclinaisons). */
export function variantSrcSet(url: string | null | undefined): string | undefined {
  if (!url || !hasVariants(url)) return undefined;
  return [...VARIANT_WIDTHS.map((w) => `${variantPath(url, w)} ${w}w`), `${url} 3200w`].join(', ');
}

/** Chemins à supprimer avec une image : l'originale et ses déclinaisons. */
export function withVariants(paths: string[]): string[] {
  const out: string[] = [];
  for (const p of paths) {
    out.push(p);
    if (/\.webp$/i.test(p) && !isVariantPath(p)) VARIANT_WIDTHS.forEach((w) => out.push(variantPath(p, w)));
  }
  return out;
}
