import type { Metadata } from 'next';
import PageHeader from '../../components/PageHeader/PageHeader';
import { getPageSeo, buildMetadataFromSeo } from '../../lib/pageSeo';
import JsonLdScript from '../../components/SeoCommandCenter/JsonLdScript';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo('galeries');
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return { title: 'Galeries', description: 'Galeries — Maxcellens' };
}

export default function GalleriesPage() {
  return (
    <section>
      <JsonLdScript slug="galeries" />
      <PageHeader page="galleries" title="Galeries" subtitle="Collections de photos et vidéos" bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <div className="container" style={{ padding: '1.5rem 0' }}>
        <p style={{ color: 'var(--muted)' }}>Collections de photos et vidéos classées par projet.</p>
        <div style={{ marginTop: '1.5rem' }}>
          {/* Placeholder gallery tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ height: 200, background: '#e5e7eb' }} />
            <div style={{ height: 200, background: '#e5e7eb' }} />
            <div style={{ height: 200, background: '#e5e7eb' }} />
            <div style={{ height: 200, background: '#e5e7eb' }} />
          </div>
        </div>
      </div>
    </section>
  );
}
