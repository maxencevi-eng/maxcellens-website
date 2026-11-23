import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { hasFolderAccess, sharedFolderGalleries, sharedFolderLookup } from '@/lib/clientGalleries/public';
import { displayUrl, objectKey, r2Configured } from '@/lib/clientGalleries/r2';
import { normalizeDesign, normalizeDownload } from '@/lib/clientGalleries/types';
import { siteLogoUrl } from '@/lib/clientGalleries/logo';
import ClientGate from '@/components/ClientGallery/ClientGate';
import ClientUnavailable from '@/components/ClientGallery/ClientUnavailable';
import FolderShare, { type FolderShareItem } from '@/components/ClientGallery/FolderShare';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const f = await sharedFolderLookup(slug);
  return {
    title: f ? f.name : 'Dossier',
    robots: { index: false, follow: false, nocache: true },
    openGraph: null,
    twitter: null,
  };
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Dossier partagé : toutes ses galeries publiées, avec un téléchargement groupé. */
export default async function SharedFolderPage({ params }: Props) {
  const { slug } = await params;
  const [f, logo] = await Promise.all([sharedFolderLookup(slug), siteLogoUrl()]);
  if (!f) return <ClientUnavailable reason="missing" logo={logo} />;
  if (!r2Configured) return <ClientUnavailable reason="setup" logo={logo} />;

  const galleries = await sharedFolderGalleries(f.id);
  const thumb = (g: any) => (g.cover_photo_id ? displayUrl(objectKey(g.id, g.cover_photo_id, g.watermark_id ? 'thumb-wm' : 'thumb')) : null);

  const jar = await cookies();
  if (!hasFolderAccess(f, jar)) {
    const first = galleries.find((g) => g.cover_photo_id);
    return (
      <ClientGate
        slug={f.share_slug!}
        mode="password"
        title={f.name}
        date={formatDate(f.event_date)}
        cover={first ? thumb(first) : null}
        theme="light"
        logo={logo}
        unlockUrl={`/api/partage/${encodeURIComponent(f.share_slug!)}/unlock`}
      />
    );
  }

  const items: FolderShareItem[] = galleries.map((g) => {
    const dl = normalizeDownload(g.download);
    return {
      id: g.id,
      slug: g.slug,
      title: g.title,
      count: g.photo_count || 0,
      bytes: Number(g.bytes_total || 0),
      cover: thumb(g),
      focus: normalizeDesign(g.design).focus || null,
      downloadable: dl.enabled && !dl.pin && dl.sizes.length > 0,
      sizes: dl.enabled ? dl.sizes : [],
    };
  });

  return <FolderShare slug={f.share_slug!} title={f.name} date={formatDate(f.event_date)} items={items} logo={logo} />;
}
