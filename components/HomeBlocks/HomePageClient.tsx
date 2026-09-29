"use client";

import { hasRichTextContent } from "../../lib/hasRichTextContent";

import { AdminToolbarShell, AdminToolbarButton } from '../admin/AdminToolbar';
import { Pencil, Film, Users, Camera } from 'lucide-react';
import { DEFAULT_CADREUR_FEATURES } from './homeDefaults';
import useBuiltinPageBlocks from '../PageBuilder/useBuiltinPageBlocks';
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useSplashReady } from "../AnimateInView/AnimateInView";
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
import { motion } from "framer-motion";
import AnimateInView, { AnimateStaggerItem, variants as animVariants } from "../AnimateInView/AnimateInView";
import type { VideoLightboxItem } from "../VideoGallery/VideoLightbox";
import { toneOf, panelStyle, htmlToLines, RevealWords, CountUp, Timecode, useMagnetic, Arrow, type Tone } from "./homeDesign";
import styles from "./HomeModern.module.css";

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

/** Converts an admin-set font size to a responsive CSS font-size value. */
function responsiveFontSize(fs: number): string {
  if (fs <= 24) return `${fs}px`;
  const vw = Math.min(fs / 8, 9).toFixed(2);
  const min = Math.max(14, Math.round(fs * 0.22));
  return `clamp(${min}px, ${vw}vw, ${fs}px)`;
}

