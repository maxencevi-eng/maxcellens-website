"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const RichTextModal = dynamic(() => import("../RichTextModal/RichTextModal"), { ssr: false });

export type TitleStyleKey = "p" | "h1" | "h2" | "h3" | "h4" | "h5";

const TITLE_STYLE_OPTIONS: { value: TitleStyleKey; label: string }[] = [
  { value: "p", label: "Paragraphe" },
  { value: "h1", label: "Titre 1" },
  { value: "h2", label: "Titre 2" },
  { value: "h3", label: "Titre 3" },
  { value: "h4", label: "Titre 4" },
  { value: "h5", label: "Titre 5" },
];

const TITLE_FONT_SIZE_MIN = 8;
const TITLE_FONT_SIZE_MAX = 72;

export type ContactZonesData = {
  qg?: { title?: string; text?: string; phone?: string; titleStyle?: TitleStyleKey; titleFontSize?: number };
  paris?: { title?: string; text?: string; titleStyle?: TitleStyleKey; titleFontSize?: number };
  france?: { title?: string; text?: string; titleStyle?: TitleStyleKey; titleFontSize?: number };
  mapQuery?: string;
  backgroundColor?: string;
};

const DEFAULT_ZONES: ContactZonesData = {
  qg: {
    title: "QG",
    text: "<p>Basé à Clamart (92). Point de départ de mes missions en Île-de-France.</p>",
    phone: "06 74 96 64 58",
    titleStyle: "h3",
  },
  paris: {
    title: "Paris & Alentours",
    text: "<p>Priorité aux transports en commun. Voiture possible pour la banlieue proche — frais kilométriques.</p>",
    titleStyle: "h3",
  },
  france: {
    title: "France & Monde",
    text: "<p>Déplacements réguliers en train pour des missions partout en France et parfois à l'étranger — frais de déplacement.</p>",
    titleStyle: "h3",
  },
  mapQuery: "92140 Clamart",
};

function toHtml(val: string | undefined): string {
  if (!val || !val.trim()) return "";
  if (/<[a-z][\s\S]*>/i.test(val)) return val;
  return `<p>${val.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`;
}

