import type { Metadata } from 'next';
import ClientHome from '@/components/ClientGallery/ClientHome';
import { siteLogoUrl } from '@/lib/clientGalleries/logo';

export const metadata: Metadata = {
  title: 'Espace client — Maxcellens',
  robots: { index: false, follow: false },
};

export default async function ClientIndexPage() {
  const logo = await siteLogoUrl();
  return <ClientHome logo={logo} />;
}
