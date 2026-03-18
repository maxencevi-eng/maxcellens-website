import type { Metadata } from 'next';
import PageHeader from '../../components/PageHeader/PageHeader';
import ContactBlocks from '../../components/ContactBlocks/ContactBlocks';
import { getPageSeo, buildMetadataFromSeo } from '../../lib/pageSeo';
import JsonLdScript from '../../components/SeoCommandCenter/JsonLdScript';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo('contact');
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return { title: 'Contact', description: 'Contact — Maxcellens' };
}

export default async function ContactPage() {
  return (
    <section>
      <JsonLdScript slug="contact" />
      <PageHeader page="contact" title="Contact" subtitle="Contactez-nous pour vos projets photo & vidéo" bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <div style={{ position: 'relative', zIndex: 20, background: 'var(--block-bg, var(--bg, #F2F0EB))', borderRadius: '28px 28px 0 0', marginTop: '-28px', width: '100vw', marginLeft: 'calc(50% - 50vw)', boxSizing: 'border-box' as const }}>
        <div className="container" style={{ padding: '1.5rem 0' }}>
          <ContactBlocks />
        </div>
      </div>
    </section>
  );
}
