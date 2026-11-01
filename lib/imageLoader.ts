'use client';

import { variantUrlFor } from './imageVariants';

/**
 * Loader de `next/image` : sert la déclinaison de taille adaptée (voir
 * lib/imageVariants.ts) pour les images du bucket « medias ». Next génère le
 * `srcset` à partir de `deviceSizes` / `imageSizes` et le navigateur choisit
 * selon la largeur d'affichage et la densité de l'écran.
 *
 * Les autres images (logo, miniatures YouTube…) sont servies telles quelles :
 * aucune transformation à la volée, donc aucun coût ni délai de traitement.
 */
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  return variantUrlFor(src, width);
}
