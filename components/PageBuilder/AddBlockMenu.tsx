"use client";

import React, { useMemo, useState } from 'react';
import { AdminButton, AdminModal, AdminSection } from '../admin';
import {
  BLOCK_CATEGORIES,
  BLOCK_LIST,
  NESTABLE_BLOCKS,
  type BlockDefinition,
} from './blocks/registry';
import styles from './AddBlockMenu.module.css';

/**
 * Sélecteur de bloc.
 *
 * Alimenté par le registre : un nouveau type de bloc y apparaît sans qu'aucune
 * ligne ne soit ajoutée ici.
 */
export default function AddBlockMenu({
  onPick,
  onClose,
  /** Limite aux blocs autorisés dans une colonne. */
  nestedOnly = false,
}: {
  onPick: (type: string) => void;
  onClose: () => void;
  nestedOnly?: boolean;
}) {
  const [query, setQuery] = useState('');
  const source = nestedOnly ? NESTABLE_BLOCKS : BLOCK_LIST;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (b) =>
        b.label.toLowerCase().includes(q) || b.description.toLowerCase().includes(q)
    );
  }, [query, source]);

  const grouped = BLOCK_CATEGORIES.map((cat) => ({
    ...cat,
    blocks: results.filter((b) => b.category === cat.id),
  })).filter((g) => g.blocks.length > 0);

  return (
    <AdminModal
      title="Ajouter un bloc"
      subtitle={
        nestedOnly
          ? 'Blocs disponibles à l’intérieur d’une colonne.'
          : 'Choisissez le type de contenu à insérer.'
      }
      size="lg"
      onClose={onClose}
      footer={<AdminButton variant="ghost" onClick={onClose}>Annuler</AdminButton>}
    >
      <input
        type="search"
        className={styles.search}
        placeholder="Rechercher un bloc…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Rechercher un bloc"
        // Pas d'`autoFocus` : il ne permet pas `preventScroll` et peut donc
        // faire défiler la page. Le piège de focus d'AdminModal place déjà le
        // curseur sur le premier champ, lui sans effet de bord.
      />

      {grouped.length === 0 ? (
        <p className={styles.noResult}>Aucun bloc ne correspond à « {query} ».</p>
      ) : (
        grouped.map((group) => (
          <AdminSection key={group.id} title={group.label}>
            <div className={styles.grid}>
              {group.blocks.map((b) => (
                <BlockCard key={b.type} block={b} onPick={() => onPick(b.type)} />
              ))}
            </div>
          </AdminSection>
        ))
      )}
    </AdminModal>
  );
}

function BlockCard({ block, onPick }: { block: BlockDefinition; onPick: () => void }) {
  const Icon = block.icon;
  return (
    <button type="button" className={styles.card} onClick={onPick}>
      <span className={styles.cardIcon}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className={styles.cardLabel}>{block.label}</span>
      <span className={styles.cardDescription}>{block.description}</span>
    </button>
  );
}
