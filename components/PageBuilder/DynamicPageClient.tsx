"use client";

import React, { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { AdminNotice, AdminToolbar } from '../admin';
import { useBlockVisibility } from '../BlockVisibility';
import AddBlockMenu from './AddBlockMenu';
import BlockEditorModal from './BlockEditorModal';
import usePageBlocks from './usePageBlocks';
import { getBlockDefinition, normalizeBlockData } from './blocks/registry';
import type { PageBlock, SitePage } from './pageTypes';
import styles from './DynamicPageClient.module.css';

/**
 * Rendu et édition sur place d'une page dynamique.
 *
 * En lecture, c'est un simple rendu des blocs. Connecté, chaque bloc reçoit sa
 * barre d'actions et des zones d'insertion apparaissent entre les blocs — le
 * WYSIWYG déjà en place sur les pages historiques est conservé.
 */
export default function DynamicPageClient({
  page,
  pageOptions,
}: {
  page: SitePage;
  pageOptions?: { value: string; label: string }[];
}) {
  const { isAdmin } = useBlockVisibility();
  const {
    blocks,
    error,
    clearError,
    addBlock,
    updateBlock,
    moveBlock,
    deleteBlock,
    duplicateBlock,
  } = usePageBlocks(page.id, page.blocks);

  const [editing, setEditing] = useState<PageBlock | null>(null);
  const [insertAt, setInsertAt] = useState<number | null>(null);

  /** Rendu d'un bloc imbriqué (colonnes) — passé au renderer pour éviter
   *  une dépendance circulaire entre le registre et les renderers. */
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
    // On enchaîne sur l'éditeur : un bloc ajouté est presque toujours à remplir
    if (created) setEditing(created);
  }

  const visibleBlocks = isAdmin ? blocks : blocks.filter((b) => b.visible);

  return (
    <div className={`${styles.page} page-blocks`}>
      {isAdmin && page.status === 'draft' ? (
        <div className={styles.draftBanner}>
          Brouillon — cette page n’est pas visible par les visiteurs.
        </div>
      ) : null}

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

      {visibleBlocks.length === 0 && !isAdmin ? null : null}

      {visibleBlocks.map((block, index) => {
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
                <Render data={normalizeBlockData(block.type, block.data)} renderNested={renderNested} />
              ) : isAdmin ? (
                <AdminNotice tone="warning">
                  Type de bloc inconnu : « {block.type} ».
                </AdminNotice>
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
                    disabled={index === visibleBlocks.length - 1}
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
                    label={
                      block.widthMode === 'full' ? 'Limiter à 1600px' : 'Pleine largeur'
                    }
                    onClick={() =>
                      updateBlock(block.id, {
                        widthMode: block.widthMode === 'full' ? 'max1600' : 'full',
                      })
                    }
                  />
                  <AdminToolbar.Duplicate onClick={() => duplicateBlock(block.id)} />
                  <AdminToolbar.Delete
                    name={def?.label}
                    onClick={() => deleteBlock(block.id)}
                  />
                </AdminToolbar>
              ) : null}
            </div>
          </React.Fragment>
        );
      })}

      {isAdmin ? (
        <Inserter last onClick={() => setInsertAt(visibleBlocks.length)} />
      ) : null}

      {isAdmin && visibleBlocks.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyTitle}>Cette page est vide</span>
          <span>Ajoutez un premier bloc pour commencer.</span>
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
    </div>
  );
}

function Inserter({ onClick, last }: { onClick: () => void; last?: boolean }) {
  return (
    <div
      className={`${styles.inserter} ${last ? styles.inserterLast : ''}`}
      data-admin-ui=""
    >
      <button type="button" className={styles.inserterButton} onClick={onClick}>
        <Plus size={14} aria-hidden="true" />
        Ajouter un bloc
      </button>
    </div>
  );
}
