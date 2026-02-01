"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type {
  HomeIntroData,
  HomeServicesData,
  HomeStatsData,
  HomePortraitBlockData,
  HomeCadreurBlockData,
  HomeQuoteData,
  HomeCtaData,
} from "./homeDefaults";

const RichTextModal = dynamic(() => import("../RichTextModal/RichTextModal"), { ssr: false });

export type HomeBlockKey =
  | "home_intro"
  | "home_services"
  | "home_stats"
  | "home_portrait"
  | "home_cadreur"
  | "home_quote"
  | "home_cta";

type BlockData =
  | HomeIntroData
  | HomeServicesData
  | HomeStatsData
  | HomePortraitBlockData
  | HomeCadreurBlockData
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
  home_portrait: "Bloc Portrait",
  home_cadreur: "Bloc Cadreur",
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
  const [editingCadreurHtml, setEditingCadreurHtml] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // Intro
  const [introTitle, setIntroTitle] = useState("");
  const [introSubtitle, setIntroSubtitle] = useState("");
  const [introHtml, setIntroHtml] = useState("");

  // Services (with optional image per item)
  const [serviceItems, setServiceItems] = useState<{ title: string; description: string; href: string; image?: { url: string; path?: string } | null }[]>([]);

  // Stats
  const [statItems, setStatItems] = useState<{ value: string; label: string }[]>([]);

  // Portrait block (carousel: 4 slides)
  const [portraitBlockTitle, setPortraitBlockTitle] = useState("");
  const [portraitCtaLabel, setPortraitCtaLabel] = useState("");
  const [portraitCtaHref, setPortraitCtaHref] = useState("");
  const [portraitSlides, setPortraitSlides] = useState<{ title: string; text: string; image?: { url: string; path?: string } | null }[]>([]);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [uploadingPortraitIndex, setUploadingPortraitIndex] = useState<number | null>(null);

  // Cadreur block
  const [cadreurTitle, setCadreurTitle] = useState("");
  const [cadreurHtml, setCadreurHtml] = useState("");
  const [cadreurImage, setCadreurImage] = useState<{ url: string; path?: string } | null>(null);

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
      const items = d.items.map((it: any) => ({ title: it.title ?? "", description: it.description ?? "", href: it.href ?? "", image: it.image ?? null }));
      setServiceItems(items.length ? items : [{ title: "", description: "", href: "", image: null }]);
    }
    if (blockKey === "home_stats" && d.items) {
      setStatItems(d.items.length ? d.items : [{ value: "", label: "" }]);
    }
    if (blockKey === "home_portrait") {
      setPortraitBlockTitle(d.blockTitle ?? "Portrait");
      setPortraitCtaLabel(d.ctaLabel ?? "Découvrir le portrait");
      setPortraitCtaHref(d.ctaHref ?? "/portrait");
      if (Array.isArray(d.slides) && d.slides.length) {
        setPortraitSlides(d.slides.map((s: any) => ({ title: s.title ?? "", text: s.text ?? "", image: s.image ?? null })));
      } else {
        setPortraitSlides([
          { title: "Lifestyle", text: "", image: null },
          { title: "Studio", text: "", image: null },
          { title: "Entreprise", text: "", image: null },
          { title: "Couple", text: "", image: null },
        ]);
      }
    }
    if (blockKey === "home_cadreur") {
      setCadreurTitle(d.title ?? "");
      setCadreurHtml(d.html ?? "");
      setCadreurImage(d.image ?? null);
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

  async function uploadServiceImage(file: File, index: number) {
    setUploadingIndex(index);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("page", "home");
      fd.append("kind", "image");
      fd.append("folder", `home/services/${index + 1}`);
      const currentPath = serviceItems[index]?.image?.path;
      if (currentPath) fd.append("old_path", currentPath);
      const resp = await fetch("/api/admin/upload-hero-media", { method: "POST", body: fd });
      const j = await resp.json();
      if (!resp.ok) throw new Error(j?.error ?? "Erreur d'upload");
      if (j?.url) {
        setServiceItems((prev) => prev.map((p, i) => (i === index ? { ...p, image: { url: j.url, path: j.path ?? undefined } } : p)));
      } else throw new Error("Upload: pas d'URL retournée");
    } catch (e: any) {
      setError(e?.message ?? "Erreur upload");
    } finally {
      setUploadingIndex(null);
    }
  }

  async function uploadPortraitSlideImage(file: File, slideIndex: number) {
    setUploadingPortraitIndex(slideIndex);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("page", "home");
      fd.append("kind", "image");
      fd.append("folder", `home/portrait/slide-${slideIndex + 1}`);
      const currentPath = portraitSlides[slideIndex]?.image?.path;
      if (currentPath) fd.append("old_path", currentPath);
      const resp = await fetch("/api/admin/upload-hero-media", { method: "POST", body: fd });
      const j = await resp.json();
      if (!resp.ok) throw new Error(j?.error ?? "Erreur d'upload");
      if (j?.url) {
        setPortraitSlides((prev) => prev.map((s, i) => (i === slideIndex ? { ...s, image: { url: j.url, path: j.path ?? undefined } } : s)));
      } else throw new Error("Upload: pas d'URL retournée");
    } catch (e: any) {
      setError(e?.message ?? "Erreur upload");
    } finally {
      setUploadingPortraitIndex(null);
    }
  }

  async function uploadBlockImage(file: File, block: "cadreur") {
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("page", "home");
      fd.append("kind", "image");
      fd.append("folder", `home/${block}`);
      if (cadreurImage?.path) fd.append("old_path", cadreurImage.path);
      const resp = await fetch("/api/admin/upload-hero-media", { method: "POST", body: fd });
      const j = await resp.json();
      if (!resp.ok) throw new Error(j?.error ?? "Erreur d'upload");
      if (j?.url) setCadreurImage({ url: j.url, path: j.path ?? undefined });
      else throw new Error("Upload: pas d'URL retournée");
    } catch (e: any) {
      setError(e?.message ?? "Erreur upload");
    }
  }

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
      case "home_portrait":
        payload = { blockTitle: portraitBlockTitle, ctaLabel: portraitCtaLabel, ctaHref: portraitCtaHref, slides: portraitSlides };
        break;
      case "home_cadreur":
        payload = { title: cadreurTitle, html: cadreurHtml, image: cadreurImage };
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
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Photo (optionnel)</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                      {item.image?.url ? <img src={item.image.url} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6 }} /> : null}
                      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadServiceImage(f, i); }} disabled={uploadingIndex === i} />
                      {uploadingIndex === i ? <span style={{ fontSize: 12, color: "var(--muted)" }}>Upload…</span> : null}
                    </div>
                  </div>
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
              <button type="button" className="btn-ghost" onClick={() => setServiceItems((prev) => [...prev, { title: "", description: "", href: "", image: null }])}>+ Ajouter un service</button>
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

          {blockKey === "home_portrait" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre du bloc</label>
                <input type="text" value={portraitBlockTitle} onChange={(e) => setPortraitBlockTitle(e.target.value)} style={inputStyle} placeholder="Portrait" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Texte du bouton</label>
                <input type="text" value={portraitCtaLabel} onChange={(e) => setPortraitCtaLabel(e.target.value)} style={inputStyle} placeholder="Découvrir le portrait" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Lien du bouton</label>
                <input type="text" value={portraitCtaHref} onChange={(e) => setPortraitCtaHref(e.target.value)} style={inputStyle} placeholder="/portrait" />
              </div>
              <div style={{ marginTop: 20, marginBottom: 8, fontWeight: 600, fontSize: 14 }}>4 slides (Lifestyle, Studio, Entreprise, Couple)</div>
              {portraitSlides.map((slide, i) => (
                <div key={i} style={{ marginBottom: 20, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Slide {i + 1} — Titre</label>
                    <input type="text" value={slide.title} onChange={(e) => setPortraitSlides((prev) => prev.map((s, j) => (j === i ? { ...s, title: e.target.value } : s)))} style={inputStyle} placeholder={["Lifestyle", "Studio", "Entreprise", "Couple"][i]} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Texte</label>
                    <div style={{ minHeight: 44, border: "1px solid #e6e6e6", borderRadius: 6, padding: 10, background: "#fff" }} dangerouslySetInnerHTML={{ __html: slide.text || "<p style='color:#999'>Aucun</p>" }} />
                    <button type="button" className="btn-ghost" style={{ marginTop: 4 }} onClick={() => setEditingSlideIndex(i)}>Éditer le texte</button>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Photo</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                      {slide.image?.url ? <img src={slide.image.url} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6 }} /> : null}
                      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPortraitSlideImage(f, i); }} disabled={uploadingPortraitIndex === i} />
                      {uploadingPortraitIndex === i ? <span style={{ fontSize: 12, color: "var(--muted)" }}>Upload…</span> : null}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {blockKey === "home_cadreur" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre</label>
                <input type="text" value={cadreurTitle} onChange={(e) => setCadreurTitle(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Texte</label>
                <div style={{ minHeight: 44, border: "1px solid #e6e6e6", borderRadius: 6, padding: 10, background: "#fff" }} dangerouslySetInnerHTML={{ __html: cadreurHtml || "<p style='color:#999'>Aucun</p>" }} />
                <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => setEditingCadreurHtml(true)}>Éditer le texte</button>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Image (optionnel)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                  {cadreurImage?.url ? <img src={cadreurImage.url} alt="" style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 6 }} /> : null}
                  <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBlockImage(f, "cadreur"); }} />
                </div>
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
        <RichTextModal title="Texte intro" initial={introHtml} onClose={() => setEditingHtml(false)} onSave={(h) => { setIntroHtml(h); setEditingHtml(false); }} />
      )}
      {editingSlideIndex !== null && blockKey === "home_portrait" && portraitSlides[editingSlideIndex] && (
        <RichTextModal
          title={`Texte — ${portraitSlides[editingSlideIndex].title || "Slide"}`}
          initial={portraitSlides[editingSlideIndex].text}
          onClose={() => setEditingSlideIndex(null)}
          onSave={(h) => {
            setPortraitSlides((prev) => prev.map((s, j) => (j === editingSlideIndex ? { ...s, text: h } : s)));
            setEditingSlideIndex(null);
          }}
        />
      )}
      {editingCadreurHtml && blockKey === "home_cadreur" && (
        <RichTextModal title="Texte Cadreur" initial={cadreurHtml} onClose={() => setEditingCadreurHtml(false)} onSave={(h) => { setCadreurHtml(h); setEditingCadreurHtml(false); }} />
      )}
    </>
  );
}
