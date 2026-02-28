// app/bac/admin/page.tsx — Admin login page
import BacAdminLoginClient from '../../../components/bac/AdminLogin';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function BacAdminLoginPage() {
  return <BacAdminLoginClient />;
}
