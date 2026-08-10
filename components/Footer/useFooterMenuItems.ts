"use client";

import { useEffect, useState } from 'react';
import {
  applyMenuOrder,
  buildMenuItems,
  isItemVisible,
  parseMenuOrder,
  type MenuItem,
} from '../MenuEditModal/menuItems';

/**
 * Visibilité par défaut du pied de page.
 *
 * Elle diffère du menu principal : les mentions légales et la politique de
 * confidentialité y sont affichées par défaut, l'admin non.
 */
const DEFAULTS: Record<string, boolean> = {
  'builtin:realisation': true,
  'builtin:evenement': true,
  'builtin:corporate': true,
  'builtin:portrait': true,
  'builtin:animation': true,
  'builtin:galleries': true,
  'builtin:contact': true,
  'builtin:bac': false,
  'builtin:admin': false,
  'builtin:mentionsLegales': true,
  'builtin:politiqueConfidentialite': true,
};

/**
 * Entrées du pied de page, dans l'ordre réglé en administration.
 *
 * `visibleFromSettings` est l'objet déjà chargé par le Footer (clé
 * `footerMenuVisible`) : on ne le recharge pas, on se contente d'y ajouter
 * l'ordre et les pages créées depuis l'admin.
 */
export function useFooterMenuItems(
  visibleFromSettings: Record<string, boolean> | null
): { items: MenuItem[] } {
  const [pages, setPages] = useState<{ slug: string; title: string }[]>([]);
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [pagesResp, settingsResp] = await Promise.all([
          fetch('/api/menu-pages'),
          fetch('/api/admin/site-settings?keys=footerMenuOrder'),
        ]);
        const pagesJson = pagesResp.ok ? await pagesResp.json() : { pages: [] };
        const settings = settingsResp.ok ? (await settingsResp.json())?.settings || {} : {};
        if (!mounted) return;
        setPages(pagesJson?.pages || []);
        setOrder(parseMenuOrder(settings.footerMenuOrder));
      } catch (_) {
        // Repli : uniquement les entrées historiques
      }
    }

    load();
    const onUpdate = () => load();
    window.addEventListener('site-settings-updated', onUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('site-settings-updated', onUpdate);
    };
  }, []);

  const all = applyMenuOrder(buildMenuItems(pages), order);
  const visible = { ...DEFAULTS, ...(visibleFromSettings || {}) };

  return { items: all.filter((i) => isItemVisible(i, visible, DEFAULTS)) };
}

export default useFooterMenuItems;
