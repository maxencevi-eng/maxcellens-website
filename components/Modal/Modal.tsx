"use client";

import React from 'react';
import AdminModal, { type AdminModalSize } from '../admin/AdminModal/AdminModal';

/**
 * Modale historique — conservée comme adaptateur.
 *
 * Elle ne fait plus que déléguer à `AdminModal`, ce qui apporte d'un coup à
 * tous ses consommateurs le verrou de scroll, le piège de focus, l'empilement,
 * la feuille plein écran sur mobile et le thème admin. Les nouveaux écrans
 * doivent importer `AdminModal` directement.
 *
 * @deprecated Utiliser `components/admin` → `AdminModal`.
 */
export default function Modal({
  title,
  onClose,
  children,
  footer,
  bodyClassName,
  size = 'lg',
}: {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  bodyClassName?: string;
  size?: AdminModalSize;
}) {
  return (
    <AdminModal
      title={title || 'Modification'}
      size={size}
      onClose={onClose}
      // `footer` était un ReactNode libre : on le passe tel quel, et l'absence
      // de footer reste l'absence de footer (et non la barre auto).
      footer={footer ?? null}
      bodyClassName={bodyClassName}
    >
      {children}
    </AdminModal>
  );
}
