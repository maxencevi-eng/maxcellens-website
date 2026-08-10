"use client";

import React, { forwardRef } from 'react';
import styles from './AdminButton.module.css';

export type AdminButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'dangerGhost';

export type AdminButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'className'
> & {
  variant?: AdminButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  /** Bouton carré ne contenant qu'une icône — `aria-label` devient obligatoire. */
  iconOnly?: boolean;
  /** Occupe toute la largeur disponible. */
  block?: boolean;
  loading?: boolean;
  /** Icône rendue avant le libellé. */
  leadingIcon?: React.ReactNode;
  className?: string;
};

/**
 * Bouton unique de l'admin. Remplace `.btn-primary` / `.btn-ghost` de
 * globals.css et les dizaines de `<button style={{...}}>` inline.
 */
const AdminButton = forwardRef<HTMLButtonElement, AdminButtonProps>(function AdminButton(
  {
    variant = 'secondary',
    size = 'md',
    iconOnly = false,
    block = false,
    loading = false,
    leadingIcon,
    children,
    disabled,
    type = 'button',
    className,
    ...rest
  },
  ref
) {
  const classes = [
    styles.btn,
    styles[variant],
    size !== 'md' ? styles[size] : '',
    iconOnly ? styles.icon : '',
    block ? styles.block : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        leadingIcon ?? null
      )}
      {/* En mode icône seule, le spinner remplace l'icône passée en children */}
      {loading && iconOnly ? null : children}
    </button>
  );
});

export default AdminButton;
