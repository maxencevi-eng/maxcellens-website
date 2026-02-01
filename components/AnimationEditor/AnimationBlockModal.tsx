"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
const RichTextModal = dynamic(() => import("../RichTextModal/RichTextModal"), { ssr: false });

export type TitleStyleKey = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

const TITLE_STYLE_OPTIONS: { value: TitleStyleKey; label: string }[] = [
  { value: 'p', label: 'Paragraphe' },
  { value: 'h1', label: 'Titre 1' },
  { value: 'h2', label: 'Titre 2' },
  { value: 'h3', label: 'Titre 3' },
  { value: 'h4', label: 'Titre 4' },
  { value: 'h5', label: 'Titre 5' },
];

const TITLE_FONT_SIZE_MIN = 8;
const TITLE_FONT_SIZE_MAX = 72;
function clampTitleFontSize(n: number): number {
  return Math.min(TITLE_FONT_SIZE_MAX, Math.max(TITLE_FONT_SIZE_MIN, n));
}

export type AnimationSectionData = {
  label?: string;
  title?: string;
  labelStyle?: TitleStyleKey;
  titleStyle?: TitleStyleKey;
  titleFontSize?: number;
  html?: string;
  image?: { url: string; path?: string } | null;
  bgColor?: string;
  cards?: { title: string; desc: string }[];
};

export type AnimationCtaData = {
  livrablesTitle?: string;
  budgetTitle?: string;
  livrablesTitleStyle?: TitleStyleKey;
  budgetTitleStyle?: TitleStyleKey;
  livrablesTitleFontSize?: number;
  budgetTitleFontSize?: number;
  livrablesHtml?: string;
  budgetHtml?: string;
  buttonLabel?: string;
  buttonHref?: string;
  buttonStyle?: '1' | '2';
  bgColor?: string;
};

type BlockKey = "animation_s1" | "animation_s2" | "animation_s3" | "animation_cta";

type Props = {
  blockKey: BlockKey;
  initialData: AnimationSectionData | AnimationCtaData;
  onClose: () => void;
  onSaved: () => void;
};

const UPLOAD_FOLDER: Record<string, string> = {
  animation_s1: "animation/block-1",
  animation_s2: "animation/block-2",
  animation_s3: "animation/block-3",
};

