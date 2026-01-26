import type { Metadata } from 'next';
import PageHeader from '../../components/PageHeader/PageHeader';
import ContactBlocks from '../../components/ContactBlocks/ContactBlocks';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact — Maxcellens',
};

export default function ContactPage() {
  return (
    <section>
      <PageHeader title="Contact" subtitle="Contactez-nous pour vos projets photo & vidéo" bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <div className="container" style={{ padding: '1.5rem 0' }}>
        <p style={{ color: 'var(--muted)' }}>Pour toute demande, contactez-moi à <strong>maxcellens@gmail.com</strong> ou par téléphone au <strong>06.74.96.64.58</strong>.</p>
        <ContactBlocks />
      </div>
    </section>
  );
}
