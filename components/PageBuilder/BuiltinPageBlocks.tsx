"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { AdminNotice, AdminToolbar } from '../admin';
import { useBlockVisibility } from '../BlockVisibility';
import AddBlockMenu from './AddBlockMenu';
import BlockEditorModal from './BlockEditorModal';
import usePageBlocks from './usePageBlocks';
import { getBlockDefinition, normalizeBlockData } from './blocks/registry';
import type { PageBlock } from './pageTypes';
import { BUILTIN_PAGES, type BuiltinPageKey } from './builtinPages';
import styles from './DynamicPageClient.module.css';

/**
 * Région de blocs additionnels sur une page historique.
 *
 * Les pages du site (accueil, contact, portrait…) gardent leurs blocs codés en
 * dur ; ce composant leur ajoute la même capacité d'édition que les pages
 * créées depuis l'admin. Les blocs ajoutés ici se placent après les blocs
 * intégrés et se réorganisent entre eux.
 *
 * Ne rend rien tant qu'aucun bloc n'a été ajouté et que l'utilisateur n'est
 * pas connecté : aucune trace côté visiteur.
 */
export default function BuiltinPageBlocks({ pageKey }: { pageKey: BuiltinPageKey }) {
  const { isAdmin } = useBlockVisibility();
  const [pageId, setPageId] = useState<string | null>(null);
  const [initial, setInitial] = useState<PageBlock[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // En session admin, la page hôte est créée à la volée par la route.
        const headers: HeadersInit = {};
        if (isAdmin) {
          const { supabase } = await import('../../lib/supabase');
          const { data } = await supabase.auth.getSession();
          const token = data?.session?.access_token;
          if (token) (headers as any).Authorization = `Bearer ${token}`;
        }
        const resp = await fetch(`/api/builtin-pages/${pageKey}`, { headers });
        const json = await resp.json();
        if (!mounted) return;
        setPageId(json?.pageId ?? null);
        setInitial(Array.isArray(json?.blocks) ? json.blocks : []);
      } catch (e: any) {
        if (mounted) {
          setInitial([]);
          setLoadError('Blocs additionnels indisponibles.');
        }
      }
    })();
    return () => { mounted = false; };
  }, [pageKey, isAdmin]);

  // Tant que rien n'est chargé, ou qu'il n'y a rien à montrer à un visiteur.
  if (initial === null) return null;
  if (!isAdmin && initial.length === 0) return null;
  if (!pageId) {
    // Page hôte absente : normal pour un visiteur, anormal pour un admin.
    return isAdmin && loadError ? (
      <div style={{ padding: 16 }}>
        <AdminNotice tone="warning">{loadError}</AdminNotice>
      </div>
    ) : null;
  }

  return <Region pageId={pageId} initial={initial} isAdmin={isAdmin} pageKey={pageKey} />;
}

function Region({
  pageId,
  initial,
  isAdmin,
  pageKey,
}: {
  pageId: string;
  initial: PageBlock[];
  isAdmin: boolean;
  pageKey: BuiltinPageKey;
}) {
  const {
    blocks,
    error,
    clearError,
    addBlock,
    updateBlock,
    moveBlock,
    deleteBlock,
    duplicateBlock,
  } = usePageBlocks(pageId, initial);

  const [editing, setEditing] = useState<PageBlock | null>(null);
  const [insertAt, setInsertAt] = useState<number | null>(null);

  const renderNested = useCallback(
    (type: string, data: Record<string, unknown>, key: string) => {
      const def = getBlockDefinition(type);
      if (!def) return null;
      const Render = def.Render;
      return <Render key={key} data={normalizeBlockData(type, data)} renderNested={renderNested} />;
    },
    []
  );

  async function handlePick(type: string) {
    const at = insertAt;
    setInsertAt(null);
    if (at === null) return;
    const created = await addBlock(type, at);
    if (created) setEditing(created);
  }

  const visible = isAdmin ? blocks : blocks.filter((b) => b.visible);
  const pageOptions = BUILTIN_PAGES.map((p) => ({ value: p.path, label: p.label }));

  return (
    <>
      {isAdmin && error ? (
        <div style={{ padding: 16 }}>
          <AdminNotice tone="danger">
            {error}{' '}
            <button type="button" onClick={clearError} style={{ textDecoration: 'underline' }}>
              Masquer
            </button>
          </AdminNotice>
        </div>
      ) : null}

      {visible.map((block, index) => {
        const def = getBlockDefinition(block.type);
        const Render = def?.Render;
        return (
          <React.Fragment key={block.id}>
            {isAdmin ? <Inserter onClick={() => setInsertAt(index)} /> : null}
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
              ) : null}

              {isAdmin ? (
                <AdminToolbar blockId={block.id} label={def?.label}>
                  <AdminToolbar.Edit onClick={() => setEditing(block)} />
                  <AdminToolbar.Divider />
                  <AdminToolbar.Action
                    icon={<span aria-hidden="true">↑</span>}
                    label="Monter le bloc"
                    disabled={index === 0}
                    onClick={() => moveBlock(block.id, 'up')}
                  />
                  <AdminToolbar.Action
                    icon={<span aria-hidden="true">↓</span>}
                    label="Descendre le bloc"
                    disabled={index === visible.length - 1}
                    onClick={() => moveBlock(block.id, 'down')}
                  />
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
                  <AdminToolbar.Delete name={def?.label} onClick={() => deleteBlock(block.id)} />
                </AdminToolbar>
              ) : null}
            </div>
          </React.Fragment>
        );
      })}

      {isAdmin ? (
        <Inserter last onClick={() => setInsertAt(visible.length)} label={`Ajouter un bloc à « ${labelFor(pageKey)} »`} />
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
}

function labelFor(key: BuiltinPageKey) {
  return BUILTIN_PAGES.find((p) => p.key === key)?.label || key;
}

function Inserter({
  onClick,
  last,
  label = 'Ajouter un bloc',
}: {
  onClick: () => void;
  last?: boolean;
  label?: string;
}) {
  return (
    <div className={`${styles.inserter} ${last ? styles.inserterLast : ''}`} data-admin-ui="">
      <button type="button" className={styles.inserterButton} onClick={onClick}>
        <Plus size={14} aria-hidden="true" />
        {label}
      </button>
    </div>
  );
}
