"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  BLOCK_ORDER_PAGES,
  DEFAULT_BLOCK_ORDERS,
  mergeBlockOrder,
  orderSettingKey,
  type BlockOrderPage,
  type BlockWidthMode,
} from './blockOrders';

export type { BlockOrderPage, BlockWidthMode };

type Orders = Record<BlockOrderPage, string[]>;

type ContextValue = {
  hiddenBlocks: string[];
  blockWidthModes: Record<string, BlockWidthMode>;
  /** Ordres de toutes les pages, indexés par page. */
  orders: Orders;
  /** Ordre d'une page — remplace les huit champs `blockOrderXxx`. */
  getOrder: (page: BlockOrderPage) => string[];
  isAdmin: boolean;
  isLoading: boolean;
  toggleBlock: (blockId: string) => Promise<void>;
  setBlockWidthMode: (blockId: string, mode: BlockWidthMode) => Promise<void>;
  moveBlock: (page: BlockOrderPage, blockId: string, direction: 'up' | 'down') => Promise<void>;
  /** Remplace l'ordre complet d'une page (glisser-déposer, ajout, suppression). */
  setOrder: (page: BlockOrderPage, next: string[]) => Promise<void>;

  /* ── Compatibilité ascendante ───────────────────────────────────────────
     Les *PageClient existants lisent encore ces champs. Ils sont dérivés de
     `orders` et disparaîtront quand toutes les pages seront passées au
     système dynamique. */
  blockOrderHome: string[];
  blockOrderContact: string[];
  blockOrderAnimation: string[];
  blockOrderRealisation: string[];
  blockOrderEvenement: string[];
  blockOrderCorporate: string[];
  blockOrderPortrait: string[];
  blockOrderGaleries: string[];
};

const defaultOrders: Orders = { ...DEFAULT_BLOCK_ORDERS };

const BlockVisibilityContext = createContext<ContextValue>({
  hiddenBlocks: [],
  blockWidthModes: {},
  orders: defaultOrders,
  getOrder: (page) => defaultOrders[page] || [],
  isAdmin: false,
  isLoading: true,
  toggleBlock: async () => {},
  setBlockWidthMode: async () => {},
  moveBlock: async () => {},
  setOrder: async () => {},
  blockOrderHome: defaultOrders.home,
  blockOrderContact: defaultOrders.contact,
  blockOrderAnimation: defaultOrders.animation,
  blockOrderRealisation: defaultOrders.realisation,
  blockOrderEvenement: defaultOrders.evenement,
  blockOrderCorporate: defaultOrders.corporate,
  blockOrderPortrait: defaultOrders.portrait,
  blockOrderGaleries: defaultOrders.galeries,
});

/** Écrit une clé de `site_settings`. Renvoie false en cas d'échec. */
async function persist(key: string, value: unknown): Promise<boolean> {
  try {
    const resp = await fetch('/api/admin/site-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: JSON.stringify(value) }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export function BlockVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hiddenBlocks, setHiddenBlocks] = useState<string[]>([]);
  const [blockWidthModes, setBlockWidthModesState] = useState<Record<string, BlockWidthMode>>({});
  const [orders, setOrders] = useState<Orders>(defaultOrders);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    let mounted = true;
    fetch('/api/block-visibility')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setHiddenBlocks(Array.isArray(data?.hiddenBlocks) ? data.hiddenBlocks : []);
        const modes = data?.blockWidthModes;
        setBlockWidthModesState(
          modes && typeof modes === 'object' && !Array.isArray(modes) ? modes : {}
        );

        // L'API renvoie `orders` (nouveau format). On retombe sur les champs
        // plats si une version antérieure de la route est encore déployée.
        const next = {} as Orders;
        for (const page of BLOCK_ORDER_PAGES) {
          const fromRecord = data?.orders?.[page];
          const legacyKey = `blockOrder${page.charAt(0).toUpperCase()}${page.slice(1)}`;
          const raw = fromRecord ?? data?.[legacyKey];
          next[page] = mergeBlockOrder(raw, DEFAULT_BLOCK_ORDERS[page]);
        }
        setOrders(next);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const toggleBlock = useCallback(async (blockId: string) => {
    let previous: string[] = [];
    let next: string[] = [];
    setHiddenBlocks((current) => {
      previous = current;
      next = current.includes(blockId)
        ? current.filter((id) => id !== blockId)
        : [...current, blockId];
      return next;
    });
    const ok = await persist('block_visibility', next);
    if (!ok) setHiddenBlocks(previous);
  }, []);

  const setBlockWidthMode = useCallback(async (blockId: string, mode: BlockWidthMode) => {
    let previous: Record<string, BlockWidthMode> = {};
    let next: Record<string, BlockWidthMode> = {};
    setBlockWidthModesState((current) => {
      previous = current;
      next = { ...current, [blockId]: mode };
      return next;
    });
    const ok = await persist('block_width_mode', next);
    if (!ok) setBlockWidthModesState(previous);
  }, []);

  const setOrder = useCallback(async (page: BlockOrderPage, nextOrder: string[]) => {
    let previous: string[] = [];
    setOrders((current) => {
      previous = current[page];
      return { ...current, [page]: nextOrder };
    });
    const ok = await persist(orderSettingKey(page), nextOrder);
    if (!ok) setOrders((current) => ({ ...current, [page]: previous }));
  }, []);

  const moveBlock = useCallback(
    async (page: BlockOrderPage, blockId: string, direction: 'up' | 'down') => {
      const order = orders[page] || [];
      const i = order.indexOf(blockId);
      if (i < 0) return;
      const j = direction === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= order.length) return;
      const next = [...order];
      [next[i], next[j]] = [next[j], next[i]];
      await setOrder(page, next);
    },
    [orders, setOrder]
  );

  const getOrder = useCallback(
    (page: BlockOrderPage) => orders[page] || DEFAULT_BLOCK_ORDERS[page] || [],
    [orders]
  );

  const value = useMemo<ContextValue>(
    () => ({
      hiddenBlocks,
      blockWidthModes,
      orders,
      getOrder,
      isAdmin,
      isLoading,
      toggleBlock,
      setBlockWidthMode,
      moveBlock,
      setOrder,
      blockOrderHome: orders.home,
      blockOrderContact: orders.contact,
      blockOrderAnimation: orders.animation,
      blockOrderRealisation: orders.realisation,
      blockOrderEvenement: orders.evenement,
      blockOrderCorporate: orders.corporate,
      blockOrderPortrait: orders.portrait,
      blockOrderGaleries: orders.galeries,
    }),
    [
      hiddenBlocks,
      blockWidthModes,
      orders,
      getOrder,
      isAdmin,
      isLoading,
      toggleBlock,
      setBlockWidthMode,
      moveBlock,
      setOrder,
    ]
  );

  return (
    <BlockVisibilityContext.Provider value={value}>
      {children}
    </BlockVisibilityContext.Provider>
  );
}

export function useBlockVisibility() {
  return useContext(BlockVisibilityContext);
}
