"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import type { AnimationSectionData, AnimationCtaData } from "./AnimationBlockModal";
import AnimationBlockModal from "./AnimationBlockModal";
import { DEFAULT_S1, DEFAULT_S2, DEFAULT_S3, DEFAULT_CTA } from "./animationDefaults";
import styles from "../../app/animation/animation.module.css";

const SETTINGS_KEYS = "animation_s1,animation_s2,animation_s3,animation_cta";

function parseSection(val: string | undefined): AnimationSectionData | null {
  if (!val) return null;
  try {
    return JSON.parse(val) as AnimationSectionData;
  } catch {
    return null;
  }
}

function parseCta(val: string | undefined): AnimationCtaData | null {
  if (!val) return null;
  try {
    return JSON.parse(val) as AnimationCtaData;
  } catch {
    return null;
  }
}

function mergeSection(
  saved: AnimationSectionData | null,
  def: AnimationSectionData
): AnimationSectionData {
  if (!saved) return def;
  return {
    label: saved.label ?? def.label,
    title: saved.title ?? def.title,
    html: saved.html ?? def.html,
    image: saved.image ?? def.image,
    bgColor: saved.bgColor ?? def.bgColor,
    cards: saved.cards ?? def.cards,
  };
}

function mergeCta(saved: AnimationCtaData | null, def: AnimationCtaData): AnimationCtaData {
  if (!saved) return def;
  return {
    livrablesHtml: saved.livrablesHtml ?? def.livrablesHtml,
    budgetHtml: saved.budgetHtml ?? def.budgetHtml,
    buttonLabel: saved.buttonLabel ?? def.buttonLabel,
    buttonHref: saved.buttonHref ?? def.buttonHref,
    bgColor: saved.bgColor ?? def.bgColor,
  };
}

type BlockKey = "animation_s1" | "animation_s2" | "animation_s3" | "animation_cta";

