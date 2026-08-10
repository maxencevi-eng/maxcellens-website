"use client";

import { useEffect } from 'react';
import {
  applyLayoutVars,
  normalizeLayout,
  PAGE_LAYOUT_UPDATED,
  type PageLayout,
} from './pageLayout';

/**
 * Applique les variables CSS de mise en page au chargement, puis à chaque
 * enregistrement depuis la modale (événement `page-layout-updated`).
 *
 * La logique d'application vit dans `pageLayout.ts` : elle était auparavant
 * recopiée ici et dans la modale, avec des défauts qui avaient divergé.
 */
export default function PageLayoutProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let mounted = true;

    fetch('/api/page-layout')
      .then((r) => r.json())
      .then((data) => {
        if (mounted) applyLayoutVars(normalizeLayout(data));
      })
      .catch(() => {});

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as PageLayout | undefined;
      if (detail) applyLayoutVars(normalizeLayout(detail));
    };
    window.addEventListener(PAGE_LAYOUT_UPDATED, handler);
    return () => {
      mounted = false;
      window.removeEventListener(PAGE_LAYOUT_UPDATED, handler);
    };
  }, []);

  return <>{children}</>;
}
