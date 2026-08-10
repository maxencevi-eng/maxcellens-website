"use client";

import React from 'react';
import Link from 'next/link';
import {
  columnCount,
  resolveColor,
  RATIO_VALUES,
  type ButtonData,
  type ColumnsData,
  type EmbedData,
  type HeadingData,
  type ImageBlockData,
  type RichTextData,
  type SeparatorData,
  type SpacerData,
} from './blockDefs';
import styles from './blocks.module.css';

/**
 * Rendu des blocs du page builder.
 *
 * Chaque bloc n'utilise que des variables du centre de style ; aucune couleur
 * n'est codée en dur, de sorte qu'un changement de thème se répercute
 * immédiatement sur les pages créées depuis l'admin.
 */

const alignClass = (a: string) =>
  a === 'center' ? styles.alignCenter : a === 'right' ? styles.alignRight : styles.alignLeft;

/* ── Séparateur ───────────────────────────────────────────────────────── */
export function SeparatorBlock({ data }: { data: SeparatorData }) {
  const variant =
    data.style === 'dashed' ? styles.separatorDashed
    : data.style === 'dotted' ? styles.separatorDotted
    : data.style === 'gradient' ? styles.separatorGradient
    : data.style === 'ornament' ? styles.separatorOrnament
    : styles.separatorSolid;

  const vars = {
    '--sep-thickness': `${data.thickness}px`,
    '--sep-color': resolveColor(data.color),
  } as React.CSSProperties;

  return (
    <div
      className={styles.inner}
      style={{ marginTop: data.marginTop, marginBottom: data.marginBottom }}
    >
      <div
        className={`${styles.separator} ${variant}`}
        style={{ ...vars, width: `${data.widthPercent}%` }}
        role="separator"
      >
        {data.style === 'ornament' ? <span className={styles.ornamentMark} /> : null}
      </div>
    </div>
  );
}

/* ── Espace ───────────────────────────────────────────────────────────── */
export function SpacerBlock({ data }: { data: SpacerData }) {
  const vars = {
    '--spacer-height-desktop': `${data.heightDesktop}px`,
    '--spacer-height-mobile': `${data.heightMobile}px`,
  } as React.CSSProperties;
  return <div className={styles.spacer} style={vars} aria-hidden="true" />;
}

/* ── Bouton ───────────────────────────────────────────────────────────── */
export function ButtonBlock({ data }: { data: ButtonData }) {
  const sizeClass =
    data.size === 'sm' ? styles.btnSizeSm
    : data.size === 'lg' ? styles.btnSizeLg
    : styles.btnSizeMd;

  const className = `${styles.buttonLink} ${sizeClass} btn-site-${data.variant}`;
  const isExternal = /^(https?:|mailto:|tel:)/i.test(data.href);

  const content = data.label || 'Bouton';

  return (
    <div
      className={styles.inner}
      style={{ marginTop: data.marginTop, marginBottom: data.marginBottom }}
    >
      <div
        className={`${styles.buttonRow} ${alignClass(data.align)} ${
          data.fullWidthMobile ? styles.buttonFullMobile : ''
        }`}
      >
        {isExternal || data.newTab ? (
          <a
            className={className}
            href={data.href || '#'}
            target={data.newTab ? '_blank' : undefined}
            rel={data.newTab ? 'noopener noreferrer' : undefined}
          >
            {content}
          </a>
        ) : (
          <Link className={className} href={data.href || '/'}>
            {content}
          </Link>
        )}
      </div>
    </div>
  );
}

/* ── Titre ────────────────────────────────────────────────────────────── */
export function HeadingBlock({ data }: { data: HeadingData }) {
  // React 19 ne déclare plus le namespace global JSX : on type via React.
  const Tag = (data.level === 'p' ? 'p' : data.level) as React.ElementType;
  const style: React.CSSProperties = {
    textAlign: data.align,
    color: resolveColor(data.color, 'inherit'),
  };
  // 0 = on laisse la taille définie par le centre de style
  if (data.fontSize > 0) style.fontSize = responsiveFontSize(data.fontSize);

  return (
    <div
      className={styles.inner}
      style={{ marginTop: data.marginTop, marginBottom: data.marginBottom }}
    >
      {data.eyebrow ? (
        <span className={styles.eyebrow} style={{ textAlign: data.align, display: 'block' }}>
          {data.eyebrow}
        </span>
      ) : null}
      <Tag className={styles.headingEl} style={style}>
        {data.text}
      </Tag>
    </div>
  );
}

