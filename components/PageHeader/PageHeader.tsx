import React from 'react';
import styles from './PageHeader.module.css';
import { getHeaderForPage, getGlobalHeaderSiteSettings } from '../../lib/supabaseAdmin';
import HeroEditorClientWrapper from '../HeroEditor/HeroEditorClientWrapper';
import PageHeaderEntrance from './PageHeaderEntrance';

type Props = {
  title: string;
  subtitle?: string;
  bgImage?: string;
  page?: string;
  /** Point de focus pour l’image de fond (ex. header galerie) quand aucun hero n’est sauvegardé */
  bgImageFocus?: { x: number; y: number };
};

export default async function PageHeader({ title, subtitle, bgImage, page, bgImageFocus }: Props) {
  let styleBase: React.CSSProperties = bgImage ? { backgroundImage: `url(${bgImage})` } : {};
  let mode: string | null = null;
  let settings: any = {};
  // Réglages globaux (Modifier header) : appliqués à tous les heroes du site
  const settingsSite = (await getGlobalHeaderSiteSettings()) || {};

  // if a page slug is provided, attempt to read hero settings from headers table (image, mode, focus)
  if (page) {
    try {
      const header = await getHeaderForPage(page);
      mode = header?.mode || null;
      settings = header?.settings || {};

      // compute background position from saved focus, fallback to center
      const focus = settings?.focus;
      const bgPos = (focus && typeof focus.x !== 'undefined' && typeof focus.y !== 'undefined')
        ? `${Number(focus.x)}% ${Number(focus.y)}%`
        : 'center';

      if (mode === 'image' && (settings?.url || header?.public_url)) {
        const url = settings?.url || header?.public_url;
        styleBase = { backgroundImage: `url(${url})`, backgroundPosition: bgPos };
      }
      if (mode === 'slideshow' && Array.isArray(settings?.slides) && settings.slides.length) {
        // render first slide as background; slideshow behavior handled client-side later
        styleBase = { backgroundImage: `url(${settings.slides[0]})`, backgroundPosition: bgPos };
      }
      // video mode: if poster exists use as background, and expose video URL for runtime client to render
      if (mode === 'video') {
        if (settings?.poster) styleBase = { backgroundImage: `url(${settings.poster})`, backgroundPosition: bgPos };
      }
      // if editor provided site-level settings (height/width/overlay), apply them to the image wrapper
      // Exception: for pages where we want the CSS default (corporate-like sizing), avoid applying inline height/width
      const preserveCssSizing = (page === 'admin' || page === 'evenement');
      if (!preserveCssSizing) {
        if (settingsSite?.height) {
          try {
            const hVal = settingsSite.height.value;
            const hUnit = settingsSite.height.unit || '%';
            styleBase = { ...styleBase, height: `${hVal}${hUnit}` };
          } catch (_) {}
        }
        if (settingsSite?.width) {
          try {
            const wVal = settingsSite.width.value;
            const wUnit = settingsSite.width.unit || '%';
            styleBase = { ...styleBase, width: `${wVal}${wUnit}` };
          } catch (_) {}
        }
      }
    } catch (e) {
      // ignore and fall back to bgImage
    }
  }

  // Point de focus : hero sauvegardé ou prop (ex. header galerie)
  const focusFromSettings = settings?.focus && typeof settings.focus.x !== 'undefined' && typeof settings.focus.y !== 'undefined';
  const focusFromProps = bgImageFocus && typeof bgImageFocus.x === 'number' && typeof bgImageFocus.y === 'number';
  const effectiveFocus = focusFromSettings ? settings.focus : focusFromProps ? bgImageFocus : null;
  if (effectiveFocus && styleBase.backgroundImage) {
    styleBase = { ...styleBase, backgroundPosition: `${Number(effectiveFocus.x)}% ${Number(effectiveFocus.y)}%` };
  }

  // Preload hero image (server-side) to reduce visual flash; place a link tag inside header so browser begins fetching early
  const preloadUrl = styleBase && (styleBase as any).backgroundImage ? String((styleBase as any).backgroundImage).replace(/^url\(['"]?|['"]?\)$/g, '') : null;

  return (
    <PageHeaderEntrance>
    <header className={styles.hero}>
      {preloadUrl ? <link rel="preload" as="image" href={preloadUrl} /> : null}
      <div className={styles.containerInner}>
        <div className={styles.heroBox}>
          {/* imageWrap margins are controlled by CSS (40px gutters) */}
          <div className={styles.imageWrap} style={styleBase} data-measure="hero" data-page={page} data-transition={mode === 'slideshow' ? settings?.transition || 'crossfade' : ''}>
            <div className={styles.overlay} style={(
              settingsSite?.overlay ? {
                backgroundColor: settingsSite.overlay.color || undefined,
                opacity: typeof settingsSite.overlay.opacity !== 'undefined' ? String(settingsSite.overlay.opacity) : undefined
              } : undefined
            )} />
            <div className={styles.content}>
              <h1 className={styles.logo}>{title}</h1>
              {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
            </div>
            {/* if video mode, render a player or YouTube embed */}
            {mode === 'video' && (settings?.videoUrl || settings?.url) ? (
              (() => {
                const vUrl = settings?.videoUrl || settings?.url || '';
                try {
                  const isYoutube = /(?:youtube\.com|youtu\.be)/i.test(vUrl);
                  if (isYoutube) {
                    // try to extract id
                    const m = vUrl.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_\-]{6,})/);
                    const id = m ? m[1] : null;
                    const src = id ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=1` : vUrl;
                    // render iframe
                    return (<div style={{ position: 'absolute', inset: 0 }}><iframe src={src} style={{ width: '100%', height: '100%', border: 0 }} allow="autoplay; encrypted-media" /></div>);
                  }
                } catch (_) {}
                // otherwise render native video
                return (<div style={{ position: 'absolute', inset: 0 }}>
                  <video src={vUrl} poster={settings?.poster || ''} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: (settings?.focus ? `${Number(settings.focus.x)}% ${Number(settings.focus.y)}%` : undefined) }} />
                </div>);
              })()
            ) : null}

            {/* Slideshow DOM: simple background-swap — no layered DOM */}
            {mode === 'slideshow' && Array.isArray(settings?.slides) && settings.slides.length ? (
              <div className={styles.slideshow} data-slides={JSON.stringify(settings.slides)} data-speed={settings?.speed || 3000} data-focus={(settings?.focus && typeof settings.focus.x !== 'undefined') ? `${Number(settings.focus.x)}% ${Number(settings.focus.y)}%` : 'center'} />
            ) : null}

            {page ? <HeroEditorClientWrapper page={page} /> : null}
          </div>
        </div>
      </div>
    </header>
    </PageHeaderEntrance>
  );
}
