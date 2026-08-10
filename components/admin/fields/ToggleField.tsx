"use client";

import React, { useId } from 'react';
import styles from './fields.module.css';

export type ToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
};

/** Interrupteur booléen. Le label entier est cliquable. */
export default function ToggleField({
  label,
  checked,
  onChange,
  hint,
  disabled,
}: ToggleFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={styles.field}>
      <label
        className={`${styles.toggleRow} ${disabled ? styles.disabled : ''}`}
        htmlFor={id}
      >
        <input
          id={id}
          type="checkbox"
          className={styles.toggleInput}
          checked={checked}
          disabled={disabled}
          aria-describedby={hintId}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={`${styles.toggleTrack} ${checked ? styles.toggleTrackOn : ''}`}
          aria-hidden="true"
        >
          <span className={styles.toggleKnob} />
        </span>
        <span className={styles.toggleText}>
          <span className={styles.label}>{label}</span>
          {hint ? <span className={styles.hint} id={hintId} style={{ display: 'block' }}>{hint}</span> : null}
        </span>
      </label>
    </div>
  );
}
