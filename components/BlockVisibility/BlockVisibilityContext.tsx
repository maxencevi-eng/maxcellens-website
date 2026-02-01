"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export type BlockWidthMode = 'full' | 'max1600';

export type BlockOrderPage = 'home' | 'contact' | 'animation' | 'realisation' | 'evenement' | 'corporate' | 'portrait' | 'galeries';

type ContextValue = {
  hiddenBlocks: string[];
  blockWidthModes: Record<string, BlockWidthMode>;
  blockOrderHome: string[];
  blockOrderContact: string[];
  blockOrderAnimation: string[];
  blockOrderRealisation: string[];
  blockOrderEvenement: string[];
  blockOrderCorporate: string[];
  blockOrderPortrait: string[];
  blockOrderGaleries: string[];
  isAdmin: boolean;
  toggleBlock: (blockId: string) => Promise<void>;
  setBlockWidthMode: (blockId: string, mode: BlockWidthMode) => Promise<void>;
  moveBlock: (page: BlockOrderPage, blockId: string, direction: 'up' | 'down') => Promise<void>;
  isLoading: boolean;
};

const BlockVisibilityContext = createContext<ContextValue>({
  hiddenBlocks: [],
  blockWidthModes: {},
  blockOrderHome: [],
  blockOrderContact: [],
  blockOrderAnimation: [],
  blockOrderRealisation: [],
  blockOrderEvenement: [],
  blockOrderCorporate: [],
  blockOrderPortrait: [],
  blockOrderGaleries: [],
  isAdmin: false,
  toggleBlock: async () => {},
  setBlockWidthMode: async () => {},
  moveBlock: async () => {},
  isLoading: true,
});

const DEFAULT_ORDER_HOME = ['home_intro', 'home_services', 'home_portrait', 'home_cadreur', 'home_stats', 'clients', 'home_quote', 'home_cta'];
const DEFAULT_ORDER_CONTACT = ['contact_intro', 'contact_zones', 'contact_kit'];
const DEFAULT_ORDER_ANIMATION = ['animation_s1', 'animation_s2', 'animation_s3', 'animation_cta'];
const DEFAULT_ORDER_REALISATION = ['production_intro', 'production_videos'];
const DEFAULT_ORDER_EVENEMENT = ['evenement_intro', 'evenement_videos'];
const DEFAULT_ORDER_CORPORATE = ['corporate_intro', 'corporate_videos'];
const DEFAULT_ORDER_PORTRAIT = ['portrait_intro', 'portrait_gallery'];
const DEFAULT_ORDER_GALERIES = ['galeries_menu'];

