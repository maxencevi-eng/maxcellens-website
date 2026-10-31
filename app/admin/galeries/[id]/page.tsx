import type { Metadata } from 'next';
import AdminLogin from '../../../../components/AdminLogin/AdminLogin';
import AdminGate from '../../../../components/admin/Dashboard/AdminGate';
import GalleryEditor from '../../../../components/admin/ClientGalleries/GalleryEditor';

export const metadata: Metadata = {
  title: 'Galerie — Admin',
  robots: { index: false, follow: false },
};

export default async function ClientGalleryEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminGate signedIn={<GalleryEditor id={id} />} signedOut={<AdminLogin />} />;
}