export default function AnimationPageClient() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [s1, setS1] = useState<AnimationSectionData>(DEFAULT_S1);
  const [s2, setS2] = useState<AnimationSectionData>(DEFAULT_S2);
  const [s3, setS3] = useState<AnimationSectionData>(DEFAULT_S3);
  const [cta, setCta] = useState<AnimationCtaData>(DEFAULT_CTA);
  const [editBlock, setEditBlock] = useState<BlockKey | null>(null);
  const [loaded, setLoaded] = useState(false);

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
        setS1(mergeSection(parseSection(s.animation_s1), DEFAULT_S1));
        setS2(mergeSection(parseSection(s.animation_s2), DEFAULT_S2));
        setS3(mergeSection(parseSection(s.animation_s3), DEFAULT_S3));
        setCta(mergeCta(parseCta(s.animation_cta), DEFAULT_CTA));
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

  const editButtonStyle: React.CSSProperties = {
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 5,
    background: "#111",
    color: "#fff",
    border: "none",
    padding: "8px 12px",
    borderRadius: 6,
    boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
    cursor: "pointer",
  };

  const sectionStyle = (bg: string | undefined) =>
    bg ? { backgroundColor: bg } : undefined;

  if (!loaded) {
    return (
      <div className="container" style={{ padding: "2rem 0", textAlign: "center", color: "var(--muted)" }}>
        Chargement…
      </div>
    );
  }

  return (
    <>
      {/* Section 1 — Le concept */}
      <div className={styles.section} style={sectionStyle(s1.bgColor)}>
        <div className="container">
          <div style={{ position: "relative" }}>
            {isAdmin && (
              <button
                className="btn-secondary"
                style={editButtonStyle}
                onClick={() => setEditBlock("animation_s1")}
              >
                Modifier
              </button>
            )}
            <div className={styles.grid}>
              <div className={styles.gridContent}>
                {s1.label ? <span className={styles.label}>{s1.label}</span> : null}
                {s1.title ? <h2 className={styles.title}>{s1.title}</h2> : null}
                {s1.html ? (
                  <div className={styles.text} dangerouslySetInnerHTML={{ __html: s1.html }} />
                ) : null}
              </div>
              <div className={styles.gridMedia}>
                {s1.image?.url ? (
                  <img src={s1.image.url} alt="" className={styles.image} />
                ) : (
                  <div className={styles.image} style={{ background: "var(--muted)", opacity: 0.2, minHeight: 200 }} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2 — Pour qui */}
      <div className={`${styles.section} ${styles.sectionAlt}`} style={sectionStyle(s2.bgColor)}>
        <div className="container">
          <div style={{ position: "relative" }}>
            {isAdmin && (
              <button
                className="btn-secondary"
                style={editButtonStyle}
                onClick={() => setEditBlock("animation_s2")}
              >
                Modifier
              </button>
            )}
            <div className={`${styles.grid} ${styles.gridReverse}`}>
              <div className={styles.gridContent}>
                {s2.label ? <span className={styles.label}>{s2.label}</span> : null}
                {s2.title ? <h2 className={styles.title}>{s2.title}</h2> : null}
                {s2.html ? (
                  <div className={styles.text} dangerouslySetInnerHTML={{ __html: s2.html }} />
                ) : null}
              </div>
              <div className={styles.gridMedia}>
                {s2.image?.url ? (
                  <img src={s2.image.url} alt="" className={styles.image} />
                ) : (
                  <div className={styles.image} style={{ background: "var(--muted)", opacity: 0.2, minHeight: 200 }} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3 — Déroulé */}
      <div className={styles.section} style={sectionStyle(s3.bgColor)}>
        <div className="container">
          <div style={{ position: "relative" }}>
            {isAdmin && (
              <button
                className="btn-secondary"
                style={editButtonStyle}
                onClick={() => setEditBlock("animation_s3")}
              >
                Modifier
              </button>
            )}
            <div className={styles.grid}>
              <div className={styles.gridContent}>
                {s3.label ? <span className={styles.label}>{s3.label}</span> : null}
                {s3.title ? <h2 className={styles.title}>{s3.title}</h2> : null}
                {s3.html ? (
                  <div className={styles.text} dangerouslySetInnerHTML={{ __html: s3.html }} />
                ) : null}
                {s3.cards && s3.cards.length > 0 ? (
                  <div className={styles.cards}>
                    {s3.cards.map((card, i) => (
                      <div key={i} className={styles.card}>
                        <span className={styles.cardTitle}>{card.title}</span>
                        <span className={styles.cardDesc}>{card.desc}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className={styles.gridMedia}>
                {s3.image?.url ? (
                  <img src={s3.image.url} alt="" className={styles.image} />
                ) : (
                  <div className={styles.image} style={{ background: "var(--muted)", opacity: 0.2, minHeight: 200 }} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4 — CTA */}
      <div className={`${styles.section} ${styles.sectionCta}`} style={sectionStyle(cta.bgColor)}>
        <div className="container">
          <div style={{ position: "relative" }}>
            {isAdmin && (
              <button
                className="btn-secondary"
                style={editButtonStyle}
                onClick={() => setEditBlock("animation_cta")}
              >
                Modifier
              </button>
            )}
            <div className={styles.ctaGrid}>
              <div className={styles.ctaBlock}>
                <h2 className={styles.ctaTitle}>Livrables</h2>
                <div
                  className={styles.ctaText}
                  dangerouslySetInnerHTML={{
                    __html: cta.livrablesHtml || "<p>Un épisode final prêt à diffuser en interne.</p>",
                  }}
                />
              </div>
              <div className={styles.ctaBlock}>
                <h2 className={styles.ctaTitle}>Durée & budget</h2>
                <div
                  className={styles.ctaText}
                  dangerouslySetInnerHTML={{
                    __html: cta.budgetHtml || "<p>Environ 4 jours. À partir de 2 500 € HT.</p>",
                  }}
                />
              </div>
            </div>
            <div className={styles.ctaButtonWrap}>
              <Link href={cta.buttonHref || "/contact"} className={styles.ctaButton}>
                {cta.buttonLabel || "En discuter ensemble"}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {editBlock && (
        <AnimationBlockModal
          blockKey={editBlock}
          initialData={
            editBlock === "animation_cta"
              ? cta
              : editBlock === "animation_s1"
                ? s1
                : editBlock === "animation_s2"
                  ? s2
                  : s3
          }
          onClose={() => setEditBlock(null)}
          onSaved={() => {
            setEditBlock(null);
            // Reload will happen via site-settings-updated
            const keys = SETTINGS_KEYS.split(",");
            fetch(`/api/admin/site-settings?keys=${keys.map((k) => encodeURIComponent(k.trim())).join(",")}`)
              .then((r) => r.json())
              .then((json) => {
                const s = json?.settings || {};
                setS1(mergeSection(parseSection(s.animation_s1), DEFAULT_S1));
                setS2(mergeSection(parseSection(s.animation_s2), DEFAULT_S2));
                setS3(mergeSection(parseSection(s.animation_s3), DEFAULT_S3));
                setCta(mergeCta(parseCta(s.animation_cta), DEFAULT_CTA));
              })
              .catch(() => {});
          }}
        />
      )}
    </>
  );
}