/** Réglages typographiques d'un titre saisis dans l'admin (taille, couleur, alignement). */
function textStyle(fs?: number, color?: string, align?: string): React.CSSProperties | undefined {
  const st: React.CSSProperties = {};
  if (fs != null) st.fontSize = responsiveFontSize(fs);
  if (color) st.color = color;
  if (align) st.textAlign = align as React.CSSProperties['textAlign'];
  return Object.keys(st).length ? st : undefined;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Compute inline style for a portrait fan card based on its offset from the active slide.
 *  offset 0 = active (front center), ±1 = adjacent, ±2 = far sides.
 *  Uses CSS transitions so changing portraitIndex smoothly animates all cards. */
function getFanCardStyle(offset: number): React.CSSProperties {
  const abs = Math.abs(offset);
  const sign = Math.sign(offset);
  // Side cards spread wide so they're nearly fully visible before coming front
  const tx = sign * (abs === 0 ? 0 : abs === 1 ? 190 : 330);
  const tz = abs === 0 ? 0 : abs === 1 ? -20 : -55;
  const ry = sign * (abs === 0 ? 0 : abs === 1 ? 8 : 14);
  const sc = abs === 0 ? 1 : abs === 1 ? 0.84 : 0.7;
  const op = abs === 0 ? 1 : abs === 1 ? 0.7 : 0.35;
  const zi = abs === 0 ? 4 : abs === 1 ? 3 : 2;
  const h  = abs === 0 ? '92%' : abs === 1 ? '78%' : '64%';
  return {
    position: 'absolute',
    height: h,
    aspectRatio: '3/4',
    left: '50%',
    bottom: 0,
    borderRadius: 18,
    overflow: 'hidden',
    zIndex: zi,
    cursor: offset !== 0 ? 'pointer' : 'default',
    opacity: op,
    /* L'opacité rattrape plus vite que la position : la carte qui prend la
       place active devient pleinement opaque à mi-course au lieu de laisser
       voir ses voisines pendant tout le déplacement. */
    transition: 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease, height 620ms cubic-bezier(0.22, 1, 0.36, 1), filter 400ms ease',
    willChange: 'transform, opacity',
    filter: abs === 0 ? 'none' : 'grayscale(0.6)',
    transform: `translateX(calc(-50% + ${tx}px)) rotateY(${ry}deg) translateZ(${tz}px) scale(${sc})`,
    boxShadow: abs === 0
      ? '0 40px 90px rgba(0,0,0,0.55), 0 10px 30px rgba(0,0,0,0.35)'
      : '0 14px 45px rgba(0,0,0,0.45)',
  };
}

export default function HomePageClient({ initialSettings, renderOnly }: { initialSettings?: Record<string, string>; renderOnly?: string }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(() => initialSettings !== undefined);
  const [editBlock, setEditBlock] = useState<HomeBlockKey | null>(null);
  const { hiddenBlocks, blockWidthModes, blockOrderHome, isAdmin: isAdminFromContext } = useBlockVisibility();
  const ctaMagnet = useMagnetic<HTMLAnchorElement>(0.2);

  /* Blocs ajoutés depuis l'administration : leurs sections sont fusionnées
     dans la table ci-dessous et leurs identifiants figurent dans le même
     ordre que les blocs intégrés. */
  const dynamicBlocks = useBuiltinPageBlocks("home", !renderOnly);
  const hide = (id: string) => {
    if (renderOnly) return id !== renderOnly;
    const state = parse(initialSettings?.[`managed_${id === "clients" ? "home_clients" : id}`], { deleted: false, visible: undefined as boolean | undefined });
    return state.deleted || (!isAdminFromContext && (state.visible === false || (state.visible === undefined && hiddenBlocks.includes(id))));
  };
  const innerClass = (id: string) => `${styles.inner}${!renderOnly && blockWidthModes[id] === "max1600" ? ` ${styles.inner1600}` : ""}`;

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
  const portraitTouchStartX = useRef<number | null>(null);
  const portraitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quoteViewportRef = useRef<HTMLDivElement>(null);
  const [quotesPaused, setQuotesPaused] = useState(false);

  /* ---- Cadreur video lightbox state ---- */
  const [cadreurLightboxOpen, setCadreurLightboxOpen] = useState(false);
  const [cadreurLightboxIndex, setCadreurLightboxIndex] = useState(0);
  const [cadreurLightboxInitial, setCadreurLightboxInitial] = useState(0);
  const splashReady = useSplashReady();

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
    if (renderOnly) return;
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
    if (renderOnly) return;
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

  // Citations : dérivation toujours exécutée (avant early return) pour respecter l'ordre des Hooks
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
  const quoteList: HomeQuoteItem[] = quoteData.quotes;

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
      setCurrentPortraitSlide((prev) => (prev >= portraitSlides.length - 1 ? 0 : prev + 1));
    }, portraitCarouselSpeed);
  }, [portraitSlides.length, portraitCarouselSpeed]);
  useEffect(() => {
    if (renderOnly && renderOnly !== "home_portrait") return;
    resetPortraitInterval();
    return () => {
      if (portraitIntervalRef.current) clearInterval(portraitIntervalRef.current);
      portraitIntervalRef.current = null;
    };
  }, [resetPortraitInterval, renderOnly]);

  const portraitIndex = Math.max(0, Math.min(currentPortraitSlide, portraitSlides.length - 1));

  if (!loaded) {
    return (
      <div className="container" style={{ padding: "2rem 0", textAlign: "center", color: "var(--muted)" }}>
        Chargement…
      </div>
    );
  }

  const serviceItems = services.items && services.items.length ? services.items : DEFAULT_SERVICES.items;
  const statItems = Array.isArray(stats.items) ? stats.items : DEFAULT_STATS.items;

  const activePortraitSlide = portraitSlides[portraitIndex] || portraitSlides[0];
  // Keep ?tab= intact so PageTransitionOverlay can store it in sessionStorage for PortraitPageClient
  const portraitSlideHref = (activePortraitSlide as any)?.href || '/portrait';

  const quoteScrollDuration = Math.max(5, Math.min(120, Math.round((quoteData.carouselSpeed ?? 5000) / 1000))) * Math.max(3, quoteList.length) / 3 * 2; // secondes pour un cycle complet

  const goPortrait = (next: number) => {
    const n = portraitSlides.length;
    setCurrentPortraitSlide(((next % n) + n) % n);
    resetPortraitInterval();
  };

  const navigateQuotes = (direction: -1 | 1) => {
    const viewport = quoteViewportRef.current;
    const track = viewport?.firstElementChild as HTMLElement | null;
    const group = track?.firstElementChild as HTMLElement | null;
    if (!viewport || !track || !group) return;
    const cards = Array.from(group.children) as HTMLElement[];
    if (!cards.length) return;
    const animation = track.getAnimations().find(a => a instanceof CSSAnimation && a.animationName === getComputedStyle(track).animationName);
    if (animation) {
      const duration = Number(animation.effect?.getTiming().duration);
      const width = group.getBoundingClientRect().width;
      if (!duration || !width) return;
      const elapsed = Number(animation.currentTime ?? 0);
      const position = ((elapsed % duration) / duration) * width;
      const offsets = cards.map(card => card.offsetLeft - cards[0].offsetLeft);
      const target = direction === 1
        ? offsets.find(offset => offset > position + 1) ?? 0
        : offsets.slice().reverse().find(offset => offset < position - 1) ?? offsets[offsets.length - 1];
      animation.currentTime = (target / width) * duration;
    } else {
      const max = viewport.scrollWidth - viewport.clientWidth;
      const positions = [...new Set(cards.map(card => Math.min(max, card.offsetLeft - cards[0].offsetLeft)))];
      const target = direction === 1
        ? positions.find(offset => offset > viewport.scrollLeft + 1) ?? 0
        : positions.slice().reverse().find(offset => offset < viewport.scrollLeft - 1) ?? max;
      viewport.scrollTo({ left: target, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  };

  /** Barre d'outils admin commune à chaque bloc. */
  const toolbar = (key: HomeBlockKey) => isAdmin ? (
    <AdminToolbarShell>
      <AdminToolbarButton
        variant="primary"
        showLabel
        icon={<Pencil size={14} aria-hidden="true" />}
        label="Modifier"
        onClick={() => setEditBlock(key)}
      />
      <BlockVisibilityToggle blockId={key} />
      <BlockWidthToggle blockId={key} />
      <BlockOrderButtons page="home" blockId={key} />
    </AdminToolbarShell>
  ) : null;

  /** Attributs d'un panneau : ton clair/sombre déduit du fond choisi dans l'admin. */
  const panel = (data: any, fallback: Tone, extra: string) => ({
    className: `${styles.panel} ${extra}`,
    "data-tone": toneOf(data.backgroundColor, fallback),
    style: panelStyle(data),
  });

  /** Titre de bloc : révélé mot à mot quand il s'agit de texte brut. */
  const heading = (text: string | undefined, tag: string, className: string, st?: React.CSSProperties, active?: boolean, delay?: number) =>
    text ? <RevealWords text={text} as={tag} className={`${className} style-${tag}`} style={st} active={active} delay={delay} /> : null;

  /* ═════════════ Intro ═════════════ */
  const introSection = hide("home_intro") ? null : (() => {
    const iv = intro as any;
    const titleTag = iv.titleStyle || 'h1';
    const titleSt = textStyle(iv.titleFontSize, iv.titleColor, iv.titleAlign);
    const imgFocus = iv.image?.focus;
    const lines = htmlToLines(iv.servicesHtml);
    const reveal = (delay: number) => ({
      initial: "hidden" as const,
      animate: splashReady ? "visible" as const : "hidden" as const,
      variants: animVariants.fadeUp,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const, delay },
    });
    const eyebrowJustify = iv.eyebrowAlign === 'center' ? 'center' : iv.eyebrowAlign === 'right' ? 'flex-end' : undefined;
    return (
      <section {...panel(iv, "dark", styles.intro)}>
        {toolbar("home_intro")}
        <div className={innerClass("home_intro")}>
          {iv.eyebrow && (
            <motion.div className={styles.introTop} style={eyebrowJustify ? { justifyContent: eyebrowJustify } : undefined} {...reveal(0)}>
              <span
                className={styles.pill}
                style={{
                  ...(iv.eyebrowFontSize ? { fontSize: `${iv.eyebrowFontSize}px` } : {}),
                  ...(iv.eyebrowColor ? { color: iv.eyebrowColor } : {}),
                }}
              >
                <span className={styles.liveDot} aria-hidden="true" />
                {iv.eyebrow}
              </span>
            </motion.div>
          )}

          <div className={styles.introGrid}>
            <div className={styles.introTitleCol}>
              {iv.titleHtml
                ? <motion.div {...reveal(0.1)}>{React.createElement(titleTag, { className: `${styles.introTitle} style-${titleTag}`, style: titleSt, dangerouslySetInnerHTML: { __html: iv.titleHtml } })}</motion.div>
                : heading(intro.title, titleTag, styles.introTitle, titleSt, splashReady, 0.1)}
            </div>

            <motion.div className={styles.introMediaCol} {...reveal(0.25)}>
              <div className={`${styles.viewfinder}${iv.imageTilted ? ` ${styles.viewfinderTilted}` : ''}`}>
                {iv.image?.url ? (
                  <Image
                    src={iv.image.url}
                    alt=""
                    fill
                    priority
                    sizes="(max-width:767px) 100vw, 40vw"
                    className={styles.viewfinderImg}
                    style={{ objectPosition: imgFocus ? `${imgFocus.x}% ${imgFocus.y}%` : 'center' }}
                  />
                ) : isAdmin ? (
                  <span className={styles.placeholderNote}>Image — cliquez « Modifier »</span>
                ) : null}
                <span className={styles.vfCorners} aria-hidden="true"><i /><i /><i /><i /></span>
                <span className={styles.vfHud} aria-hidden="true">
                  <span className={styles.vfRec}><span className={styles.recDot} />REC</span>
                  <Timecode />
                </span>
                <span className={styles.vfHudBottom} aria-hidden="true">
                  <span>4K · 25p</span>
                  <span>ƒ/1.8</span>
                </span>
              </div>
            </motion.div>
          </div>

          {(intro.html || iv.servicesHtml) && (
            <motion.div className={styles.introFoot} {...reveal(0.4)}>
              {intro.html ? <div className={styles.introText} dangerouslySetInnerHTML={{ __html: intro.html }} /> : <div />}
              {lines.length ? (
                <ol className={styles.introList}>
                  {lines.map((line, i) => (
                    <li key={i}><span className={styles.introListNum}>{pad2(i + 1)}</span><span>{line}</span></li>
                  ))}
                </ol>
              ) : iv.servicesHtml ? (
                <div className={styles.introText} dangerouslySetInnerHTML={{ __html: iv.servicesHtml }} />
              ) : null}
              <span className={styles.scrollCue} aria-hidden="true"><span className={styles.scrollCueLine} />Défiler</span>
            </motion.div>
          )}
        </div>
      </section>
    );
  })();

  /* ═════════════ Bannière ═════════════ */
  const bannerSection = hide("home_banner") ? null : (() => {
    const b = banner as any;
    const ratio = b.imageRatio && IMAGE_RATIO_MAP[b.imageRatio] ? IMAGE_RATIO_MAP[b.imageRatio] : IMAGE_RATIO_MAP['21:9'];
    const isTextMode = b.textMode === 'text';
    const imgRight = b.textImagePosition !== 'left';
    const focus = b.image?.focus ? { objectPosition: `${b.image.focus.x}% ${b.image.focus.y}%` } : undefined;

    if (isTextMode) {
      const titleTag = b.blockTitleStyle || 'h2';
      const subtitleTag = b.blockSubtitleStyle || 'p';
      const media = (
        <AnimateInView variant="fade" className={styles.bannerMedia}>
          <div className={styles.mediaCard}>
            {b.image?.url ? (
              <Image src={b.image.url} alt="" fill sizes="(max-width:768px) 100vw, 46vw" className={styles.mediaImg} style={focus} />
            ) : isAdmin ? (
              <span className={styles.placeholderNote}>Image — cliquez « Modifier »</span>
            ) : null}
          </div>
        </AnimateInView>
      );
      return (
        <section {...panel(b, "light", styles.bannerText)}>
          {toolbar("home_banner")}
          <div className={innerClass("home_banner")}>
            <div className={`${styles.split} ${imgRight ? '' : styles.splitReverse}`}>
              <div className={styles.splitText}>
                {b.eyebrow && <span className={styles.eyebrow} style={b.blockTitleAlign ? { justifyContent: b.blockTitleAlign === 'center' ? 'center' : b.blockTitleAlign === 'right' ? 'flex-end' : undefined } : undefined}>{b.eyebrow}</span>}
                {heading(b.blockTitle, titleTag, styles.display, textStyle(b.blockTitleFontSize, b.blockTitleColor, b.blockTitleAlign))}
                {b.blockSubtitle && React.createElement(subtitleTag, {
                  className: `${styles.lead} style-${subtitleTag}`,
                  style: textStyle(b.blockSubtitleFontSize, b.blockSubtitleColor, b.blockSubtitleAlign),
                }, b.blockSubtitle)}
                {b.html ? <div className={styles.rich} dangerouslySetInnerHTML={{ __html: b.html }} /> : null}
                {b.ctaLabel && b.ctaHref && (
                  <Link href={b.ctaHref} className={`${styles.btn}${b.ctaButtonStyle === '2' ? ` ${styles.btnGhost}` : ''}`}>
                    <span>{b.ctaLabel}</span><span className={styles.btnIcon}><Arrow /></span>
                  </Link>
                )}
              </div>
              {media}
            </div>
          </div>
        </section>
      );
    }

    // Bannière image seule : pleine largeur, légère mise à l'échelle au défilement.
    const hasBg = Boolean(b.backgroundColor);
    return (
      <section {...panel(b, "light", `${styles.bannerImage}${hasBg ? ` ${styles.bannerImageFilled}` : ''}`)}>
        {toolbar("home_banner")}
        <div className={hasBg ? innerClass("home_banner") : undefined}>
          <div className={styles.bannerFrame} style={{ aspectRatio: ratio }}>
            {b.image?.url ? (
              <Image src={b.image.url} alt="" fill sizes="100vw" className={styles.bannerImg} style={focus} />
            ) : isAdmin ? (
              <span className={styles.placeholderNote}>Bannière — cliquez « Modifier » pour ajouter une image</span>
            ) : null}
          </div>
        </div>
      </section>
    );
  })();

  /* ═════════════ Services ═════════════ */
  const servicesSection = hide("home_services") ? null : (() => {
    const sv = services as any;
    const titleTag = sv.blockTitleStyle || "h2";
    const subTag = sv.blockSubtitleStyle || "p";
    return (
      <section {...panel(sv, "light", styles.services)}>
        {toolbar("home_services")}
        <div className={innerClass("home_services")}>
          <div className={styles.head}>
            <div>
              <span className={styles.eyebrow}>Services — {pad2(serviceItems.length)}</span>
              {heading(sv.blockTitle, titleTag, styles.display, textStyle(sv.blockTitleFontSize, sv.blockTitleColor, sv.blockTitleAlign))}
            </div>
            {sv.blockSubtitle ? (
              <AnimateInView variant="fadeUp">
                {React.createElement(subTag, { className: `${styles.lead} ${styles.headLead} style-${subTag}`, style: textStyle(sv.blockSubtitleFontSize, sv.blockSubtitleColor, sv.blockSubtitleAlign) }, sv.blockSubtitle)}
              </AnimateInView>
            ) : null}
          </div>
          <AnimateInView variant="stagger" className={styles.svcGrid} style={{ ['--n' as string]: Math.min(4, serviceItems.length) } as React.CSSProperties}>
            {serviceItems.map((item, i) => {
              const TitleTag = ((item as any).titleStyle || "h3") as any;
              const DescTag = ((item as any).descriptionStyle || "p") as any;
              return (
                <AnimateStaggerItem key={i} className={styles.svcItem}>
                  <Link href={item.href || "#"} className={styles.svcCard} data-analytics-id={`Accueil|Service - ${(item.title || 'Service').toString().slice(0, 40)}`}>
                    {item.image?.url ? (
                      <Image src={item.image.url} alt="" fill className={styles.svcImg} sizes="(max-width: 767px) 85vw, 33vw" quality={100} />
                    ) : (
                      <span className={styles.svcImgEmpty} />
                    )}
                    <span className={styles.svcShade} aria-hidden="true" />
                    <span className={styles.svcTop}>
                      <span className={styles.glassPill}>{pad2(i + 1)}</span>
                      <span className={styles.svcArrow}><Arrow size={18} /></span>
                    </span>
                    <span className={styles.svcBottom}>
                      <TitleTag className={`${styles.svcTitle} style-${TitleTag}`} style={(item as any).titleFontSize != null ? { fontSize: responsiveFontSize((item as any).titleFontSize) } : undefined}>{item.title || "Service"}</TitleTag>
                      {item.description ? <DescTag className={`${styles.svcDesc} style-${DescTag}`} style={(item as any).descriptionFontSize != null ? { fontSize: responsiveFontSize((item as any).descriptionFontSize) } : undefined}>{item.description}</DescTag> : null}
                    </span>
                  </Link>
                </AnimateStaggerItem>
              );
            })}
          </AnimateInView>
        </div>
      </section>
    );
  })();

  /* ═════════════ Portrait ═════════════ */
  const portraitSection = hide("home_portrait") ? null : (() => {
    const pb = portraitBlock as any;
    const blockTitleText = pb.blockTitle ?? pb.title ?? "Portrait";
    const titleTag = pb.blockTitleStyle || "h2";
    const titleEl = heading(blockTitleText, titleTag, styles.display, textStyle(pb.blockTitleFontSize, pb.blockTitleColor, pb.blockTitleAlign));
    const SlideTag = ((activePortraitSlide as any)?.titleStyle || "h3") as any;
    const slideFs = (activePortraitSlide as any)?.titleFontSize;
    const storeScrollTarget = () => { try { const hashIdx = portraitSlideHref.indexOf('#'); const path = portraitSlideHref.split('?')[0].split('#')[0]; const id = hashIdx !== -1 ? portraitSlideHref.slice(hashIdx + 1) : path === '/portrait' ? 'portrait-gallery-nav' : null; if (id) sessionStorage.setItem('spaScrollTarget', id); } catch (_) {} };
    return (
      <section {...panel(pb, "dark", styles.portrait)}>
        {toolbar("home_portrait")}
        <div className={innerClass("home_portrait")}>
          <div
            className={styles.portraitGrid}
            onTouchStart={(e) => { portraitTouchStartX.current = e.touches[0]?.clientX ?? null; }}
            onTouchEnd={(e) => {
              const start = portraitTouchStartX.current;
              portraitTouchStartX.current = null;
              const end = e.changedTouches[0]?.clientX;
              if (start == null || end == null || Math.abs(start - end) < 50) return;
              goPortrait(portraitIndex + (start > end ? 1 : -1));
            }}
          >
            <div className={styles.portraitHead}>
              <span className={styles.eyebrow}>Séances photo</span>
              {titleEl}
            </div>

            <div className={styles.portraitStageWrap}>
              <div className={styles.portraitStage}>
                <div className={styles.portraitGlow} aria-hidden="true" />
                {portraitSlides.map((slide: any, slideIdx: number) => {
                  const n = portraitSlides.length;
                  let offset = slideIdx - portraitIndex;
                  if (offset > n / 2) offset -= n;
                  if (offset < -n / 2) offset += n;
                  if (Math.abs(offset) > 2) return null;
                  const focusStyle = slide.image?.focus?.x != null
                    ? { objectPosition: `${slide.image.focus.x}% ${slide.image.focus.y}%` }
                    : {};
                  return (
                    <div
                      key={slideIdx}
                      style={getFanCardStyle(offset)}
                      onClick={offset !== 0 ? () => goPortrait(slideIdx) : undefined}
                    >
                      {slide.image?.url ? (
                        <Image
                          src={slide.image.url}
                          alt=""
                          width={500}
                          height={667}
                          quality={100}
                          sizes="(max-width: 899px) 70vw, (max-width: 1400px) 38vw, 540px"
                          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', ...focusStyle }}
                        />
                      ) : (
                        <div className={styles.portraitCardEmpty}><span>{slide.title}</span></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.portraitBody}>
              <div className={styles.portraitCounter} aria-live="polite">
                <span className={styles.portraitCounterNow}>{pad2(portraitIndex + 1)}</span>
                <span className={styles.portraitCounterTotal}>/ {pad2(portraitSlides.length)}</span>
              </div>
              <div key={portraitIndex} className={styles.portraitSlide}>
                {activePortraitSlide?.title ? <SlideTag className={`${styles.portraitSlideTitle} style-${SlideTag}`} style={slideFs != null ? { fontSize: responsiveFontSize(slideFs) } : undefined}>{activePortraitSlide.title}</SlideTag> : null}
                {activePortraitSlide?.text ? <div className={styles.rich} dangerouslySetInnerHTML={{ __html: activePortraitSlide.text }} /> : null}
              </div>
              <Link
                href={portraitSlideHref}
                className={`${styles.btn}${pb.ctaButtonStyle === '2' ? ` ${styles.btnGhost}` : ''}`}
                data-analytics-id="Accueil|CTA Portrait"
                onMouseDown={storeScrollTarget}
                onTouchStart={storeScrollTarget}
              >
                <span>{pb.ctaLabel || "Découvrir le portrait"}</span><span className={styles.btnIcon}><Arrow /></span>
              </Link>
              <div className={styles.portraitNav}>
                <div className={styles.progress}>
                  {portraitSlides.map((slide: any, i: number) => (
                    <button
                      key={i}
                      type="button"
                      className={styles.progressSeg}
                      data-state={i < portraitIndex ? "done" : i === portraitIndex ? "active" : undefined}
                      onClick={() => goPortrait(i)}
                      aria-label={`${slide.title || 'Slide'} (${i + 1}/${portraitSlides.length})`}
                    >
                      <span key={i === portraitIndex ? `a${portraitIndex}` : i} style={{ animationDuration: `${portraitCarouselSpeed}ms` }} />
                    </button>
                  ))}
                </div>
                <div className={styles.roundNav}>
                  <button type="button" onClick={() => goPortrait(portraitIndex - 1)} aria-label="Précédent"><span className={styles.flip}><Arrow /></span></button>
                  <button type="button" onClick={() => goPortrait(portraitIndex + 1)} aria-label="Suivant"><Arrow /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  })();

  /* ═════════════ Cadreur ═════════════ */
  const cadreurSection = hide("home_cadreur") ? null : (() => {
    const cb = cadreurBlock as any;
    const vs = cb.videoSettings || {};
    const vShadow = SHADOW_MAP[vs.shadow || 'medium'] || 'none';
    const vGlossy = vs.glossy ?? false;
    const titleTag = cb.titleStyle || "h2";
    const features = cadreurBlock.features ?? DEFAULT_CADREUR_FEATURES;
    const ratio = cadreurBlock.imageRatio && IMAGE_RATIO_MAP[cadreurBlock.imageRatio];
    return (
      <section {...panel(cb, "light", styles.cadreur)}>
        {toolbar("home_cadreur")}
        <div className={innerClass("home_cadreur")}>
          <div className={styles.bento}>
            <AnimateInView variant="fadeUp" className={`${styles.card} ${styles.bentoText}`}>
              <span className={styles.eyebrow}>Tournage & production</span>
              {heading(cadreurBlock.title, titleTag, styles.display, textStyle(cb.titleFontSize, cb.titleColor, cb.titleAlign))}
              {cadreurBlock.html ? <div className={`${styles.rich} ${styles.bentoRich}`} dangerouslySetInnerHTML={{ __html: cadreurBlock.html }} /> : null}
            </AnimateInView>
            <AnimateInView variant="fade" className={styles.bentoMedia} style={ratio ? { aspectRatio: ratio } : undefined}>
              {cadreurBlock.image?.url ? (
                <Image
                  src={cadreurBlock.image.url}
                  alt=""
                  fill
                  quality={100}
                  sizes="(max-width: 899px) 100vw, 45vw"
                  className={styles.mediaImg}
                  style={cb.image?.focus?.x != null ? { objectPosition: `${cb.image.focus.x}% ${cb.image.focus.y}%` } : undefined}
                />
              ) : null}
            </AnimateInView>
            {features.length > 0 && (
              <AnimateInView variant="stagger" className={styles.bentoFeatures}>
                {features.map((feature, index) => {
                  const Icon = feature.icon === 'team' ? Users : feature.icon === 'camera' ? Camera : Film;
                  return (
                    <AnimateStaggerItem key={index} className={`${styles.card} ${styles.feature}`}>
                      <span className={styles.featureIcon}><Icon size={20} strokeWidth={1.6} aria-hidden="true" /></span>
                      {feature.title && <h3 className={styles.featureTitle}>{feature.title}</h3>}
                      {feature.text && <p className={styles.featureText}>{feature.text}</p>}
                    </AnimateStaggerItem>
                  );
                })}
              </AnimateInView>
            )}
          </div>

          {cadreurVisibleVideos.length > 0 && (
            <div className={styles.videos}>
              {cb.videosSectionTitle ? (
                <p className={styles.eyebrow} style={{ justifyContent: cb.videosSectionTitleAlign === 'center' ? 'center' : cb.videosSectionTitleAlign === 'right' ? 'flex-end' : undefined }}>
                  {cb.videosSectionTitle}
                </p>
              ) : null}
              <AnimateInView variant="stagger" className={styles.videoGrid} style={{ ['--n' as string]: cadreurVisibleVideos.length } as React.CSSProperties}>
                {cadreurVisibleVideos.map((vid, i) => {
                  const thumb = getYouTubeThumb(getYouTubeId(vid.url));
                  return (
                    <AnimateStaggerItem key={i}>
                      <button
                        type="button"
                        className={styles.videoCard}
                        onClick={() => openCadreurLightbox(i)}
                        aria-label={vid.title || `Vidéo ${i + 1}`}
                        data-video-name={vid.title || `Vidéo ${i + 1}`}
                      >
                        <span className={styles.videoThumb} style={{ boxShadow: vShadow !== 'none' ? vShadow : undefined }}>
                          <img src={thumb} alt="" loading="lazy" />
                          {vGlossy && <span className={styles.videoGlossy} />}
                          <span className={styles.videoPlay}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="7,4 20,12 7,20" /></svg>
                          </span>
                        </span>
                        {vid.title && <span className={styles.videoTitle}>{vid.title}</span>}
                        {vid.description && <span className={styles.videoDesc}>{vid.description}</span>}
                      </button>
                    </AnimateStaggerItem>
                  );
                })}
              </AnimateInView>
            </div>
          )}
        </div>

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

  /* ═════════════ Bureau à la carte (animation) ═════════════ */
  const animationSection = hide("home_animation") ? null : (() => {
    const ab = animationBlock as any;
    const titleTag = ab.blockTitleStyle || "h2";
    const subTag = ab.blockSubtitleStyle || "p";
    const hasImage = Boolean(ab.image?.url);
    return (
      <section {...panel(ab, "dark", styles.animation)}>
        {toolbar("home_animation")}
        <div className={innerClass("home_animation")}>
          <div className={`${styles.split} ${hasImage ? '' : styles.splitSingle}`}>
            {hasImage ? (
              <AnimateInView variant="fade" className={styles.animationMedia}>
                <div className={styles.mediaCard}>
                  <Image src={ab.image.url} alt="" fill className={styles.mediaImg} sizes="(max-width: 768px) 100vw, 50vw" />
                </div>
              </AnimateInView>
            ) : null}
            <div className={styles.splitText} style={ab.contentBgColor ? { background: ab.contentBgColor, padding: 'clamp(24px, 3vw, 48px)', borderRadius: 'var(--h-radius-sm)' } : undefined}>
              <span className={styles.eyebrow}>Bureau à la carte</span>
              {heading(ab.blockTitle, titleTag, styles.display, textStyle(ab.blockTitleFontSize, ab.blockTitleColor, ab.blockTitleAlign))}
              {ab.blockSubtitle ? React.createElement(subTag, { className: `${styles.lead} style-${subTag}`, style: textStyle(ab.blockSubtitleFontSize, ab.blockSubtitleColor, ab.blockSubtitleAlign) }, ab.blockSubtitle) : null}
              {hasRichTextContent(animationBlock.html) ? <div className={styles.rich} dangerouslySetInnerHTML={{ __html: ab.html }} /> : null}
              <Link href="/animation" className={styles.btn}>
                <span>Découvrir le bureau à la carte</span><span className={styles.btnIcon}><Arrow /></span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  })();

  /* ═════════════ Chiffres clés ═════════════ */
  const statsSection = hide("home_stats") ? null : (() => {
    const st = stats as any;
    return (
      <section {...panel(st, "light", styles.stats)}>
        {toolbar("home_stats")}
        <div className={innerClass("home_stats")} style={stats.textColor ? { color: stats.textColor } : undefined}>
          <AnimateInView variant="stagger" className={styles.statsGrid} style={{ ['--n' as string]: Math.max(1, statItems.length) } as React.CSSProperties}>
            {statItems.map((item, i) => (
              <AnimateStaggerItem key={i} className={styles.stat}>
                <span className={styles.statIndex}>{pad2(i + 1)}</span>
                <div className={`${styles.statValue}${/\d/.test(item.value || "") ? "" : ` ${styles.statWord}`}`}>{item.value ? <CountUp value={item.value} /> : "—"}</div>
                <p className={styles.statLabel}>{item.label || ""}</p>
              </AnimateStaggerItem>
            ))}
          </AnimateInView>
        </div>
      </section>
    );
  })();

  const clientsSection = hide("clients") ? null : <div className={styles.clientsWrap}><Clients premium /></div>;

  /* ═════════════ Témoignages ═════════════ */
  const quoteSection = hide("home_quote") ? null : (() => {
    const q = quote as any;
    const vars: Record<string, string> = {};
    if (q.cardBackground) vars['--quote-card-bg'] = q.cardBackground;
    if (q.cardBorderColor) vars['--quote-card-border'] = q.cardBorderColor;
    if (q.cardTextColor) vars['--quote-card-text'] = q.cardTextColor;
    const p = panel(q, "dark", styles.quote);
    const TitleTag = (q.blockTitleStyle || "p") as any;
    const subTag = q.blockSubtitleStyle || "h2";
    return (
      <section {...p} style={{ ...(p.style || {}), ...vars }}>
        {toolbar("home_quote")}
        <div className={innerClass("home_quote")}>
          <div className={styles.head}>
            <div>
              <TitleTag className={`${styles.eyebrow} style-${TitleTag}`} style={textStyle(q.blockTitleFontSize && q.blockTitleFontSize <= 16 ? undefined : q.blockTitleFontSize, q.blockTitleColor, q.blockTitleAlign)}>{q.blockTitle ?? "Témoignages"}</TitleTag>
              {heading(q.blockSubtitle || "Ils m'ont fait confiance", subTag, styles.display, textStyle(q.blockSubtitleFontSize, q.blockSubtitleColor, q.blockSubtitleAlign))}
            </div>
            <div className={styles.roundNav}>
              <button type="button" aria-label="Témoignage précédent" onClick={() => navigateQuotes(-1)}><span className={styles.flip}><Arrow /></span></button>
              <button type="button" aria-label={quotesPaused ? "Reprendre le défilement" : "Mettre le défilement en pause"} aria-pressed={quotesPaused} onClick={() => setQuotesPaused(paused => !paused)}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  {quotesPaused ? <path d="M4 2 14 8 4 14Z" /> : <path d="M3 2h3v12H3zM10 2h3v12h-3z" />}
                </svg>
              </button>
              <button type="button" aria-label="Témoignage suivant" onClick={() => navigateQuotes(1)}><Arrow /></button>
            </div>
          </div>
        </div>
        <div ref={quoteViewportRef} className={styles.marquee} aria-label="Témoignages défilants">
          <div className={styles.marqueeTrack} style={{ animationDuration: `${quoteScrollDuration}s`, animationPlayState: quotesPaused ? "paused" : undefined }}>
            {[0, 1].map((copy) => (
              <div key={copy} aria-hidden={copy > 0 ? true : undefined} className={styles.marqueeGroup}>
                {quoteList.map((item, i) => {
                  const AuthorTag = (item.authorStyle || "p") as any;
                  const RoleTag = (item.roleStyle || "p") as any;
                  return (
                    <figure key={`${copy}-${i}`} className={styles.quoteCard}>
                      <span className={styles.quoteGlyph} aria-hidden="true">“</span>
                      {item.text ? <blockquote className={styles.quoteText}>{item.text}</blockquote> : null}
                      <figcaption className={styles.quoteAuthor}>
                        <span className={styles.avatar} aria-hidden="true">{(item.author || "?").trim().charAt(0).toUpperCase()}</span>
                        <span>
                          {item.author ? <AuthorTag className={`${styles.quoteName} style-${AuthorTag}`}>{item.author}</AuthorTag> : null}
                          {item.role ? <RoleTag className={`${styles.quoteRole} style-${RoleTag}`}>{item.role}</RoleTag> : null}
                        </span>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  })();

  /* ═════════════ Appel à l'action ═════════════ */
  const ctaSection = hide("home_cta") ? null : (() => {
    const c = cta as any;
    const titleTag = c.titleStyle || "h2";
    return (
      <section {...panel(c, "dark", styles.cta)}>
        {toolbar("home_cta")}
        <span className={styles.ctaGlow} aria-hidden="true" />
        <div className={innerClass("home_cta")}>
          <span className={`${styles.pill} ${styles.ctaPill}`}><span className={styles.liveDot} aria-hidden="true" />Disponible pour de nouveaux projets</span>
          {heading(cta.title, titleTag, styles.ctaTitle, textStyle(c.titleFontSize, c.titleColor, c.titleAlign))}
          <div className={styles.ctaActions}>
            <Link
              href={cta.buttonHref || "/contact"}
              className={`${styles.btn} ${styles.btnLarge}${c.buttonStyle === '2' ? ` ${styles.btnGhost}` : ''}`}
              data-analytics-id="Accueil|CTA Contact"
              ref={ctaMagnet.ref}
              onMouseMove={ctaMagnet.onMouseMove}
              onMouseLeave={ctaMagnet.onMouseLeave}
            >
              <span>{cta.buttonLabel || "Contactez-moi"}</span><span className={styles.btnIcon}><Arrow size={18} /></span>
            </Link>
          </div>
        </div>
      </section>
    );
  })();

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

  if (renderOnly) return <div className={styles.managed}>{sections[renderOnly]}</div>;

  // Les blocs dynamiques s'ajoutent à la table de rendu, indexés par
  // leur identifiant d'ordre (« dyn:<uuid> »).
  Object.assign(sections, dynamicBlocks.sections);

  // These blocks manage their own internal animations — wrapping them in RevealSection
  // would animate the background too, which looks wrong (background should always be visible).
  const noRevealBlocks = new Set(['home_intro', 'home_stats', 'clients', 'home_banner']);

  return (
    <div className={`page-blocks ${styles.root}`}>
      {blockOrderHome.map((blockId) =>
        sections[blockId] ? (
          // Les blocs ajoutés depuis l'admin portent leur barre d'outils en
          // position absolue : le `transform` de RevealSection en ferait le
          // bloc conteneur et décalerait la barre. On les rend tels quels.
          noRevealBlocks.has(blockId) || blockId.startsWith('dyn:')
            ? <React.Fragment key={blockId}>{sections[blockId]}</React.Fragment>
            : <RevealSection key={blockId}>{sections[blockId]}</RevealSection>
        ) : null
      )}
      {dynamicBlocks.addButton}
      {dynamicBlocks.modals}
      {editBlock && (
        <HomeBlockModal
          blockKey={editBlock}
          initialData={getBlockData(editBlock)}
          onClose={() => setEditBlock(null)}
          onSaved={() => setEditBlock(null)}
        />
      )}
    </div>
  );
}
