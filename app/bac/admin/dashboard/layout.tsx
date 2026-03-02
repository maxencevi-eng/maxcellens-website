// app/bac/admin/dashboard/layout.tsx — Admin layout with sidebar
// server component: protect all dashboard child pages by verifying admin session
import BacAdminSidebar from '../../../../components/bac/AdminSidebar';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requireBacAdmin } from '../../../../lib/bac/auth';

export default async function BacAdminDashboardLayout({ children }: { children: ReactNode }) {
  const isAdmin = await requireBacAdmin();
  if (!isAdmin) {
    // any non-admin (or expired session) gets sent back to login
    redirect('/bac/admin');
  }

  return (
    <div className="bac-admin-layout">
      <BacAdminSidebar />
      <main className="bac-admin-content">
        {children}
      </main>
    </div>
  );
}
