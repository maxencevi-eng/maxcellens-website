// app/bac/connexion/page.tsx
import ConnexionClient from '../../../components/bac/Connexion';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion',
  robots: { index: false, follow: false },
};

export default function ConnexionPage() {
  return <ConnexionClient />;
}
