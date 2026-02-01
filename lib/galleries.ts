import { supabaseAdmin } from './supabaseAdmin';

export type GallerySubPage = {
  id: string;
  slug: string;
  name: string;
  headerImageUrl?: string;
  headerImagePath?: string;
  headerImageFocus?: { x: number; y: number };
};

export type GalleryPagesData = {
  pages: GallerySubPage[];
};

async function toPublicUrl(val: string | undefined | null): Promise<string | undefined> {
  if (!val || typeof val !== 'string') return undefined;
  if (/^https?:\/\//i.test(val)) return val;
  if (!supabaseAdmin) return val;
  try {
    const res = await supabaseAdmin.storage.from('medias').getPublicUrl(val);
    const url = (res as any)?.data?.publicUrl ?? (res as any)?.data?.publicURL ?? (res as any)?.publicUrl;
    return url || val;
  } catch {
    return val;
  }
}

export async function getGalleryPages(): Promise<GallerySubPage[]> {
  if (!supabaseAdmin) return [];
  try {
    const { data } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'gallery_pages').maybeSingle();
    if (!data?.value) return [];
    const parsed = JSON.parse(data.value as string) as GalleryPagesData;
    const pages = parsed?.pages ?? [];
    const withUrls = await Promise.all(
      pages.map(async (p) => ({
        ...p,
        headerImageUrl: p.headerImageUrl ?? (p.headerImagePath ? await toPublicUrl(p.headerImagePath) : undefined),
      }))
    );
    return withUrls;
  } catch {
    return [];
  }
}

/** Normalise le slug pour la recherche (cohérent avec slugify côté admin). */
function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || slug.toLowerCase();
}

export async function getGalleryPageBySlug(slug: string): Promise<GallerySubPage | null> {
  const pages = await getGalleryPages();
  const normalized = normalizeSlug(slug);
  return pages.find((p) => normalizeSlug(p.slug) === normalized) ?? null;
}

export type GalleryPhotosData = {
  items: Array<{ id: string; image_url: string; image_path?: string; title?: string; width?: number; height?: number }>;
  settings?: { galleryType?: string; columns?: number; aspect?: string; disposition?: string };
};

export async function getGalleryPhotos(slug: string): Promise<GalleryPhotosData> {
  if (!supabaseAdmin) return { items: [], settings: {} };
  try {
    const normalizedSlug = normalizeSlug(slug);
    const key = `gallery_photos_${normalizedSlug}`;
    const { data } = await supabaseAdmin.from('site_settings').select('value').eq('key', key).maybeSingle();
    if (!data?.value) return { items: [], settings: {} };
    const parsed = JSON.parse(data.value as string) as GalleryPhotosData;
    const rawItems = parsed?.items ?? [];
    const items = await Promise.all(
      rawItems.map(async (it: any, i: number) => {
        let imageUrl = it.image_url || it.src || '';
        // Si c'est un chemin Supabase (pas une URL absolue), résoudre en URL publique
        if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
          imageUrl = (await toPublicUrl(imageUrl)) || imageUrl;
        }
        return {
          id: String(it.id ?? i),
          image_url: imageUrl,
          image_path: it.image_path ?? it.path,
          title: it.title ?? '',
          width: it.width,
          height: it.height,
        };
      })
    );
    return { items, settings: parsed?.settings ?? {} };
  } catch {
    return { items: [], settings: {} };
  }
}
