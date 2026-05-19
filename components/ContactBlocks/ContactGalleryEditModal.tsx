"use client";

import React, { useEffect, useRef, useState } from "react";
import { compressImageClient } from "../../lib/compressImageClient";

export type ContactGalleryItem = {
  url: string;
  path?: string;
  caption?: string;
};

export type ContactGalleryData = {
  title?: string;
  titleStyle?: string;
  titleFontSize?: number;
  titleColor?: string;
  titleAlign?: "left" | "center" | "right" | "";
  description?: string;
  descriptionFontSize?: number;
  descriptionColor?: string;
  backgroundColor?: string;
  scrollSpeed?: number;
  items: ContactGalleryItem[];
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #e6e6e6",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
};

export default function ContactGalleryEditModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [titleStyle, setTitleStyle] = useState("h2");
  const [titleFontSize, setTitleFontSize] = useState<number | "">("");
  const [titleColor, setTitleColor] = useState("");
  const [titleAlign, setTitleAlign] = useState<"left" | "center" | "right" | "">("");
  const [description, setDescription] = useState("");
  const [descriptionFontSize, setDescriptionFontSize] = useState<number | "">("");
  const [descriptionColor, setDescriptionColor] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("");
  const [scrollSpeed, setScrollSpeed] = useState(20);
  const [items, setItems] = useState<ContactGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch("/api/admin/site-settings?keys=contact_gallery");
        const j = await resp.json();
        const s = j?.settings || {};
        if (!mounted) return;
        if (s.contact_gallery) {
          try {
            const parsed = JSON.parse(String(s.contact_gallery)) as ContactGalleryData;
            setTitle(parsed.title ?? "");
            setTitleStyle(parsed.titleStyle ?? "h2");
            setTitleFontSize(parsed.titleFontSize ?? "");
            setTitleColor(parsed.titleColor ?? "");
            setTitleAlign(parsed.titleAlign ?? "");
            setDescription(parsed.description ?? "");
            setDescriptionFontSize(parsed.descriptionFontSize ?? "");
            setDescriptionColor(parsed.descriptionColor ?? "");
            setBackgroundColor(parsed.backgroundColor ?? "");
            setScrollSpeed(parsed.scrollSpeed ?? 20);
            setItems(Array.isArray(parsed.items) ? parsed.items : []);
          } catch (_) {}
        }
      } catch (_) {}
      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  async function uploadImage(file: File, idx: number) {
    setUploadingIdx(idx);
    try {
      const compressed = await compressImageClient(file);
      const fd = new FormData();
      fd.append("file", compressed);
      fd.append("page", "contact");
      fd.append("kind", "image");
      fd.append("folder", "contact/gallery");
      const oldPath = items[idx]?.path;
      if (oldPath) fd.append("old_path", oldPath);
      const r = await fetch("/api/admin/upload-hero-media", { method: "POST", body: fd });
      if (r.ok) {
        const d = await r.json();
        setItems((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], url: d.url, path: d.path };
          return next;
        });
      }
    } finally {
      setUploadingIdx(null);
    }
  }

  function addItem() {
    setItems((prev) => [...prev, { url: "", caption: "" }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveItem(idx: number, dir: "up" | "down") {
    setItems((prev) => {
      const next = [...prev];
      const j = dir === "up" ? idx - 1 : idx + 1;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  function updateCaption(idx: number, caption: string) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], caption };
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: ContactGalleryData = {
        title: title.trim() || undefined,
        titleStyle: titleStyle || undefined,
        titleFontSize: typeof titleFontSize === "number" ? titleFontSize : undefined,
        titleColor: titleColor.trim() || undefined,
        titleAlign: titleAlign || undefined,
        description: description.trim() || undefined,
        descriptionFontSize: typeof descriptionFontSize === "number" ? descriptionFontSize : undefined,
        descriptionColor: descriptionColor.trim() || undefined,
        backgroundColor: backgroundColor.trim() || undefined,
        scrollSpeed: scrollSpeed,
        items: items.filter((it) => it.url),
      };
      const resp = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "contact_gallery", value: JSON.stringify(payload) }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error((j as any).error || "Erreur sauvegarde");
      }
      window.dispatchEvent(new CustomEvent("site-settings-updated", { detail: { key: "contact_gallery" } }));
      onSaved?.();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="modal-overlay-mobile" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50000 }}>
        <div style={{ background: "#fff", color: "#000", padding: 24, borderRadius: 12 }}>Chargement…</div>
      </div>
    );
  }

  return (
    <div
      className="modal-overlay-mobile"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50000, overflowY: "auto", padding: "16px 0" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{ background: "#fff", color: "#000", padding: 24, width: 560, maxWidth: "calc(100% - 24px)", borderRadius: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 20 }}>Bloc Galerie</h3>
          <button type="button" aria-label="Fermer" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#666" }}>✕</button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre (optionnel)</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ma galerie" style={inputStyle} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <select value={titleStyle} onChange={(e) => setTitleStyle(e.target.value)} style={{ ...inputStyle, width: 120 }}>
            {[{ value: "h1", label: "Titre 1" }, { value: "h2", label: "Titre 2" }, { value: "h3", label: "Titre 3" }, { value: "h4", label: "Titre 4" }, { value: "h5", label: "Titre 5" }, { value: "p", label: "Paragraphe" }].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="number" min={10} max={100} value={titleFontSize} onChange={(e) => setTitleFontSize(e.target.value === "" ? "" : Number(e.target.value))} placeholder="px" style={{ width: 64, padding: "8px 12px", border: "1px solid #e6e6e6", borderRadius: 6, fontSize: 14, boxSizing: "border-box" as const }} />
          <input type="color" value={titleColor || "#1a1a18"} onChange={(e) => setTitleColor(e.target.value)} title="Couleur du titre" style={{ width: 40, height: 36, padding: 2, border: "1px solid #e6e6e6", borderRadius: 6, cursor: "pointer" }} />
          {titleColor && <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setTitleColor("")}>Effacer couleur</button>}
          {(["left", "center", "right"] as const).map(a => (
            <button key={a} type="button" onClick={() => setTitleAlign(titleAlign === a ? "" : a)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e6e6e6", fontSize: 12, cursor: "pointer", background: titleAlign === a ? "#111" : "#fff", color: titleAlign === a ? "#fff" : "inherit" }}>{a === "left" ? "←" : a === "center" ? "↔" : "→"}</button>
          ))}
        </div>

        {/* Description */}
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Description (optionnel)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description de la galerie…" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <input type="number" min={10} max={100} value={descriptionFontSize} onChange={(e) => setDescriptionFontSize(e.target.value === "" ? "" : Number(e.target.value))} placeholder="px" style={{ width: 64, padding: "8px 12px", border: "1px solid #e6e6e6", borderRadius: 6, fontSize: 14, boxSizing: "border-box" as const }} />
          <input type="color" value={descriptionColor || "#666666"} onChange={(e) => setDescriptionColor(e.target.value)} title="Couleur de la description" style={{ width: 40, height: 36, padding: 2, border: "1px solid #e6e6e6", borderRadius: 6, cursor: "pointer" }} />
          {descriptionColor && <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setDescriptionColor("")}>Effacer couleur</button>}
        </div>

        {/* Background color */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Couleur de fond (optionnel)</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" value={backgroundColor || "#fafaf9"} onChange={(e) => setBackgroundColor(e.target.value)} style={{ width: 48, height: 32, padding: 0, border: "1px solid #e6e6e6", borderRadius: 6 }} />
            <input type="text" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} placeholder="ou hex" style={{ width: 120, ...inputStyle }} />
            {backgroundColor ? <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setBackgroundColor("")}>Effacer</button> : null}
          </div>
        </div>

        {/* Scroll speed */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Vitesse de défilement</label>
          <div style={{ display: "flex", gap: 6 }}>
            {([{ label: "Lent", value: 35 }, { label: "Normal", value: 22 }, { label: "Rapide", value: 13 }, { label: "Très rapide", value: 7 }] as const).map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => setScrollSpeed(value)}
                style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e6e6e6", fontSize: 12, cursor: "pointer", background: scrollSpeed === value ? "#111" : "#fff", color: scrollSpeed === value ? "#fff" : "inherit", transition: "background 0.1s" }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Items */}
        <div style={{ borderTop: "1px solid #e6e6e6", paddingTop: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Photos ({items.length})</label>
            <button type="button" className="btn-secondary" onClick={addItem} style={{ fontSize: 12, padding: "5px 12px" }}>+ Ajouter</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {items.map((item, idx) => (
              <div key={idx} style={{ border: "1px solid #e6e6e6", borderRadius: 7, padding: "8px 8px 8px 8px", display: "flex", gap: 8, alignItems: "center", background: "#fafafa" }}>
                {/* Thumbnail */}
                <label style={{ flexShrink: 0, cursor: "pointer", position: "relative" }} title={item.url ? "Changer la photo" : "Importer"}>
                  <div style={{ width: 48, height: 48, borderRadius: 5, overflow: "hidden", background: "#ebebeb", position: "relative", border: "1px solid #e0e0e0" }}>
                    {item.url ? (
                      <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.3 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={18} height={18}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" /></svg>
                      </div>
                    )}
                    {uploadingIdx === idx && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>…</div>
                    )}
                  </div>
                  <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploadingIdx !== null} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, idx); }} />
                </label>

                {/* Caption */}
                <input
                  type="text"
                  value={item.caption ?? ""}
                  onChange={(e) => updateCaption(idx, e.target.value)}
                  placeholder="Légende…"
                  style={{ flex: 1, minWidth: 0, padding: "5px 8px", border: "1px solid #e6e6e6", borderRadius: 5, fontSize: 12, background: "#fff" }}
                />

                {/* Controls */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                  <button type="button" onClick={() => moveItem(idx, "up")} disabled={idx === 0} style={{ width: 20, height: 20, fontSize: 10, background: "none", border: "1px solid #ddd", borderRadius: 3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === 0 ? 0.3 : 1 }} title="Monter">↑</button>
                  <button type="button" onClick={() => moveItem(idx, "down")} disabled={idx === items.length - 1} style={{ width: 20, height: 20, fontSize: 10, background: "none", border: "1px solid #ddd", borderRadius: 3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === items.length - 1 ? 0.3 : 1 }} title="Descendre">↓</button>
                  <button type="button" onClick={() => removeItem(idx)} style={{ width: 20, height: 20, fontSize: 10, background: "none", border: "1px solid #fca5a5", borderRadius: 3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#b91c1c" }} title="Supprimer">✕</button>
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 13, border: "1.5px dashed #e6e6e6", borderRadius: 8, marginTop: 4 }}>
              Aucune photo — cliquez sur « + Ajouter »
            </div>
          )}
        </div>

        {error && <div style={{ color: "#b91c1c", marginBottom: 12, fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </div>
    </div>
  );
}
