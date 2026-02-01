import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHeader from '../../../components/PageHeader/PageHeader';
import EditablePortraitGallery from '../../../components/PortraitGallery/EditablePortraitGallery';
import { getGalleryPageBySlug, getGalleryPhotos } from '../../../lib/galleries';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const gallery = await getGalleryPageBySlug(slug);
  if (!gallery) return { title: 'Galerie introuvable' };
  return {
    title: gallery.name,
    description: `Galerie photo : ${gallery.name}`,
    openGraph: gallery.headerImageUrl
      ? { images: [gallery.headerImageUrl] }
      : undefined,
  };
}

export default async function GallerySubPage({ params }: Params) {
  const { slug } = await params;
  const gallery = await getGalleryPageBySlug(slug);
  if (!gallery) notFound();

  // Utiliser le slug canonique de la galerie (celui en base) pour photos et clés
  const canonicalSlug = gallery.slug;
  const { items, settings } = await getGalleryPhotos(canonicalSlug);
  const defaultBg =
    'https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80';

  return (
    <section>
      <PageHeader
        title={gallery.name}
        bgImage={gallery.headerImageUrl || defaultBg}
        page={`galeries-${canonicalSlug}`}
        bgImageFocus={gallery.headerImageFocus}
      />
      <div className="container" style={{ padding: '1rem 0 0', paddingLeft: 0, paddingRight: 0 }}>
        <Link
          href="/galeries"
          style={{ fontSize: 14, color: 'var(--color-primary)', textDecoration: 'none', marginBottom: 8, display: 'inline-block' }}
        >
          ← Retour aux galeries
        </Link>
        <h2
          className="container"
          style={{
            marginTop: 0,
            marginBottom: '1rem',
            fontSize: 'var(--font-h2-size, 1.75rem)',
            fontFamily: 'var(--font-h2-family)',
            fontWeight: 'var(--font-h2-weight, 600)',
          }}
        >
          {gallery.name}
        </h2>
      </div>
      <div className="container" style={{ padding: '1.5rem 0', paddingLeft: 0, paddingRight: 0 }}>
        <EditablePortraitGallery
          items={items}
          settingsKey={`gallery_photos_${canonicalSlug}`}
          uploadPage="galleries"
          uploadFolder={`Galleries/${canonicalSlug}`}
        />
      </div>
    </section>
  );
}
