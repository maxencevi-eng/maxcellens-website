"use client";

import React from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, FileText, Layers } from 'lucide-react';
import { AdminButton, AdminNotice } from '../admin';
import type { MenuItem } from './menuItems';
import styles from './MenuItemsField.module.css';

/**
 * Liste ordonnable des entrées de menu.
 *
 * Utilisée à l'identique par le menu de bureau, le menu mobile et la
 * navigation du pied de page : c'est ce qui garantit que les trois écrans
 * proposent les mêmes entrées et le même comportement.
 */
export default function MenuItemsField({
  items,
  visible,
  onToggle,
  onMove,
  emptyHint,
}: {
  items: MenuItem[];
  /** Vrai / faux par identifiant d'entrée. */
  visible: Record<string, boolean>;
  onToggle: (id: string, next: boolean) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  emptyHint?: string;
}) {
  if (items.length === 0) {
    return <AdminNotice>{emptyHint || 'Aucune entrée disponible.'}</AdminNotice>;
  }

  return (
    <ul className={styles.list}>
      {items.map((item, index) => {
        const isVisible = Boolean(visible[item.id]);
        const Icon = item.builtin ? Layers : FileText;
        return (
          <li
            key={item.id}
            className={`${styles.item} ${isVisible ? '' : styles.itemHidden}`}
          >
            <Icon size={15} className={styles.icon} aria-hidden="true" />

            <span className={styles.text}>
              <span className={styles.label}>{item.label}</span>
              <span className={styles.href}>{item.href}</span>
            </span>

            {!item.builtin ? (
              <span className={styles.badge}>Page créée</span>
            ) : null}

            <span className={styles.actions}>
              <AdminButton
                size="sm"
                variant="ghost"
                iconOnly
                aria-label={`Monter ${item.label}`}
                disabled={index === 0}
                onClick={() => onMove(item.id, 'up')}
              >
                <ArrowUp size={14} aria-hidden="true" />
              </AdminButton>
              <AdminButton
                size="sm"
                variant="ghost"
                iconOnly
                aria-label={`Descendre ${item.label}`}
                disabled={index === items.length - 1}
                onClick={() => onMove(item.id, 'down')}
              >
                <ArrowDown size={14} aria-hidden="true" />
              </AdminButton>
              <AdminButton
                size="sm"
                variant={isVisible ? 'secondary' : 'ghost'}
                iconOnly
                aria-label={
                  isVisible ? `Masquer ${item.label}` : `Afficher ${item.label}`
                }
                onClick={() => onToggle(item.id, !isVisible)}
              >
                {isVisible
                  ? <Eye size={14} aria-hidden="true" />
                  : <EyeOff size={14} aria-hidden="true" />}
              </AdminButton>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
