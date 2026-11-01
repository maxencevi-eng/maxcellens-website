import { supabaseAdmin } from './supabaseAdmin';
import { VARIANT_WIDTHS, variantPath } from './imageVariants';

/** Les fichiers ont des noms uniques (horodatés) : cache navigateur/CDN d'un an. */
export const IMMUTABLE_CACHE = '31536000';

/**
 * Crée et envoie les déclinaisons d'une image WebP du bucket « medias ».
 * Qualité 82 : visuellement identique à l'originale à la taille d'affichage,
 * pour un poids bien moindre.
 */
export async function uploadImageVariants(buf: Buffer, path: string): Promise<void> {
  const sharpImport = await import('sharp');
  const sharp = (sharpImport?.default || sharpImport) as any;
  await Promise.all(
    VARIANT_WIDTHS.map(async (w) => {
      const out = await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      const { error } = await supabaseAdmin.storage
        .from('medias')
        .upload(variantPath(path, w), out, { contentType: 'image/webp', upsert: true, cacheControl: IMMUTABLE_CACHE });
      if (error) throw new Error(`variante ${w}px : ${error.message || error}`);
    })
  );
}
