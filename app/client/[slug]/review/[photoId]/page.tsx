import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/clientGalleries/db';
import { availability, gallerySlugLookup, hasAccess, visitorId } from '@/lib/clientGalleries/public';
import { displayUrl, objectKey, presign, r2Configured } from '@/lib/clientGalleries/r2';
import { checkPreviewToken } from '@/lib/clientGalleries/security';
import { normalizeReview } from '@/lib/clientGalleries/types';
import ClientReview from '@/components/ClientGallery/ClientReview';
import ClientUnavailable from '@/components/ClientGallery/ClientUnavailable';
import { siteLogoUrl } from '@/lib/clientGalleries/logo';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string; photoId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: 'Review vidéo — Maxcellens',
  robots: { index: false, follow: false, nocache: true },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Salle de review d'une vidéo : mêmes contrôles d'accès que la galerie. */
export default async function ReviewPage({ params, searchParams }: Props) {
  const { slug, photoId } = await params;
  const sp = await searchParams;
  const galleryUrl = `/client/${encodeURIComponent(slug)}`;

  const g = await gallerySlugLookup(slug);
  const previewTok = one(sp.preview);
  const preview = !!g && checkPreviewToken(g.id, g.access_version, previewTok);
  const av = availability(g);
  if (av !== 'ok' && !preview) return <ClientUnavailable reason={av} logo={await siteLogoUrl()} />;
  if (!r2Configured) return <ClientUnavailable reason="setup" />;

  // Accès, inscription e-mail : la galerie s'en charge (porte d'accès), on y renvoie
  const jar = await cookies();
  if (!preview && (!hasAccess(g, jar) || (g.email_gate && !visitorId(g, jar)))) redirect(galleryUrl);
  if (!normalizeReview(g.review).enabled && !preview) redirect(galleryUrl);

  const { data: photo } = await db
    .from('client_gallery_photos')
    .select('id, filename, ext, kind, has_preview')
    .eq('gallery_id', g.id)
    .eq('id', photoId)
    .eq('ready', true)
    .eq('hidden', false)
    .maybeSingle();
  if (!photo || photo.kind !== 'video') redirect(galleryUrl);

  return (
    <ClientReview
      slug={g.slug}
      photoId={photo.id}
      galleryTitle={g.title}
      videoName={photo.filename}
      src={presign('GET', objectKey(g.id, photo.id, 'original', photo.ext), { expires: 12 * 3600, stableWindowSec: 6 * 3600 })}
      poster={photo.has_preview ? displayUrl(objectKey(g.id, photo.id, 'screen')) : null}
      previewToken={preview ? previewTok || null : null}
      requireEmail={normalizeReview(g.review).requireEmail}
    />
  );
}
