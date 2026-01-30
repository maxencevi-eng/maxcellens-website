import Link from 'next/link';

export default function ServicesIndex() {
  const services = [
    { slug: 'realisation', title: 'Réalisation' },
    { slug: 'evenement', title: 'Évènement' },
    { slug: 'corporate', title: 'Corporate' },
    { slug: 'portrait', title: 'Portrait' },
  ];

  return (
    <section style={{ padding: '3rem 0' }}>
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
