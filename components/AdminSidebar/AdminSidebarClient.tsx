"use client";

import dynamic from 'next/dynamic';

/**
 * La coque admin est chargée côté client uniquement : elle dépend de la
 * session Supabase et ne doit rien rendre au SSR.
 *
 * Remplace l'ancien `AdminSidebar` (voir components/admin/AdminShell).
 */
const AdminShell = dynamic(() => import('../admin/AdminShell/AdminShell'), { ssr: false });

export default function AdminSidebarClient() {
  return <AdminShell />;
}
