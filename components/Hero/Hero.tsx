import React from 'react';
import Image from 'next/image';
import styles from './Hero.module.css';
import Container from '../Container/Container';

type Props = {
  title?: string;
  subtitle?: string;
  imageSrc: string;
  height?: number; // px height on desktop
};

export default function Hero({ title, subtitle, imageSrc, height = 520 }: Props) {
  return (
    <section className={styles.hero} aria-label="Hero">
      <Container>
        <div className={styles.inner} style={{ height }}>
          <div className={styles.media}>
            <Image src={imageSrc} alt={title || 'Hero image'} fill sizes="(min-width:1200px) 1200px, 100vw" style={{ objectFit: 'cover' }} />
          </div>
          <div className={styles.content}>
            {/* Title and subtitle removed per request */}
          </div>
        </div>
      </Container>
    </section>
  );
}
