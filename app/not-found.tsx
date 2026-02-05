import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page introuvable',
  description: 'La page demandée n’existe pas.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main style={{ padding: '2rem', textAlign: 'center', minHeight: '40vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Page introuvable</h1>
      <p style={{ color: 'var(--muted, #6b7280)', marginBottom: '1.5rem' }}>
        La page que vous recherchez n’existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          background: 'var(--color-primary, #213431)',
          color: '#fff',
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Retour à l’accueil
      </Link>
    </main>
  );
}
