"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { AdminNotice, AdminToolbar } from '../admin';
import { useBlockVisibility, type BlockOrderPage } from '../BlockVisibility';
import { supabase } from '../../lib/supabase';
import AddBlockMenu from './AddBlockMenu';
import BlockEditorModal from './BlockEditorModal';
import usePageBlocks from './usePageBlocks';
import { getBlockDefinition, normalizeBlockData } from './blocks/registry';
import { BUILTIN_PAGES, type BuiltinPageKey } from './builtinPages';
import type { PageBlock } from './pageTypes';
import styles from './DynamicPageClient.module.css';

/**
 * Blocs ajoutés depuis l'administration sur une page historique.
 *
 * Point clé : les blocs ne forment PAS une région séparée en fin de page. Ils
 * sont insérés dans le même tableau d'ordre que les blocs intégrés
 * (`block_order_<page>`), sous la forme d'identifiants préfixés `dyn:`. Un
 * bloc ajouté peut donc se placer entre deux blocs d'origine, et les flèches
 * de la barre d'outils les déplacent tous indifféremment.
 *
 * Le composant appelant fusionne `sections` dans sa propre table de rendu :
 *
 *   const dyn = useBuiltinPageBlocks('home');
 *   const sections = { ...builtinSections, ...dyn.sections };
 *   {order.map((id) => sections[id] ?? null)}
 *   {dyn.addButton}
 *   {dyn.modals}
 */

/** Préfixe des identifiants de blocs dynamiques dans l'ordre d'une page. */
export const DYN_PREFIX = 'dyn:';

export function isDynamicId(id: string) {
  return id.startsWith(DYN_PREFIX);
}

export function dynamicId(blockId: string) {
  return `${DYN_PREFIX}${blockId}`;
}

export function blockIdOf(orderId: string) {
  return orderId.slice(DYN_PREFIX.length);
}

export type BuiltinBlocksApi = {
  /** Sections indexées par identifiant d'ordre (`dyn:<uuid>`). */
  sections: Record<string, React.ReactNode>;
  /** Bouton « Ajouter un bloc », à placer en fin de page. */
  addButton: React.ReactNode;
  /** Modales (sélecteur de bloc, éditeur) — à rendre une fois. */
  modals: React.ReactNode;
};

export function useBuiltinPageBlocks(pageKey: BuiltinPageKey): BuiltinBlocksApi {
  const { isAdmin, getOrder, setOrder } = useBlockVisibility();
  const orderPage = pageKey as BlockOrderPage;

  const [pageId, setPageId] = useState<string | null>(null);
  const [initial, setInitial] = useState<PageBlock[] | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const headers: Record<string, string> = {};
        if (isAdmin) {
          const { data } = await supabase.auth.getSession();
          const token = data?.session?.access_token;
          if (token) headers.Authorization = `Bearer ${token}`;
        }
        const resp = await fetch(`/api/builtin-pages/${pageKey}`, { headers });
        const json = await resp.json();
        if (!mounted) return;
        setPageId(json?.pageId ?? null);
        setInitial(Array.isArray(json?.blocks) ? json.blocks : []);
      } catch (_) {
        if (mounted) setInitial([]);
      }
    })();
    return () => { mounted = false; };
  }, [pageKey, isAdmin]);

  // Appel de fonction, PAS de JSX : les hooks de `buildApi` se composent avec
  // ceux ci-dessus et sont donc appelés dans le même ordre à chaque rendu.
  return buildApi({
    pageKey,
    orderPage,
    pageId,
    initial,
    isAdmin,
    getOrder,
    setOrder,
  });
}

