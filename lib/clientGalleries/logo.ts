import { supabaseAdmin } from '../supabaseAdmin';

/**
 * URL du logo du site (le même que l'en-tête), avec sa version pour casser
 * le cache après un remplacement. `null` si Supabase n'est pas configuré.
 */
export async function siteLogoUrl(): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  let version = '';
  try {
    const { data } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'siteLogoVersion').maybeSingle();
    version = data?.value ? String(data.value) : '';
  } catch {
    /* sans version : URL de base */
  }
  return `${base}/storage/v1/object/public/site-assets/logos/site-logo.webp${version ? `?t=${encodeURIComponent(version)}` : ''}`;
}
