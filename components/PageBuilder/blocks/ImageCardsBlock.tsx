"use client";

import React, { useState } from 'react';
import VideoLightbox from '../../VideoGallery/VideoLightbox';
import { RATIO_VALUES, resolveColor } from './blockDefs';
import { safeCardHref, playableCardVideo, type ImageCardsData } from './imageCardsDefs';
import styles from './ImageCardsBlock.module.css';

/** Anciennes valeurs par défaut : tant qu'elles n'ont pas été modifiées, la
 *  taille vient du style de texte choisi (Style du site). */
const LEGACY_TITLE_SIZE = 32;
const LEGACY_CARD_TITLE_SIZE = [13, 15];

const pad2 = (n: number) => String(n).padStart(2, '0');

function PlayIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="7,4 20,12 7,20" /></svg>;
}
function ArrowIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function ImageCardsBlock({ data, lateral = false }: { data: ImageCardsData; lateral?: boolean }) {
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const [initialVideo, setInitialVideo] = useState(0);
  const playable = data.cards.flatMap((card, cardIndex) => {
    const video = playableCardVideo(card);
    return video ? [{ ...video, cardIndex, poster: card.image?.url }] : [];
  });
  const Heading = data.headingLevel as React.ElementType;
  const headingStyle = data.headingLevel || 'h2';
  const ctaHref = safeCardHref(data.ctaHref);
  const customTitleSize = data.titleSize && data.titleSize !== LEGACY_TITLE_SIZE ? data.titleSize : 0;
  const customCardTitleSize = data.cardTitleSize && !LEGACY_CARD_TITLE_SIZE.includes(data.cardTitleSize) ? data.cardTitleSize : 0;
  // Arrondis à 0 = arrondis du design (panneaux de l'accueil), 0 ailleurs.
  const radius = (v: number) => (v ? `${v}px` : 'var(--h-radius, 0px)');
  const variables = {
    '--cards-columns': data.columns, '--cards-mobile-columns': Math.min(data.columns, 2), '--cards-gap': `${data.gap}px`,
    '--cards-padding-x': `${data.paddingX}px`,
    '--cards-radius': data.cardRadius ? `${data.cardRadius}px` : 'var(--h-radius-sm, 0px)',
    '--cards-shade': data.overlayOpacity / 100,
    '--cards-bg-solid': resolveColor(data.background, 'var(--bg, #fff)'),
    background: resolveColor(data.background), color: resolveColor(data.color),
    paddingTop: data.paddingTop, paddingBottom: data.paddingBottom,
    marginTop: data.marginTop, marginBottom: data.marginBottom,
    borderRadius: `${radius(data.radiusTop)} ${radius(data.radiusTop)} ${radius(data.radiusBottom)} ${radius(data.radiusBottom)}`,
  } as React.CSSProperties;
  return (
    <><section className={`${styles.section} ${lateral ? styles.lateral : ''} ${lateral && data.titlePosition === 'right' ? styles.titleRight : ''}`} style={variables}>
      <header className={styles.header} style={{ textAlign: data.titleAlign }}>
        <div>
          {data.eyebrow && <p className={`${styles.eyebrow} style-h5`} style={data.titleAlign === 'center' ? { justifyContent: 'center' } : data.titleAlign === 'right' ? { justifyContent: 'flex-end' } : undefined}>{data.eyebrow}</p>}
          {data.title && <Heading className={`${styles.heading} style-${headingStyle}`} style={customTitleSize ? { fontSize: `min(${customTitleSize}px, calc(${customTitleSize}px * 0.5 + 3vw))` } : undefined}>{data.title}</Heading>}
          {data.subtitle && <p className={`${styles.subtitle} style-p`}>{data.subtitle}</p>}
        </div>
        {data.ctaLabel && ctaHref && <a className={styles.cta} href={ctaHref} target={data.ctaNewTab ? '_blank' : undefined} rel={data.ctaNewTab ? 'noopener noreferrer' : undefined}><span>{data.ctaLabel}</span><span className={styles.ctaIcon}><ArrowIcon /></span></a>}
      </header>
      <div className={styles.cards} data-count={data.cards.length}>
        {data.cards.map((card, index) => {
          const href = lateral ? safeCardHref(card.href) : undefined;
          const video = lateral ? null : playableCardVideo(card);
          const cover = card.image?.url || (video?.youtubeId ? `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg` : '');
          const Tag = video ? 'button' : href ? 'a' : 'div';
          return <Tag key={index} className={`${styles.card}${video || href ? ` ${styles.interactive}` : ''}`} href={href} type={video ? 'button' : undefined} aria-label={video ? `Lire ${card.title || 'la vidéo'}` : undefined} onClick={video ? () => { const i = playable.findIndex(item => item.cardIndex === index); setInitialVideo(i); setActiveVideo(i); } : undefined} target={href && card.newTab ? '_blank' : undefined} rel={href && card.newTab ? 'noopener noreferrer' : undefined} style={{ aspectRatio: RATIO_VALUES[data.ratio] || '4 / 3', color: resolveColor(data.cardColor) }}>
            {cover ? <img src={cover} alt={card.alt} loading="lazy" style={{ objectPosition: `${card.focusX}% ${card.focusY}%` }} /> : video?.kind === 'file' ? <video src={video.url} muted playsInline preload="metadata" className={styles.videoPreview} /> : null}
            <span className={styles.shade} aria-hidden="true" />
            {!lateral && <span className={styles.index} aria-hidden="true">{pad2(index + 1)}</span>}
            {video && <span className={styles.play} aria-hidden="true"><PlayIcon /></span>}
            <div className={styles.caption}>
              <div className={styles.captionText}>
                {card.title && <p className={`${styles.cardTitle} style-h4`} style={customCardTitleSize ? { fontSize: customCardTitleSize } : undefined}>{card.title}</p>}
                {card.subtitle && <p className={styles.cardSubtitle}>{card.subtitle}</p>}
              </div>
              {href && <span className={styles.arrow} aria-hidden="true"><ArrowIcon /></span>}
            </div>
          </Tag>;
        })}
      </div>
    </section>
    {activeVideo !== null && <VideoLightbox videos={playable} index={activeVideo} initialIndex={initialVideo} onClose={() => setActiveVideo(null)} onPrev={() => setActiveVideo(i => ((i ?? 0) - 1 + playable.length) % playable.length)} onNext={() => setActiveVideo(i => ((i ?? 0) + 1) % playable.length)} />}
    </>
  );
}
export function ServiceImageCardsBlock({ data }: { data: ImageCardsData }) {
  return <ImageCardsBlock data={data} lateral />;
}
