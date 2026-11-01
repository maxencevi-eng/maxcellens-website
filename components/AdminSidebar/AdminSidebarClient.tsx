"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { hasStoredSession, supabase } from '../../lib/supabase';

/**
 * La coque admin est chargée côté client uniquement : elle dépend de la
 * session Supabase et ne doit rien rendre au SSR. Son code n'est téléchargé
 * que si une session est mémorisée dans le navigateur ou à la connexion —
 * jamais pour un simple visiteur.
 *
 * Remplace l'ancien `AdminSidebar` (voir components/admin/AdminShell).
 */
const AdminShell = dynamic(() => import('../admin/AdminShell/AdminShell'), { ssr: false });

export default function AdminSidebarClient() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (hasStoredSession()) setEnabled(true);
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) setEnabled(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return enabled ? <AdminShell /> : null;
}
