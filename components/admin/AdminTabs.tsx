"use client";

import React, { useRef } from 'react';
import styles from './AdminTabs.module.css';

export type AdminTab = {
  id: string;
  label: string;
  /** Pastille numérique (nombre d'éléments, d'erreurs…). */
  badge?: number | string;
  icon?: React.ReactNode;
};

export type AdminTabsProps = {
  tabs: AdminTab[];
  active: string;
  onChange: (id: string) => void;
  /** `underline` (défaut) pour l'entête de modale, `pills` dans un corps. */
  variant?: 'underline' | 'pills';
};

/**
 * Onglets admin. Remplace `components/ui/ModalTabs.tsx`, qui stylait tout en
 * inline et n'était donc ni surchargeable ni navigable au clavier.
 */
export default function AdminTabs({
  tabs,
  active,
  onChange,
  variant = 'underline',
}: AdminTabsProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  /** Flèches gauche/droite pour naviguer entre onglets (pattern ARIA tablist). */
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = tabs.findIndex((t) => t.id === active);
    if (i < 0) return;
    const next = e.key === 'ArrowRight' ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    const node = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
    node?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      className={`${styles.tabs} ${variant === 'pills' ? styles.pills : ''}`}
      onKeyDown={onKeyDown}
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(t.id)}
          >
            {t.icon}
            {t.label}
            {t.badge !== undefined && t.badge !== null && t.badge !== '' ? (
              <span className={styles.badge}>{t.badge}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
