"use client";

import React, { useEffect, useLayoutEffect, useState, useRef, useMemo, useCallback } from "react";
import { useScrollReveal, revealInitialStyle, revealVisibleStyle } from "../../hooks/useScrollReveal";

/** Enveloppe chaque section dans une animation de révélation au scroll */
function RevealSection({ children }: { children: React.ReactNode }) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>({ threshold: 0.12 });
  return (
    <div ref={ref} style={visible ? revealVisibleStyle : revealInitialStyle}>
      {children}
    </div>
  );
}
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Clients from "../Clients/Clients";
import HomeBlockModal from "./HomeBlockModal";
import type {
  HomeIntroData,
  HomeServicesData,
  HomeStatsData,
  HomePortraitBlockData,
  HomeCadreurBlockData,
  HomeAnimationBlockData,
  HomeQuoteData,
  HomeQuoteItem,
  HomeCtaData,
  HomeBannerData,
  CadreurVideoItem,
} from "./homeDefaults";
import {
  DEFAULT_INTRO,
  DEFAULT_SERVICES,
  DEFAULT_STATS,
  DEFAULT_PORTRAIT,
  DEFAULT_CADREUR,
  DEFAULT_ANIMATION,
  DEFAULT_QUOTE,
  DEFAULT_CTA,
  DEFAULT_BANNER,
} from "./homeDefaults";
import type { HomeBlockKey } from "./HomeBlockModal";
import { useBlockVisibility, BlockVisibilityToggle, BlockWidthToggle, BlockOrderButtons } from "../BlockVisibility";
import AnimateInView, { AnimateStaggerItem } from "../AnimateInView/AnimateInView";
import type { VideoLightboxItem } from "../VideoGallery/VideoLightbox";
import styles from "./HomeBlocks.module.css";

const VideoLightbox = dynamic(() => import("../VideoGallery/VideoLightbox"), { ssr: false });

const SETTINGS_KEYS =
  "home_intro,home_services,home_banner,home_stats,home_portrait,home_cadreur,home_animation,home_quote,home_cta";

function parse<T>(val: string | undefined, def: T): T {
  if (!val) return def;
  try {
    return JSON.parse(val) as T;
  } catch {
    return def;
  }
}

const editBtnStyle: React.CSSProperties = {
  position: "absolute",
  right: 12,
  top: 12,
  zIndex: 5,
  background: "#111",
  color: "#fff",
  border: "none",
  padding: "8px 14px",
  borderRadius: 6,
  fontSize: "0.85rem",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
};

const ANIMATION_SECTIONS = [
  { label: "Le concept", hash: "animation_s1" },
  { label: "Pour qui", hash: "animation_s2" },
  { label: "Déroulé", hash: "animation_s3" },
  { label: "Livrables & contact", hash: "animation_cta" },
] as const;

