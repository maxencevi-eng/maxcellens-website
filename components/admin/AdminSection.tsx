"use client";

import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import styles from './AdminSection.module.css';

export type AdminSectionProps = {
  title?: string;
  description?: string;
  /** Boutons alignés à droite du titre. */
  actions?: React.ReactNode;
  /** Colonnes de la grille interne. `auto` s'adapte à la largeur disponible. */
  columns?: 1 | 2 | 3 | 'auto';
  children: React.ReactNode;
};

/** Section de formulaire : titre, description et grille de champs responsive. */
export default function AdminSection({
  title,
  description,
  actions,
  columns = 1,
  children,
}: AdminSectionProps) {
  const colClass =
    columns === 'auto' ? styles.colsAuto
    : columns === 3 ? styles.cols3
    : columns === 2 ? styles.cols2
    : styles.cols1;

  return (
    <section className={styles.section}>
      {title || description || actions ? (
        <div className={styles.head}>
          <div className={styles.headText}>
            {title ? <h3 className={styles.title}>{title}</h3> : null}
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      ) : null}
      <div className={`${styles.body} ${colClass}`}>{children}</div>
    </section>
  );
}

/** Enfant de `AdminSection` occupant toute la largeur de la grille. */
export function AdminSpan({ children }: { children: React.ReactNode }) {
  return <div className={styles.span}>{children}</div>;
}

/** Carte groupant un élément de liste (une diapositive, un client, un lien…). */
export function AdminCard({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.card}>
      {title || actions ? (
        <div className={styles.cardHead}>
          {title ? <h4 className={styles.cardTitle}>{title}</h4> : <span />}
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

const NOTICE_ICON = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const;

/** Bandeau d'information contextuel. */
export function AdminNotice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}) {
  const Icon = NOTICE_ICON[tone];
  const toneClass =
    tone === 'success' ? styles.noticeSuccess
    : tone === 'warning' ? styles.noticeWarning
    : tone === 'danger' ? styles.noticeDanger
    : styles.noticeInfo;

  return (
    <div className={`${styles.notice} ${toneClass}`} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon size={16} className={styles.noticeIcon} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

/** État vide d'une liste, avec une action de création facultative. */
export function AdminEmpty({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <div>{children}</div>
      {action}
    </div>
  );
}