export default function AnimationBlockModal({ blockKey, initialData, onClose, onSaved }: Props) {
  const isCta = blockKey === "animation_cta";
  const ctaData = initialData as AnimationCtaData;
  const sectionData = initialData as AnimationSectionData;

  const [label, setLabel] = useState(sectionData.label ?? "");
  const [title, setTitle] = useState(sectionData.title ?? "");
  const [labelStyle, setLabelStyle] = useState<TitleStyleKey>(sectionData.labelStyle === 'h1' || sectionData.labelStyle === 'h2' || sectionData.labelStyle === 'h3' || sectionData.labelStyle === 'h4' || sectionData.labelStyle === 'h5' || sectionData.labelStyle === 'p' ? sectionData.labelStyle : 'p');
  const [titleStyle, setTitleStyle] = useState<TitleStyleKey>(sectionData.titleStyle === 'h1' || sectionData.titleStyle === 'h2' || sectionData.titleStyle === 'h3' || sectionData.titleStyle === 'h4' || sectionData.titleStyle === 'h5' || sectionData.titleStyle === 'p' ? sectionData.titleStyle : 'h2');
  const [titleFontSize, setTitleFontSize] = useState<number | "">(sectionData.titleFontSize != null && sectionData.titleFontSize >= TITLE_FONT_SIZE_MIN && sectionData.titleFontSize <= TITLE_FONT_SIZE_MAX ? sectionData.titleFontSize : "");
  const [html, setHtml] = useState(sectionData.html ?? "");
  const [image, setImage] = useState<{ url: string; path?: string } | null>(sectionData.image ?? null);
  const [originalImagePath, setOriginalImagePath] = useState<string | null>(
    sectionData.image?.path ?? null
  );
  const [bgColor, setBgColor] = useState(sectionData.bgColor ?? ctaData.bgColor ?? "");
  const [cards, setCards] = useState<{ title: string; desc: string }[]>(
    sectionData.cards ?? [
      { title: "Préparation", desc: "Synopsis, pré-script, validation client" },
      { title: "Tournage", desc: "Une demi-journée avec rôles et équipe technique dédiée" },
      { title: "Post-production", desc: "Montage style série, générique, sound design" },
    ]
  );
  const [livrablesTitle, setLivrablesTitle] = useState(ctaData.livrablesTitle ?? "Livrables");
  const [budgetTitle, setBudgetTitle] = useState(ctaData.budgetTitle ?? "Durée & budget");
  const [livrablesTitleStyle, setLivrablesTitleStyle] = useState<TitleStyleKey>(ctaData.livrablesTitleStyle === 'h1' || ctaData.livrablesTitleStyle === 'h2' || ctaData.livrablesTitleStyle === 'h3' || ctaData.livrablesTitleStyle === 'h4' || ctaData.livrablesTitleStyle === 'h5' || ctaData.livrablesTitleStyle === 'p' ? ctaData.livrablesTitleStyle : 'h2');
  const [budgetTitleStyle, setBudgetTitleStyle] = useState<TitleStyleKey>(ctaData.budgetTitleStyle === 'h1' || ctaData.budgetTitleStyle === 'h2' || ctaData.budgetTitleStyle === 'h3' || ctaData.budgetTitleStyle === 'h4' || ctaData.budgetTitleStyle === 'h5' || ctaData.budgetTitleStyle === 'p' ? ctaData.budgetTitleStyle : 'h2');
  const [livrablesTitleFontSize, setLivrablesTitleFontSize] = useState<number | "">(ctaData.livrablesTitleFontSize != null && ctaData.livrablesTitleFontSize >= TITLE_FONT_SIZE_MIN && ctaData.livrablesTitleFontSize <= TITLE_FONT_SIZE_MAX ? ctaData.livrablesTitleFontSize : "");
  const [budgetTitleFontSize, setBudgetTitleFontSize] = useState<number | "">(ctaData.budgetTitleFontSize != null && ctaData.budgetTitleFontSize >= TITLE_FONT_SIZE_MIN && ctaData.budgetTitleFontSize <= TITLE_FONT_SIZE_MAX ? ctaData.budgetTitleFontSize : "");
  const [livrablesHtml, setLivrablesHtml] = useState(ctaData.livrablesHtml ?? "");
  const [budgetHtml, setBudgetHtml] = useState(ctaData.budgetHtml ?? "");
  const [buttonLabel, setButtonLabel] = useState(ctaData.buttonLabel ?? "En discuter ensemble");
  const [buttonHref, setButtonHref] = useState(ctaData.buttonHref ?? "/contact");
  const [buttonStyle, setButtonStyle] = useState<'1' | '2'>(ctaData.buttonStyle === '2' ? '2' : '1');

  const [editingHtml, setEditingHtml] = useState(false);
  const [editingLivrables, setEditingLivrables] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLabel(sectionData.label ?? "");
    setTitle(sectionData.title ?? "");
    setLabelStyle(sectionData.labelStyle === 'h1' || sectionData.labelStyle === 'h2' || sectionData.labelStyle === 'h3' || sectionData.labelStyle === 'h4' || sectionData.labelStyle === 'h5' || sectionData.labelStyle === 'p' ? sectionData.labelStyle : 'p');
    setTitleStyle(sectionData.titleStyle === 'h1' || sectionData.titleStyle === 'h2' || sectionData.titleStyle === 'h3' || sectionData.titleStyle === 'h4' || sectionData.titleStyle === 'h5' || sectionData.titleStyle === 'p' ? sectionData.titleStyle : 'h2');
    setTitleFontSize(sectionData.titleFontSize != null && sectionData.titleFontSize >= TITLE_FONT_SIZE_MIN && sectionData.titleFontSize <= TITLE_FONT_SIZE_MAX ? sectionData.titleFontSize : "");
    setHtml(sectionData.html ?? "");
    setImage(sectionData.image ?? null);
    setOriginalImagePath(sectionData.image?.path ?? null);
    setBgColor((sectionData.bgColor ?? ctaData.bgColor) ?? "");
    if (sectionData.cards?.length) setCards(sectionData.cards);
    setLivrablesTitle(ctaData.livrablesTitle ?? "Livrables");
    setBudgetTitle(ctaData.budgetTitle ?? "Durée & budget");
    setLivrablesTitleStyle(ctaData.livrablesTitleStyle === 'h1' || ctaData.livrablesTitleStyle === 'h2' || ctaData.livrablesTitleStyle === 'h3' || ctaData.livrablesTitleStyle === 'h4' || ctaData.livrablesTitleStyle === 'h5' || ctaData.livrablesTitleStyle === 'p' ? ctaData.livrablesTitleStyle : 'h2');
    setBudgetTitleStyle(ctaData.budgetTitleStyle === 'h1' || ctaData.budgetTitleStyle === 'h2' || ctaData.budgetTitleStyle === 'h3' || ctaData.budgetTitleStyle === 'h4' || ctaData.budgetTitleStyle === 'h5' || ctaData.budgetTitleStyle === 'p' ? ctaData.budgetTitleStyle : 'h2');
    setLivrablesTitleFontSize(ctaData.livrablesTitleFontSize != null && ctaData.livrablesTitleFontSize >= TITLE_FONT_SIZE_MIN && ctaData.livrablesTitleFontSize <= TITLE_FONT_SIZE_MAX ? ctaData.livrablesTitleFontSize : "");
    setBudgetTitleFontSize(ctaData.budgetTitleFontSize != null && ctaData.budgetTitleFontSize >= TITLE_FONT_SIZE_MIN && ctaData.budgetTitleFontSize <= TITLE_FONT_SIZE_MAX ? ctaData.budgetTitleFontSize : "");
    setLivrablesHtml(ctaData.livrablesHtml ?? "");
    setBudgetHtml(ctaData.budgetHtml ?? "");
    setButtonLabel(ctaData.buttonLabel ?? "En discuter ensemble");
    setButtonHref(ctaData.buttonHref ?? "/contact");
    setButtonStyle(ctaData.buttonStyle === '2' ? '2' : '1');
  }, [blockKey, initialData]);

  async function handleFileSelect(file: File | null) {
    if (!file || isCta) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("page", "animation");
      fd.append("kind", "image");
      fd.append("folder", UPLOAD_FOLDER[blockKey] ?? "animation/block-1");
      const currentPath = image?.path ?? originalImagePath;
      if (currentPath) fd.append("old_path", currentPath);
      const resp = await fetch("/api/admin/upload-hero-media", { method: "POST", body: fd });
      const j = await resp.json();
      if (!resp.ok) throw new Error(j?.error ?? "Erreur d'upload");
      if (j?.url) {
        setImage({ url: j.url, path: j.path ?? undefined });
        setOriginalImagePath(j.path ?? null);
      } else throw new Error("Upload: pas d'URL retournée");
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
    } finally {
      setUploading(false);
    }
  }

  async function removeImage() {
    if (!image?.path) {
      setImage(null);
      setOriginalImagePath(null);
      return;
    }
    setError(null);
    try {
      const resp = await fetch("/api/admin/delete-hero-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: "animation", paths: [image.path] }),
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(j?.error ?? `Erreur suppression (${resp.status})`);
      setImage(null);
      setOriginalImagePath(null);
    } catch (err: any) {
      setError(err?.message ?? "Erreur suppression");
    }
  }

  async function saveAll() {
    setSaving(true);
    setError(null);
    try {
      let value: string;
      if (isCta) {
        value = JSON.stringify({
          livrablesTitle: livrablesTitle ?? "",
          budgetTitle: budgetTitle ?? "",
          livrablesTitleStyle,
          budgetTitleStyle,
          livrablesTitleFontSize: livrablesTitleFontSize !== "" ? clampTitleFontSize(livrablesTitleFontSize as number) : undefined,
          budgetTitleFontSize: budgetTitleFontSize !== "" ? clampTitleFontSize(budgetTitleFontSize as number) : undefined,
          livrablesHtml,
          budgetHtml,
          buttonLabel,
          buttonHref,
          buttonStyle,
          bgColor: bgColor || undefined,
        });
      } else {
        const payload: AnimationSectionData = {
          label: label ?? "",
          title: title ?? "",
          labelStyle: labelStyle,
          titleStyle: titleStyle,
          titleFontSize: titleFontSize !== "" ? clampTitleFontSize(titleFontSize as number) : undefined,
          html: html || undefined,
          image: image || undefined,
          bgColor: bgColor || undefined,
        };
        if (blockKey === "animation_s3") payload.cards = cards;
        value = JSON.stringify(payload);
      }

      const resp = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: blockKey, value }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j?.error ?? "Erreur sauvegarde");
      }

      try {
        window.dispatchEvent(new CustomEvent("site-settings-updated", { detail: { key: blockKey, value } }));
      } catch (_) {}
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const blockTitles: Record<BlockKey, string> = {
    animation_s1: "Bloc 1 — Le concept",
    animation_s2: "Bloc 2 — Pour qui",
    animation_s3: "Bloc 3 — Déroulé",
    animation_cta: "Bloc CTA — Livrables & bouton",
  };

  return (
    <div
      className="modal-overlay-mobile"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#fff",
          color: "#000",
          padding: 20,
          width: 720,
          maxWidth: "98%",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: 10,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>{blockTitles[blockKey]}</h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
          {!isCta && (
            <>
              <div>
                <label style={{ fontSize: 13, color: "var(--muted)" }}>Label (petit titre)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid #e6e6e6" }}
                    placeholder="ex: Le concept"
                  />
                  <select value={labelStyle} onChange={(e) => setLabelStyle(e.target.value as TitleStyleKey)} style={{ width: 120, padding: "8px 10px", borderRadius: 6, border: "1px solid #e6e6e6" }}>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--muted)" }}>Titre</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{ flex: 1, minWidth: 160, padding: "8px 10px", borderRadius: 6, border: "1px solid #e6e6e6" }}
                    placeholder="ex: Votre entreprise en série"
                  />
                  <select value={titleStyle} onChange={(e) => setTitleStyle(e.target.value as TitleStyleKey)} style={{ width: 120, padding: "8px 10px", borderRadius: 6, border: "1px solid #e6e6e6" }}>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={titleFontSize === "" ? "" : titleFontSize} onChange={(e) => setTitleFontSize(e.target.value === "" ? "" : clampTitleFontSize(Number(e.target.value)))} placeholder="px" style={{ width: 64, padding: "8px 10px", borderRadius: 6, border: "1px solid #e6e6e6" }} title="Taille titre (8–72 px)" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--muted)" }}>Texte (contenu)</label>
                <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div
                    style={{
                      flex: 1,
                      minHeight: 60,
                      border: "1px solid #e6e6e6",
                      borderRadius: 6,
                      padding: 10,
                      background: "#fff",
                    }}
                    dangerouslySetInnerHTML={{ __html: html || "<p style='color:#999'>Aucun</p>" }}
                  />
                  <button className="btn-ghost" onClick={() => setEditingHtml(true)}>
                    Éditer
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--muted)" }}>Image</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                      e.target.value = "";
                    }}
                  />
                  {uploading ? (
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>Téléchargement…</span>
                  ) : null}
                  {image?.url ? (
                    <>
                      <img
                        src={image.url}
                        alt="Aperçu"
                        style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 6 }}
                      />
                      <button type="button" className="btn-secondary" onClick={removeImage}>
                        Supprimer
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                      >
                        Remplacer
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              {blockKey === "animation_s3" && (
                <div>
                  <label style={{ fontSize: 13, color: "var(--muted)" }}>Cartes (titre / description)</label>
                  {cards.map((card, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginTop: 6, alignItems: "center" }}>
                      <input
                        type="text"
                        value={card.title}
                        onChange={(e) => {
                          const next = [...cards];
                          next[i] = { ...next[i], title: e.target.value };
                          setCards(next);
                        }}
                        placeholder="Titre"
                        style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #e6e6e6" }}
                      />
                      <input
                        type="text"
                        value={card.desc}
                        onChange={(e) => {
                          const next = [...cards];
                          next[i] = { ...next[i], desc: e.target.value };
                          setCards(next);
                        }}
                        placeholder="Description"
                        style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #e6e6e6" }}
                      />
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ fontSize: 12 }}
                        onClick={() => setCards((c) => c.filter((_, j) => j !== i))}
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ marginTop: 8, fontSize: 13 }}
                    onClick={() => setCards((c) => [...c, { title: "", desc: "" }])}
                  >
                    + Ajouter une carte
                  </button>
                </div>
              )}
            </>
          )}

          {isCta && (
            <>
              <div>
                <label style={{ fontSize: 13, color: "var(--muted)" }}>Titre Livrables</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                  <input
                    type="text"
                    value={livrablesTitle}
                    onChange={(e) => setLivrablesTitle(e.target.value)}
                    style={{ flex: 1, minWidth: 120, padding: "8px 10px", borderRadius: 6, border: "1px solid #e6e6e6" }}
                    placeholder="ex: Livrables"
                  />
                  <select value={livrablesTitleStyle} onChange={(e) => setLivrablesTitleStyle(e.target.value as TitleStyleKey)} style={{ width: 120, padding: "8px 10px", borderRadius: 6, border: "1px solid #e6e6e6" }}>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={livrablesTitleFontSize === "" ? "" : livrablesTitleFontSize} onChange={(e) => setLivrablesTitleFontSize(e.target.value === "" ? "" : clampTitleFontSize(Number(e.target.value)))} placeholder="px" style={{ width: 64, padding: "8px 10px", borderRadius: 6, border: "1px solid #e6e6e6" }} title="Taille titre (8–72 px)" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--muted)" }}>Titre Durée & budget</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                  <input
                    type="text"
                    value={budgetTitle}
                    onChange={(e) => setBudgetTitle(e.target.value)}
                    style={{ flex: 1, minWidth: 120, padding: "8px 10px", borderRadius: 6, border: "1px solid #e6e6e6" }}
                    placeholder="ex: Durée & budget"
                  />
                  <select value={budgetTitleStyle} onChange={(e) => setBudgetTitleStyle(e.target.value as TitleStyleKey)} style={{ width: 120, padding: "8px 10px", borderRadius: 6, border: "1px solid #e6e6e6" }}>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={budgetTitleFontSize === "" ? "" : budgetTitleFontSize} onChange={(e) => setBudgetTitleFontSize(e.target.value === "" ? "" : clampTitleFontSize(Number(e.target.value)))} placeholder="px" style={{ width: 64, padding: "8px 10px", borderRadius: 6, border: "1px solid #e6e6e6" }} title="Taille titre (8–72 px)" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--muted)" }}>Texte Livrables</label>
                <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div
                    style={{ flex: 1, minHeight: 44, border: "1px solid #e6e6e6", borderRadius: 6, padding: 10 }}
                    dangerouslySetInnerHTML={{ __html: livrablesHtml || "<p style='color:#999'>Aucun</p>" }}
                  />
                  <button className="btn-ghost" onClick={() => setEditingLivrables(true)}>
                    Éditer
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: "var(--muted)" }}>Texte Durée & budget</label>
                <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div
                    style={{ flex: 1, minHeight: 44, border: "1px solid #e6e6e6", borderRadius: 6, padding: 10 }}
                    dangerouslySetInnerHTML={{ __html: budgetHtml || "<p style='color:#999'>Aucun</p>" }}
                  />
                  <button className="btn-ghost" onClick={() => setEditingBudget(true)}>
                    Éditer
                  </button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: "var(--muted)" }}>Libellé du bouton</label>
                  <input
                    type="text"
                    value={buttonLabel}
                    onChange={(e) => setButtonLabel(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", marginTop: 4, borderRadius: 6, border: "1px solid #e6e6e6" }}
                    placeholder="En discuter ensemble"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "var(--muted)" }}>Lien du bouton</label>
                  <input
                    type="text"
                    value={buttonHref}
                    onChange={(e) => setButtonHref(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", marginTop: 4, borderRadius: 6, border: "1px solid #e6e6e6" }}
                    placeholder="/contact"
                  />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 13, color: "var(--muted)" }}>Style du bouton</label>
                <select
                  value={buttonStyle}
                  onChange={(e) => setButtonStyle(e.target.value as '1' | '2')}
                  style={{ width: "100%", padding: "8px 10px", marginTop: 4, borderRadius: 6, border: "1px solid #e6e6e6" }}
                >
                  <option value="1">Style 1</option>
                  <option value="2">Style 2</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label style={{ fontSize: 13, color: "var(--muted)" }}>Couleur de fond du bloc (optionnel)</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
              <input
                type="color"
                value={bgColor || "#ffffff"}
                onChange={(e) => setBgColor(e.target.value)}
                style={{ width: 40, height: 32, padding: 0, border: "1px solid #e6e6e6", borderRadius: 6 }}
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                placeholder="#fff ou rgba(...)"
                style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #e6e6e6" }}
              />
            </div>
          </div>

          {error ? <div style={{ color: "crimson" }}>{error}</div> : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn-secondary" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button className="btn-primary" onClick={saveAll} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>

        {editingHtml && (
          <RichTextModal
            title="Éditer le texte"
            initial={html}
            onClose={() => setEditingHtml(false)}
            onSave={(h) => {
              setHtml(h);
              setEditingHtml(false);
            }}
          />
        )}
        {editingLivrables && (
          <RichTextModal
            title="Éditer Livrables"
            initial={livrablesHtml}
            onClose={() => setEditingLivrables(false)}
            onSave={(h) => {
              setLivrablesHtml(h);
              setEditingLivrables(false);
            }}
          />
        )}
        {editingBudget && (
          <RichTextModal
            title="Éditer Durée & budget"
            initial={budgetHtml}
            onClose={() => setEditingBudget(false)}
            onSave={(h) => {
              setBudgetHtml(h);
              setEditingBudget(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
