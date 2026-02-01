"use client";

import React, { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import type { AnimationSectionData, AnimationCtaData } from "./AnimationBlockModal";
import AnimationBlockModal from "./AnimationBlockModal";
import { DEFAULT_S1, DEFAULT_S2, DEFAULT_S3, DEFAULT_CTA } from "./animationDefaults";
import { useBlockVisibility, BlockVisibilityToggle, BlockWidthToggle, BlockOrderButtons } from "../BlockVisibility";
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
    labelStyle: saved.labelStyle ?? def.labelStyle,
    titleStyle: saved.titleStyle ?? def.titleStyle,
    titleFontSize: saved.titleFontSize ?? def.titleFontSize,
    html: saved.html ?? def.html,
    image: saved.image ?? def.image,
    bgColor: saved.bgColor ?? def.bgColor,
    cards: saved.cards ?? def.cards,
  };
}

function mergeCta(saved: AnimationCtaData | null, def: AnimationCtaData): AnimationCtaData {
  if (!saved) return def;
  return {
    livrablesTitle: saved.livrablesTitle ?? def.livrablesTitle,
    budgetTitle: saved.budgetTitle ?? def.budgetTitle,
    livrablesTitleStyle: saved.livrablesTitleStyle ?? def.livrablesTitleStyle,
    budgetTitleStyle: saved.budgetTitleStyle ?? def.budgetTitleStyle,
    livrablesTitleFontSize: saved.livrablesTitleFontSize ?? def.livrablesTitleFontSize,
    budgetTitleFontSize: saved.budgetTitleFontSize ?? def.budgetTitleFontSize,
    livrablesHtml: saved.livrablesHtml ?? def.livrablesHtml,
    budgetHtml: saved.budgetHtml ?? def.budgetHtml,
    buttonLabel: saved.buttonLabel ?? def.buttonLabel,
    buttonHref: saved.buttonHref ?? def.buttonHref,
    buttonStyle: saved.buttonStyle ?? def.buttonStyle,
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

  const { hiddenBlocks, blockWidthModes, blockOrderAnimation, isAdmin: isAdminCtx } = useBlockVisibility();
  const hide = (id: string) => !isAdminCtx && hiddenBlocks.includes(id);
  const blockWidthClass = (id: string) => (blockWidthModes[id] === "max1600" ? "block-width-1600" : "");
  const editButtonWrapStyle: React.CSSProperties = { position: "absolute", right: 12, top: 12, zIndex: 5, display: "flex", gap: 8, alignItems: "center" };
  const editButtonStyle: React.CSSProperties = {
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

  const s1Section = hide("animation_s1") ? null : (
      <div className={styles.section} style={sectionStyle(s1.bgColor)}>
        <div className={`container ${blockWidthClass("animation_s1")}`.trim()}>
          <div style={{ position: "relative" }}>
            {isAdmin && (
              <div style={editButtonWrapStyle}>
                <BlockVisibilityToggle blockId="animation_s1" />
                <BlockWidthToggle blockId="animation_s1" />
                <button className="btn-secondary" style={editButtonStyle} onClick={() => setEditBlock("animation_s1")}>
                  Modifier
                </button>
                <BlockOrderButtons page="animation" blockId="animation_s1" />
              </div>
            )}
            <div className={styles.grid}>
              <div className={styles.gridContent}>
                {s1.label ? (() => { const Tag = (s1 as any).labelStyle || 'p'; return <Tag className={`${styles.label} style-${Tag}`}>{s1.label}</Tag>; })() : null}
                {s1.title ? (() => { const Tag = (s1 as any).titleStyle || 'h2'; const fs = (s1 as any).titleFontSize; return <Tag className={`${styles.title} style-${Tag}`} style={fs != null && fs >= 8 && fs <= 72 ? { fontSize: `${fs}px` } : undefined}>{s1.title}</Tag>; })() : null}
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
  );
  const s2Section = hide("animation_s2") ? null : (
      <div className={`${styles.section} ${styles.sectionAlt}`} style={sectionStyle(s2.bgColor)}>
        <div className={`container ${blockWidthClass("animation_s2")}`.trim()}>
          <div style={{ position: "relative" }}>
            {isAdmin && (
              <div style={editButtonWrapStyle}>
                <BlockVisibilityToggle blockId="animation_s2" />
                <BlockWidthToggle blockId="animation_s2" />
                <button className="btn-secondary" style={editButtonStyle} onClick={() => setEditBlock("animation_s2")}>
                  Modifier
                </button>
                <BlockOrderButtons page="animation" blockId="animation_s2" />
              </div>
            )}
            <div className={`${styles.grid} ${styles.gridReverse}`}>
              <div className={styles.gridContent}>
                {s2.label ? (() => { const Tag = (s2 as any).labelStyle || 'p'; return <Tag className={`${styles.label} style-${Tag}`}>{s2.label}</Tag>; })() : null}
                {s2.title ? (() => { const Tag = (s2 as any).titleStyle || 'h2'; const fs = (s2 as any).titleFontSize; return <Tag className={`${styles.title} style-${Tag}`} style={fs != null && fs >= 8 && fs <= 72 ? { fontSize: `${fs}px` } : undefined}>{s2.title}</Tag>; })() : null}
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
  );
  const s3Section = hide("animation_s3") ? null : (
      <div className={styles.section} style={sectionStyle(s3.bgColor)}>
        <div className={`container ${blockWidthClass("animation_s3")}`.trim()}>
          <div style={{ position: "relative" }}>
            {isAdmin && (
              <div style={editButtonWrapStyle}>
                <BlockVisibilityToggle blockId="animation_s3" />
                <BlockWidthToggle blockId="animation_s3" />
                <button className="btn-secondary" style={editButtonStyle} onClick={() => setEditBlock("animation_s3")}>
                  Modifier
                </button>
                <BlockOrderButtons page="animation" blockId="animation_s3" />
              </div>
            )}
            <div className={styles.grid}>
              <div className={styles.gridContent}>
                {s3.label ? (() => { const Tag = (s3 as any).labelStyle || 'p'; return <Tag className={`${styles.label} style-${Tag}`}>{s3.label}</Tag>; })() : null}
                {s3.title ? (() => { const Tag = (s3 as any).titleStyle || 'h2'; const fs = (s3 as any).titleFontSize; return <Tag className={`${styles.title} style-${Tag}`} style={fs != null && fs >= 8 && fs <= 72 ? { fontSize: `${fs}px` } : undefined}>{s3.title}</Tag>; })() : null}
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
  );
  const ctaSection = hide("animation_cta") ? null : (
      <div className={`${styles.section} ${styles.sectionCta}`} style={sectionStyle(cta.bgColor)}>
        <div className={`container ${blockWidthClass("animation_cta")}`.trim()}>
          <div style={{ position: "relative" }}>
            {isAdmin && (
              <div style={editButtonWrapStyle}>
                <BlockVisibilityToggle blockId="animation_cta" />
                <BlockWidthToggle blockId="animation_cta" />
                <button className="btn-secondary" style={editButtonStyle} onClick={() => setEditBlock("animation_cta")}>
                  Modifier
                </button>
                <BlockOrderButtons page="animation" blockId="animation_cta" />
              </div>
            )}
            <div className={styles.ctaGrid}>
              <div className={styles.ctaBlock}>
                {(() => {
                  const tag = (cta as any).livrablesTitleStyle && ["p", "h1", "h2", "h3", "h4", "h5"].includes((cta as any).livrablesTitleStyle) ? (cta as any).livrablesTitleStyle : "h2";
                  const Tag = tag as keyof JSX.IntrinsicElements;
                  const fs = (cta as any).livrablesTitleFontSize != null && (cta as any).livrablesTitleFontSize >= 8 && (cta as any).livrablesTitleFontSize <= 72 ? (cta as any).livrablesTitleFontSize : undefined;
                  return <Tag className={`${styles.ctaTitle} style-${tag}`} style={fs != null ? { fontSize: `${fs}px` } : undefined}>{(cta as any).livrablesTitle ?? "Livrables"}</Tag>;
                })()}
                <div
                  className={styles.ctaText}
                  dangerouslySetInnerHTML={{
                    __html: cta.livrablesHtml || "<p>Un épisode final prêt à diffuser en interne.</p>",
                  }}
                />
              </div>
              <div className={styles.ctaBlock}>
                {(() => {
                  const tag = (cta as any).budgetTitleStyle && ["p", "h1", "h2", "h3", "h4", "h5"].includes((cta as any).budgetTitleStyle) ? (cta as any).budgetTitleStyle : "h2";
                  const Tag = tag as keyof JSX.IntrinsicElements;
                  const fs = (cta as any).budgetTitleFontSize != null && (cta as any).budgetTitleFontSize >= 8 && (cta as any).budgetTitleFontSize <= 72 ? (cta as any).budgetTitleFontSize : undefined;
                  return <Tag className={`${styles.ctaTitle} style-${tag}`} style={fs != null ? { fontSize: `${fs}px` } : undefined}>{(cta as any).budgetTitle ?? "Durée & budget"}</Tag>;
                })()}
                <div
                  className={styles.ctaText}
                  dangerouslySetInnerHTML={{
                    __html: cta.budgetHtml || "<p>Environ 4 jours. À partir de 2 500 € HT.</p>",
                  }}
                />
              </div>
            </div>
            <div className={styles.ctaButtonWrap}>
              <Link href={cta.buttonHref || "/contact"} className={`${styles.ctaButton} btn-site-${cta.buttonStyle || "1"}`}>
                {cta.buttonLabel || "En discuter ensemble"}
              </Link>
            </div>
          </div>
        </div>
      </div>
  );

  const sections: Record<string, React.ReactNode> = {
    animation_s1: s1Section,
    animation_s2: s2Section,
    animation_s3: s3Section,
    animation_cta: ctaSection,
  };

  return (
    <>
      {blockOrderAnimation.map((blockId) => (
        <Fragment key={blockId}>{sections[blockId] ?? null}</Fragment>
      ))}
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
