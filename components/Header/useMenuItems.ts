"use client";

import { useEffect, useState } from 'react';
import {
  applyMenuOrder,
  buildMenuItems,
  isItemVisible,
  parseMenuOrder,
  parseMenuVisible,
  type MenuItem,
} from '../MenuEditModal/menuItems';

/** Visibilité par défaut, alignée sur celle de l'éditeur de menu. */
const DEFAULTS: Record<string, boolean> = {
  'builtin:realisation': true,
  'builtin:evenement': true,
  'builtin:corporate': true,
  'builtin:portrait': true,
  'builtin:animation': true,
  'builtin:galleries': true,
  'builtin:contact': true,
  'builtin:bac': false,
  'builtin:admin': true,
  'builtin:mentionsLegales': false,
  'builtin:politiqueConfidentialite': false,
};

/**
 * Entrées de menu à afficher, dans l'ordre réglé en administration.
 *
 * Résout en un seul endroit ce que le header faisait auparavant avec une
 * dizaine de `isNavItemVisible(...)` en dur — ce qui rendait impossible
 * l'ajout d'une page créée depuis l'admin.
 */
export function useMenuItems(scope: 'desktop' | 'mobile'): {
  items: MenuItem[];
  ready: boolean;
} {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const prefix = scope === 'mobile' ? 'navMobile' : 'nav';
    const visibleKey = `${prefix}MenuVisible`;
    const orderKey = `${prefix}MenuOrder`;

    async function load() {
      try {
        // `/api/pages` renvoie les brouillons uniquement à une session admin :
        // un visiteur ne verra jamais une page non publiée dans le menu.
        const [settingsResp, pagesResp] = await Promise.all([
          fetch(`/api/admin/site-settings?keys=${visibleKey},${orderKey}`),
          fetch('/api/menu-pages'),
        ]);

        const settings = settingsResp.ok ? (await settingsResp.json())?.settings || {} : {};
        const pagesJson = pagesResp.ok ? await pagesResp.json() : { pages: [] };
        if (!mounted) return;

        const visible = { ...DEFAULTS, ...parseMenuVisible(settings[visibleKey]) };
        const order = parseMenuOrder(settings[orderKey]);
        const all = applyMenuOrder(buildMenuItems(pagesJson?.pages || []), order);

        setItems(all.filter((i) => isItemVisible(i, visible, DEFAULTS)));
      } catch (_) {
        // Repli : entrées historiques par défaut, pour ne jamais rendre un
        // header sans navigation.
        const all = buildMenuItems([]);
        if (mounted) setItems(all.filter((i) => isItemVisible(i, DEFAULTS, DEFAULTS)));
      } finally {
        if (mounted) setReady(true);
      }
    }

    load();
    const onUpdate = () => load();
    window.addEventListener('site-settings-updated', onUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('site-settings-updated', onUpdate);
    };
  }, [scope]);

  return { items, ready };
}

export default useMenuItems;
