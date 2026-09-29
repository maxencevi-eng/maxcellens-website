import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page introuvable',
  description: 'La page demandée n’existe pas.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main style={{ padding: 'clamp(64px, 10vw, 140px) 1.5rem', textAlign: 'center', minHeight: '50vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
      <p className="style-h5" style={{ margin: 0, opacity: 0.7 }}>Erreur 404</p>
      <h1 className="style-h2" style={{ margin: 0 }}>Page introuvable</h1>
      <p className="style-p" style={{ margin: 0, opacity: 0.75, maxWidth: '44ch' }}>
        La page que vous recherchez n’existe pas ou a été déplacée.
      </p>
      <Link href="/" className="btn-site-1" style={{ marginTop: 12, display: 'inline-block', padding: '14px 26px', textDecoration: 'none', fontWeight: 500 }}>
        Retour à l’accueil
      </Link>
    </main>
  );
}
