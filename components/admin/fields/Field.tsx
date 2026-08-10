"use client";

import React, { useId } from 'react';
import styles from './fields.module.css';

export type FieldProps = {
  label?: string;
  /** Valeur affichée à droite du label (ex. « 48px » pour un curseur). */
  labelValue?: React.ReactNode;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
};

/**
 * Enveloppe commune à tous les champs admin : label, aide, erreur, liaison
 * `id` / `aria-describedby`. Chaque champ concret la réutilise, ce qui garantit
 * une accessibilité et un espacement identiques partout.
 */
export default function Field({
  label,
  labelValue,
  hint,
  error,
  required,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.field}>
      {label || labelValue ? (
        <div className={styles.labelRow}>
          {label ? (
            <label className={styles.label} htmlFor={id}>
              {label}
              {required ? <span className={styles.required} aria-hidden="true">*</span> : null}
            </label>
          ) : <span />}
          {labelValue ? <span className={styles.labelValue}>{labelValue}</span> : null}
        </div>
      ) : null}

      {children(id, describedBy)}

      {error ? (
        <p className={styles.error} id={errorId} role="alert">{error}</p>
      ) : hint ? (
        <p className={styles.hint} id={hintId}>{hint}</p>
      ) : null}
    </div>
  );
}
