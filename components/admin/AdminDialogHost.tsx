"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, HelpCircle, Info } from 'lucide-react';
import AdminModal from './AdminModal/AdminModal';
import AdminButton from './AdminButton';
import TextField from './fields/TextField';
import {
  resolveDialog,
  subscribeToDialogs,
  type DialogRequest,
} from './dialog';
import styles from './AdminDialogHost.module.css';

/**
 * Rend le dialogue actif demandé via `confirmDialog` / `promptDialog` /
 * `alertDialog`. Monté une seule fois, à la racine de l'application.
 *
 * Le dialogue passe par `AdminModal`, il hérite donc du verrou de scroll, du
 * piège de focus et de l'empilement : une confirmation ouverte depuis une
 * modale s'affiche correctement par-dessus.
 */
export default function AdminDialogHost() {
  const [active, setActive] = useState<{ id: number; request: DialogRequest } | null>(null);
  const [value, setValue] = useState('');

  useEffect(() => subscribeToDialogs((dialog) => {
    setActive(dialog ? { id: dialog.id, request: dialog.request } : null);
    // Réinitialise la saisie à chaque nouveau dialogue
    setValue(
      dialog?.request.kind === 'prompt' ? dialog.request.defaultValue ?? '' : ''
    );
  }), []);

  if (!active) return null;

  const { id, request } = active;
  const isDanger = request.tone === 'danger';
  const Icon = request.kind === 'alert' ? Info : isDanger ? AlertTriangle : HelpCircle;

  const cancel = () => resolveDialog(id, request.kind === 'prompt' ? null : false);
  const accept = () => resolveDialog(id, request.kind === 'prompt' ? value : true);

  // Saisie de sécurité : le bouton reste inactif tant que le texte ne
  // correspond pas exactement.
  const mustMatch = request.kind === 'prompt' ? request.mustMatch : undefined;
  const matches = !mustMatch || value.trim() === mustMatch;

  return (
    <AdminModal
      title={request.title}
      size="sm"
      onClose={cancel}
      // Une confirmation destructrice ne doit pas se fermer par un clic
      // distrait à côté : on exige un choix explicite.
      disableOverlayClose={isDanger}
      footer={
        <>
          {request.kind !== 'alert' ? (
            <AdminButton variant="ghost" onClick={cancel}>
              {request.cancelLabel || 'Annuler'}
            </AdminButton>
          ) : null}
          <AdminButton
            variant={isDanger ? 'danger' : 'primary'}
            onClick={accept}
            disabled={!matches}
          >
            {request.confirmLabel ||
              (request.kind === 'alert' ? 'Fermer' : isDanger ? 'Supprimer' : 'Confirmer')}
          </AdminButton>
        </>
      }
    >
      <div className={styles.body}>
        <span className={`${styles.icon} ${isDanger ? styles.iconDanger : ''}`}>
          <Icon size={20} aria-hidden="true" />
        </span>

        <div className={styles.content}>
          {request.message ? <p className={styles.message}>{request.message}</p> : null}

          {request.kind === 'prompt' ? (
            <TextField
              label={request.label}
              value={value}
              onChange={setValue}
              placeholder={request.placeholder}
              hint={
                mustMatch
                  ? `Saisissez exactement « ${mustMatch} » pour confirmer.`
                  : undefined
              }
            />
          ) : null}
        </div>
      </div>
    </AdminModal>
  );
}
