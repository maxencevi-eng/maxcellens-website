"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import PhotoMasonry from "../PhotoMasonry/PhotoMasonry";
import VideoGallery from "../VideoGallery/VideoGallery";
import Clients from "../Clients/Clients";
import HomeBlockModal from "./HomeBlockModal";
import type {
  HomeIntroData,
  HomeServicesData,
  HomeStatsData,
  HomeSectionData,
  HomeQuoteData,
  HomeCtaData,
} from "./homeDefaults";
import {
  DEFAULT_INTRO,
  DEFAULT_SERVICES,
  DEFAULT_STATS,
  DEFAULT_PROJECTS_SECTION,
  DEFAULT_VIDEOS_SECTION,
  DEFAULT_QUOTE,
  DEFAULT_CTA,
} from "./homeDefaults";
import type { HomeBlockKey } from "./HomeBlockModal";
import type { Project } from "../../types";
import styles from "./HomeBlocks.module.css";

const SETTINGS_KEYS =
  "home_intro,home_services,home_stats,home_projects_section,home_videos_section,home_quote,home_cta";

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

type Props = { projects: Project[] };

export default function HomePageClient({ projects }: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editBlock, setEditBlock] = useState<HomeBlockKey | null>(null);

  const [intro, setIntro] = useState<HomeIntroData>(DEFAULT_INTRO);
  const [services, setServices] = useState<HomeServicesData>(DEFAULT_SERVICES);
  const [stats, setStats] = useState<HomeStatsData>(DEFAULT_STATS);
  const [projectsSection, setProjectsSection] = useState<HomeSectionData>(DEFAULT_PROJECTS_SECTION);
  const [videosSection, setVideosSection] = useState<HomeSectionData>(DEFAULT_VIDEOS_SECTION);
  const [quote, setQuote] = useState<HomeQuoteData>(DEFAULT_QUOTE);
  const [cta, setCta] = useState<HomeCtaData>(DEFAULT_CTA);

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
        setProjectsSection(parse(s.home_projects_section, DEFAULT_PROJECTS_SECTION));
        setVideosSection(parse(s.home_videos_section, DEFAULT_VIDEOS_SECTION));
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

  type BlockData = HomeIntroData | HomeServicesData | HomeStatsData | HomeSectionData | HomeQuoteData | HomeCtaData;

  const getBlockData = (key: HomeBlockKey): BlockData => {
    switch (key) {
      case "home_intro": return intro;
      case "home_services": return services;
      case "home_stats": return stats;
      case "home_projects_section": return projectsSection;
      case "home_videos_section": return videosSection;
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

      {/* Bloc Services (4 cartes) */}
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
              Portrait, événementiel, corporate et réalisation — des prestations sur mesure.
            </p>
            <div className={styles.servicesGrid}>
              {serviceItems.map((item, i) => (
                <Link key={i} href={item.href || "#"} className={styles.serviceCard}>
                  <span className={styles.serviceCardTitle}>{item.title || "Service"}</span>
                  <span className={styles.serviceCardDesc}>{item.description || ""}</span>
                </Link>
              ))}
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

      {/* Section Projets (éditable titre + description + masonry) */}
      <section className={styles.sectionBlock}>
        <div className="container">
          <div className={styles.editWrap}>
            {isAdmin && (
              <button className={styles.editBtn} onClick={() => setEditBlock("home_projects_section")}>
                Modifier
              </button>
            )}
            <h2 className={styles.sectionBlockTitle}>{projectsSection.title || "Sélection de projets"}</h2>
            <p className={styles.sectionBlockDesc}>{projectsSection.description || ""}</p>
          </div>
          {projects.length === 0 ? (
            <p style={{ color: "var(--muted)", textAlign: "center" }}>
              Pas encore de projets — connectez Supabase et importez des entrées dans la table <code>projects</code>.
            </p>
          ) : (
            // @ts-ignore server -> client
            <PhotoMasonry items={projects} />
          )}
        </div>
      </section>

      {/* Section Réalisations vidéo (fond sombre, éditable) */}
      <section className={styles.sectionBlockAlt}>
        <div className="container" style={{ textAlign: "center", padding: "0 0 2rem" }}>
          <div className={styles.editWrap}>
            {isAdmin && (
              <button className={styles.editBtn} style={{ background: "#fff", color: "#111" }} onClick={() => setEditBlock("home_videos_section")}>
                Modifier
              </button>
            )}
            <h2 className={styles.sectionBlockTitle}>{videosSection.title || "Nos Réalisations"}</h2>
            <p className={styles.sectionBlockDesc}>{videosSection.description || ""}</p>
          </div>
        </div>
        <div className="container">
          <VideoGallery />
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
