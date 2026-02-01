"use client";

import React, { Fragment, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import Clients from "../Clients/Clients";
import HomeBlockModal from "./HomeBlockModal";
import type {
  HomeIntroData,
  HomeServicesData,
  HomeStatsData,
  HomePortraitBlockData,
  HomeCadreurBlockData,
  HomeQuoteData,
  HomeQuoteItem,
  HomeCtaData,
} from "./homeDefaults";
import {
  DEFAULT_INTRO,
  DEFAULT_SERVICES,
  DEFAULT_STATS,
  DEFAULT_PORTRAIT,
  DEFAULT_CADREUR,
  DEFAULT_QUOTE,
  DEFAULT_CTA,
} from "./homeDefaults";
import type { HomeBlockKey } from "./HomeBlockModal";
import { useBlockVisibility, BlockVisibilityToggle, BlockWidthToggle, BlockOrderButtons } from "../BlockVisibility";
import styles from "./HomeBlocks.module.css";

const SETTINGS_KEYS =
  "home_intro,home_services,home_stats,home_portrait,home_cadreur,home_quote,home_cta";

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

export default function HomePageClient() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editBlock, setEditBlock] = useState<HomeBlockKey | null>(null);
  const { hiddenBlocks, blockWidthModes, blockOrderHome, isAdmin: isAdminFromContext } = useBlockVisibility();
  const hide = (id: string) => !isAdminFromContext && hiddenBlocks.includes(id);
  const blockWidthClass = (id: string) => (blockWidthModes[id] === "max1600" ? "block-width-1600" : "");

  const [intro, setIntro] = useState<HomeIntroData>(DEFAULT_INTRO);
  const [services, setServices] = useState<HomeServicesData>(DEFAULT_SERVICES);
  const [stats, setStats] = useState<HomeStatsData>(DEFAULT_STATS);
  const [portraitBlock, setPortraitBlock] = useState<HomePortraitBlockData>(DEFAULT_PORTRAIT);
  const [cadreurBlock, setCadreurBlock] = useState<HomeCadreurBlockData>(DEFAULT_CADREUR);
  const [quote, setQuote] = useState<HomeQuoteData>(DEFAULT_QUOTE);
  const [cta, setCta] = useState<HomeCtaData>(DEFAULT_CTA);
  const [currentPortraitSlide, setCurrentPortraitSlide] = useState(0);
  const [portraitSlideDirection, setPortraitSlideDirection] = useState<"next" | "prev">("next");
  const portraitTouchStartX = useRef<number | null>(null);
  const portraitIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const quoteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        setStats(parse(s.home_stats, DEFAULT_STATS));
        setPortraitBlock(parse(s.home_portrait, DEFAULT_PORTRAIT));
        setCadreurBlock(parse(s.home_cadreur, DEFAULT_CADREUR));
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

  // Citations : dérivation + useEffect toujours exécutés (avant early return) pour respecter l’ordre des Hooks
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

  useEffect(() => {
    quoteIntervalRef.current = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quoteList.length);
    }, quoteSpeed);
    return () => {
      if (quoteIntervalRef.current) clearInterval(quoteIntervalRef.current);
      quoteIntervalRef.current = null;
    };
  }, [quoteList.length, quoteSpeed]);

  type BlockData = HomeIntroData | HomeServicesData | HomeStatsData | HomePortraitBlockData | HomeCadreurBlockData | HomeQuoteData | HomeCtaData;

  const getBlockData = (key: HomeBlockKey): BlockData => {
    switch (key) {
      case "home_intro": return intro;
      case "home_services": return services;
      case "home_stats": return stats;
      case "home_portrait": return portraitBlock;
      case "home_cadreur": return cadreurBlock;
      case "home_quote": return quote;
      case "home_cta": return cta;
      default: return {};
    }
  };

  // Portrait carousel : dérivation + useEffect avant early return pour respecter l’ordre des Hooks
  const portraitSlides = (() => {
    const p = portraitBlock as any;
    if (Array.isArray(p?.slides) && p.slides.length) return p.slides;
    if (p?.title || p?.html || p?.image) {
      return [{ title: p.title ?? "Portrait", text: p.html ?? "", image: p.image ?? null, image2: p.image2 ?? null }];
    }
    return DEFAULT_PORTRAIT.slides;
  })();
  const portraitCarouselSpeed = Math.max(2000, (portraitBlock as any).carouselSpeed ?? 5000);
  useEffect(() => {
    if (portraitSlides.length <= 1) return;
    portraitIntervalRef.current = setInterval(() => {
      setPortraitSlideDirection("next");
      setCurrentPortraitSlide((prev) => (prev >= portraitSlides.length - 1 ? 0 : prev + 1));
    }, portraitCarouselSpeed);
    return () => {
      if (portraitIntervalRef.current) clearInterval(portraitIntervalRef.current);
      portraitIntervalRef.current = null;
    };
  }, [portraitSlides.length, portraitCarouselSpeed]);

  if (!loaded) {
    return (
      <div className="container" style={{ padding: "2rem 0", textAlign: "center", color: "var(--muted)" }}>
        Chargement…
      </div>
    );
  }

  const serviceItems = services.items && services.items.length ? services.items : DEFAULT_SERVICES.items;
  const statItems = stats.items && stats.items.length ? stats.items : DEFAULT_STATS.items;

  const portraitIndex = Math.max(0, Math.min(currentPortraitSlide, portraitSlides.length - 1));
  const activePortraitSlide = portraitSlides[portraitIndex] || portraitSlides[0];

  const safeQuoteIndex = Math.max(0, Math.min(currentQuoteIndex, quoteList.length - 1));
  const visibleQuoteIndices = [0, 1, 2].map((i) => (safeQuoteIndex + i) % quoteList.length);

  const btnWrapStyle: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', position: 'absolute', right: 12, top: 12, zIndex: 5 };

  const introSection = hide("home_intro") ? null : (
      <section className={styles.intro} style={(intro as any).backgroundColor ? { backgroundColor: (intro as any).backgroundColor } : undefined}>
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
            {intro.title ? (() => { const Tag = (intro as any).titleStyle || "h1"; const fs = (intro as any).titleFontSize; return <Tag className={`${styles.introTitle} style-${Tag}`} style={fs != null ? { fontSize: `${fs}px` } : undefined}>{intro.title}</Tag>; })() : null}
            {intro.subtitle ? (() => { const Tag = (intro as any).subtitleStyle || "p"; const fs = (intro as any).subtitleFontSize; return <Tag className={`${styles.introSubtitle} style-${Tag}`} style={fs != null ? { fontSize: `${fs}px` } : undefined}>{intro.subtitle}</Tag>; })() : null}
            {intro.html ? <div className={styles.introText} dangerouslySetInnerHTML={{ __html: intro.html }} /> : null}
          </div>
        </div>
      </section>
  );

  const servicesSection = hide("home_services") ? null : (
      <section className={styles.services} style={(services as any).backgroundColor ? { backgroundColor: (services as any).backgroundColor } : undefined}>
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
            {(services as any).blockTitle ? (() => { const Tag = (services as any).blockTitleStyle || "h2"; const fs = (services as any).blockTitleFontSize; return <Tag className={`${styles.servicesTitle} style-${Tag}`} style={fs != null ? { fontSize: `${fs}px` } : undefined}>{(services as any).blockTitle}</Tag>; })() : null}
            {(services as any).blockSubtitle ? (() => { const Tag = (services as any).blockSubtitleStyle || "p"; const fs = (services as any).blockSubtitleFontSize; return <Tag className={`${styles.servicesSubtitle} style-${Tag}`} style={fs != null ? { fontSize: `${fs}px` } : undefined}>{(services as any).blockSubtitle}</Tag>; })() : null}
            <div className={styles.servicesGrid}>
              {serviceItems.map((item, i) => (
                <Link key={i} href={item.href || "#"} className={styles.serviceCard}>
                  <div className={styles.serviceCardImageWrap}>
                    {item.image?.url ? (
                      <img src={item.image.url} alt="" className={styles.serviceCardImage} />
                    ) : (
                      <div className={styles.serviceCardImage} style={{ background: "rgba(0,0,0,0.06)", minHeight: "100%" }} />
                    )}
                  </div>
                  <div className={styles.serviceCardContent}>
                    {(item.title || "Service") ? (() => { const Tag = (item as any).titleStyle || "h3"; const fs = (item as any).titleFontSize; return <Tag className={`${styles.serviceCardTitle} style-${Tag}`} style={fs != null ? { fontSize: `${fs}px` } : undefined}>{item.title || "Service"}</Tag>; })() : null}
                    {(item.description || "") ? (() => { const Tag = (item as any).descriptionStyle || "p"; return <Tag className={`${styles.serviceCardDesc} style-${Tag}`}>{item.description || ""}</Tag>; })() : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
  );

  const portraitSection = hide("home_portrait") ? null : (
      <section className={styles.portraitBlock}>
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
            {(() => {
              const blockTitleText = (portraitBlock as any).blockTitle ?? (portraitBlock as any).title ?? "Portrait";
              const Tag = (portraitBlock as any).blockTitleStyle || "h2";
              const fs = (portraitBlock as any).blockTitleFontSize;
              return <Tag className={`${styles.portraitBlockTitle} style-${Tag}`} style={fs != null ? { fontSize: `${fs}px` } : undefined}>{blockTitleText}</Tag>;
            })()}
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
                } else {
                  setPortraitSlideDirection("prev");
                  setCurrentPortraitSlide((prev) => (prev <= 0 ? portraitSlides.length - 1 : prev - 1));
                }
              }}
            >
              <div key={portraitIndex} className={styles.portraitSlideTransition}>
              <div className={styles.portraitCarouselImageWrap}>
                <div className={styles.portraitCarouselImage}>
                  <div className={`${styles.portraitPhoto1Wrap} ${portraitSlideDirection === "next" ? styles.portraitPhoto1FromRight : styles.portraitPhoto1FromLeft}`}>
                    {activePortraitSlide?.image?.url ? (
                      <img
                        src={activePortraitSlide.image.url}
                        alt=""
                        className={styles.portraitImageTorn}
                        style={
                          (activePortraitSlide.image as any)?.focus?.x != null
                            ? { objectPosition: `${(activePortraitSlide.image as any).focus.x}% ${(activePortraitSlide.image as any).focus.y}%` }
                            : undefined
                        }
                      />
                    ) : (
                      <div className={styles.portraitImageTorn} style={{ background: "rgba(0,0,0,0.08)" }} />
                    )}
                  </div>
                  {(activePortraitSlide as any)?.image2?.url ? (
                    <div className={`${styles.portraitPhoto2Wrap} ${styles.portraitPhoto2SlideDown}`}>
                      <img
                        src={(activePortraitSlide as any).image2.url}
                        alt=""
                        className={styles.portraitImageSecondary}
                        style={
                          (activePortraitSlide as any).image2?.focus?.x != null
                            ? { objectPosition: `${(activePortraitSlide as any).image2.focus.x}% ${(activePortraitSlide as any).image2.focus.y}%` }
                            : undefined
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>
              <div className={`${styles.portraitCarouselContent} ${styles.portraitContentFade}`}>
                {activePortraitSlide?.title ? (() => { const Tag = (activePortraitSlide as any).titleStyle || "h3"; const fs = (activePortraitSlide as any).titleFontSize; return <Tag className={`${styles.portraitSlideTitle} style-${Tag}`} style={fs != null ? { fontSize: `${fs}px` } : undefined}>{activePortraitSlide.title}</Tag>; })() : null}
                {activePortraitSlide?.text ? <div className={styles.portraitSlideText} dangerouslySetInnerHTML={{ __html: activePortraitSlide.text }} /> : null}
                <Link href={(portraitBlock as any).ctaHref || "/portrait"} className={`${styles.portraitCta} btn-site-${(portraitBlock as any).ctaButtonStyle || "1"}`}>
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
          </div>
        </div>
      </section>
  );

  const cadreurSection = hide("home_cadreur") ? null : (
      <section className={styles.cadreurBlock} style={(cadreurBlock as any).backgroundColor ? { backgroundColor: (cadreurBlock as any).backgroundColor } : undefined}>
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
              <div className={styles.cadreurContent}>
                {cadreurBlock.title ? (() => { const Tag = (cadreurBlock as any).titleStyle || "h2"; const fs = (cadreurBlock as any).titleFontSize; return <Tag className={`${styles.cadreurTitle} style-${Tag}`} style={fs != null ? { fontSize: `${fs}px` } : undefined}>{cadreurBlock.title}</Tag>; })() : null}
                {cadreurBlock.html ? <div className={styles.cadreurText} dangerouslySetInnerHTML={{ __html: cadreurBlock.html }} /> : null}
              </div>
              <div className={styles.cadreurMedia}>
                {cadreurBlock.image?.url ? (
                  <img
                    src={cadreurBlock.image.url}
                    alt=""
                    className={styles.cadreurImage}
                    style={
                      (cadreurBlock.image as any)?.focus?.x != null
                        ? { objectPosition: `${(cadreurBlock.image as any).focus.x}% ${(cadreurBlock.image as any).focus.y}%` }
                        : undefined
                    }
                  />
                ) : (
                  <div className={styles.cadreurImage} style={{ background: "rgba(0,0,0,0.06)", minHeight: 200 }} />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
  );

  const statsSection = hide("home_stats") ? null : (
      <section className={styles.stats} style={(stats as any).backgroundColor ? { backgroundColor: (stats as any).backgroundColor } : undefined}>
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
            <div className={styles.statsGrid}>
              {statItems.map((item, i) => (
                <div key={i}>
                  <div className={styles.statValue}>{item.value || "—"}</div>
                  <p className={styles.statLabel}>{item.label || ""}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
  );

  const clientsSection = hide("clients") ? null : <Clients />;

  const quoteSection = hide("home_quote") ? null : (
      <section className={styles.quote} style={(quote as any).backgroundColor ? { backgroundColor: (quote as any).backgroundColor } : undefined}>
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
            <div className={styles.quoteCarousel}>
              {visibleQuoteIndices.map((idx) => {
                const q = quoteList[idx];
                if (!q) return null;
                return (
                  <div key={idx} className={styles.quoteCard}>
                    {q.text ? <p className={styles.quoteText}>« {q.text} »</p> : null}
                    {q.author ? (() => { const Tag = q.authorStyle || "p"; return <Tag className={`${styles.quoteAuthor} style-${Tag}`}>{q.author}</Tag>; })() : null}
                    {q.role ? (() => { const Tag = q.roleStyle || "p"; return <Tag className={`${styles.quoteRole} style-${Tag}`}>{q.role}</Tag>; })() : null}
                  </div>
                );
              })}
            </div>
            <div className={styles.quoteDots} aria-hidden>
              {quoteList.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={i === safeQuoteIndex ? styles.quoteDotActive : styles.quoteDot}
                  onClick={() => setCurrentQuoteIndex(i)}
                  aria-label={`Citation ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
  );

  const ctaSection = hide("home_cta") ? null : (
      <section className={styles.cta} style={(cta as any).backgroundColor ? { backgroundColor: (cta as any).backgroundColor } : undefined}>
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
            {cta.title ? (() => { const Tag = (cta as any).titleStyle || "h2"; const fs = (cta as any).titleFontSize; return <Tag className={`${styles.ctaTitle} style-${Tag}`} style={fs != null ? { fontSize: `${fs}px` } : undefined}>{cta.title}</Tag>; })() : null}
            <Link href={cta.buttonHref || "/contact"} className={`${styles.ctaButton} btn-site-${cta.buttonStyle || "1"}`}>
              {cta.buttonLabel || "Contactez-moi"}
            </Link>
          </div>
        </div>
      </section>
  );

  const sections: Record<string, React.ReactNode> = {
    home_intro: introSection,
    home_services: servicesSection,
    home_portrait: portraitSection,
    home_cadreur: cadreurSection,
    home_stats: statsSection,
    clients: clientsSection,
    home_quote: quoteSection,
    home_cta: ctaSection,
  };

  return (
    <>
      {blockOrderHome.map((blockId) => (
        <Fragment key={blockId}>{sections[blockId] ?? null}</Fragment>
      ))}
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
