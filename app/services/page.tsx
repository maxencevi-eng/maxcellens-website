import type { Metadata } from 'next';
import Link from 'next/link';
import { getPageSeo, buildMetadataFromSeo } from '../../lib/pageSeo';
import JsonLdScript from '../../components/SeoCommandCenter/JsonLdScript';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo('services');
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return { title: 'Services' };
}

export default function ServicesIndex() {
  const services = [
    { slug: 'realisation', title: 'Réalisation' },
    { slug: 'evenement', title: 'Évènement' },
    { slug: 'corporate', title: 'Corporate' },
    { slug: 'portrait', title: 'Portrait' },
    { slug: 'animation', title: 'Animation' },
  ];

  return (
    <section style={{ padding: '3rem 0' }}>
      <JsonLdScript slug="services" />
      <div className="container">
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Services</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {services.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`} style={{ padding: '1rem', border: '1px solid rgba(0,0,0,0.06)', textDecoration: 'none' }}>
              <h3 style={{ margin: 0 }}>{s.title}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
