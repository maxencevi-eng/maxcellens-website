"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  MoreVertical,
  Maximize2,
  Minimize2,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  useBlockVisibility,
  type BlockOrderPage,
  type BlockWidthMode,
} from '../BlockVisibility';
import styles from './AdminToolbar.module.css';

type ToolbarCtx = {
  blockId: string;
  page?: BlockOrderPage;
  compact: boolean;
};

const Ctx = createContext<ToolbarCtx | null>(null);

function useToolbar(component: string): ToolbarCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error(`${component} doit être utilisé dans <AdminToolbar>`);
  return ctx;
}

export type AdminToolbarProps = {
  blockId: string;
  /** Page portant l'ordre des blocs — requis pour les flèches de déplacement. */
  page?: BlockOrderPage;
  /** Étiquette affichée à gauche des actions. */
  label?: string;
  position?: 'topRight' | 'topLeft' | 'bottomRight';
  children: React.ReactNode;
};

/**
 * Barre d'actions admin ancrée sur un bloc de page.
 *
 * Remplace `editBtnStyle` (dupliqué dans une douzaine de fichiers) ainsi que
 * les composants `BlockVisibilityToggle`, `BlockWidthToggle` et
 * `BlockOrderButtons` rendus séparément. Elle lit elle-même le contexte de
 * visibilité : plus aucune prop à câbler bloc par bloc.
 *
 * Ne rend rien si l'utilisateur n'est pas connecté.
 */
export default function AdminToolbar({
  blockId,
  page,
  label,
  position = 'topRight',
  children,
}: AdminToolbarProps) {
  const { isAdmin } = useBlockVisibility();
  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setCompact(mq.matches);
    update();
    // addEventListener sur MediaQueryList n'existe pas avant Safari 14
    if (mq.addEventListener) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (!isAdmin) return null;

  const posClass =
    position === 'topLeft' ? styles.topLeft
    : position === 'bottomRight' ? styles.bottomRight
    : '';

  const ctx: ToolbarCtx = { blockId, page, compact };

  return (
    <Ctx.Provider value={ctx}>
      <div
        ref={wrapRef}
        className={`${styles.toolbar} ${posClass} ${compact ? styles.menuWrap : ''}`}
        data-admin-ui=""
      >
        {compact ? (
          <>
            <button
              type="button"
              className={styles.btn}
              aria-label="Actions du bloc"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <MoreVertical size={16} aria-hidden="true" />
            </button>
            {menuOpen ? <div className={styles.menu}>{children}</div> : null}
          </>
        ) : (
          <>
            {label ? <span className={styles.tag}>{label}</span> : null}
            {children}
          </>
        )}
      </div>
    </Ctx.Provider>
  );
}

/* ── Actions ───────────────────────────────────────────────────────────── */

function Edit({ onClick, label = 'Modifier' }: { onClick: () => void; label?: string }) {
  const { compact } = useToolbar('AdminToolbar.Edit');
  return (
    <button
      type="button"
      className={`${styles.btn} ${styles.btnPrimary}`}
      onClick={onClick}
      aria-label={label}
    >
      <Pencil size={14} aria-hidden="true" />
      {compact ? label : null}
    </button>
  );
}

