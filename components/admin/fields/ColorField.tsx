"use client";

import React, { useEffect, useState } from 'react';
import Field from './Field';
import { contrastRatio, contrastVerdict, parseColor } from '../contrast';
import styles from './fields.module.css';

export type ColorFieldProps = {
  label?: string;
  value: string | undefined;
  onChange: (value: string) => void;
  /** Valeur appliquée quand `value` est vide. */
  fallback: string;
  hint?: string;
  disabled?: boolean;
  /**
   * Couleur en vis-à-vis pour le contrôle de contraste WCAG.
   * Ex. la couleur de fond quand on règle la couleur de texte.
   */
  contrastAgainst?: string;
};

/**
 * Sélecteur de couleur : pastille native + saisie hexadécimale + verdict de
 * contraste. Remplace la vingtaine de `<input type="color">` inline.
 */
export default function ColorField({
  label,
  value,
  onChange,
  fallback,
  hint,
  disabled,
  contrastAgainst,
}: ColorFieldProps) {
  const current = value && value.trim() !== '' ? value : fallback;
  const [draft, setDraft] = useState(current);

  useEffect(() => setDraft(current), [current]);

  /** N'accepte que des hex complets — évite d'écraser la valeur en cours de frappe. */
  function commitText(raw: string) {
    setDraft(raw);
    const normalized = raw.startsWith('#') ? raw : `#${raw}`;
    if (parseColor(normalized) && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) {
      onChange(normalized.toLowerCase());
    }
  }

  const ratio = contrastAgainst ? contrastRatio(current, contrastAgainst) : null;
  const verdict = ratio ? contrastVerdict(ratio) : null;
  const verdictClass =
    verdict === 'pass' ? styles.contrastPass
    : verdict === 'warn' ? styles.contrastWarn
    : styles.contrastFail;
  const verdictLabel =
    verdict === 'pass' ? 'AA'
    : verdict === 'warn' ? 'AA gros'
    : 'Faible';

  return (
    <Field label={label} hint={hint}>
      {(id, describedBy) => (
        <div className={styles.colorRow}>
          <input
            id={id}
            type="color"
            className={styles.colorSwatch}
            value={parseColor(current) ? toHex(current) : fallback}
            disabled={disabled}
            aria-describedby={describedBy}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            type="text"
            className={`${styles.control} ${styles.colorText}`}
            value={draft}
            disabled={disabled}
            spellCheck={false}
            aria-label={label ? `${label} (code hexadécimal)` : 'Code hexadécimal'}
            onChange={(e) => commitText(e.target.value)}
            onBlur={() => setDraft(current)}
          />
          {ratio ? (
            <span
              className={`${styles.contrast} ${verdictClass}`}
              title={`Contraste ${ratio.toFixed(2)}:1 avec la couleur en vis-à-vis`}
            >
              {ratio.toFixed(1)} {verdictLabel}
            </span>
          ) : null}
        </div>
      )}
    </Field>
  );
}

/** `<input type="color">` n'accepte que #rrggbb — on normalise #rgb et rgb(). */
function toHex(input: string): string {
  const c = parseColor(input);
  if (!c) return '#000000';
  const h = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}
