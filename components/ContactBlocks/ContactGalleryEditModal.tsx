"use client";

import React, { useEffect, useState } from "react";
import { compressImageClient } from "../../lib/compressImageClient";

export type ContactGalleryItem = {
  url: string;
  path?: string;
  caption?: string;
  category?: string;
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
  categories?: string[];
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

const smBtn: React.CSSProperties = {
  width: 22,
  height: 22,
  fontSize: 11,
  background: "none",
  border: "1px solid #ddd",
  borderRadius: 4,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
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
  const [scrollSpeed, setScrollSpeed] = useState(22);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
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
            setScrollSpeed(parsed.scrollSpeed ?? 22);
            setCategories(Array.isArray(parsed.categories) ? parsed.categories : []);
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

  function addCategory() {
    const name = newCategory.trim();
    if (!name || categories.includes(name)) return;
    setCategories((prev) => [...prev, name]);
    setNewCategory("");
  }

  function renameCategory(idx: number, name: string) {
    const oldName = categories[idx];
    const next = [...categories];
    next[idx] = name;
    setCategories(next);
    // update items that used the old name
    setItems((prev) => prev.map((it) => it.category === oldName ? { ...it, category: name } : it));
  }

  function removeCategory(idx: number) {
    const name = categories[idx];
    setCategories((prev) => prev.filter((_, i) => i !== idx));
    // clear category on items
    setItems((prev) => prev.map((it) => it.category === name ? { ...it, category: undefined } : it));
  }

  function moveCat(idx: number, dir: "up" | "down") {
    setCategories((prev) => {
      const next = [...prev];
      const j = dir === "up" ? idx - 1 : idx + 1;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }

  function addItem() {
    setItems((prev) => [...prev, { url: "", caption: "", category: categories[0] }]);
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

  function updateItem(idx: number, patch: Partial<ContactGalleryItem>) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
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
        scrollSpeed,
        categories: categories.length > 0 ? categories : undefined,
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

  const [tab, setTab] = useState<"general" | "categories" | "photos">("general");

  const tabStyle = (t: typeof tab): React.CSSProperties => ({
    padding: "7px 16px",
    fontSize: 13,
    fontWeight: 500,
    border: "none",
    borderBottom: tab === t ? "2px solid #111" : "2px solid transparent",
    background: "none",
    cursor: "pointer",
    color: tab === t ? "#111" : "#888",
    transition: "color 0.1s",
  });

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
        style={{ background: "#fff", color: "#000", width: 560, maxWidth: "calc(100% - 24px)", borderRadius: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.2)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px 0" }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Bloc Galerie</h3>
          <button type="button" aria-label="Fermer" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#666" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #e6e6e6", padding: "0 12px", marginTop: 8 }}>
          <button type="button" style={tabStyle("general")} onClick={() => setTab("general")}>Général</button>
          <button type="button" style={tabStyle("categories")} onClick={() => setTab("categories")}>
            Catégories {categories.length > 0 && <span style={{ fontSize: 11, background: "#e6e6e6", borderRadius: 10, padding: "1px 6px", marginLeft: 4 }}>{categories.length}</span>}
          </button>
          <button type="button" style={tabStyle("photos")} onClick={() => setTab("photos")}>
            Photos {items.length > 0 && <span style={{ fontSize: 11, background: "#e6e6e6", borderRadius: 10, padding: "1px 6px", marginLeft: 4 }}>{items.length}</span>}
          </button>
        </div>

        {/* Tab content */}
        <div style={{ overflowY: "auto", padding: "20px", flex: 1 }}>

          {/* ── GÉNÉRAL ── */}
          {tab === "general" && (
            <>
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
                {titleColor && <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setTitleColor("")}>Effacer</button>}
                {(["left", "center", "right"] as const).map(a => (
                  <button key={a} type="button" onClick={() => setTitleAlign(titleAlign === a ? "" : a)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e6e6e6", fontSize: 12, cursor: "pointer", background: titleAlign === a ? "#111" : "#fff", color: titleAlign === a ? "#fff" : "inherit" }}>{a === "left" ? "←" : a === "center" ? "↔" : "→"}</button>
                ))}
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Description (optionnel)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description de la galerie…" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                <input type="number" min={10} max={100} value={descriptionFontSize} onChange={(e) => setDescriptionFontSize(e.target.value === "" ? "" : Number(e.target.value))} placeholder="px" style={{ width: 64, padding: "8px 12px", border: "1px solid #e6e6e6", borderRadius: 6, fontSize: 14, boxSizing: "border-box" as const }} />
                <input type="color" value={descriptionColor || "#666666"} onChange={(e) => setDescriptionColor(e.target.value)} title="Couleur" style={{ width: 40, height: 36, padding: 2, border: "1px solid #e6e6e6", borderRadius: 6, cursor: "pointer" }} />
                {descriptionColor && <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setDescriptionColor("")}>Effacer</button>}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Couleur de fond (optionnel)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={backgroundColor || "#fafaf9"} onChange={(e) => setBackgroundColor(e.target.value)} style={{ width: 48, height: 32, padding: 0, border: "1px solid #e6e6e6", borderRadius: 6 }} />
                  <input type="text" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} placeholder="ou hex" style={{ width: 120, ...inputStyle }} />
                  {backgroundColor && <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setBackgroundColor("")}>Effacer</button>}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Vitesse de défilement</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {([{ label: "Désactivé", value: 0 }, { label: "Lent", value: 35 }, { label: "Normal", value: 22 }, { label: "Rapide", value: 13 }, { label: "Très rapide", value: 7 }] as const).map(({ label, value }) => (
                    <button key={value} type="button" onClick={() => setScrollSpeed(value)}
                      style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e6e6e6", fontSize: 12, cursor: "pointer", background: scrollSpeed === value ? "#111" : "#fff", color: scrollSpeed === value ? "#fff" : "inherit" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── CATÉGORIES ── */}
          {tab === "categories" && (
            <>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--muted)" }}>
                Chaque catégorie avec au moins une photo devient une ligne de galerie défilante.
              </p>
              {categories.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {categories.map((cat, ci) => (
                    <div key={ci} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="text"
                        value={cat}
                        onChange={(e) => renameCategory(ci, e.target.value)}
                        style={{ flex: 1, padding: "7px 10px", border: "1px solid #e6e6e6", borderRadius: 5, fontSize: 13 }}
                      />
                      <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {items.filter(it => it.category === cat).length} photo{items.filter(it => it.category === cat).length !== 1 ? "s" : ""}
                      </span>
                      <button type="button" onClick={() => moveCat(ci, "up")} disabled={ci === 0} style={{ ...smBtn, opacity: ci === 0 ? 0.3 : 1 }}>↑</button>
                      <button type="button" onClick={() => moveCat(ci, "down")} disabled={ci === categories.length - 1} style={{ ...smBtn, opacity: ci === categories.length - 1 ? 0.3 : 1 }}>↓</button>
                      <button type="button" onClick={() => removeCategory(ci)} style={{ ...smBtn, border: "1px solid #fca5a5", color: "#b91c1c" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
                  placeholder="Nouvelle catégorie…"
                  style={{ flex: 1, padding: "7px 10px", border: "1px solid #e6e6e6", borderRadius: 6, fontSize: 13 }}
                />
                <button type="button" onClick={addCategory} disabled={!newCategory.trim()} style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid #e6e6e6", fontSize: 13, cursor: "pointer", background: "#f5f5f5", whiteSpace: "nowrap" }}>
                  + Ajouter
                </button>
              </div>
              {categories.length === 0 && (
                <div style={{ marginTop: 20, textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 13, border: "1.5px dashed #e6e6e6", borderRadius: 8 }}>
                  Aucune catégorie — toutes les photos défilent dans une seule ligne
                </div>
              )}
            </>
          )}

          {/* ── PHOTOS ── */}
          {tab === "photos" && (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button type="button" className="btn-secondary" onClick={addItem} style={{ fontSize: 12, padding: "5px 12px" }}>+ Ajouter</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{ border: "1px solid #e6e6e6", borderRadius: 7, padding: 8, display: "flex", gap: 8, alignItems: "flex-start", background: "#fafafa" }}>
                    <label style={{ flexShrink: 0, cursor: "pointer" }} title={item.url ? "Changer" : "Importer"}>
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

                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                      <input
                        type="text"
                        value={item.caption ?? ""}
                        onChange={(e) => updateItem(idx, { caption: e.target.value })}
                        placeholder="Légende…"
                        style={{ width: "100%", padding: "4px 7px", border: "1px solid #e6e6e6", borderRadius: 4, fontSize: 11, background: "#fff", boxSizing: "border-box" as const }}
                      />
                      {categories.length > 0 && (
                        <select
                          value={item.category ?? ""}
                          onChange={(e) => updateItem(idx, { category: e.target.value || undefined })}
                          style={{ width: "100%", padding: "4px 6px", border: "1px solid #e6e6e6", borderRadius: 4, fontSize: 11, background: "#fff", boxSizing: "border-box" as const }}
                        >
                          <option value="">Sans catégorie</option>
                          {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                      <button type="button" onClick={() => moveItem(idx, "up")} disabled={idx === 0} style={{ ...smBtn, opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
                      <button type="button" onClick={() => moveItem(idx, "down")} disabled={idx === items.length - 1} style={{ ...smBtn, opacity: idx === items.length - 1 ? 0.3 : 1 }}>↓</button>
                      <button type="button" onClick={() => removeItem(idx)} style={{ ...smBtn, border: "1px solid #fca5a5", color: "#b91c1c" }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
              {items.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 13, border: "1.5px dashed #e6e6e6", borderRadius: 8 }}>
                  Aucune photo — cliquez sur « + Ajouter »
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #e6e6e6", padding: "14px 20px", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
          {error && <span style={{ color: "#b91c1c", fontSize: 13, marginRight: "auto", alignSelf: "center" }}>{error}</span>}
          <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </div>
    </div>
  );
}
