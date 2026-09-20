"use client";

import React from 'react';
import { RATIO_VALUES, resolveColor } from './blockDefs';
import { safeCardHref, type ImageCardsData } from './imageCardsDefs';
import styles from './ImageCardsBlock.module.css';

export function ImageCardsBlock({ data, lateral = false }: { data: ImageCardsData; lateral?: boolean }) {
  const Heading = data.headingLevel;
  const ctaHref = safeCardHref(data.ctaHref);
  const variables = {
    '--cards-columns': data.columns, '--cards-mobile-columns': Math.min(data.columns, 2), '--cards-gap': `${data.gap}px`,
    '--cards-padding-x': `${data.paddingX}px`, '--cards-heading-size': `${data.titleSize}px`,
    background: resolveColor(data.background), color: resolveColor(data.color),
    paddingTop: data.paddingTop, paddingBottom: data.paddingBottom,
    marginTop: data.marginTop, marginBottom: data.marginBottom,
    borderRadius: `${data.radiusTop}px ${data.radiusTop}px ${data.radiusBottom}px ${data.radiusBottom}px`,
  } as React.CSSProperties;
  return (
    <section className={`${styles.section} ${lateral ? styles.lateral : ''} ${lateral && data.titlePosition === 'right' ? styles.titleRight : ''}`} style={variables}>
      <header className={styles.header} style={{ textAlign: data.titleAlign }}>
        <div>
          {data.eyebrow && <p className={styles.eyebrow}>{data.eyebrow}</p>}
          {data.title && <Heading className={styles.heading}>{data.title}</Heading>}
          {data.subtitle && <p className={styles.subtitle}>{data.subtitle}</p>}
        </div>
        {data.ctaLabel && ctaHref && <a className={styles.cta} href={ctaHref} target={data.ctaNewTab ? '_blank' : undefined} rel={data.ctaNewTab ? 'noopener noreferrer' : undefined}>{data.ctaLabel} <span aria-hidden="true">→</span></a>}
      </header>
      <div className={styles.cards}>
        {data.cards.map((card, index) => {
          const href = safeCardHref(card.href);
          const Tag = href ? 'a' : 'div';
          return <Tag key={index} className={styles.card} href={href} target={href && card.newTab ? '_blank' : undefined} rel={href && card.newTab ? 'noopener noreferrer' : undefined} style={{ aspectRatio: RATIO_VALUES[data.ratio] || '4 / 3', borderRadius: data.cardRadius, color: resolveColor(data.cardColor) }}>
            {card.image?.url && <img src={card.image.url} alt={card.alt} loading="lazy" style={{ objectPosition: `${card.focusX}% ${card.focusY}%` }} />}
            <span className={styles.shade} style={{ background: `linear-gradient(180deg, transparent 25%, rgba(0,0,0,${data.overlayOpacity / 100}) 100%)` }} />
            <div className={styles.caption}>
              <div>{card.title && <p className={styles.cardTitle} style={{ fontSize: data.cardTitleSize }}>{card.title}</p>}{card.subtitle && <p className={styles.cardSubtitle}>{card.subtitle}</p>}</div>
              {href && <span className={styles.arrow} aria-hidden="true">↗</span>}
            </div>
          </Tag>;
        })}
      </div>
    </section>
  );
}
export function ServiceImageCardsBlock({ data }: { data: ImageCardsData }) {
  return <ImageCardsBlock data={data} lateral />;
}
