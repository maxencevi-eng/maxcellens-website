"use client";

import React, { useEffect, useState } from "react";

const DEFAULT_EMBED_URL = "https://kit.co/embed?url=https%3A%2F%2Fkit.co%2FMaxcellens%2Fmon-equipement";

const TITLE_FONT_SIZE_MIN = 10;
const TITLE_FONT_SIZE_MAX = 100;
const clampTitleFontSize = (n: number) => Math.min(TITLE_FONT_SIZE_MAX, Math.max(TITLE_FONT_SIZE_MIN, Number(n) || 16));
const parseFontSize = (v: string): number | "" => (v === "" ? "" : clampTitleFontSize(Number(v)));

function FontSizeInput({ value, onChange }: { value: number | ""; onChange: (v: number | "") => void }) {
  const [raw, setRaw] = React.useState(value === "" ? "" : String(value));
  React.useEffect(() => { setRaw(value === "" ? "" : String(value)); }, [value]);
  return (
    <input
      type="number"
      min={TITLE_FONT_SIZE_MIN}
      max={TITLE_FONT_SIZE_MAX}
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={(e) => {
        const parsed = parseFontSize(e.target.value);
        onChange(parsed);
        setRaw(parsed === "" ? "" : String(parsed));
      }}
      placeholder="px"
      style={{ width: 64, padding: "8px 12px", border: "1px solid #e6e6e6", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }}
      title={`Taille (${TITLE_FONT_SIZE_MIN}–${TITLE_FONT_SIZE_MAX} px)`}
    />
  );
}

export type ContactKitData = {
  title?: string;
  titleStyle?: string;
  titleFontSize?: number;
  titleColor?: string;
  titleAlign?: "left" | "center" | "right" | "";
  embedUrl?: string;
  backgroundColor?: string;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #e6e6e6",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
};

export default function ContactKitEditModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [titleStyle, setTitleStyle] = useState("h3");
  const [titleFontSize, setTitleFontSize] = useState<number | "">("");
  const [titleColor, setTitleColor] = useState("");
  const [titleAlign, setTitleAlign] = useState<"left" | "center" | "right" | "">("");
  const [embedUrl, setEmbedUrl] = useState(DEFAULT_EMBED_URL);
  const [backgroundColor, setBackgroundColor] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch("/api/admin/site-settings?keys=contact_kit");
        const j = await resp.json();
        const s = j?.settings || {};
        if (!mounted) return;
        if (s.contact_kit) {
          try {
            const parsed = JSON.parse(String(s.contact_kit)) as ContactKitData;
            setTitle(parsed.title ?? "");
            setTitleStyle(parsed.titleStyle ?? "h3");
            setTitleFontSize(parsed.titleFontSize ?? "");
            setTitleColor(parsed.titleColor ?? "");
            setTitleAlign(parsed.titleAlign ?? "");
            setEmbedUrl(parsed.embedUrl?.trim() || DEFAULT_EMBED_URL);
          } catch (_) {}
        }
      } catch (_) {}
      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: ContactKitData = {
        title: title.trim() || undefined,
        titleStyle: titleStyle || undefined,
        titleFontSize: typeof titleFontSize === "number" ? titleFontSize : undefined,
        titleColor: titleColor.trim() || undefined,
        titleAlign: titleAlign || undefined,
        embedUrl: embedUrl.trim() || DEFAULT_EMBED_URL,
        backgroundColor: backgroundColor?.trim() || undefined,
      };
      const resp = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "contact_kit", value: JSON.stringify(payload) }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error((j as any).error || "Erreur sauvegarde");
      }
      window.dispatchEvent(new CustomEvent("site-settings-updated", { detail: { key: "contact_kit" } }));
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
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50000 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#fff", color: "#000", padding: 24, width: 520, maxWidth: "calc(100% - 24px)", borderRadius: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 20 }}>Bloc Mon équipement (Kit.co)</h3>
          <button type="button" aria-label="Fermer" onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#666" }}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
          Ce bloc affiche votre liste d’équipement Kit.co sous la carte. Vous pouvez personnaliser le titre et l’URL d’intégration.
        </p>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre au-dessus du widget (optionnel)</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mon équipement" style={inputStyle} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <select value={titleStyle} onChange={(e) => setTitleStyle(e.target.value)} style={{ ...inputStyle, width: 130 }}>
            {[{ value: "h1", label: "Titre 1" }, { value: "h2", label: "Titre 2" }, { value: "h3", label: "Titre 3" }, { value: "h4", label: "Titre 4" }, { value: "h5", label: "Titre 5" }, { value: "p", label: "Paragraphe" }].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <FontSizeInput value={titleFontSize} onChange={setTitleFontSize} />
          <input type="color" value={titleColor || "#1a1a18"} onChange={(e) => setTitleColor(e.target.value)} title="Couleur du titre" style={{ width: 40, height: 36, padding: 2, border: "1px solid #e6e6e6", borderRadius: 6, cursor: "pointer" }} />
          {titleColor && <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setTitleColor("")}>Effacer couleur</button>}
          {(["left", "center", "right"] as const).map(a => (
            <button key={a} type="button" onClick={() => setTitleAlign(titleAlign === a ? "" : a)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e6e6e6", fontSize: 12, cursor: "pointer", background: titleAlign === a ? "#111" : "#fff", color: titleAlign === a ? "#fff" : "inherit" }}>{a === "left" ? "←" : a === "center" ? "↔" : "→"}</button>
          ))}
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>URL d’intégration (embed Kit.co)</label>
          <input type="url" value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} placeholder={DEFAULT_EMBED_URL} style={inputStyle} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Couleur de fond (optionnel)</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
            <input type="color" value={backgroundColor || "#fafaf9"} onChange={(e) => setBackgroundColor(e.target.value)} style={{ width: 48, height: 32, padding: 0, border: "1px solid #e6e6e6", borderRadius: 6 }} />
            <input type="text" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} placeholder="ou hex" style={{ width: 120, ...inputStyle }} />
            {backgroundColor ? <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setBackgroundColor("")}>Effacer</button> : null}
          </div>
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
