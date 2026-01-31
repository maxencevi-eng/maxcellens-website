import Link from 'next/link';

export const metadata = { title: 'Animation' };

export default function AnimationService() {
  return (
    <section style={{ padding: '3rem 0' }}>
      <div className="container">
        <h1>Animation</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>
          Un épisode de série TV personnalisé pour votre entreprise — team building créatif pour PME.
        </p>
        <Link href="/animation" style={{ fontWeight: 600, textDecoration: 'underline' }}>
          Découvrir le service Animation
        </Link>
      </div>
    </section>
  );
}
