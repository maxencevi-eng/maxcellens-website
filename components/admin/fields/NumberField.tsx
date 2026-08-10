"use client";

import React, { useEffect, useState } from 'react';
import Field from './Field';
import styles from './fields.module.css';

export type NumberFieldProps = {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Unité affichée en suffixe (px, %, rem, s…). */
  unit?: string;
  hint?: string;
  error?: string | null;
  disabled?: boolean;
  placeholder?: string;
};

/**
 * Champ numérique borné.
 *
 * Garde une valeur texte locale pendant la saisie : sans cela, taper « 12 »
 * pour arriver à 120 déclenche un clamp à chaque frappe et bloque l'utilisateur
 * (comportement des `<input type="number">` inline du code d'origine).
 */
export default function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  hint,
  error,
  disabled,
  placeholder,
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string>(String(value));

  // Resynchronise quand la valeur change depuis l'extérieur (chargement, reset)
  useEffect(() => {
    setDraft((d) => (Number(d) === value ? d : String(value)));
  }, [value]);

  function clamp(n: number) {
    let out = n;
    if (min !== undefined) out = Math.max(min, out);
    if (max !== undefined) out = Math.min(max, out);
    return out;
  }

  function commit(raw: string) {
    const n = Number(raw);
    if (raw.trim() === '' || Number.isNaN(n)) {
      // Saisie vide ou invalide → on revient à la dernière valeur valide
      setDraft(String(value));
      return;
    }
    const next = clamp(n);
    setDraft(String(next));
    if (next !== value) onChange(next);
  }

  const input = (id: string, describedBy: string | undefined) => (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      className={`${styles.control} ${error ? styles.controlInvalid : ''}`}
      value={draft}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      placeholder={placeholder}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      onChange={(e) => {
        setDraft(e.target.value);
        // Propage immédiatement si la saisie est déjà dans les bornes,
        // pour conserver l'aperçu en direct.
        const n = Number(e.target.value);
        if (e.target.value !== '' && !Number.isNaN(n) && clamp(n) === n) onChange(n);
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
      }}
    />
  );

  return (
    <Field label={label} hint={hint} error={error}>
      {(id, describedBy) =>
        unit ? (
          <div className={styles.inputGroup}>
            {input(id, describedBy)}
            <span className={styles.suffix}>{unit}</span>
          </div>
        ) : (
          input(id, describedBy)
        )
      }
    </Field>
  );
}
