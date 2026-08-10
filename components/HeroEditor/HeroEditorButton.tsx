"use client";
import { AdminToolbarShell, AdminToolbarButton } from '../admin/AdminToolbar';
import { Pencil } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import HeroEditor from './HeroEditor';
import { supabase } from '../../lib/supabase';

export default function HeroEditorButton({ page }: { page: string }) {
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    // consider user logged in if Supabase has a user session
    supabase.auth.getUser().then(({ data }) => { if (!mounted) return; setIsAdmin(Boolean((data as any).user)); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setIsAdmin(Boolean(session?.user)); });
    return () => {
      mounted = false;
      try { (listener as any)?.subscription?.unsubscribe?.(); } catch (_) {}
    };
  }, []);

  if (!isAdmin) return null;
  return (
    <>
      <AdminToolbarShell position="bottomRight">
        <AdminToolbarButton
          variant="primary"
          showLabel
          icon={<Pencil size={14} aria-hidden="true" />}
          label="Modifier l’en-tête"
          onClick={() => setOpen(true)}
        />
      </AdminToolbarShell>
      {open ? <HeroEditor page={page} onClose={() => setOpen(false)} /> : null}
    </>
  );
}