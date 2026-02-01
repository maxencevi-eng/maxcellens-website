"use client";

import React, { useEffect, useState } from "react";
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

  const [intro, setIntro] = useState<HomeIntroData>(DEFAULT_INTRO);
  const [services, setServices] = useState<HomeServicesData>(DEFAULT_SERVICES);
  const [stats, setStats] = useState<HomeStatsData>(DEFAULT_STATS);
  const [portraitBlock, setPortraitBlock] = useState<HomePortraitBlockData>(DEFAULT_PORTRAIT);
  const [cadreurBlock, setCadreurBlock] = useState<HomeCadreurBlockData>(DEFAULT_CADREUR);
  const [quote, setQuote] = useState<HomeQuoteData>(DEFAULT_QUOTE);
  const [cta, setCta] = useState<HomeCtaData>(DEFAULT_CTA);
  const [currentPortraitSlide, setCurrentPortraitSlide] = useState(0);

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

  if (!loaded) {
    return (
      <div className="container" style={{ padding: "2rem 0", textAlign: "center", color: "var(--muted)" }}>
        Chargement…
      </div>
    );
  }

  const serviceItems = services.items && services.items.length ? services.items : DEFAULT_SERVICES.items;
  const statItems = stats.items && stats.items.length ? stats.items : DEFAULT_STATS.items;

  // Portrait carousel: migrate old shape (title/html/image) to slides if needed
  const portraitSlides = (() => {
    const p = portraitBlock as any;
    if (Array.isArray(p?.slides) && p.slides.length) return p.slides;
    if (p?.title || p?.html || p?.image) {
      return [{ title: p.title ?? "Portrait", text: p.html ?? "", image: p.image ?? null }];
    }
    return DEFAULT_PORTRAIT.slides;
  })();
  const portraitIndex = Math.max(0, Math.min(currentPortraitSlide, portraitSlides.length - 1));
  const activePortraitSlide = portraitSlides[portraitIndex] || portraitSlides[0];

  return (
    <>
      {/* Bloc Intro */}
      <section className={styles.intro}>
        <div className="container">
          <div className={styles.editWrap}>
            {isAdmin && (
              <button className={styles.editBtn} onClick={() => setEditBlock("home_intro")}>
                Modifier
              </button>
            )}
            {intro.title ? <h2 className={styles.introTitle}>{intro.title}</h2> : null}
            {intro.subtitle ? <p className={styles.introSubtitle}>{intro.subtitle}</p> : null}
            {intro.html ? <div className={styles.introText} dangerouslySetInnerHTML={{ __html: intro.html }} /> : null}
          </div>
        </div>
      </section>

      {/* Bloc Services (3 cartes avec photo : Réalisation, Événement, Corporate) */}
      <section className={styles.services}>
        <div className="container">
          <div className={styles.editWrap}>
            {isAdmin && (
              <button className={styles.editBtn} onClick={() => setEditBlock("home_services")}>
                Modifier
              </button>
            )}
            <h2 className={styles.servicesTitle}>Services</h2>
            <p className={styles.servicesSubtitle}>
              Réalisation, événementiel et corporate — des prestations sur mesure.
            </p>
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
                    <div className={styles.serviceCardTitle}>{item.title || "Service"}</div>
                    <div className={styles.serviceCardDesc}>{item.description || ""}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bloc Portrait — carousel (4 slides : Lifestyle, Studio, Entreprise, Couple) */}
      <section className={styles.portraitBlock}>
        <div className="container">
          <div className={styles.editWrap}>
            {isAdmin && (
              <button className={styles.editBtn} onClick={() => setEditBlock("home_portrait")}>
                Modifier
              </button>
            )}
            {((portraitBlock as any).blockTitle ?? (portraitBlock as any).title) ? <h2 className={styles.portraitBlockTitle}>{(portraitBlock as any).blockTitle ?? (portraitBlock as any).title ?? "Portrait"}</h2> : null}
            <div className={styles.portraitCarousel}>
              <div className={styles.portraitCarouselImage}>
                {activePortraitSlide?.image?.url ? (
                  <img src={activePortraitSlide.image.url} alt="" className={styles.portraitImageTorn} />
                ) : (
                  <div className={styles.portraitImageTorn} style={{ background: "rgba(0,0,0,0.08)" }} />
                )}
              </div>
              <div className={styles.portraitCarouselContent}>
                {activePortraitSlide?.title ? <h3 className={styles.portraitSlideTitle}>{activePortraitSlide.title}</h3> : null}
                {activePortraitSlide?.text ? <div className={styles.portraitSlideText} dangerouslySetInnerHTML={{ __html: activePortraitSlide.text }} /> : null}
                <Link href={(portraitBlock as any).ctaHref || "/portrait"} className={styles.portraitCta}>
                  {(portraitBlock as any).ctaLabel || "Découvrir le portrait"}
                </Link>
                <div className={styles.portraitNav}>
                  <div className={styles.portraitDots} aria-hidden>
                    {portraitSlides.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={i === portraitIndex ? styles.portraitDotActive : styles.portraitDot}
                        onClick={() => setCurrentPortraitSlide(i)}
                        aria-label={`Slide ${i + 1}`}
                      />
                    ))}
                  </div>
                  <div className={styles.portraitArrows}>
                    <button
                      type="button"
                      className={styles.portraitArrow}
                      onClick={() => setCurrentPortraitSlide((prev) => (prev <= 0 ? portraitSlides.length - 1 : prev - 1))}
                      aria-label="Précédent"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className={styles.portraitArrow}
                      onClick={() => setCurrentPortraitSlide((prev) => (prev >= portraitSlides.length - 1 ? 0 : prev + 1))}
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
      </section>

      {/* Bloc Cadreur */}
      <section className={styles.cadreurBlock}>
        <div className="container">
          <div className={styles.editWrap}>
            {isAdmin && (
              <button className={styles.editBtn} onClick={() => setEditBlock("home_cadreur")}>
                Modifier
              </button>
            )}
            <div className={styles.cadreurGrid}>
              <div className={styles.cadreurContent}>
                {cadreurBlock.title ? <h2 className={styles.cadreurTitle}>{cadreurBlock.title}</h2> : null}
                {cadreurBlock.html ? <div className={styles.cadreurText} dangerouslySetInnerHTML={{ __html: cadreurBlock.html }} /> : null}
              </div>
              <div className={styles.cadreurMedia}>
                {cadreurBlock.image?.url ? (
                  <img src={cadreurBlock.image.url} alt="" className={styles.cadreurImage} />
                ) : (
                  <div className={styles.cadreurImage} style={{ background: "rgba(0,0,0,0.06)", minHeight: 200 }} />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bloc Chiffres */}
      <section className={styles.stats}>
        <div className="container">
          <div className={styles.editWrap}>
            {isAdmin && (
              <button className={styles.editBtn} style={{ background: "#fff", color: "#111" }} onClick={() => setEditBlock("home_stats")}>
                Modifier
              </button>
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

      {/* Logos clients (déjà validé) */}
      <Clients />

      {/* Citation / Témoignage */}
      <section className={styles.quote}>
        <div className="container">
          <div className={styles.editWrap}>
            {isAdmin && (
              <button className={styles.editBtn} onClick={() => setEditBlock("home_quote")}>
                Modifier
              </button>
            )}
            <div className={styles.quoteInner}>
              {quote.text ? <p className={styles.quoteText}>« {quote.text} »</p> : null}
              {quote.author ? <p className={styles.quoteAuthor}>{quote.author}</p> : null}
              {quote.role ? <p className={styles.quoteRole}>{quote.role}</p> : null}
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className={styles.cta}>
        <div className="container">
          <div className={styles.editWrap}>
            {isAdmin && (
              <button className={styles.editBtn} style={{ background: "#fff", color: "#111" }} onClick={() => setEditBlock("home_cta")}>
                Modifier
              </button>
            )}
            {cta.title ? <h2 className={styles.ctaTitle}>{cta.title}</h2> : null}
            <Link href={cta.buttonHref || "/contact"} className={styles.ctaButton}>
              {cta.buttonLabel || "Contactez-moi"}
            </Link>
          </div>
        </div>
      </section>

      {/* Modal d'édition */}
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