/** Suite du hook, extraite pour la lisibilité. Voir l'appel ci-dessus. */
function buildApi({
  pageKey,
  orderPage,
  pageId,
  initial,
  isAdmin,
  getOrder,
  setOrder,
}: {
  pageKey: BuiltinPageKey;
  orderPage: BlockOrderPage;
  pageId: string | null;
  initial: PageBlock[] | null;
  isAdmin: boolean;
  getOrder: (p: BlockOrderPage) => string[];
  setOrder: (p: BlockOrderPage, next: string[]) => Promise<void>;
}): BuiltinBlocksApi {
  const {
    blocks,
    error,
    clearError,
    addBlock,
    updateBlock,
    deleteBlock,
    duplicateBlock,
  } = usePageBlocks(pageId || '', initial || []);

  const [editing, setEditing] = useState<PageBlock | null>(null);
  const [insertAt, setInsertAt] = useState<number | null>(null);

  const renderNested = useCallback(
    (type: string, data: Record<string, unknown>, key: string) => {
      const def = getBlockDefinition(type);
      if (!def) return null;
      const Render = def.Render;
      return (
        <Render key={key} data={normalizeBlockData(type, data)} renderNested={renderNested} />
      );
    },
    []
  );

  /**
   * Tout bloc dynamique doit figurer dans l'ordre de la page, sinon il ne
   * serait jamais rendu. On complète l'ordre pour les blocs créés avant cette
   * mécanique, ou ajoutés depuis un autre onglet.
   */
  useEffect(() => {
    if (!isAdmin || !blocks.length) return;
    const order = getOrder(orderPage);
    const missing = blocks
      .map((b) => dynamicId(b.id))
      .filter((id) => !order.includes(id));
    if (missing.length) setOrder(orderPage, [...order, ...missing]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, isAdmin, orderPage]);

  const pageOptions = useMemo(
    () => BUILTIN_PAGES.map((p) => ({ value: p.path, label: p.label })),
    []
  );

  async function handlePick(type: string) {
    const at = insertAt;
    setInsertAt(null);
    if (at === null) return;
    const created = await addBlock(type, at);
    if (!created) return;
    // Placement dans l'ordre de la page, juste après le bloc courant
    const order = getOrder(orderPage);
    const next = [...order, dynamicId(created.id)];
    await setOrder(orderPage, next);
    setEditing(created);
  }

  async function handleDelete(block: PageBlock) {
    await deleteBlock(block.id);
    const order = getOrder(orderPage).filter((id) => id !== dynamicId(block.id));
    await setOrder(orderPage, order);
  }

  const sections: Record<string, React.ReactNode> = {};
  for (const block of blocks) {
    if (!isAdmin && !block.visible) continue;
    const def = getBlockDefinition(block.type);
    const Render = def?.Render;
    const orderId = dynamicId(block.id);

    sections[orderId] = (
      <div
        className={[
          styles.block,
          'adm-block',
          isAdmin ? styles.blockAdmin : '',
          isAdmin && !block.visible ? styles.blockHidden : '',
          block.widthMode === 'max1600' ? 'block-width-1600' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {Render ? (
          <Render
            data={normalizeBlockData(block.type, block.data)}
            renderNested={renderNested}
          />
        ) : isAdmin ? (
          <AdminNotice tone="warning">Type de bloc inconnu : « {block.type} ».</AdminNotice>
        ) : null}

        {isAdmin ? (
          // `blockId` = l'identifiant d'ORDRE : les flèches déplacent donc ce
          // bloc parmi les blocs intégrés, pas seulement entre blocs ajoutés.
          <AdminToolbar blockId={orderId} page={orderPage} label={def?.label}>
            <AdminToolbar.Edit onClick={() => setEditing(block)} />
            <AdminToolbar.Divider />
            <AdminToolbar.Move />
            <AdminToolbar.Divider />
            <AdminToolbar.Action
              icon={<span aria-hidden="true">{block.visible ? '👁' : '⃠'}</span>}
              label={block.visible ? 'Masquer le bloc' : 'Afficher le bloc'}
              active={!block.visible}
              onClick={() => updateBlock(block.id, { visible: !block.visible })}
            />
            <AdminToolbar.Action
              icon={<span aria-hidden="true">⇔</span>}
              label={block.widthMode === 'full' ? 'Limiter à 1600px' : 'Pleine largeur'}
              onClick={() =>
                updateBlock(block.id, {
                  widthMode: block.widthMode === 'full' ? 'max1600' : 'full',
                })
              }
            />
            <AdminToolbar.Duplicate onClick={() => duplicateBlock(block.id)} />
            <AdminToolbar.Delete name={def?.label} onClick={() => handleDelete(block)} />
          </AdminToolbar>
        ) : null}
      </div>
    );
  }

  const label = BUILTIN_PAGES.find((p) => p.key === pageKey)?.label || pageKey;

  const addButton =
    isAdmin && pageId ? (
      <div className={`${styles.inserter} ${styles.inserterLast}`} data-admin-ui="">
        <button
          type="button"
          className={styles.inserterButton}
          onClick={() => setInsertAt(blocks.length)}
        >
          <Plus size={14} aria-hidden="true" />
          Ajouter un bloc à « {label} »
        </button>
      </div>
    ) : null;

  const modals = (
    <>
      {isAdmin && error ? (
        <div style={{ padding: 16 }} data-admin-ui="">
          <AdminNotice tone="danger">
            {error}{' '}
            <button type="button" onClick={clearError} style={{ textDecoration: 'underline' }}>
              Masquer
            </button>
          </AdminNotice>
        </div>
      ) : null}

      {insertAt !== null ? (
        <AddBlockMenu onPick={handlePick} onClose={() => setInsertAt(null)} />
      ) : null}

      {editing ? (
        <BlockEditorModal
          block={editing}
          pageOptions={pageOptions}
          onSave={async (data) => updateBlock(editing.id, { data })}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );

  return { sections, addButton, modals };
}

export default useBuiltinPageBlocks;
