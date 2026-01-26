"use client";
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
      <button onClick={() => setOpen(true)} style={{ position: 'absolute', right: 12, bottom: 12, padding: '8px 10px', borderRadius: 6, background: '#fff', border: '1px solid #ddd', cursor: 'pointer', zIndex: 10001 }}>Modifier Hero</button>
      {open ? <HeroEditor page={page} onClose={() => setOpen(false)} /> : null}
    </>
  );
}