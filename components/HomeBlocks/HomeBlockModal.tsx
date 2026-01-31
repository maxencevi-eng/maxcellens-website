"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type {
  HomeIntroData,
  HomeServicesData,
  HomeStatsData,
  HomeSectionData,
  HomeQuoteData,
  HomeCtaData,
} from "./homeDefaults";

const RichTextModal = dynamic(() => import("../RichTextModal/RichTextModal"), { ssr: false });

export type HomeBlockKey =
  | "home_intro"
  | "home_services"
  | "home_stats"
  | "home_projects_section"
  | "home_videos_section"
  | "home_quote"
  | "home_cta";

type BlockData =
  | HomeIntroData
  | HomeServicesData
  | HomeStatsData
  | HomeSectionData
  | HomeQuoteData
  | HomeCtaData;

type Props = {
  blockKey: HomeBlockKey;
  initialData: BlockData;
  onClose: () => void;
  onSaved: (key: string, value: string) => void;
};

const LABELS: Record<HomeBlockKey, string> = {
  home_intro: "Bloc Intro",
  home_services: "Bloc Services",
  home_stats: "Bloc Chiffres",
  home_projects_section: "Section Projets",
  home_videos_section: "Section Réalisations vidéo",
  home_quote: "Citation / Témoignage",
  home_cta: "Bloc CTA",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #e6e6e6",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
};

