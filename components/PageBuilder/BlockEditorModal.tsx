"use client";

import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  AdminButton,
  AdminCard,
  AdminEmpty,
  AdminModal,
  AdminNotice,
  AdminSection,
} from '../admin';
import AddBlockMenu from './AddBlockMenu';
import { getBlockDefinition, normalizeBlockData } from './blocks/registry';
import { columnCount, type ColumnsData, type NestedBlock } from './blocks/blockDefs';
import type { PageBlock } from './pageTypes';

/**
 * Édition d'un bloc.
 *
 * Le formulaire vient du registre (`definition.Editor`) : cette modale ne
 * connaît aucun type de bloc en particulier. Le cas `columns` est le seul à
 * demander un traitement propre, puisqu'il contient d'autres blocs.
 */
export default function BlockEditorModal({
  block,
  pageOptions,
  onSave,
  onClose,
}: {
  block: PageBlock;
  /** Pages du site, proposées comme cibles de lien. */
  pageOptions?: { value: string; label: string }[];
  onSave: (data: Record<string, unknown>) => Promise<boolean> | boolean;
  onClose: () => void;
}) {
  const definition = getBlockDefinition(block.type);
  const [data, setData] = useState<Record<string, unknown>>(() =>
    normalizeBlockData(block.type, block.data)
  );
  const [baseline] = useState(() => JSON.stringify(normalizeBlockData(block.type, block.data)));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingToColumn, setAddingToColumn] = useState<number | null>(null);

  const dirty = JSON.stringify(data) !== baseline;

  if (!definition) {
    return (
      <AdminModal title="Bloc inconnu" size="sm" onClose={onClose}>
        <AdminNotice tone="danger">
          Le type « {block.type} » n’existe pas dans le registre de blocs. Il a
          probablement été retiré du code : supprimez ce bloc ou restaurez son type.
        </AdminNotice>
      </AdminModal>
    );
  }

  const Editor = definition.Editor;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const ok = await onSave(data);
      if (ok) {
        setSaved(true);
        onClose();
      } else {
        setError('Enregistrement impossible.');
      }
    } catch (e: any) {
      setError(e?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  /* ── Colonnes : gestion des blocs imbriqués ─────────────────────────── */
  const columnsData = data as unknown as ColumnsData;

  function updateNested(colIndex: number, nested: NestedBlock[]) {
    const columns = [...(columnsData.columns || [])];
    columns[colIndex] = nested;
    setData({ ...data, columns } as Record<string, unknown>);
  }

  function addNested(colIndex: number, type: string) {
    const current = columnsData.columns?.[colIndex] || [];
    updateNested(colIndex, [...current, { type, data: normalizeBlockData(type, {}) }]);
    setAddingToColumn(null);
  }

  function removeNested(colIndex: number, index: number) {
    const current = columnsData.columns?.[colIndex] || [];
    updateNested(colIndex, current.filter((_, i) => i !== index));
  }

  function updateNestedData(colIndex: number, index: number, nestedData: Record<string, unknown>) {
    const current = columnsData.columns?.[colIndex] || [];
    updateNested(
      colIndex,
      current.map((n, i) => (i === index ? { ...n, data: nestedData } : n))
    );
  }

  const columnsUi = useMemo(() => {
    if (block.type !== 'columns') return null;
    const count = columnCount(columnsData.layout || '2');

    return (
      <>
        {Array.from({ length: count }).map((_, colIndex) => {
          const nested = columnsData.columns?.[colIndex] || [];
          return (
            <AdminSection
              key={colIndex}
              title={`Colonne ${colIndex + 1}`}
              actions={
                <AdminButton
                  size="sm"
                  variant="secondary"
                  leadingIcon={<Plus size={14} aria-hidden="true" />}
                  onClick={() => setAddingToColumn(colIndex)}
                >
                  Ajouter
                </AdminButton>
              }
            >
              {nested.length === 0 ? (
                <AdminEmpty>Colonne vide.</AdminEmpty>
              ) : (
                nested.map((n, i) => {
                  const nestedDef = getBlockDefinition(n.type);
                  if (!nestedDef) return null;
                  const NestedEditor = nestedDef.Editor;
                  return (
                    <AdminCard
                      key={`${colIndex}-${i}`}
                      title={nestedDef.label}
                      actions={
                        <AdminButton
                          size="sm"
                          variant="dangerGhost"
                          iconOnly
                          aria-label={`Retirer le bloc ${nestedDef.label}`}
                          onClick={() => removeNested(colIndex, i)}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </AdminButton>
                      }
                    >
                      <NestedEditor
                        data={normalizeBlockData(n.type, n.data)}
                        onChange={(d: Record<string, unknown>) =>
                          updateNestedData(colIndex, i, d)
                        }
                        pageOptions={pageOptions}
                      />
                    </AdminCard>
                  );
                })
              )}
            </AdminSection>
          );
        })}
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.type, columnsData, pageOptions]);

  return (
    <>
      <AdminModal
        title={definition.label}
        subtitle={definition.description}
        size="lg"
        onClose={onClose}
        dirty={dirty}
        saving={saving}
        saved={saved}
        error={error}
        onSave={handleSave}
      >
        <Editor
          data={data}
          onChange={(d: Record<string, unknown>) => {
            setSaved(false);
            setData(d);
          }}
          pageOptions={pageOptions}
        >
          {columnsUi}
        </Editor>
      </AdminModal>

      {addingToColumn !== null ? (
        <AddBlockMenu
          nestedOnly
          onPick={(type) => addNested(addingToColumn, type)}
          onClose={() => setAddingToColumn(null)}
        />
      ) : null}
    </>
  );
}
