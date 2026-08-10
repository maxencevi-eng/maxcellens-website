"use client";

import { useEffect, useState } from 'react';
import {
  applyMenuOrder,
  buildMenuItems,
  parseMenuOrder,
  parseMenuVisible,
  visibleMenuItems,
  type MenuItem,
} from '../MenuEditModal/menuItems';
import { useBlockVisibility } from '../BlockVisibility';

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
  const { isAdmin } = useBlockVisibility();
  /** Liste complète, non filtrée : le filtrage dépend de la session. */
  const [all, setAll] = useState<MenuItem[]>([]);
  const [visible, setVisible] = useState<Record<string, boolean>>(DEFAULTS);
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

        const order = parseMenuOrder(settings[orderKey]);
        setVisible({ ...DEFAULTS, ...parseMenuVisible(settings[visibleKey]) });
        setAll(applyMenuOrder(buildMenuItems(pagesJson?.pages || []), order));
      } catch (_) {
        // Repli : entrées historiques par défaut, pour ne jamais rendre un
        // header sans navigation.
        if (mounted) {
          setVisible(DEFAULTS);
          setAll(buildMenuItems([]));
        }
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

  // Filtrage au rendu, pas au chargement : la session Supabase se résout après
  // le premier rendu, et l'entrée Admin doit apparaître dès qu'elle est connue
  // sans qu'il faille recharger les réglages.
  return { items: visibleMenuItems(all, visible, DEFAULTS, isAdmin), ready };
}

export default useMenuItems;