/**
 * Taille de police fluide.
 * Reprend la logique déjà utilisée par les blocs de la page d'accueil, pour
 * qu'un titre réglé à 64px ne déborde pas sur mobile.
 */
function responsiveFontSize(fs: number): string {
  if (fs <= 24) return `${fs}px`;
  const vw = Math.min(fs / 8, 9).toFixed(2);
  const min = Math.max(14, Math.round(fs * 0.22));
  return `clamp(${min}px, ${vw}vw, ${fs}px)`;
}

/* ── Texte riche ──────────────────────────────────────────────────────── */
export function RichTextBlock({ data }: { data: RichTextData }) {
  return (
    <div
      className={styles.inner}
      style={{ marginTop: data.marginTop, marginBottom: data.marginBottom }}
    >
      <div
        className={`${styles.richText} richtext-content`}
        style={{
          textAlign: data.align,
          maxWidth: data.maxWidth > 0 ? data.maxWidth : undefined,
          marginLeft: data.align === 'center' && data.maxWidth > 0 ? 'auto' : undefined,
          marginRight: data.align === 'center' && data.maxWidth > 0 ? 'auto' : undefined,
        }}
        // Le HTML est assaini à l'enregistrement, côté serveur (route blocks).
        dangerouslySetInnerHTML={{ __html: data.html || '' }}
      />
    </div>
  );
}

/* ── Image ────────────────────────────────────────────────────────────── */
export function ImageBlock({ data }: { data: ImageBlockData }) {
  if (!data.image?.url) {
    return (
      <div className={styles.inner}>
        <p className={styles.placeholder}>Aucune image sélectionnée.</p>
      </div>
    );
  }
  return (
    <div
      className={styles.inner}
      style={{ marginTop: data.marginTop, marginBottom: data.marginBottom }}
    >
      <figure className={styles.imageFigure}>
        <img
          className={styles.imageEl}
          src={data.image.url}
          alt={data.alt || ''}
          loading="lazy"
          style={{
            aspectRatio: data.ratio !== 'auto' ? RATIO_VALUES[data.ratio] : undefined,
            borderRadius: data.radius,
          }}
        />
        {data.caption ? (
          <figcaption className={styles.imageCaption}>{data.caption}</figcaption>
        ) : null}
      </figure>
    </div>
  );
}

/* ── Colonnes ─────────────────────────────────────────────────────────── */
export function ColumnsBlock({
  data,
  renderNested,
}: {
  data: ColumnsData;
  /** Injecté par le rendu de page, pour éviter une dépendance circulaire. */
  renderNested: (type: string, blockData: Record<string, unknown>, key: string) => React.ReactNode;
}) {
  const layoutClass =
    data.layout === 'wide-left' ? styles.columnsRatioWideLeft
    : data.layout === 'wide-right' ? styles.columnsRatioWideRight
    : data.layout === '3' ? styles.columnsCount3
    : data.layout === '4' ? styles.columnsCount4
    : styles.columnsCount2;

  const count = columnCount(data.layout);
  const vars = {
    '--columns-gap': `${data.gap}px`,
    '--columns-align': data.verticalAlign,
  } as React.CSSProperties;

  return (
    <div
      className={styles.inner}
      style={{ marginTop: data.marginTop, marginBottom: data.marginBottom }}
    >
      <div className={`${styles.columns} ${layoutClass}`} style={vars}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={styles.column}>
            {(data.columns[i] || []).map((nested, j) =>
              renderNested(nested.type, nested.data, `${i}-${j}`)
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Intégration externe ──────────────────────────────────────────────── */
export function EmbedBlock({ data }: { data: EmbedData }) {
  if (!data.html) {
    return (
      <div className={styles.inner}>
        <p className={styles.placeholder}>Aucun contenu à intégrer.</p>
      </div>
    );
  }
  const vars = { '--embed-ratio': `${data.ratioPercent}%` } as React.CSSProperties;
  return (
    <div
      className={styles.inner}
      style={{ marginTop: data.marginTop, marginBottom: data.marginBottom }}
    >
      <div
        className={`${styles.embed} ${data.ratioPercent > 0 ? styles.embedRatio : ''}`}
        style={vars}
        // Assaini côté serveur avant écriture en base (sanitize-html).
        dangerouslySetInnerHTML={{ __html: data.html }}
      />
    </div>
  );
}
