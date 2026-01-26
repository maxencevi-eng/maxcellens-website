export const metadata = {
  title: 'Galeries',
  description: 'Galeries — Maxcellens',
};

import PageHeader from '../../components/PageHeader/PageHeader';

export default function GalleriesPage() {
  return (
    <section>
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
