"use client";

import React from 'react';
import Field from './Field';
import styles from './fields.module.css';

export type SelectOption = { value: string; label: string };

export type SelectFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  hint?: string;
  error?: string | null;
  disabled?: boolean;
  placeholder?: string;
};

export default function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
  error,
  disabled,
  placeholder,
}: SelectFieldProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id, describedBy) => (
        <select
          id={id}
          className={`${styles.control} ${styles.select} ${error ? styles.controlInvalid : ''}`}
          value={value}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </Field>
  );
}
