"use client";

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import AdminButton from '../AdminButton';
import AdminTabs, { type AdminTab } from '../AdminTabs';
import { pushModal, popModal, isTopModal, modalDepth } from '../modalStack';
import useFocusTrap from '../useFocusTrap';
import { confirmDialog } from '../dialog';
import styles from './AdminModal.module.css';

export type AdminModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export type AdminModalProps = {
  title: string;
  subtitle?: string;
  size?: AdminModalSize;
  onClose: () => void;
  children: React.ReactNode;

  /** Onglets facultatifs, rendus sous l'entête. */
  tabs?: AdminTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;

  /** État du formulaire — pilote le pied de page et le garde-fou de fermeture. */
  dirty?: boolean;
  saving?: boolean;
  saved?: boolean;
  error?: string | null;
  onSave?: () => void | Promise<void>;
  saveLabel?: string;
  cancelLabel?: string;

  /**
   * `auto` (défaut) : Annuler + Enregistrer si `onSave` est fourni, sinon rien.
   * ReactNode : pied de page entièrement personnalisé.
   * `null` : aucun pied de page.
   */
  footer?: React.ReactNode | 'auto' | null;

  /** Supprime le padding du corps (galeries, tableaux pleine largeur). */
  flushBody?: boolean;
  /** Classe additionnelle sur le corps défilant. */
  bodyClassName?: string;
  /** Désactive la fermeture au clic sur l'overlay. */
  disableOverlayClose?: boolean;
};

/**
 * Modale unique de l'espace admin.
 *
 * Remplace `components/Modal/Modal.tsx` et les 20 overlays réimplémentés à la
 * main. Apporte : verrou de scroll, piège de focus, empilement, garde-fou
 * « modifications non enregistrées », feuille plein écran sur mobile, et
 * isolation des clics vis-à-vis des transitions de page.
 */
export default function AdminModal({
  title,
  subtitle,
  size = 'md',
  onClose,
  children,
  tabs,
  activeTab,
  onTabChange,
  dirty = false,
  saving = false,
  saved = false,
  error = null,
  onSave,
  saveLabel = 'Enregistrer',
  cancelLabel = 'Annuler',
  footer = 'auto',
  flushBody = false,
  bodyClassName,
  disableOverlayClose = false,
}: AdminModalProps) {
  const id = useId();
  const [mounted, setMounted] = useState(false);
  const panelRef = useFocusTrap<HTMLDivElement>(mounted);

  useEffect(() => {
    setMounted(true);
    pushModal(id);
    return () => popModal(id);
  }, [id]);

  /** Fermeture avec garde-fou si des modifications sont en attente. */
  const requestClose = useCallback(async () => {
    if (dirty && !saving) {
      const ok = await confirmDialog({
        title: 'Modifications non enregistrées',
        message:
          'Vos changements seront perdus si vous fermez maintenant.',
        confirmLabel: 'Fermer sans enregistrer',
        cancelLabel: 'Continuer l’édition',
        tone: 'danger',
      });
      if (!ok) return;
    }
    onClose();
  }, [dirty, saving, onClose]);

  // Escape — ne ferme que la modale du sommet de la pile
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (!isTopModal(id)) return;
      e.stopPropagation();
      requestClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [id, requestClose]);

  // Ctrl/⌘+S enregistre
  useEffect(() => {
    if (!onSave) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        if (!isTopModal(id)) return;
        e.preventDefault();
        if (!saving) onSave!();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [id, onSave, saving]);

  const depth = mounted ? modalDepth(id) : 0;

  const footerNode = useMemo(() => {
    if (footer === null) return null;
    if (footer !== 'auto') return footer;
    if (!onSave) return null;
    return (
      <>
        <AdminButton variant="ghost" onClick={requestClose} disabled={saving}>
          {cancelLabel}
        </AdminButton>
        <AdminButton variant="primary" onClick={onSave} loading={saving}>
          {saveLabel}
        </AdminButton>
      </>
    );
  }, [footer, onSave, requestClose, saving, cancelLabel, saveLabel]);

  if (typeof document === 'undefined') return null;

  let status: React.ReactNode = null;
  if (error) status = <span className={styles.statusError}>{error}</span>;
  else if (saved) status = <span className={styles.statusSaved}>Enregistré</span>;
  else if (dirty) status = <span className={styles.statusDirty}>Modifications non enregistrées</span>;

  return createPortal(
    <div
      className={styles.overlay}
      // Marqueur lu par PageTransitionOverlay : les liens internes à l'admin
      // ne doivent jamais déclencher une transition de page.
      data-admin-ui=""
      style={{ zIndex: `calc(var(--adm-z-overlay) + ${depth * 2})` }}
      onMouseDown={(e) => {
        if (disableOverlayClose) return;
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        ref={panelRef}
        className={`${styles.panel} ${styles[size]}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{ zIndex: `calc(var(--adm-z-modal) + ${depth * 2})` }}
      >
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h2 className={styles.title}>{title}</h2>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={requestClose}
            aria-label="Fermer"
            data-adm-close=""
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {tabs && tabs.length > 0 ? (
          <div className={styles.tabsBar}>
            <AdminTabs
              tabs={tabs}
              active={activeTab ?? tabs[0].id}
              onChange={onTabChange ?? (() => {})}
            />
          </div>
        ) : null}

        <div
          className={[styles.body, flushBody ? styles.bodyFlush : '', bodyClassName]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </div>

        {footerNode ? (
          <div className={styles.footer}>
            <div className={styles.footerStatus}>{status}</div>
            <div className={styles.footerActions}>{footerNode}</div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