/* ----- YouTube helpers for cadreur videos ----- */
function getYouTubeId(url: string) {
  try {
    if (!url) return '';
    if (!url.includes('youtube') && !url.includes('youtu.be')) return url;
    const short = url.match(/youtu\.be\/(.+)$/);
    if (short?.[1]) return short[1].split(/[?&]/)[0];
    const shorts = url.match(/shorts\/([^?&#\/]+)/);
    if (shorts?.[1]) return shorts[1].split(/[?&]/)[0];
    const embed = url.match(/embed\/(.+)$/);
    if (embed?.[1]) return embed[1].split(/[?&]/)[0];
    const watch = url.match(/[?&]v=([^&]+)/);
    if (watch?.[1]) return watch[1];
    return url;
  } catch { return url; }
}
function isYouTubeShort(url: string) { return /\/shorts\//.test(url); }
function getYouTubeThumb(id: string) { return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : ""; }

const SHADOW_MAP: Record<string, string> = {
  none: 'none',
  light: '0 2px 8px rgba(0,0,0,0.15)',
  medium: '0 4px 16px rgba(0,0,0,0.25)',
  heavy: '0 8px 30px rgba(0,0,0,0.4)',
};

const IMAGE_RATIO_MAP: Record<string, string> = {
  '4:1': '4/1',
  '21:9': '21/9',
  '16:9': '16/9',
  '4:3': '4/3',
  '3:2': '3/2',
  '4:5': '4/5',
  '1:1': '1/1',
};

/** Converts an admin-set font size to a responsive CSS font-size value.
 *  For sizes above 48px uses clamp() so the text scales down on mobile
 *  rather than wrapping or overflowing. */
function responsiveFontSize(fs: number): string {
  if (fs <= 48) return `${fs}px`;
  // At 1400px viewport the text is at full size; scales down proportionally
  const vw = (fs / 14).toFixed(2);
  const min = Math.max(24, Math.round(fs * 0.58));
  return `clamp(${min}px, ${vw}vw, ${fs}px)`;
}

/** Compute inline style for a portrait fan card based on its offset from the active slide.
 *  offset 0 = active (front center), ±1 = adjacent, ±2 = far sides.
 *  Uses CSS transitions so changing portraitIndex smoothly animates all cards. */
function getFanCardStyle(offset: number): React.CSSProperties {
  const abs = Math.abs(offset);
  const sign = Math.sign(offset);
  // Side cards spread wide so they're nearly fully visible before coming front
  const tx = sign * (abs === 0 ? 0 : abs === 1 ? 195 : 340);
  const tz = abs === 0 ? 0 : abs === 1 ? -20 : -55;
  const ry = sign * (abs === 0 ? 0 : abs === 1 ? 6 : 12);
  const sc = abs === 0 ? 1 : abs === 1 ? 0.86 : 0.72;
  const op = abs === 0 ? 1 : abs === 1 ? 0.82 : 0.55;
  const zi = abs === 0 ? 4 : abs === 1 ? 3 : 2;
  const h  = abs === 0 ? '90%' : abs === 1 ? '76%' : '62%';
  return {
    position: 'absolute',
    height: h,
    aspectRatio: '3/4',
    left: '50%',
    bottom: 0,
    borderRadius: '18px',
    overflow: 'hidden',
    zIndex: zi,
    cursor: offset !== 0 ? 'pointer' : 'default',
    opacity: op,
    transition: 'transform 520ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 520ms ease, height 520ms ease',
    willChange: 'transform, opacity',
    transform: `translateX(calc(-50% + ${tx}px)) rotateY(${ry}deg) translateZ(${tz}px) scale(${sc})`,
    boxShadow: abs === 0
      ? '0 32px 80px rgba(0,0,0,0.75), 0 8px 24px rgba(0,0,0,0.45)'
      : '0 14px 45px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)',
  };
}

export default function HomePageClient({ initialSettings }: { initialSettings?: Record<string, string> }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(() => initialSettings !== undefined);
  const [editBlock, setEditBlock] = useState<HomeBlockKey | null>(null);
  const { hiddenBlocks, blockWidthModes, blockOrderHome, isAdmin: isAdminFromContext } = useBlockVisibility();
  const hide = (id: string) => !isAdminFromContext && hiddenBlocks.includes(id);
  const blockWidthClass = (id: string) => (blockWidthModes[id] === "max1600" ? "block-width-1600" : "");

  const [intro, setIntro] = useState<HomeIntroData>(() => parse(initialSettings?.home_intro, DEFAULT_INTRO));
  const [services, setServices] = useState<HomeServicesData>(() => parse(initialSettings?.home_services, DEFAULT_SERVICES));
  const [banner, setBanner] = useState<HomeBannerData>(() => parse(initialSettings?.home_banner, DEFAULT_BANNER));
  const [stats, setStats] = useState<HomeStatsData>(() => parse(initialSettings?.home_stats, DEFAULT_STATS));
  const [portraitBlock, setPortraitBlock] = useState<HomePortraitBlockData>(() => parse(initialSettings?.home_portrait, DEFAULT_PORTRAIT));
  const [cadreurBlock, setCadreurBlock] = useState<HomeCadreurBlockData>(() => parse(initialSettings?.home_cadreur, DEFAULT_CADREUR));
  const [animationBlock, setAnimationBlock] = useState<HomeAnimationBlockData>(() => parse(initialSettings?.home_animation, DEFAULT_ANIMATION));
  const [quote, setQuote] = useState<HomeQuoteData>(() => parse(initialSettings?.home_quote, DEFAULT_QUOTE));
  const [cta, setCta] = useState<HomeCtaData>(() => parse(initialSettings?.home_cta, DEFAULT_CTA));
  const [currentPortraitSlide, setCurrentPortraitSlide] = useState(0);
  const [portraitSlideDirection, setPortraitSlideDirection] = useState<"next" | "prev">("next");
  const portraitTouchStartX = useRef<number | null>(null);
  const portraitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks the outgoing active card to keep it at higher z-index during transition (prevents visual "cut")
  const [outgoingPortraitIdx, setOutgoingPortraitIdx] = useState<number | null>(null);
  const prevPortraitIdxRef = useRef(0);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0); // kept for possible dots; marquee uses continuous scroll

  /* ---- Cadreur video lightbox state ---- */
  const [cadreurLightboxOpen, setCadreurLightboxOpen] = useState(false);
  const [cadreurLightboxIndex, setCadreurLightboxIndex] = useState(0);
  const [cadreurLightboxInitial, setCadreurLightboxInitial] = useState(0);

  const cadreurVisibleVideos = useMemo(() => {
    const vids = (cadreurBlock as any).videos as CadreurVideoItem[] | undefined;
    if (!vids) return [];
    return vids.filter((v) => v && v.visible && v.url);
  }, [cadreurBlock]);

  const cadreurLightboxItems: VideoLightboxItem[] = useMemo(
    () => cadreurVisibleVideos.map((v) => ({ url: v.url, isShort: isYouTubeShort(v.url) })),
    [cadreurVisibleVideos]
  );

  const openCadreurLightbox = (idx: number) => {
    setCadreurLightboxInitial(idx);
    setCadreurLightboxIndex(idx);
    setCadreurLightboxOpen(true);
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setIsAdmin(Boolean((data as any)?.user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(Boolean(session?.user));
    });
    return () => {
      mounted = false;
      try {
        (listener as any)?.subscription?.unsubscribe?.();
      } catch (_) {}
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch(`/api/admin/site-settings?keys=${encodeURIComponent(SETTINGS_KEYS)}`);
        const json = await resp.json();
        const s = json?.settings || {};
        if (!mounted) return;
        setIntro(parse(s.home_intro, DEFAULT_INTRO));
        setServices(parse(s.home_services, DEFAULT_SERVICES));
        setBanner(parse(s.home_banner, DEFAULT_BANNER));
        setStats(parse(s.home_stats, DEFAULT_STATS));
        setPortraitBlock(parse(s.home_portrait, DEFAULT_PORTRAIT));
        setCadreurBlock(parse(s.home_cadreur, DEFAULT_CADREUR));
        setAnimationBlock(parse(s.home_animation, DEFAULT_ANIMATION));
        setQuote(parse(s.home_quote, DEFAULT_QUOTE));
        setCta(parse(s.home_cta, DEFAULT_CTA));
      } catch (_) {
        // keep defaults
      } finally {
        if (mounted) setLoaded(true);
      }
    }
    load();
    function onUpdate() {
      load();
    }
    window.addEventListener("site-settings-updated", onUpdate as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener("site-settings-updated", onUpdate as EventListener);
    };
  }, []);

  // Citations : dérivation + useEffect toujours exécutés (avant early return) pour respecter l'ordre des Hooks
  const quoteData = (() => {
    const q = quote as any;
    if (Array.isArray(q?.quotes) && q.quotes.length >= 3) return { quotes: q.quotes, carouselSpeed: typeof q.carouselSpeed === "number" ? q.carouselSpeed : 5000 };
    if (Array.isArray(q?.quotes) && q.quotes.length > 0) {
      const pad = DEFAULT_QUOTE.quotes;
      const list = [...q.quotes];
      while (list.length < 3) list.push(pad[list.length % pad.length] ?? { text: "", author: "", role: "", authorStyle: "p" as const, roleStyle: "p" as const });
      return { quotes: list, carouselSpeed: typeof q.carouselSpeed === "number" ? q.carouselSpeed : 5000 };
    }
    if (q?.text != null || q?.author != null) {
      const one: HomeQuoteItem = { text: q.text ?? "", author: q.author ?? "", role: q.role ?? "", authorStyle: q.authorStyle ?? "p", roleStyle: q.roleStyle ?? "p" };
      return { quotes: [one, ...DEFAULT_QUOTE.quotes.slice(0, 2)], carouselSpeed: 5000 };
    }
    return { quotes: DEFAULT_QUOTE.quotes, carouselSpeed: DEFAULT_QUOTE.carouselSpeed ?? 5000 };
  })();
  const quoteList = quoteData.quotes;
  const quoteSpeed = Math.max(2000, quoteData.carouselSpeed ?? 5000);

  // Défilement continu : plus d'intervalle, le marquee CSS gère l'animation

  type BlockData = HomeIntroData | HomeServicesData | HomeBannerData | HomeStatsData | HomePortraitBlockData | HomeCadreurBlockData | HomeAnimationBlockData | HomeQuoteData | HomeCtaData;

  const getBlockData = (key: HomeBlockKey): BlockData => {
    switch (key) {
      case "home_intro": return intro;
      case "home_services": return services;
      case "home_banner": return banner;
      case "home_stats": return stats;
      case "home_portrait": return portraitBlock;
      case "home_cadreur": return cadreurBlock;
      case "home_animation": return animationBlock;
      case "home_quote": return quote;
      case "home_cta": return cta;
      default: return {};
    }
  };

  // Portrait carousel : dérivation + useEffect avant early return pour respecter l'ordre des Hooks
  const portraitSlides = (() => {
    const p = portraitBlock as any;
    if (Array.isArray(p?.slides) && p.slides.length) return p.slides;
    if (p?.title || p?.html || p?.image) {
      return [{ title: p.title ?? "Portrait", text: p.html ?? "", image: p.image ?? null, image2: p.image2 ?? null }];
    }
    return DEFAULT_PORTRAIT.slides;
  })();
  const portraitCarouselSpeed = Math.max(2000, (portraitBlock as any).carouselSpeed ?? 5000);
  const resetPortraitInterval = useCallback(() => {
    if (portraitIntervalRef.current) clearInterval(portraitIntervalRef.current);
    portraitIntervalRef.current = null;
    if (portraitSlides.length <= 1) return;
    portraitIntervalRef.current = setInterval(() => {
      setPortraitSlideDirection("next");
      setCurrentPortraitSlide((prev) => (prev >= portraitSlides.length - 1 ? 0 : prev + 1));
    }, portraitCarouselSpeed);
  }, [portraitSlides.length, portraitCarouselSpeed]);
  useEffect(() => {
    resetPortraitInterval();
    return () => {
      if (portraitIntervalRef.current) clearInterval(portraitIntervalRef.current);
      portraitIntervalRef.current = null;
    };
  }, [resetPortraitInterval]);

  // Keep outgoing portrait card at higher z-index during slide transition (prevents visual "cut")
  const portraitIndex = Math.max(0, Math.min(currentPortraitSlide, portraitSlides.length - 1));
  useLayoutEffect(() => {
    const prev = prevPortraitIdxRef.current;
    if (prev !== portraitIndex) {
      prevPortraitIdxRef.current = portraitIndex;
      setOutgoingPortraitIdx(prev);
      const t = setTimeout(() => setOutgoingPortraitIdx(null), 560);
      return () => clearTimeout(t);
    }
  }, [portraitIndex]);

  if (!loaded) {
    return (
      <div className="container" style={{ padding: "2rem 0", textAlign: "center", color: "var(--muted)" }}>
        Chargement…
      </div>
    );
  }

  const serviceItems = services.items && services.items.length ? services.items : DEFAULT_SERVICES.items;
  const statItems = stats.items && stats.items.length ? stats.items : DEFAULT_STATS.items;

  const activePortraitSlide = portraitSlides[portraitIndex] || portraitSlides[0];
  // Use slide-specific href or fallback to default URL with tab parameter
  const portraitSlideHref = (activePortraitSlide as any)?.href || `/portrait?tab=${["lifestyle", "studio", "entreprise", "couple"][Math.min(portraitIndex, 3)] || "lifestyle"}`;

  const safeQuoteIndex = Math.max(0, Math.min(currentQuoteIndex, quoteList.length - 1));
  const visibleQuoteIndices = [0, 1, 2].map((i) => (safeQuoteIndex + i) % quoteList.length);
  const quoteScrollDuration = Math.max(5, Math.min(120, Math.round((quoteData.carouselSpeed ?? 5000) / 1000))); // valeur en secondes = durée d'un cycle (ex. 5 = rapide, 30 = lent)

  const btnWrapStyle: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', position: 'absolute', right: 12, top: 12, zIndex: 5 };

  const introSection = hide("home_intro") ? null : (
      <section className={styles.intro} style={(() => { const s: React.CSSProperties = {}; if ((intro as any).backgroundColor) s.backgroundColor = (intro as any).backgroundColor; const rt = (intro as any).borderRadiusTop; const rb = (intro as any).borderRadiusBottom; if (rt != null) { s.borderTopLeftRadius = `${rt}px`; s.borderTopRightRadius = `${rt}px`; } if (rb != null) { s.borderBottomLeftRadius = `${rb}px`; s.borderBottomRightRadius = `${rb}px`; } const pt = (intro as any).paddingTop; const pb = (intro as any).paddingBottom; if (pt != null) s.paddingTop = `${pt}px`; if (pb != null) s.paddingBottom = `${pb}px`; return Object.keys(s).length ? s : undefined; })()}>
        <div className={`container ${blockWidthClass("home_intro")}`.trim()}>
          <div className={styles.editWrap}>
            {isAdmin && (
              <div style={btnWrapStyle}>
                <BlockVisibilityToggle blockId="home_intro" />
                <BlockWidthToggle blockId="home_intro" />
                <button className={styles.editBtn} style={{ position: 'static' }} onClick={() => setEditBlock("home_intro")}>
                  Modifier
                </button>
                <BlockOrderButtons page="home" blockId="home_intro" />
              </div>
            )}
            <AnimateInView variant="fadeUp" viewport={{ once: true, amount: 0 }} initial="visible">
              {intro.title ? (() => { const Tag = (intro as any).titleStyle || "h2"; const fs = (intro as any).titleFontSize; const color = (intro as any).titleColor; const align = (intro as any).titleAlign; return <Tag className={`${styles.introTitle} style-${Tag}`} style={{ ...(fs != null ? { fontSize: responsiveFontSize(fs) } : {}), ...(color ? { color } : {}), ...(align ? { textAlign: align, width: '100%', display: 'block' } : {}) }}>{intro.title}</Tag>; })() : null}
              {intro.subtitle ? (() => { const Tag = (intro as any).subtitleStyle || "p"; const fs = (intro as any).subtitleFontSize; const color = (intro as any).subtitleColor; const align = (intro as any).subtitleAlign; return <Tag className={`${styles.introSubtitle} style-${Tag}`} style={{ ...(fs != null ? { fontSize: responsiveFontSize(fs) } : {}), ...(color ? { color } : {}), ...(align ? { textAlign: align, width: '100%', display: 'block' } : {}) }}>{intro.subtitle}</Tag>; })() : null}
              {intro.html ? <div className={styles.introText} dangerouslySetInnerHTML={{ __html: intro.html }} /> : null}
            </AnimateInView>
          </div>
        </div>
      </section>
  );

  const bannerSection = hide("home_banner") ? null : (() => {
    const b = banner as any;
    const s: React.CSSProperties = {};
    if (b.backgroundColor) s.backgroundColor = b.backgroundColor;
    const rt = b.borderRadiusTop; const rb = b.borderRadiusBottom;
    if (rt != null) { s.borderTopLeftRadius = `${rt}px`; s.borderTopRightRadius = `${rt}px`; }
    if (rb != null) { s.borderBottomLeftRadius = `${rb}px`; s.borderBottomRightRadius = `${rb}px`; }
    if (b.paddingTop != null) s.paddingTop = `${b.paddingTop}px`;
    if (b.paddingBottom != null) s.paddingBottom = `${b.paddingBottom}px`;
    // z-index: 2 pour passer au-dessus de .intro (z-index: 2, DOM antérieur)
    // z-index: 3 en admin pour que les boutons soient toujours visibles
    s.zIndex = isAdmin ? 3 : 2;
    const ratio = b.imageRatio && IMAGE_RATIO_MAP[b.imageRatio] ? IMAGE_RATIO_MAP[b.imageRatio] : IMAGE_RATIO_MAP['21:9'];
    const isTextMode = b.textMode === 'text';
    const imgRight = b.textImagePosition !== 'left';
    const adminBar = isAdmin && (
      <div className={styles.bannerBlockAdminBar}>
        <BlockVisibilityToggle blockId="home_banner" />
        <BlockWidthToggle blockId="home_banner" />
        <button className={styles.editBtn} style={{ position: 'static' }} onClick={() => setEditBlock("home_banner")}>
          Modifier
        </button>
        <BlockOrderButtons page="home" blockId="home_banner" />
      </div>
    );

    if (isTextMode) {
      const imgFocusStyle = b.image?.focus ? { objectPosition: `${b.image.focus.x}% ${b.image.focus.y}%` } : {};
      const imgFrame = (
        <div className={styles.bannerTextImgCol}>
          <div className={styles.bannerTextImgFrame}>
            {b.image?.url ? (
              <Image src={b.image.url} alt="" fill sizes="(max-width:768px) 100vw, 44vw" style={{ objectFit: 'cover', ...imgFocusStyle }} />
            ) : isAdmin ? (
              <div className={styles.bannerTextImgPlaceholder}>
                <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Image — cliquez « Modifier »</span>
              </div>
            ) : null}
          </div>
        </div>
      );
      const titleTag = b.blockTitleStyle || 'h2';
      const subtitleTag = b.blockSubtitleStyle || 'p';
      const titleFs = b.blockTitleFontSize;
      const subtitleFs = b.blockSubtitleFontSize;
      const bwClass = blockWidthClass("home_banner");
      return (
        <section className={styles.bannerBlock} style={Object.keys(s).length ? s : undefined}>
          <div className={`container ${bwClass}`.trim()}>
            {adminBar}
            <AnimateInView variant="fadeUp" delay={0.1} viewport={{ once: true, amount: 0.2 }}>
              <div className={`${styles.bannerTextLayout} ${imgRight ? styles.bannerTextImgRight : styles.bannerTextImgLeft}`}>
                {!imgRight && imgFrame}
                <div className={styles.bannerTextCol}>
                  {b.eyebrow && <span className={styles.bannerTextEyebrow} style={b.blockTitleAlign ? { textAlign: b.blockTitleAlign as any, display: 'block' } : undefined}>{b.eyebrow}</span>}
                  {b.blockTitle && React.createElement(titleTag, {
                    className: `${styles.bannerTextTitle} style-${titleTag}`,
                    style: { ...(titleFs != null ? { fontSize: responsiveFontSize(titleFs) } : {}), ...(b.blockTitleColor ? { color: b.blockTitleColor } : {}), ...(b.blockTitleAlign ? { textAlign: b.blockTitleAlign } : {}) },
                  }, b.blockTitle)}
                  {b.blockSubtitle && React.createElement(subtitleTag, {
                    className: `${styles.bannerTextSubtitle} style-${subtitleTag}`,
                    style: { ...(subtitleFs != null ? { fontSize: responsiveFontSize(subtitleFs) } : {}), ...(b.blockSubtitleColor ? { color: b.blockSubtitleColor } : {}), ...(b.blockSubtitleAlign ? { textAlign: b.blockSubtitleAlign } : {}) },
                  }, b.blockSubtitle)}
                  {b.html ? <div className={styles.bannerTextRich} dangerouslySetInnerHTML={{ __html: b.html }} /> : null}
                  {b.ctaLabel && b.ctaHref && (
                    <Link href={b.ctaHref} className={`${styles.bannerTextCta}${b.ctaButtonStyle === '2' ? ` ${styles.bannerTextCtaStyle2}` : ''}`}>{b.ctaLabel}</Link>
                  )}
                </div>
                {imgRight && imgFrame}
              </div>
            </AnimateInView>
          </div>
        </section>
      );
    }

    return (
      <section className={styles.bannerBlock} style={Object.keys(s).length ? s : undefined}>
        <div className={styles.bannerBlockInner}>
          {adminBar}
          <AnimateInView variant="fade" delay={0.2} viewport={{ once: true, amount: 0.25 }}>
            <div className={styles.bannerBlockCard}>
              {b.image?.url ? (
                <div className={styles.bannerBlockImageWrap} style={{ aspectRatio: ratio }}>
                  <Image src={b.image.url} alt="" className={styles.bannerBlockImage} width={2400} height={900} sizes="100vw" style={b.image.focus ? { objectPosition: `${b.image.focus.x}% ${b.image.focus.y}%` } : undefined} />
                </div>
              ) : isAdmin ? (
                <div className={styles.bannerBlockImageWrap} style={{ aspectRatio: ratio, background: '#1a1a18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#666', fontSize: '1rem' }}>Bannière — cliquez « Modifier » pour ajouter une image</span>
                </div>
              ) : null}
            </div>
          </AnimateInView>
        </div>
      </section>
    );
  })();

  const servicesSection = hide("home_services") ? null : (
      <section className={styles.services} style={(() => { const s: React.CSSProperties = {}; if ((services as any).backgroundColor) s.backgroundColor = (services as any).backgroundColor; const rt = (services as any).borderRadiusTop; const rb = (services as any).borderRadiusBottom; if (rt != null) { s.borderTopLeftRadius = `${rt}px`; s.borderTopRightRadius = `${rt}px`; } if (rb != null) { s.borderBottomLeftRadius = `${rb}px`; s.borderBottomRightRadius = `${rb}px`; } const pt = (services as any).paddingTop; const pb = (services as any).paddingBottom; if (pt != null) s.paddingTop = `${pt}px`; if (pb != null) s.paddingBottom = `${pb}px`; return Object.keys(s).length ? s : undefined; })()}>
        <div className={`container ${blockWidthClass("home_services")}`.trim()}>
          <div className={styles.editWrap}>
            {isAdmin && (
              <div style={btnWrapStyle}>
                <BlockVisibilityToggle blockId="home_services" />
                <BlockWidthToggle blockId="home_services" />
                <button className={styles.editBtn} style={{ position: 'static' }} onClick={() => setEditBlock("home_services")}>
                  Modifier
                </button>
                <BlockOrderButtons page="home" blockId="home_services" />
              </div>
            )}
            <AnimateInView variant="fadeUp">
              {(services as any).blockTitle ? (() => { const Tag = (services as any).blockTitleStyle || "h2"; const fs = (services as any).blockTitleFontSize; const color = (services as any).blockTitleColor; const align = (services as any).blockTitleAlign; return <Tag className={`${styles.servicesTitle} style-${Tag}`} style={{ ...(fs != null ? { fontSize: responsiveFontSize(fs) } : {}), ...(color ? { color } : {}), ...(align ? { textAlign: align, width: '100%', display: 'block' } : {}) }}>{(services as any).blockTitle}</Tag>; })() : null}
              {(services as any).blockSubtitle ? (() => { const Tag = (services as any).blockSubtitleStyle || "p"; const fs = (services as any).blockSubtitleFontSize; const color = (services as any).blockSubtitleColor; const align = (services as any).blockSubtitleAlign; return <Tag className={`${styles.servicesSubtitle} style-${Tag}`} style={{ ...(fs != null ? { fontSize: responsiveFontSize(fs), maxWidth: 'none' } : {}), ...(color ? { color } : {}), ...(align ? { textAlign: align, width: '100%', display: 'block' } : {}) }}>{(services as any).blockSubtitle}</Tag>; })() : null}
            </AnimateInView>
            <AnimateInView variant="stagger" className={styles.servicesGrid}>
              {serviceItems.map((item, i) => (
                <AnimateStaggerItem key={i}>
                  <Link href={item.href || "#"} className={styles.serviceCard} data-analytics-id={`Accueil|Service - ${(item.title || 'Service').toString().slice(0, 40)}`}>
                    <div className={styles.serviceCardImageWrap}>
                      {item.image?.url ? (
                        <Image src={item.image.url} alt="" className={styles.serviceCardImage} width={800} height={600} sizes="(max-width: 767px) 100vw, 33vw" quality={100} />
                      ) : (
                        <div className={styles.serviceCardImage} style={{ background: "rgba(40,40,40,0.9)", minHeight: "100%" }} />
                      )}
                    </div>
                    <div className={styles.serviceCardContent}>
                      {(item.title || "Service") ? (() => { const Tag = (item as any).titleStyle || "h3"; const fs = (item as any).titleFontSize; return <Tag className={`${styles.serviceCardTitle} style-${Tag}`} style={fs != null ? { fontSize: responsiveFontSize(fs) } : undefined}>{item.title || "Service"}</Tag>; })() : null}
                      <div className={styles.serviceCardBottom}>
                        {(item.description || "") ? (() => { const Tag = (item as any).descriptionStyle || "p"; const fs = (item as any).descriptionFontSize; return <Tag className={`${styles.serviceCardDesc} style-${Tag}`} style={fs != null ? { fontSize: responsiveFontSize(fs) } : undefined}>{item.description || ""}</Tag>; })() : null}
                        <div className={styles.serviceCardReadMore}><span>•</span> Découvrir</div>
                      </div>
                    </div>
                  </Link>
                </AnimateStaggerItem>
              ))}
            </AnimateInView>
          </div>
        </div>
      </section>
  );

  const portraitSection = hide("home_portrait") ? null : (
      <section className={styles.portraitBlock} style={(() => { const s: React.CSSProperties = {}; if ((portraitBlock as any).backgroundColor) s.backgroundColor = (portraitBlock as any).backgroundColor; const rt = (portraitBlock as any).borderRadiusTop; const rb = (portraitBlock as any).borderRadiusBottom; if (rt != null) { s.borderTopLeftRadius = `${rt}px`; s.borderTopRightRadius = `${rt}px`; } if (rb != null) { s.borderBottomLeftRadius = `${rb}px`; s.borderBottomRightRadius = `${rb}px`; } const pt = (portraitBlock as any).paddingTop; const pb = (portraitBlock as any).paddingBottom; if (pt != null) s.paddingTop = `${pt}px`; if (pb != null) s.paddingBottom = `${pb}px`; return Object.keys(s).length ? s : undefined; })()}>
        <div className={`container ${blockWidthClass("home_portrait")}`.trim()}>
          <div className={styles.editWrap}>
            {isAdmin && (
              <div style={btnWrapStyle}>
                <BlockVisibilityToggle blockId="home_portrait" />
                <BlockWidthToggle blockId="home_portrait" />
                <button className={styles.editBtn} style={{ position: 'static' }} onClick={() => setEditBlock("home_portrait")}>
                  Modifier
                </button>
                <BlockOrderButtons page="home" blockId="home_portrait" />
              </div>
            )}
            <AnimateInView variant="fadeUp">
              {(() => {
                const blockTitleText = (portraitBlock as any).blockTitle ?? (portraitBlock as any).title ?? "Portrait";
                const Tag = (portraitBlock as any).blockTitleStyle || "h2";
                const fs = (portraitBlock as any).blockTitleFontSize;
                const color = (portraitBlock as any).blockTitleColor;
                const align = (portraitBlock as any).blockTitleAlign;
                return <Tag className={`${styles.portraitBlockTitle} style-${Tag}`} style={{ ...(fs != null ? { fontSize: responsiveFontSize(fs) } : {}), ...(color ? { color } : {}), ...(align ? { textAlign: align, width: '100%', display: 'block' } : {}) }}>{blockTitleText}</Tag>;
              })()}
            </AnimateInView>
            <AnimateInView variant="slideUp">
            <div
              className={styles.portraitCarousel}
              onTouchStart={(e) => { portraitTouchStartX.current = e.touches[0]?.clientX ?? null; }}
              onTouchEnd={(e) => {
                const start = portraitTouchStartX.current;
                if (start == null) return;
                portraitTouchStartX.current = null;
                const end = e.changedTouches[0]?.clientX;
                if (end == null) return;
                const delta = start - end;
                if (Math.abs(delta) < 50) return;
                if (delta > 0) {
                  setPortraitSlideDirection("next");
                  setCurrentPortraitSlide((prev) => (prev >= portraitSlides.length - 1 ? 0 : prev + 1));
                  resetPortraitInterval();
                } else {
                  setPortraitSlideDirection("prev");
                  setCurrentPortraitSlide((prev) => (prev <= 0 ? portraitSlides.length - 1 : prev - 1));
                  resetPortraitInterval();
                }
              }}
            >
              <div className={styles.portraitSlideTransition}>
              {/* ── Fan Carousel — zone images ── */}
              <div className={styles.portraitCarouselImageWrap}>
                <div className={styles.portrait3DStage}>
                  <div className={styles.portrait3DGlow} />
                  {portraitSlides.map((slide, slideIdx) => {
                    const n = portraitSlides.length;
                    let offset = slideIdx - portraitIndex;
                    if (offset > n / 2) offset -= n;
                    if (offset < -n / 2) offset += n;
                    if (Math.abs(offset) > 2) return null;
                    const focusStyle = (slide.image as any)?.focus?.x != null
                      ? { objectPosition: `${(slide.image as any).focus.x}% ${(slide.image as any).focus.y}%` }
                      : {};
                    const cardStyle = getFanCardStyle(offset);
                    const effectiveStyle = slideIdx === outgoingPortraitIdx
                      ? { ...cardStyle, zIndex: 5 }
                      : cardStyle;
                    return (
                      <div
                        key={slideIdx}
                        style={effectiveStyle}
                        onClick={offset !== 0 ? () => {
                          setPortraitSlideDirection(offset > 0 ? "next" : "prev");
                          setCurrentPortraitSlide(slideIdx);
                          resetPortraitInterval();
                        } : undefined}
                      >
                        {slide.image?.url ? (
                          <Image
                            src={slide.image.url}
                            alt=""
                            width={500}
                            height={667}
                            quality={100}
                            sizes="(max-width: 768px) 60vw, 340px"
                            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', ...focusStyle }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.06)' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div key={portraitIndex} className={`${styles.portraitCarouselContent} ${styles.portraitContentFade}`}>
                {activePortraitSlide?.title ? (() => { const Tag = (activePortraitSlide as any).titleStyle || "h3"; const fs = (activePortraitSlide as any).titleFontSize; return <Tag className={`${styles.portraitSlideTitle} style-${Tag}`} style={fs != null ? { fontSize: responsiveFontSize(fs) } : undefined}>{activePortraitSlide.title}</Tag>; })() : null}
                {activePortraitSlide?.text ? <div className={styles.portraitSlideText} dangerouslySetInnerHTML={{ __html: activePortraitSlide.text }} /> : null}
                <Link href={portraitSlideHref} className={`${styles.portraitCta} btn-site-${(portraitBlock as any).ctaButtonStyle || "1"}`} data-analytics-id="Accueil|CTA Portrait">
                  {(portraitBlock as any).ctaLabel || "Découvrir le portrait"}
                </Link>
                <div className={styles.portraitNav}>
                  <div className={styles.portraitDots} aria-hidden>
                    {portraitSlides.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={i === portraitIndex ? styles.portraitDotActive : styles.portraitDot}
                        onClick={() => {
                          setPortraitSlideDirection(i > portraitIndex ? "next" : "prev");
                          setCurrentPortraitSlide(i);
                          resetPortraitInterval();
                        }}
                        aria-label={`Slide ${i + 1}`}
                      />
                    ))}
                  </div>
                  <div className={styles.portraitArrows}>
                    <button
                      type="button"
                      className={styles.portraitArrow}
                      onClick={() => {
                        setPortraitSlideDirection("prev");
                        setCurrentPortraitSlide((prev) => (prev <= 0 ? portraitSlides.length - 1 : prev - 1));
                        resetPortraitInterval();
                      }}
                      aria-label="Précédent"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className={styles.portraitArrow}
                      onClick={() => {
                        setPortraitSlideDirection("next");
                        setCurrentPortraitSlide((prev) => (prev >= portraitSlides.length - 1 ? 0 : prev + 1));
                        resetPortraitInterval();
                      }}
                      aria-label="Suivant"
                    >
                      →
                    </button>
                  </div>
                </div>
                </div>
              </div>
            </div>
            </AnimateInView>
          </div>
        </div>
      </section>
  );

  const cadreurSection = hide("home_cadreur") ? null : (() => {
    const vs = (cadreurBlock as any).videoSettings || {};
    const vBorderRadius = vs.borderRadius ?? 12;
    const vShadow = SHADOW_MAP[vs.shadow || 'medium'] || 'none';
    const vGlossy = vs.glossy ?? false;
    return (
      <section className={styles.cadreurBlock} style={(() => { const s: React.CSSProperties = {}; if ((cadreurBlock as any).backgroundColor) s.backgroundColor = (cadreurBlock as any).backgroundColor; const rt = (cadreurBlock as any).borderRadiusTop; const rb = (cadreurBlock as any).borderRadiusBottom; if (rt != null) { s.borderTopLeftRadius = `${rt}px`; s.borderTopRightRadius = `${rt}px`; } if (rb != null) { s.borderBottomLeftRadius = `${rb}px`; s.borderBottomRightRadius = `${rb}px`; } const pt = (cadreurBlock as any).paddingTop; const pb = (cadreurBlock as any).paddingBottom; if (pt != null) s.paddingTop = `${pt}px`; if (pb != null) s.paddingBottom = `${pb}px`; return Object.keys(s).length ? s : undefined; })()}>
        <div className={`container ${blockWidthClass("home_cadreur")}`.trim()}>
          <div className={styles.editWrap}>
            {isAdmin && (
              <div style={btnWrapStyle}>
                <BlockVisibilityToggle blockId="home_cadreur" />
                <BlockWidthToggle blockId="home_cadreur" />
                <button className={styles.editBtn} style={{ position: 'static' }} onClick={() => setEditBlock("home_cadreur")}>
                  Modifier
                </button>
                <BlockOrderButtons page="home" blockId="home_cadreur" />
              </div>
            )}
            <div className={styles.cadreurGrid}>
              <AnimateInView variant="slideFromLeft" className={styles.cadreurContent}>
                {cadreurBlock.title ? (() => { const Tag = (cadreurBlock as any).titleStyle || "h2"; const fs = (cadreurBlock as any).titleFontSize; const color = (cadreurBlock as any).titleColor; const align = (cadreurBlock as any).titleAlign; return <Tag className={`${styles.cadreurTitle} style-${Tag}`} style={{ ...(fs != null ? { fontSize: responsiveFontSize(fs) } : {}), ...(color ? { color } : {}), ...(align ? { textAlign: align, width: '100%', display: 'block' } : {}) }}>{cadreurBlock.title}</Tag>; })() : null}
                {cadreurBlock.html ? <div className={styles.cadreurText} dangerouslySetInnerHTML={{ __html: cadreurBlock.html }} /> : null}
              </AnimateInView>
              <AnimateInView variant="slideFromRight" className={styles.cadreurMedia} style={cadreurBlock.imageRatio && IMAGE_RATIO_MAP[cadreurBlock.imageRatio] ? { aspectRatio: IMAGE_RATIO_MAP[cadreurBlock.imageRatio] } : undefined}>
                {cadreurBlock.image?.url ? (
                  <Image
                    src={cadreurBlock.image.url}
                    alt=""
                    className={styles.cadreurImage}
                    width={800}
                    height={600}
                    quality={100}
                    sizes="(max-width: 768px) 100vw, 800px"
                    style={{
                      ...(
                        (cadreurBlock.image as any)?.focus?.x != null
                        ? { objectPosition: `${(cadreurBlock.image as any).focus.x}% ${(cadreurBlock.image as any).focus.y}%` }
                        : {}
                      ),
                      ...(cadreurBlock.imageRatio ? { height: '100%' } : {})
                    }
                    }
                  />
                ) : (
                  <div className={styles.cadreurImage} style={{ background: "rgba(0,0,0,0.06)", minHeight: 200, ...(cadreurBlock.imageRatio ? { height: '100%' } : {}) }} />
                )}
              </AnimateInView>
            </div>

            {/* --- Featured project videos --- */}
            {cadreurVisibleVideos.length > 0 && (
              <AnimateInView variant="stagger" className={styles.cadreurVideosSection}>
                {(cadreurBlock as any).videosSectionTitle ? (
                  <p className={styles.cadreurVideosSectionTitle} style={{ textAlign: (cadreurBlock as any).videosSectionTitleAlign || 'center' }}>
                    {(cadreurBlock as any).videosSectionTitle}
                  </p>
                ) : null}
                <div className={styles.cadreurVideosGrid} data-count={cadreurVisibleVideos.length}>
                  {cadreurVisibleVideos.map((vid, i) => {
                    const ytId = getYouTubeId(vid.url);
                    const thumb = getYouTubeThumb(ytId);
                    return (
                      <AnimateStaggerItem key={i}>
                        <div className={styles.cadreurVideoCard}>
                          <button
                            type="button"
                            className={styles.cadreurVideoThumbWrap}
                            style={{ borderRadius: vBorderRadius, boxShadow: vShadow !== 'none' ? vShadow : undefined }}
                            onClick={() => openCadreurLightbox(i)}
                            aria-label={vid.title || `Vidéo ${i + 1}`}
                            data-video-name={vid.title || `Vidéo ${i + 1}`}
                          >
                            <img src={thumb} alt="" loading="lazy" />
                            {vGlossy && <span className={styles.cadreurVideoGlossy} />}
                            <span className={styles.cadreurVideoPlay}>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><polygon points="6,3 20,12 6,21" /></svg>
                            </span>
                          </button>
                          {vid.title && <p className={styles.cadreurVideoTitle}>{vid.title}</p>}
                          {vid.description && <p className={styles.cadreurVideoDesc}>{vid.description}</p>}
                        </div>
                      </AnimateStaggerItem>
                    );
                  })}
                </div>
              </AnimateInView>
            )}
          </div>
        </div>

        {/* Cadreur video lightbox */}
        {cadreurLightboxOpen && cadreurLightboxItems.length > 0 && (
          <VideoLightbox
            videos={cadreurLightboxItems}
            index={cadreurLightboxIndex}
            initialIndex={cadreurLightboxInitial}
            onClose={() => setCadreurLightboxOpen(false)}
            onPrev={() => setCadreurLightboxIndex((i) => (i <= 0 ? cadreurLightboxItems.length - 1 : i - 1))}
            onNext={() => setCadreurLightboxIndex((i) => (i >= cadreurLightboxItems.length - 1 ? 0 : i + 1))}
          />
        )}
      </section>
    );
  })();

  const animationSection = hide("home_animation") ? null : (
      <section
        className={styles.animationBlock}
        style={(() => {
          const s: React.CSSProperties = {};
          const bg = (animationBlock as any).backgroundColor?.trim();
          const validHex = bg && /^#?[0-9A-Fa-f]{3}$|^#?[0-9A-Fa-f]{6}$/.test(bg);
          if (validHex) s.background = bg.startsWith("#") ? bg : `#${bg}`;
          const rt = (animationBlock as any).borderRadiusTop;
          const rb = (animationBlock as any).borderRadiusBottom;
          if (rt != null) { s.borderTopLeftRadius = `${rt}px`; s.borderTopRightRadius = `${rt}px`; }
          if (rb != null) { s.borderBottomLeftRadius = `${rb}px`; s.borderBottomRightRadius = `${rb}px`; }
          const pt = (animationBlock as any).paddingTop; const pb = (animationBlock as any).paddingBottom;
          if (pt != null) s.paddingTop = `${pt}px`; if (pb != null) s.paddingBottom = `${pb}px`;
          return Object.keys(s).length ? s : undefined;
        })()}
      >
        <div className={`container ${blockWidthClass("home_animation")}`.trim()}>
          <div className={styles.editWrap}>
            {isAdmin && (
              <div style={btnWrapStyle}>
                <BlockVisibilityToggle blockId="home_animation" />
                <BlockWidthToggle blockId="home_animation" />
                <button className={styles.editBtn} style={{ background: "#fff", color: "#111", position: "static" }} onClick={() => setEditBlock("home_animation")}>
                  Modifier
                </button>
                <BlockOrderButtons page="home" blockId="home_animation" />
              </div>
            )}
            <AnimateInView variant="scaleIn">
            <div className={styles.animationBlockCard}>
              {(animationBlock as any).image?.url ? (
                <div className={styles.animationBlockBannerWrap} style={(animationBlock as any).imageRatio && IMAGE_RATIO_MAP[(animationBlock as any).imageRatio] ? { aspectRatio: IMAGE_RATIO_MAP[(animationBlock as any).imageRatio] } : undefined}>
                  <Image src={(animationBlock as any).image.url} alt="" className={styles.animationBlockBanner} width={1200} height={600} sizes="(max-width: 768px) 100vw, 1200px" />
                </div>
              ) : null}
              <div className={styles.animationBlockContent} style={(animationBlock as any).contentBgColor ? { background: (animationBlock as any).contentBgColor } : undefined}>
                {(animationBlock as any).blockTitle ? (() => {
                  const Tag = (animationBlock as any).blockTitleStyle || "h2";
                  const fs = (animationBlock as any).blockTitleFontSize;
                  const color = (animationBlock as any).blockTitleColor;
                  const align = (animationBlock as any).blockTitleAlign;
                  return <Tag className={`${styles.animationBlockTitle} style-${Tag}`} style={{ ...(fs != null ? { fontSize: responsiveFontSize(fs) } : {}), ...(color ? { color } : {}), ...(align ? { textAlign: align, width: '100%', display: 'block' } : {}) }}>{(animationBlock as any).blockTitle}</Tag>;
                })() : null}
                {(animationBlock as any).blockSubtitle ? (() => {
                  const Tag = (animationBlock as any).blockSubtitleStyle || "p";
                  const fs = (animationBlock as any).blockSubtitleFontSize;
                  const color = (animationBlock as any).blockSubtitleColor;
                  const align = (animationBlock as any).blockSubtitleAlign;
                  return <Tag className={`${styles.animationBlockSubtitle} style-${Tag}`} style={{ ...(fs != null ? { fontSize: responsiveFontSize(fs) } : {}), ...(color ? { color } : {}), ...(align ? { textAlign: align, width: '100%', display: 'block' } : {}) }}>{(animationBlock as any).blockSubtitle}</Tag>;
                })() : null}
                {(animationBlock as any).html ? (
                  <div className={styles.animationBlockRichText} dangerouslySetInnerHTML={{ __html: (animationBlock as any).html }} />
                ) : null}
                <div className={styles.animationBlockButtons}>
                  {ANIMATION_SECTIONS.map(({ label, hash }) => (
                    <button
                      type="button"
                      key={hash}
                      className={`${styles.ctaButton} btn-site-${(animationBlock as any).ctaButtonStyle || "1"}`}
                      data-analytics-id={`Accueil|Animation - ${label}`}
                      onClick={() => router.push(`/animation#${hash}`)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.animationBlockGlow} aria-hidden />
            </div>
            </AnimateInView>
          </div>
        </div>
      </section>
  );

  const statsSection = hide("home_stats") ? null : (
      <section className={styles.stats} style={(() => { const s: React.CSSProperties = {}; if ((stats as any).backgroundColor) s.backgroundColor = (stats as any).backgroundColor; const rt = (stats as any).borderRadiusTop; const rb = (stats as any).borderRadiusBottom; if (rt != null) { s.borderTopLeftRadius = `${rt}px`; s.borderTopRightRadius = `${rt}px`; } if (rb != null) { s.borderBottomLeftRadius = `${rb}px`; s.borderBottomRightRadius = `${rb}px`; } const pt = (stats as any).paddingTop; const pb = (stats as any).paddingBottom; if (pt != null) s.paddingTop = `${pt}px`; if (pb != null) s.paddingBottom = `${pb}px`; return Object.keys(s).length ? s : undefined; })()}>
        <div className={`container ${blockWidthClass("home_stats")}`.trim()}>
          <div className={styles.editWrap}>
            {isAdmin && (
              <div style={btnWrapStyle}>
                <BlockVisibilityToggle blockId="home_stats" />
                <BlockWidthToggle blockId="home_stats" />
                <button className={styles.editBtn} style={{ background: "#fff", color: "#111", position: 'static' }} onClick={() => setEditBlock("home_stats")}>
                  Modifier
                </button>
                <BlockOrderButtons page="home" blockId="home_stats" />
              </div>
            )}
            <AnimateInView variant="stagger" className={styles.statsGrid}>
              {statItems.map((item, i) => (
                <AnimateStaggerItem key={i}>
                  <div>
                    <div className={styles.statValue}>{item.value || "—"}</div>
                    <p className={styles.statLabel}>{item.label || ""}</p>
                  </div>
                </AnimateStaggerItem>
              ))}
            </AnimateInView>
          </div>
        </div>
      </section>
  );

  const clientsSection = hide("clients") ? null : <Clients />;

  const quoteSection = hide("home_quote") ? null : (
      <section className={styles.quote} style={(() => { const s: React.CSSProperties = {}; if ((quote as any).backgroundColor) s.backgroundColor = (quote as any).backgroundColor; const rt = (quote as any).borderRadiusTop; const rb = (quote as any).borderRadiusBottom; if (rt != null) { s.borderTopLeftRadius = `${rt}px`; s.borderTopRightRadius = `${rt}px`; } if (rb != null) { s.borderBottomLeftRadius = `${rb}px`; s.borderBottomRightRadius = `${rb}px`; } const pt = (quote as any).paddingTop; const pb = (quote as any).paddingBottom; if (pt != null) s.paddingTop = `${pt}px`; if (pb != null) s.paddingBottom = `${pb}px`; if ((quote as any).cardBackground) (s as any)['--quote-card-bg'] = (quote as any).cardBackground; if ((quote as any).cardBorderColor) (s as any)['--quote-card-border'] = (quote as any).cardBorderColor; if ((quote as any).cardTextColor) (s as any)['--quote-card-text'] = (quote as any).cardTextColor; return Object.keys(s).length ? s : undefined; })()}>
        <div className={`container ${blockWidthClass("home_quote")}`.trim()}>
          <div className={styles.editWrap}>
            {isAdmin && (
              <div style={btnWrapStyle}>
                <BlockVisibilityToggle blockId="home_quote" />
                <BlockWidthToggle blockId="home_quote" />
                <button className={styles.editBtn} style={{ position: 'static' }} onClick={() => setEditBlock("home_quote")}>
                  Modifier
                </button>
                <BlockOrderButtons page="home" blockId="home_quote" />
              </div>
            )}
            <AnimateInView variant="fadeUp">
              {(() => {
                const blockTitleText = (quote as any).blockTitle ?? "Témoignages";
                const Tag = (quote as any).blockTitleStyle || "h2";
                const fs = (quote as any).blockTitleFontSize;
                const color = (quote as any).blockTitleColor;
                const align = (quote as any).blockTitleAlign;
                return <Tag className={`${styles.quoteBlockTitle} style-${Tag}`} style={{ ...(fs != null ? { fontSize: responsiveFontSize(fs) } : {}), ...(color ? { color } : {}), ...(align ? { textAlign: align, width: '100%', display: 'block' } : {}) }}>{blockTitleText}</Tag>;
              })()}
              {(quote as any).blockSubtitle ? (() => {
                const SubTag = (quote as any).blockSubtitleStyle || 'p';
                const subFs = (quote as any).blockSubtitleFontSize;
                const subColor = (quote as any).blockSubtitleColor;
                const subAlign = (quote as any).blockSubtitleAlign;
                return <SubTag className={`${styles.quoteBlockSubtitle} style-${SubTag}`} style={{ ...(subFs != null ? { fontSize: responsiveFontSize(subFs) } : {}), ...(subColor ? { color: subColor } : {}), ...(subAlign ? { textAlign: subAlign, width: '100%', display: 'block' } : {}) }}>{(quote as any).blockSubtitle}</SubTag>;
              })() : null}
            </AnimateInView>
            <AnimateInView variant="fade">
            <div className={styles.quoteMarqueeWrap} aria-label="Citations défilantes">
              <div className={styles.quoteMarqueeInner} style={{ animationDuration: `${quoteScrollDuration}s` }}>
                {[0, 1, 2, 3].map((copy) => (
                  <div key={copy} className={styles.quoteMarqueeGroup}>
                    {quoteList.map((q, i) => (
                      <div key={`${copy}-${i}`} className={styles.quoteCard}>
                        <div className={styles.quoteCardHeader}>
                          {q.author ? (() => { const Tag = q.authorStyle || "p"; return <Tag className={`${styles.quoteAuthor} style-${Tag}`}>{q.author}</Tag>; })() : null}
                          {q.role ? (() => { const Tag = q.roleStyle || "p"; return <Tag className={`${styles.quoteRole} style-${Tag}`}>{q.role}</Tag>; })() : null}
                        </div>
                        {q.text ? <p className={styles.quoteText}>"{q.text}"</p> : null}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            </AnimateInView>
          </div>
        </div>
      </section>
  );

  const ctaSection = hide("home_cta") ? null : (
      <section className={styles.cta} style={(() => { const s: React.CSSProperties = {}; if ((cta as any).backgroundColor) s.backgroundColor = (cta as any).backgroundColor; const rt = (cta as any).borderRadiusTop; const rb = (cta as any).borderRadiusBottom; if (rt != null) { s.borderTopLeftRadius = `${rt}px`; s.borderTopRightRadius = `${rt}px`; } if (rb != null) { s.borderBottomLeftRadius = `${rb}px`; s.borderBottomRightRadius = `${rb}px`; } const pt = (cta as any).paddingTop; const pb = (cta as any).paddingBottom; if (pt != null) s.paddingTop = `${pt}px`; if (pb != null) s.paddingBottom = `${pb}px`; return Object.keys(s).length ? s : undefined; })()}>
        <div className={`container ${blockWidthClass("home_cta")}`.trim()}>
          <div className={styles.editWrap}>
            {isAdmin && (
              <div style={btnWrapStyle}>
                <BlockVisibilityToggle blockId="home_cta" />
                <BlockWidthToggle blockId="home_cta" />
                <button className={styles.editBtn} style={{ background: "#fff", color: "#111", position: 'static' }} onClick={() => setEditBlock("home_cta")}>
                  Modifier
                </button>
                <BlockOrderButtons page="home" blockId="home_cta" />
              </div>
            )}
            <AnimateInView variant="fadeUp">
              {cta.title ? (() => { const Tag = (cta as any).titleStyle || "h2"; const fs = (cta as any).titleFontSize; const color = (cta as any).titleColor; const align = (cta as any).titleAlign; return <Tag className={`${styles.ctaTitle} style-${Tag}`} style={{ ...(fs != null ? { fontSize: responsiveFontSize(fs) } : {}), ...(color ? { color } : {}), ...(align ? { textAlign: align, width: '100%', display: 'block' } : {}) }}>{cta.title}</Tag>; })() : null}
              <Link href={cta.buttonHref || "/contact"} className={`${styles.ctaButton} btn-site-${cta.buttonStyle || "1"}`} data-analytics-id="Accueil|CTA Contact">
                {cta.buttonLabel || "Contactez-moi"}
              </Link>
            </AnimateInView>
          </div>
        </div>
      </section>
  );

  const sections: Record<string, React.ReactNode> = {
    home_intro: introSection,
    home_banner: bannerSection,
    home_services: servicesSection,
    home_portrait: portraitSection,
    home_cadreur: cadreurSection,
    home_animation: animationSection,
    home_stats: statsSection,
    clients: clientsSection,
    home_quote: quoteSection,
    home_cta: ctaSection,
  };

  // These blocks manage their own internal animations — wrapping them in RevealSection
  // would animate the background too, which looks wrong (background should always be visible).
  const noRevealBlocks = new Set(['home_stats', 'clients', 'home_banner']);

  return (
    <>
      {blockOrderHome.map((blockId) =>
        sections[blockId] ? (
          noRevealBlocks.has(blockId)
            ? <React.Fragment key={blockId}>{sections[blockId]}</React.Fragment>
            : <RevealSection key={blockId}>{sections[blockId]}</RevealSection>
        ) : null
      )}
      {editBlock && (
        <HomeBlockModal
          blockKey={editBlock}
          initialData={getBlockData(editBlock)}
          onClose={() => setEditBlock(null)}
          onSaved={() => setEditBlock(null)}
        />
      )}
    </>
  );
}
