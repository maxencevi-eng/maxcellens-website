"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * Bloque le clic-droit "Enregistrer sous" sur les images pour les visiteurs non connectés.
 * Les admins connectés peuvent toujours enregistrer les images.
 */
export default function DisableImageSave() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setIsAdmin(Boolean((data as any)?.user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(Boolean(session?.user));
    });
    return () => {
      mounted = false;
      try { (listener as any)?.subscription?.unsubscribe?.(); } catch (_) {}
    };
  }, []);

  useEffect(() => {
    if (isAdmin) return;
    function preventImageContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'IMG') e.preventDefault();
    }
    document.addEventListener('contextmenu', preventImageContextMenu, { capture: true });
    return () => document.removeEventListener('contextmenu', preventImageContextMenu, { capture: true });
  }, [isAdmin]);

  return null;
}
