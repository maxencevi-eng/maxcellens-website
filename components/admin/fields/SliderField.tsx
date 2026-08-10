"use client";

import React from 'react';
import Field from './Field';
import styles from './fields.module.css';

export type SliderFieldProps = {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
  disabled?: boolean;
  /** Ajoute un champ numérique éditable à droite du curseur. */
  showInput?: boolean;
};

/**
 * Curseur + valeur. Remplace les six copies de
 * `<input type="range"> + <div>{n}px</div>` de l'AdminSidebar.
 */
export default function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = 'px',
  hint,
  disabled,
  showInput = true,
}: SliderFieldProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <Field
      label={label}
      labelValue={showInput ? undefined : `${value}${unit}`}
      hint={hint}
    >
      {(id, describedBy) => (
        <div className={styles.sliderRow}>
          <input
            id={id}
            type="range"
            className={styles.slider}
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            aria-describedby={describedBy}
            aria-valuetext={`${value}${unit}`}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          {showInput ? (
            <div className={styles.inputGroup} style={{ width: 'auto', flex: '0 0 auto' }}>
              <input
                type="number"
                className={`${styles.control} ${styles.sliderNumber}`}
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                aria-label={label ? `${label} (valeur)` : 'Valeur'}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isNaN(n)) onChange(clamp(n));
                }}
              />
              {unit ? <span className={styles.suffix}>{unit}</span> : null}
            </div>
          ) : null}
        </div>
      )}
    </Field>
  );
}