export function BlockVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hiddenBlocks, setHiddenBlocks] = useState<string[]>([]);
  const [blockWidthModes, setBlockWidthModesState] = useState<Record<string, BlockWidthMode>>({});
  const [blockOrderHome, setBlockOrderHome] = useState<string[]>(DEFAULT_ORDER_HOME);
  const [blockOrderContact, setBlockOrderContact] = useState<string[]>(DEFAULT_ORDER_CONTACT);
  const [blockOrderAnimation, setBlockOrderAnimation] = useState<string[]>(DEFAULT_ORDER_ANIMATION);
  const [blockOrderRealisation, setBlockOrderRealisation] = useState<string[]>(DEFAULT_ORDER_REALISATION);
  const [blockOrderEvenement, setBlockOrderEvenement] = useState<string[]>(DEFAULT_ORDER_EVENEMENT);
  const [blockOrderCorporate, setBlockOrderCorporate] = useState<string[]>(DEFAULT_ORDER_CORPORATE);
  const [blockOrderPortrait, setBlockOrderPortrait] = useState<string[]>(DEFAULT_ORDER_PORTRAIT);
  const [blockOrderGaleries, setBlockOrderGaleries] = useState<string[]>(DEFAULT_ORDER_GALERIES);
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
        setBlockWidthModesState(modes && typeof modes === 'object' && !Array.isArray(modes) ? modes : {});
        setBlockOrderHome(Array.isArray(data?.blockOrderHome) ? data.blockOrderHome : DEFAULT_ORDER_HOME);
        setBlockOrderContact(Array.isArray(data?.blockOrderContact) ? data.blockOrderContact : DEFAULT_ORDER_CONTACT);
        setBlockOrderAnimation(Array.isArray(data?.blockOrderAnimation) ? data.blockOrderAnimation : DEFAULT_ORDER_ANIMATION);
        setBlockOrderRealisation(Array.isArray(data?.blockOrderRealisation) ? data.blockOrderRealisation : DEFAULT_ORDER_REALISATION);
        setBlockOrderEvenement(Array.isArray(data?.blockOrderEvenement) ? data.blockOrderEvenement : DEFAULT_ORDER_EVENEMENT);
        setBlockOrderCorporate(Array.isArray(data?.blockOrderCorporate) ? data.blockOrderCorporate : DEFAULT_ORDER_CORPORATE);
        setBlockOrderPortrait(Array.isArray(data?.blockOrderPortrait) ? data.blockOrderPortrait : DEFAULT_ORDER_PORTRAIT);
        setBlockOrderGaleries(Array.isArray(data?.blockOrderGaleries) ? data.blockOrderGaleries : DEFAULT_ORDER_GALERIES);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  async function toggleBlock(blockId: string) {
    const next = hiddenBlocks.includes(blockId)
      ? hiddenBlocks.filter((id) => id !== blockId)
      : [...hiddenBlocks, blockId];
    setHiddenBlocks(next);
    try {
      await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'block_visibility', value: JSON.stringify(next) }),
      });
    } catch {
      setHiddenBlocks(hiddenBlocks);
    }
  }

  async function setBlockWidthMode(blockId: string, mode: BlockWidthMode) {
    const next = { ...blockWidthModes, [blockId]: mode };
    setBlockWidthModesState(next);
    try {
      await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'block_width_mode', value: JSON.stringify(next) }),
      });
    } catch {
      setBlockWidthModesState(blockWidthModes);
    }
  }

  async function moveBlock(page: BlockOrderPage, blockId: string, direction: 'up' | 'down') {
    const getOrder = () => {
      switch (page) {
        case 'home': return blockOrderHome;
        case 'contact': return blockOrderContact;
        case 'animation': return blockOrderAnimation;
        case 'realisation': return blockOrderRealisation;
        case 'evenement': return blockOrderEvenement;
        case 'corporate': return blockOrderCorporate;
        case 'portrait': return blockOrderPortrait;
        case 'galeries': return blockOrderGaleries;
        default: return blockOrderHome;
      }
    };
    const setOrder = (next: string[]) => {
      switch (page) {
        case 'home': setBlockOrderHome(next); break;
        case 'contact': setBlockOrderContact(next); break;
        case 'animation': setBlockOrderAnimation(next); break;
        case 'realisation': setBlockOrderRealisation(next); break;
        case 'evenement': setBlockOrderEvenement(next); break;
        case 'corporate': setBlockOrderCorporate(next); break;
        case 'portrait': setBlockOrderPortrait(next); break;
        case 'galeries': setBlockOrderGaleries(next); break;
        default: setBlockOrderHome(next);
      }
    };
    const keyMap: Record<BlockOrderPage, string> = {
      home: 'block_order_home',
      contact: 'block_order_contact',
      animation: 'block_order_animation',
      realisation: 'block_order_realisation',
      evenement: 'block_order_evenement',
      corporate: 'block_order_corporate',
      portrait: 'block_order_portrait',
      galeries: 'block_order_galeries',
    };
    const key = keyMap[page];
    const order = getOrder();
    const i = order.indexOf(blockId);
    if (i < 0) return;
    const j = direction === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    try {
      await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: JSON.stringify(next) }),
      });
    } catch {
      setOrder(order);
    }
  }

  return (
    <BlockVisibilityContext.Provider value={{ hiddenBlocks, blockWidthModes, blockOrderHome, blockOrderContact, blockOrderAnimation, blockOrderRealisation, blockOrderEvenement, blockOrderCorporate, blockOrderPortrait, blockOrderGaleries, isAdmin, toggleBlock, setBlockWidthMode, moveBlock, isLoading }}>
      {children}
    </BlockVisibilityContext.Provider>
  );
}

export function useBlockVisibility() {
  return useContext(BlockVisibilityContext);
}