function Visibility() {
  const { blockId, compact } = useToolbar('AdminToolbar.Visibility');
  const { hiddenBlocks, toggleBlock } = useBlockVisibility();
  const hidden = hiddenBlocks.includes(blockId);
  const label = hidden ? 'Afficher le bloc' : 'Masquer le bloc';
  return (
    <button
      type="button"
      className={`${styles.btn} ${hidden ? styles.btnActive : ''}`}
      onClick={() => toggleBlock(blockId)}
      aria-label={label}
      title={label}
    >
      {hidden ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
      {compact ? label : null}
    </button>
  );
}

function Width() {
  const { blockId, compact } = useToolbar('AdminToolbar.Width');
  const { blockWidthModes, setBlockWidthMode } = useBlockVisibility();
  const mode: BlockWidthMode = blockWidthModes[blockId] || 'full';
  const next: BlockWidthMode = mode === 'full' ? 'max1600' : 'full';
  const label = mode === 'full' ? 'Limiter à 1600px' : 'Pleine largeur';
  return (
    <button
      type="button"
      className={styles.btn}
      onClick={() => setBlockWidthMode(blockId, next)}
      aria-label={label}
      title={label}
    >
      {mode === 'full'
        ? <Minimize2 size={14} aria-hidden="true" />
        : <Maximize2 size={14} aria-hidden="true" />}
      {compact ? label : null}
    </button>
  );
}

function Move() {
  const { blockId, page, compact } = useToolbar('AdminToolbar.Move');
  const { moveBlock, getOrder } = useBlockVisibility();
  if (!page) return null;
  const order = getOrder(page);
  const i = order.indexOf(blockId);
  const isFirst = i <= 0;
  const isLast = i < 0 || i >= order.length - 1;
  return (
    <>
      <button
        type="button"
        className={styles.btn}
        disabled={isFirst}
        onClick={() => moveBlock(page, blockId, 'up')}
        aria-label="Monter le bloc"
        title="Monter le bloc"
      >
        <ArrowUp size={14} aria-hidden="true" />
        {compact ? 'Monter' : null}
      </button>
      <button
        type="button"
        className={styles.btn}
        disabled={isLast}
        onClick={() => moveBlock(page, blockId, 'down')}
        aria-label="Descendre le bloc"
        title="Descendre le bloc"
      >
        <ArrowDown size={14} aria-hidden="true" />
        {compact ? 'Descendre' : null}
      </button>
    </>
  );
}

function Duplicate({ onClick }: { onClick: () => void }) {
  const { compact } = useToolbar('AdminToolbar.Duplicate');
  return (
    <button
      type="button"
      className={styles.btn}
      onClick={onClick}
      aria-label="Dupliquer le bloc"
      title="Dupliquer le bloc"
    >
      <Copy size={14} aria-hidden="true" />
      {compact ? 'Dupliquer' : null}
    </button>
  );
}

function Delete({ onClick, name }: { onClick: () => void; name?: string }) {
  const { compact } = useToolbar('AdminToolbar.Delete');
  return (
    <button
      type="button"
      className={`${styles.btn} ${styles.btnDanger}`}
      onClick={() => {
        const ok = window.confirm(
          `Supprimer définitivement ce bloc${name ? ` « ${name} »` : ''} ?`
        );
        if (ok) onClick();
      }}
      aria-label="Supprimer le bloc"
      title="Supprimer le bloc"
    >
      <Trash2 size={14} aria-hidden="true" />
      {compact ? 'Supprimer' : null}
    </button>
  );
}

function Divider() {
  const { compact } = useToolbar('AdminToolbar.Divider');
  if (compact) return null;
  return <span className={styles.divider} aria-hidden="true" />;
}

/** Action libre, pour les cas propres à un bloc. */
function Action({
  icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  const { compact } = useToolbar('AdminToolbar.Action');
  return (
    <button
      type="button"
      className={`${styles.btn} ${active ? styles.btnActive : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {icon}
      {compact ? label : null}
    </button>
  );
}

/* ── Coque et bouton réutilisables pour les blocs historiques ────────────
   Les pages d'origine composent leurs contrôles à la main (bouton
   « Modifier » propre à chaque page, puis BlockVisibilityToggle,
   BlockWidthToggle, BlockOrderButtons). Plutôt que de réécrire ces douze
   emplacements, on leur donne la coque et les boutons du design system :
   l'apparence devient identique à celle des blocs du page builder. */

export function AdminToolbarShell({
  children,
  position = 'topRight',
}: {
  children: React.ReactNode;
  position?: 'topRight' | 'topLeft' | 'bottomRight';
}) {
  const posClass =
    position === 'topLeft' ? styles.topLeft
    : position === 'bottomRight' ? styles.bottomRight
    : '';
  return (
    <div className={`${styles.toolbar} ${posClass}`} data-admin-ui="">
      {children}
    </div>
  );
}

export function AdminToolbarButton({
  icon,
  label,
  onClick,
  variant = 'default',
  active,
  disabled,
  /** Affiche le libellé à côté de l'icône (bouton « Modifier »). */
  showLabel,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
  active?: boolean;
  disabled?: boolean;
  showLabel?: boolean;
}) {
  const variantClass =
    variant === 'primary' ? styles.btnPrimary
    : variant === 'danger' ? styles.btnDanger
    : '';
  return (
    <button
      type="button"
      className={`${styles.btn} ${variantClass} ${active ? styles.btnActive : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {icon}
      {showLabel ? label : null}
    </button>
  );
}

export function AdminToolbarDivider() {
  return <span className={styles.divider} aria-hidden="true" />;
}

AdminToolbar.Edit = Edit;
AdminToolbar.Visibility = Visibility;
AdminToolbar.Width = Width;
AdminToolbar.Move = Move;
AdminToolbar.Duplicate = Duplicate;
AdminToolbar.Delete = Delete;
AdminToolbar.Divider = Divider;
AdminToolbar.Action = Action;
