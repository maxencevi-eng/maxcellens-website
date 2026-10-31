import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/clientGalleries/db';
import { availability, gallerySlugLookup, hasAccess, visitorId } from '@/lib/clientGalleries/public';
import { displayUrl, objectKey, presign, r2Configured } from '@/lib/clientGalleries/r2';
import { checkPreviewToken, decrypt } from '@/lib/clientGalleries/security';
import { normalizeDesign, normalizeDownload, normalizeFavorites, type ClientPhoto } from '@/lib/clientGalleries/types';
import ClientGallery from '@/components/ClientGallery/ClientGallery';
import ClientGate from '@/components/ClientGallery/ClientGate';
import ClientUnavailable from '@/components/ClientGallery/ClientUnavailable';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const g = await gallerySlugLookup(slug);
  return {
    title: g && availability(g) === 'ok' ? `${g.title} — Maxcellens` : 'Galerie — Maxcellens',
    robots: { index: false, follow: false, nocache: true },
    // Pas d'aperçu de lien : la couverture d'une galerie privée ne doit pas fuiter
    openGraph: null,
    twitter: null,
  };
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function ClientGalleryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const k = one(sp.k);
  if (k) redirect(`/api/client/${encodeURIComponent(slug)}/magic?k=${encodeURIComponent(k)}`);

  const g = await gallerySlugLookup(slug);
  const preview = !!g && checkPreviewToken(g.id, g.access_version, one(sp.preview));
  const av = availability(g);
  if (av !== 'ok' && !preview) return <ClientUnavailable reason={av} />;
  if (!r2Configured) return <ClientUnavailable reason="setup" />;

  const design = normalizeDesign(g.design);
  const wm = !!g.watermark_id;
  const coverId = g.cover_photo_id;
  const coverThumb = coverId ? displayUrl(objectKey(g.id, coverId, wm ? 'thumb-wm' : 'thumb')) : null;
  const eventDate = formatDate(g.event_date);

  const jar = await cookies();
  if (!preview && !hasAccess(g, jar)) {
    return <ClientGate slug={g.slug} mode="password" title={g.title} date={eventDate} cover={coverThumb} theme={design.theme} />;
  }
  const vid = visitorId(g, jar);
  if (!preview && g.email_gate && !vid) {
    return <ClientGate slug={g.slug} mode="email" title={g.title} date={eventDate} cover={coverThumb} theme={design.theme} />;
  }

  const [setsRes, photosRes, favRes] = await Promise.all([
    db.from('client_gallery_sets').select('id, name, position').eq('gallery_id', g.id).order('position'),
    db
      .from('client_gallery_photos')
      .select('id, kind, set_id, filename, ext, bytes, duration, width, height, placeholder, has_web, has_preview')
      .eq('gallery_id', g.id)
      .eq('ready', true)
      .eq('hidden', false)
      .order('position')
      .order('created_at'),
    vid ? db.from('client_gallery_favorites').select('photo_id').eq('visitor_id', vid) : Promise.resolve({ data: [] as any[] }),
  ]);

  const download = normalizeDownload(g.download);
  const photos: ClientPhoto[] = (photosRes.data || []).map((p: any) => {
    const kind = p.kind || 'image';
    const img = kind === 'image';
    // Le filigrane ne concerne que les photos ; une vidéo garde sa vignette propre
    const wmHere = wm && img;
    return {
      id: p.id,
      kind,
      set_id: p.set_id,
      name: p.filename,
      ext: p.ext,
      size: Number(p.bytes || 0),
      duration: p.duration ?? null,
      w: p.width || 3,
      h: p.height || 2,
      ph: p.placeholder,
      thumb: p.has_preview ? displayUrl(objectKey(g.id, p.id, wmHere ? 'thumb-wm' : 'thumb')) : '',
      screen: p.has_preview ? displayUrl(objectKey(g.id, p.id, wmHere ? 'screen-wm' : 'screen')) : '',
      // Avec filigrane, on plafonne l'affichage au rendu 1600 px filigrané
      web: img && !wm && p.has_web ? displayUrl(objectKey(g.id, p.id, 'web')) : null,
      src:
        kind === 'video'
          ? presign('GET', objectKey(g.id, p.id, 'original', p.ext), { expires: 12 * 3600, stableWindowSec: 6 * 3600 })
          : kind === 'file' && download.enabled
            ? presign('GET', objectKey(g.id, p.id, 'original', p.ext), { expires: 6 * 3600, query: { 'response-content-disposition': 'inline' } })
            : null,
    };
  });

  const cover = photos.find((p) => p.id === coverId && p.kind === 'image') || photos.find((p) => p.kind === 'image') || null;

  return (
    <ClientGallery
      slug={g.slug}
      title={g.title}
      date={eventDate}
      clientName={g.client_name}
      intro={g.intro}
      expiresAt={g.expires_at ? formatDate(g.expires_at.slice(0, 10)) : null}
      design={design}
      cover={cover}
      sets={setsRes.data || []}
      photos={photos}
      download={download}
      pinRequired={download.enabled && download.pin && !!decrypt(g.download_pin_enc)}
      favorites={normalizeFavorites(g.favorites)}
      initialFavorites={(favRes.data || []).map((f: any) => f.photo_id)}
      identified={!!vid}
      preview={preview}
    />
  );
}
