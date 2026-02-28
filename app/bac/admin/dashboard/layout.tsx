// app/bac/admin/dashboard/layout.tsx — Admin layout with sidebar
import BacAdminSidebar from '../../../../components/bac/AdminSidebar';
import type { ReactNode } from 'react';

export default function BacAdminDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bac-admin-layout">
      <BacAdminSidebar />
      <main className="bac-admin-content">
        {children}
      </main>
    </div>
  );
}
