"use client";

import React from 'react';
import Field from './Field';
import styles from './fields.module.css';

export type SegmentedOption<T extends string = string> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
  title?: string;
};

export type SegmentedFieldProps<T extends string = string> = {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  hint?: string;
  disabled?: boolean;
};

/**
 * Choix exclusif court (alignement, style de bouton, ratio d'image…).
 * Remplace les groupes de boutons stylés à la main dans les éditeurs de blocs.
 */
export default function SegmentedField<T extends string = string>({
  label,
  value,
  onChange,
  options,
  hint,
  disabled,
}: SegmentedFieldProps<T>) {
  return (
    <Field label={label} hint={hint}>
      {(id, describedBy) => (
        <div
          id={id}
          className={styles.segmented}
          role="radiogroup"
          aria-label={label}
          aria-describedby={describedBy}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                title={o.title || o.label}
                disabled={disabled}
                className={`${styles.segment} ${active ? styles.segmentActive : ''}`}
                onClick={() => onChange(o.value)}
              >
                {o.icon}
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </Field>
  );
}