export default function HomeBlockModal({ blockKey, initialData, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingHtml, setEditingHtml] = useState(false);

  // Intro
  const [introTitle, setIntroTitle] = useState("");
  const [introSubtitle, setIntroSubtitle] = useState("");
  const [introHtml, setIntroHtml] = useState("");

  // Services
  const [serviceItems, setServiceItems] = useState<{ title: string; description: string; href: string }[]>([]);

  // Stats
  const [statItems, setStatItems] = useState<{ value: string; label: string }[]>([]);

  // Section (projects / videos)
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDesc, setSectionDesc] = useState("");

  // Quote
  const [quoteText, setQuoteText] = useState("");
  const [quoteAuthor, setQuoteAuthor] = useState("");
  const [quoteRole, setQuoteRole] = useState("");

  // CTA
  const [ctaTitle, setCtaTitle] = useState("");
  const [ctaButtonLabel, setCtaButtonLabel] = useState("");
  const [ctaButtonHref, setCtaButtonHref] = useState("");

  useEffect(() => {
    const d = initialData as any;
    if (blockKey === "home_intro") {
      setIntroTitle(d.title ?? "");
      setIntroSubtitle(d.subtitle ?? "");
      setIntroHtml(d.html ?? "");
    }
    if (blockKey === "home_services" && d.items) {
      setServiceItems(d.items.length ? d.items : [{ title: "", description: "", href: "" }]);
    }
    if (blockKey === "home_stats" && d.items) {
      setStatItems(d.items.length ? d.items : [{ value: "", label: "" }]);
    }
    if (blockKey === "home_projects_section" || blockKey === "home_videos_section") {
      setSectionTitle(d.title ?? "");
      setSectionDesc(d.description ?? "");
    }
    if (blockKey === "home_quote") {
      setQuoteText(d.text ?? "");
      setQuoteAuthor(d.author ?? "");
      setQuoteRole(d.role ?? "");
    }
    if (blockKey === "home_cta") {
      setCtaTitle(d.title ?? "");
      setCtaButtonLabel(d.buttonLabel ?? "");
      setCtaButtonHref(d.buttonHref ?? "");
    }
  }, [blockKey, initialData]);

  async function save() {
    setSaving(true);
    setError(null);
    let payload: BlockData;
    switch (blockKey) {
      case "home_intro":
        payload = { title: introTitle, subtitle: introSubtitle, html: introHtml };
        break;
      case "home_services":
        payload = { items: serviceItems };
        break;
      case "home_stats":
        payload = { items: statItems };
        break;
      case "home_projects_section":
      case "home_videos_section":
        payload = { title: sectionTitle, description: sectionDesc };
        break;
      case "home_quote":
        payload = { text: quoteText, author: quoteAuthor, role: quoteRole };
        break;
      case "home_cta":
        payload = { title: ctaTitle, buttonLabel: ctaButtonLabel, buttonHref: ctaButtonHref };
        break;
      default:
        setSaving(false);
        return;
    }
    try {
      const resp = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: blockKey, value: JSON.stringify(payload) }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j?.error ?? "Erreur sauvegarde");
      }
      window.dispatchEvent(new CustomEvent("site-settings-updated", { detail: { key: blockKey } }));
      onSaved(blockKey, JSON.stringify(payload));
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
  };

  const boxStyle: React.CSSProperties = {
    background: "#fff",
    color: "#000",
    padding: 24,
    width: 560,
    maxWidth: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    borderRadius: 10,
  };

  return (
    <>
      <div style={overlayStyle} onClick={onClose}>
        <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ margin: 0 }}>{LABELS[blockKey]}</h3>
            <button type="button" onClick={onClose} aria-label="Fermer" style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>
              ✕
            </button>
          </div>

          {blockKey === "home_intro" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre</label>
                <input type="text" value={introTitle} onChange={(e) => setIntroTitle(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Sous-titre</label>
                <input type="text" value={introSubtitle} onChange={(e) => setIntroSubtitle(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Texte</label>
                <div style={{ minHeight: 44, border: "1px solid #e6e6e6", borderRadius: 6, padding: 10, background: "#fff" }} dangerouslySetInnerHTML={{ __html: introHtml || "<p style='color:#999'>Aucun</p>" }} />
                <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => setEditingHtml(true)}>Éditer le texte</button>
              </div>
            </>
          )}

          {blockKey === "home_services" && (
            <>
              {serviceItems.map((item, i) => (
                <div key={i} style={{ marginBottom: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
                  <div style={{ marginBottom: 8 }}>
                    <input type="text" placeholder="Titre" value={item.title} onChange={(e) => setServiceItems((prev) => prev.map((p, j) => (j === i ? { ...p, title: e.target.value } : p)))} style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <input type="text" placeholder="Description courte" value={item.description} onChange={(e) => setServiceItems((prev) => prev.map((p, j) => (j === i ? { ...p, description: e.target.value } : p)))} style={inputStyle} />
                  </div>
                  <div>
                    <input type="text" placeholder="Lien (ex. /realisation)" value={item.href} onChange={(e) => setServiceItems((prev) => prev.map((p, j) => (j === i ? { ...p, href: e.target.value } : p)))} style={inputStyle} />
                  </div>
                </div>
              ))}
              <button type="button" className="btn-ghost" onClick={() => setServiceItems((prev) => [...prev, { title: "", description: "", href: "" }])}>+ Ajouter un service</button>
            </>
          )}

          {blockKey === "home_stats" && (
            <>
              {statItems.map((item, i) => (
                <div key={i} style={{ marginBottom: 12, display: "flex", gap: 8 }}>
                  <input type="text" placeholder="Valeur (ex. 10+)" value={item.value} onChange={(e) => setStatItems((prev) => prev.map((p, j) => (j === i ? { ...p, value: e.target.value } : p)))} style={{ ...inputStyle, width: 100 }} />
                  <input type="text" placeholder="Label (ex. ans d'expérience)" value={item.label} onChange={(e) => setStatItems((prev) => prev.map((p, j) => (j === i ? { ...p, label: e.target.value } : p)))} style={{ ...inputStyle, flex: 1 }} />
                </div>
              ))}
              <button type="button" className="btn-ghost" onClick={() => setStatItems((prev) => [...prev, { value: "", label: "" }])}>+ Ajouter un chiffre</button>
            </>
          )}

          {(blockKey === "home_projects_section" || blockKey === "home_videos_section") && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre de la section</label>
                <input type="text" value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Description</label>
                <textarea value={sectionDesc} onChange={(e) => setSectionDesc(e.target.value)} style={{ ...inputStyle, minHeight: 80 }} rows={3} />
              </div>
            </>
          )}

          {blockKey === "home_quote" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Citation</label>
                <textarea value={quoteText} onChange={(e) => setQuoteText(e.target.value)} style={{ ...inputStyle, minHeight: 80 }} rows={3} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Auteur</label>
                <input type="text" value={quoteAuthor} onChange={(e) => setQuoteAuthor(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Rôle (optionnel)</label>
                <input type="text" value={quoteRole} onChange={(e) => setQuoteRole(e.target.value)} style={inputStyle} />
              </div>
            </>
          )}

          {blockKey === "home_cta" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre</label>
                <input type="text" value={ctaTitle} onChange={(e) => setCtaTitle(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Texte du bouton</label>
                <input type="text" value={ctaButtonLabel} onChange={(e) => setCtaButtonLabel(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Lien du bouton</label>
                <input type="text" value={ctaButtonHref} onChange={(e) => setCtaButtonHref(e.target.value)} style={inputStyle} placeholder="/contact" />
              </div>
            </>
          )}

          {error && <div style={{ color: "crimson", marginBottom: 8 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="button" className="btn-primary" onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
          </div>
        </div>
      </div>

      {editingHtml && blockKey === "home_intro" && (
        <RichTextModal
          title="Texte intro"
          initial={introHtml}
          onClose={() => setEditingHtml(false)}
          onSave={(h) => {
            setIntroHtml(h);
            setEditingHtml(false);
          }}
        />
      )}
    </>
  );
}
