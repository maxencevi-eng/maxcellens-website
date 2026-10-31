import type { Metadata } from 'next';
import { Suspense } from 'react';
import AdminLogin from '../../../components/AdminLogin/AdminLogin';
import AdminGate from '../../../components/admin/Dashboard/AdminGate';
import GalleriesAdmin from '../../../components/admin/ClientGalleries/GalleriesAdmin';

export const metadata: Metadata = {
  title: 'Galeries clients — Admin',
  robots: { index: false, follow: false },
};

export default function ClientGalleriesAdminPage() {
  return (
    <AdminGate
      signedIn={
        <Suspense fallback={null}>
          <GalleriesAdmin />
        </Suspense>
      }
      signedOut={<AdminLogin />}
    />
  );
}