export default function ContactZonesEditModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [zones, setZones] = useState<ContactZonesData>(DEFAULT_ZONES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingZone, setEditingZone] = useState<"qg" | "paris" | "france" | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch("/api/admin/site-settings?keys=contact_zones");
        const j = await resp.json();
        const s = j?.settings || {};
        if (!mounted) return;
        if (s.contact_zones) {
          try {
            const parsed = JSON.parse(String(s.contact_zones)) as ContactZonesData;
            const style = (s: string) => (["h1", "h2", "h3", "h4", "h5", "p"].includes(s) ? s as TitleStyleKey : undefined);
            const clampFs = (n: number | undefined) => (n != null && n >= TITLE_FONT_SIZE_MIN && n <= TITLE_FONT_SIZE_MAX ? n : undefined);
            setZones({
              qg: { ...DEFAULT_ZONES.qg, ...parsed.qg, titleStyle: style(parsed.qg?.titleStyle) ?? "h3", titleFontSize: clampFs(parsed.qg?.titleFontSize), text: parsed.qg?.text != null ? (/<[a-z][\s\S]*>/i.test(String(parsed.qg.text)) ? parsed.qg.text : toHtml(parsed.qg.text)) : DEFAULT_ZONES.qg?.text },
              paris: { ...DEFAULT_ZONES.paris, ...parsed.paris, titleStyle: style(parsed.paris?.titleStyle) ?? "h3", titleFontSize: clampFs(parsed.paris?.titleFontSize), text: parsed.paris?.text != null ? (/<[a-z][\s\S]*>/i.test(String(parsed.paris.text)) ? parsed.paris.text : toHtml(parsed.paris.text)) : DEFAULT_ZONES.paris?.text },
              france: { ...DEFAULT_ZONES.france, ...parsed.france, titleStyle: style(parsed.france?.titleStyle) ?? "h3", titleFontSize: clampFs(parsed.france?.titleFontSize), text: parsed.france?.text != null ? (/<[a-z][\s\S]*>/i.test(String(parsed.france.text)) ? parsed.france.text : toHtml(parsed.france.text)) : DEFAULT_ZONES.france?.text },
              mapQuery: parsed.mapQuery ?? DEFAULT_ZONES.mapQuery,
              backgroundColor: parsed.backgroundColor ?? undefined,
            });
          } catch {
            setZones(DEFAULT_ZONES);
          }
        }
      } catch {
        if (mounted) setZones(DEFAULT_ZONES);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "contact_zones", value: JSON.stringify(zones) }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j?.error ?? "Erreur sauvegarde");
      }
      try {
        window.dispatchEvent(new CustomEvent("site-settings-updated", { detail: { key: "contact_zones", value: JSON.stringify(zones) } }));
      } catch (_) {}
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
      <div className="modal-overlay-mobile" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
        <div style={{ background: "#fff", padding: 24, borderRadius: 8 }}>Chargement…</div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <div style={{ background: "#fff", color: "#000", padding: 20, width: 560, maxWidth: "98%", maxHeight: "90vh", overflowY: "auto", borderRadius: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Modifier les zones (QG, Paris, France & carte)</h3>
          <button type="button" onClick={onClose} aria-label="Fermer" style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <section style={{ marginBottom: 20 }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "var(--muted)" }}>Zone 1 — QG</h4>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
              <input
                type="text"
                value={zones.qg?.title ?? ""}
                onChange={(e) => setZones((z) => ({ ...z, qg: { ...z.qg, title: e.target.value } }))}
                style={{ flex: 1, minWidth: 120, padding: "8px 10px", border: "1px solid #e6e6e6", borderRadius: 6, boxSizing: "border-box" }}
              />
              <select value={zones.qg?.titleStyle ?? "h3"} onChange={(e) => setZones((z) => ({ ...z, qg: { ...z.qg, titleStyle: e.target.value as TitleStyleKey } }))} style={{ width: 120, padding: "8px 10px", border: "1px solid #e6e6e6", borderRadius: 6 }}>
                {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={zones.qg?.titleFontSize ?? ""} onChange={(e) => { const v = e.target.value === "" ? undefined : Math.min(TITLE_FONT_SIZE_MAX, Math.max(TITLE_FONT_SIZE_MIN, Number(e.target.value))); setZones((z) => ({ ...z, qg: { ...z.qg, titleFontSize: v } })); }} placeholder="px" style={{ width: 64, padding: "8px 10px", border: "1px solid #e6e6e6", borderRadius: 6 }} title="Taille titre (8–72 px)" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Texte</label>
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minHeight: 44, border: "1px solid #e6e6e6", borderRadius: 6, padding: 10, background: "#fff" }} dangerouslySetInnerHTML={{ __html: zones.qg?.text || "<p style='color:#999'>Aucun</p>" }} />
              <button type="button" className="btn-ghost" onClick={() => setEditingZone("qg")}>Éditer</button>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Téléphone</label>
            <input
              type="text"
              value={zones.qg?.phone ?? ""}
              onChange={(e) => setZones((z) => ({ ...z, qg: { ...z.qg, phone: e.target.value } }))}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #e6e6e6", borderRadius: 6, boxSizing: "border-box" }}
              placeholder="06 74 96 64 58"
            />
          </div>
        </section>

        <section style={{ marginBottom: 20 }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "var(--muted)" }}>Zone 2 — Paris & Alentours</h4>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
              <input
                type="text"
                value={zones.paris?.title ?? ""}
                onChange={(e) => setZones((z) => ({ ...z, paris: { ...z.paris, title: e.target.value } }))}
                style={{ flex: 1, minWidth: 120, padding: "8px 10px", border: "1px solid #e6e6e6", borderRadius: 6, boxSizing: "border-box" }}
              />
              <select value={zones.paris?.titleStyle ?? "h3"} onChange={(e) => setZones((z) => ({ ...z, paris: { ...z.paris, titleStyle: e.target.value as TitleStyleKey } }))} style={{ width: 120, padding: "8px 10px", border: "1px solid #e6e6e6", borderRadius: 6 }}>
                {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={zones.paris?.titleFontSize ?? ""} onChange={(e) => { const v = e.target.value === "" ? undefined : Math.min(TITLE_FONT_SIZE_MAX, Math.max(TITLE_FONT_SIZE_MIN, Number(e.target.value))); setZones((z) => ({ ...z, paris: { ...z.paris, titleFontSize: v } })); }} placeholder="px" style={{ width: 64, padding: "8px 10px", border: "1px solid #e6e6e6", borderRadius: 6 }} title="Taille titre (8–72 px)" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Texte</label>
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minHeight: 44, border: "1px solid #e6e6e6", borderRadius: 6, padding: 10, background: "#fff" }} dangerouslySetInnerHTML={{ __html: zones.paris?.text || "<p style='color:#999'>Aucun</p>" }} />
              <button type="button" className="btn-ghost" onClick={() => setEditingZone("paris")}>Éditer</button>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 20 }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "var(--muted)" }}>Zone 3 — France & Monde</h4>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
              <input
                type="text"
                value={zones.france?.title ?? ""}
                onChange={(e) => setZones((z) => ({ ...z, france: { ...z.france, title: e.target.value } }))}
                style={{ flex: 1, minWidth: 120, padding: "8px 10px", border: "1px solid #e6e6e6", borderRadius: 6, boxSizing: "border-box" }}
              />
              <select value={zones.france?.titleStyle ?? "h3"} onChange={(e) => setZones((z) => ({ ...z, france: { ...z.france, titleStyle: e.target.value as TitleStyleKey } }))} style={{ width: 120, padding: "8px 10px", border: "1px solid #e6e6e6", borderRadius: 6 }}>
                {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={zones.france?.titleFontSize ?? ""} onChange={(e) => { const v = e.target.value === "" ? undefined : Math.min(TITLE_FONT_SIZE_MAX, Math.max(TITLE_FONT_SIZE_MIN, Number(e.target.value))); setZones((z) => ({ ...z, france: { ...z.france, titleFontSize: v } })); }} placeholder="px" style={{ width: 64, padding: "8px 10px", border: "1px solid #e6e6e6", borderRadius: 6 }} title="Taille titre (8–72 px)" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Texte</label>
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minHeight: 44, border: "1px solid #e6e6e6", borderRadius: 6, padding: 10, background: "#fff" }} dangerouslySetInnerHTML={{ __html: zones.france?.text || "<p style='color:#999'>Aucun</p>" }} />
              <button type="button" className="btn-ghost" onClick={() => setEditingZone("france")}>Éditer</button>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 20 }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "var(--muted)" }}>Carte Google Maps</h4>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Adresse ou recherche (ex. 92140 Clamart)</label>
            <input
              type="text"
              value={zones.mapQuery ?? ""}
              onChange={(e) => setZones((z) => ({ ...z, mapQuery: e.target.value }))}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #e6e6e6", borderRadius: 6, boxSizing: "border-box" }}
              placeholder="92140 Clamart"
            />
          </div>
        </section>

        <section style={{ marginBottom: 20 }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "var(--muted)" }}>Apparence</h4>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Couleur de fond (optionnel)</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
              <input
                type="color"
                value={zones.backgroundColor || "#fafaf9"}
                onChange={(e) => setZones((z) => ({ ...z, backgroundColor: e.target.value }))}
                style={{ width: 48, height: 32, padding: 0, border: "1px solid #e6e6e6", borderRadius: 6 }}
              />
              <input
                type="text"
                value={zones.backgroundColor ?? ""}
                onChange={(e) => setZones((z) => ({ ...z, backgroundColor: e.target.value }))}
                placeholder="ou hex"
                style={{ width: 120, padding: "8px 10px", border: "1px solid #e6e6e6", borderRadius: 6, boxSizing: "border-box" }}
              />
              {(zones.backgroundColor ?? "") && (
                <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setZones((z) => ({ ...z, backgroundColor: undefined }))}>Effacer</button>
              )}
            </div>
          </div>
        </section>

        {error && <div style={{ color: "crimson", marginBottom: 8 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </div>

      {editingZone === "qg" && (
        <RichTextModal
          title="Éditer zone QG"
          initial={zones.qg?.text ?? ""}
          onClose={() => setEditingZone(null)}
          onSave={(h) => { setZones((z) => ({ ...z, qg: { ...z.qg, text: h } })); setEditingZone(null); }}
        />
      )}
      {editingZone === "paris" && (
        <RichTextModal
          title="Éditer zone Paris & Alentours"
          initial={zones.paris?.text ?? ""}
          onClose={() => setEditingZone(null)}
          onSave={(h) => { setZones((z) => ({ ...z, paris: { ...z.paris, text: h } })); setEditingZone(null); }}
        />
      )}
      {editingZone === "france" && (
        <RichTextModal
          title="Éditer zone France & Monde"
          initial={zones.france?.text ?? ""}
          onClose={() => setEditingZone(null)}
          onSave={(h) => { setZones((z) => ({ ...z, france: { ...z.france, text: h } })); setEditingZone(null); }}
        />
      )}
    </div>
  );
}
