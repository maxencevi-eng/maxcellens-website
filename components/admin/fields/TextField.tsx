"use client";

import React from 'react';
import Field from './Field';
import styles from './fields.module.css';

export type TextFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string | null;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Rend un `<textarea>` avec ce nombre de lignes. */
  multiline?: number;
  /** Police à chasse fixe — pour le HTML, le JSON, les slugs. */
  mono?: boolean;
  maxLength?: number;
  type?: 'text' | 'email' | 'url' | 'password' | 'search';
  autoComplete?: string;
};

export default function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  required,
  disabled,
  multiline,
  mono,
  maxLength,
  type = 'text',
  autoComplete,
}: TextFieldProps) {
  const counter =
    maxLength !== undefined ? `${value.length}/${maxLength}` : undefined;

  return (
    <Field
      label={label}
      labelValue={counter}
      hint={hint}
      error={error}
      required={required}
    >
      {(id, describedBy) =>
        multiline ? (
          <textarea
            id={id}
            className={[
              styles.control,
              styles.textarea,
              mono ? styles.textareaCode : '',
              error ? styles.controlInvalid : '',
            ]
              .filter(Boolean)
              .join(' ')}
            rows={multiline}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
          />
        ) : (
          <input
            id={id}
            type={type}
            className={[
              styles.control,
              mono ? styles.textareaCode : '',
              error ? styles.controlInvalid : '',
            ]
              .filter(Boolean)
              .join(' ')}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            autoComplete={autoComplete}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
          />
        )
      }
    </Field>
  );
}
