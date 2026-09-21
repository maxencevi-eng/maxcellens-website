"use no memo";
"use client";
import { AdminModal } from '../admin';

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import ModalTabs from "../ui/ModalTabs";

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

/** Icônes des points portés sur la carte. */
export type MapPointIconKey = "pin" | "plane" | "train" | "car";
/** Icônes des trois cartes et de la ligne de bas de bloc. */
export type ZoneIconKey = "pin" | "train" | "plane" | "car" | "compass" | "globe" | "calendar";

export type ContactZonePoint = {
  label: string;
  detail?: string;
  lat: number;
  lng: number;
  icon?: MapPointIconKey;
  /** Le point de départ : épingle pleine et halo, au lieu d'une puce. */
  primary?: boolean;
};

export type ContactZoneCard = {
  /** Sur-titre de la carte (« BASE », « ÎLE-DE-FRANCE »…). */
  kicker?: string;
  icon?: ZoneIconKey;
  title?: string;
  text?: string;
  phone?: string;
  titleStyle?: TitleStyleKey;
  titleFontSize?: number;
};

export type ContactZonesData = {
  /** Sur-titre du bloc. Le modèle n'affiche que celui-ci, pas de gros titre. */
  eyebrow?: string;
  /** Typographie du sur-titre, sur le modèle des titres de blocs de l'accueil. */
  eyebrowStyle?: TitleStyleKey;
  eyebrowFontSize?: number;
  eyebrowColor?: string;
  eyebrowAlign?: "left" | "center" | "right";
  /** Le sur-titre est en capitales par défaut ; décocher rend la casse saisie. */
  eyebrowUppercase?: boolean;
  qg?: ContactZoneCard;
  paris?: ContactZoneCard;
  france?: ContactZoneCard;
  /** Recherche Google Maps : sert au lien « Voir sur Google Maps ». */
  mapQuery?: string;
  map?: {
    lat?: number;
    lng?: number;
    zoom?: number;
    /** Gabarit XYZ. {r} vaut "@2x" sur écran HiDPI. Voir LocationMap. */
    tileUrl?: string;
    attribution?: string;
    /** true = le fournisseur sert déjà un fond gris, on n'applique pas le filtre. */
    plainTiles?: boolean;
    points?: ContactZonePoint[];
  };
  footnotes?: { icon?: ZoneIconKey; text: string }[];
  backgroundColor?: string;
  /** Onglet Style — mêmes réglages que les blocs de la page d'accueil. */
  borderRadiusTop?: number;
  borderRadiusBottom?: number;
  paddingTop?: number;
  paddingBottom?: number;
  /** Marge intérieure horizontale. Vide = marge des blocs (Page > Dimensions). */
  paddingX?: number;
};

/**
 * Fond de carte par défaut : tuiles OpenStreetMap, libres et sans clé d'API.
 * Le gris clair du modèle est obtenu par un filtre CSS (voir LocationMap.module.css)
 * plutôt que par un fournisseur de tuiles déjà stylé — ceux-ci (CARTO, Stadia,
 * MapTiler…) demandent tous une clé. Pour en utiliser un, il suffit de coller
 * son gabarit ici : le reste du composant est inchangé.
 */
export const DEFAULT_MAP_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const DEFAULT_MAP_ATTRIBUTION = "© OpenStreetMap";

export const DEFAULT_ZONES: ContactZonesData = {
  eyebrow: "Localisation",
  qg: {
    kicker: "Base",
    icon: "pin",
    title: "QG",
    text: "<p>Basé à Clamart (92). Point de départ de mes missions en Île-de-France.</p>",
    phone: "06 74 96 64 58",
    titleStyle: "h3",
  },
  paris: {
    kicker: "Île-de-France",
    icon: "train",
    title: "Paris & Alentours",
    text: "<p>Priorité aux transports en commun. Voiture possible pour la banlieue proche — frais kilométriques.</p>",
    titleStyle: "h3",
  },
  france: {
    kicker: "Destinations",
    icon: "plane",
    title: "France & Monde",
    text: "<p>Déplacements réguliers en train pour des missions partout en France et parfois à l'étranger — frais de déplacement.</p>",
    titleStyle: "h3",
  },
  mapQuery: "92140 Clamart",
  map: {
    lat: 48.82,
    lng: 2.32,
    zoom: 10,
    tileUrl: DEFAULT_MAP_TILE_URL,
    attribution: DEFAULT_MAP_ATTRIBUTION,
    points: [
      { label: "Clamart", detail: "Point de départ", lat: 48.7997, lng: 2.2625, icon: "pin", primary: true },
      { label: "Aéroport Charles de Gaulle", detail: "~ 45 min", lat: 49.0097, lng: 2.5479, icon: "plane" },
      { label: "Aéroport d’Orly", detail: "~ 25 min", lat: 48.7262, lng: 2.3652, icon: "plane" },
    ],
  },
  footnotes: [
    { icon: "compass", text: "Des projets locaux aux grandes destinations." },
    { icon: "globe", text: "Disponible en France et à l’étranger." },
    { icon: "calendar", text: "Déplacements organisés selon vos besoins." },
  ],
};

function toHtml(val: string | undefined): string {
  if (!val || !val.trim()) return "";
  if (/<[a-z][\s\S]*>/i.test(val)) return val;
  return `<p>${val.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`;
}

const ZONE_ICON_OPTIONS: { value: ZoneIconKey; label: string }[] = [
  { value: "pin", label: "Épingle" },
  { value: "train", label: "Train" },
  { value: "plane", label: "Avion" },
  { value: "car", label: "Voiture" },
  { value: "compass", label: "Boussole" },
  { value: "globe", label: "Globe" },
  { value: "calendar", label: "Calendrier" },
];

const MAP_ICON_OPTIONS: { value: MapPointIconKey; label: string }[] = [
  { value: "pin", label: "Épingle" },
  { value: "plane", label: "Avion" },
  { value: "train", label: "Train" },
  { value: "car", label: "Voiture" },
];

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #e6e6e6",
  borderRadius: 6,
  boxSizing: "border-box",
  fontSize: 14,
};

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
  const [tab, setTab] = useState<'bloc' | 'qg' | 'paris' | 'france' | 'carte' | 'style'>('bloc');

  /** Paire de champs px, sur le modèle des modaux de la page d'accueil. */
  const numberPair = (
    label: string,
    max: number,
    keys: [keyof ContactZonesData, keyof ContactZonesData],
    labels: [string, string] = ["Haut (px)", "Bas (px)"],
  ) => {
    const [kA, kB] = keys;
    const vA = zones[kA] as number | undefined;
    const vB = zones[kB] as number | undefined;
    const set = (k: keyof ContactZonesData, raw: string) =>
      setZones((z) => ({ ...z, [k]: raw === "" ? undefined : Math.max(0, Math.min(max, Number(raw))) }));
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>{label}</label>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--muted)" }}>{labels[0]}</label>
            <input type="number" min={0} max={max} value={vA ?? ""} onChange={(e) => set(kA, e.target.value)} placeholder="défaut CSS" style={{ ...inputStyle, width: 96 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: "var(--muted)" }}>{labels[1]}</label>
            <input type="number" min={0} max={max} value={vB ?? ""} onChange={(e) => set(kB, e.target.value)} placeholder="défaut CSS" style={{ ...inputStyle, width: 96 }} />
          </div>
          {(vA != null || vB != null) ? (
            <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setZones((z) => ({ ...z, [kA]: undefined, [kB]: undefined }))}>↺ Réinitialiser</button>
          ) : null}
        </div>
      </div>
    );
  };

  /** Champs communs aux trois cartes : sur-titre + icône. */
  const cardHeaderFields = (key: 'qg' | 'paris' | 'france') => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Sur-titre et icône</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          value={zones[key]?.kicker ?? ""}
          onChange={(e) => setZones((z) => ({ ...z, [key]: { ...z[key], kicker: e.target.value } }))}
          placeholder="BASE"
          style={{ ...inputStyle, flex: 1, minWidth: 120 }}
        />
        <select
          value={zones[key]?.icon ?? "pin"}
          onChange={(e) => setZones((z) => ({ ...z, [key]: { ...z[key], icon: e.target.value as ZoneIconKey } }))}
          style={{ ...inputStyle, width: 140 }}
        >
          {ZONE_ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );

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
              eyebrow: parsed.eyebrow ?? DEFAULT_ZONES.eyebrow,
              eyebrowStyle: style(parsed.eyebrowStyle),
              eyebrowFontSize: clampFs(parsed.eyebrowFontSize),
              eyebrowColor: parsed.eyebrowColor,
              eyebrowAlign: parsed.eyebrowAlign,
              eyebrowUppercase: parsed.eyebrowUppercase,
              qg: { ...DEFAULT_ZONES.qg, ...parsed.qg, titleStyle: style(parsed.qg?.titleStyle) ?? "h3", titleFontSize: clampFs(parsed.qg?.titleFontSize), text: parsed.qg?.text != null ? (/<[a-z][\s\S]*>/i.test(String(parsed.qg.text)) ? parsed.qg.text : toHtml(parsed.qg.text)) : DEFAULT_ZONES.qg?.text },
              paris: { ...DEFAULT_ZONES.paris, ...parsed.paris, titleStyle: style(parsed.paris?.titleStyle) ?? "h3", titleFontSize: clampFs(parsed.paris?.titleFontSize), text: parsed.paris?.text != null ? (/<[a-z][\s\S]*>/i.test(String(parsed.paris.text)) ? parsed.paris.text : toHtml(parsed.paris.text)) : DEFAULT_ZONES.paris?.text },
              france: { ...DEFAULT_ZONES.france, ...parsed.france, titleStyle: style(parsed.france?.titleStyle) ?? "h3", titleFontSize: clampFs(parsed.france?.titleFontSize), text: parsed.france?.text != null ? (/<[a-z][\s\S]*>/i.test(String(parsed.france.text)) ? parsed.france.text : toHtml(parsed.france.text)) : DEFAULT_ZONES.france?.text },
              mapQuery: parsed.mapQuery ?? DEFAULT_ZONES.mapQuery,
              // `points` n'est pas fusionné élément par élément : une liste vidée
              // dans l'admin doit le rester, et non repeupler les défauts.
              map: { ...DEFAULT_ZONES.map, ...parsed.map, points: parsed.map?.points ?? DEFAULT_ZONES.map?.points },
              footnotes: parsed.footnotes ?? DEFAULT_ZONES.footnotes,
              backgroundColor: parsed.backgroundColor ?? undefined,
              borderRadiusTop: parsed.borderRadiusTop,
              borderRadiusBottom: parsed.borderRadiusBottom,
              paddingTop: parsed.paddingTop,
              paddingBottom: parsed.paddingBottom,
              paddingX: parsed.paddingX,
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
    // Même coque que l'état chargé : la modale ne « saute » pas à l'arrivée
    // des données.
    return (
      <AdminModal title="Zones d’intervention" size="md" onClose={onClose} footer={null}>
        Chargement…
      </AdminModal>
    );
  }

  const qgTitleStyle = zones.qg?.titleStyle ?? "h3";
  const qgTitleFontSize = zones.qg?.titleFontSize ?? "";
  const qgTitle = zones.qg?.title ?? "";
  const qgPhone = zones.qg?.phone ?? "";

  const parisTitleStyle = zones.paris?.titleStyle ?? "h3";
  const parisTitleFontSize = zones.paris?.titleFontSize ?? "";
  const parisTitle = zones.paris?.title ?? "";

  const franceTitleStyle = zones.france?.titleStyle ?? "h3";
  const franceTitleFontSize = zones.france?.titleFontSize ?? "";
  const franceTitle = zones.france?.title ?? "";

  const mapQuery = zones.mapQuery ?? "";
  const backgroundColor = zones.backgroundColor ?? "";

  const mapCfg = zones.map ?? {};
  const setMap = (patch: Partial<NonNullable<ContactZonesData["map"]>>) =>
    setZones((z) => ({ ...z, map: { ...z.map, ...patch } }));
  const setPoint = (index: number, patch: Partial<ContactZonePoint>) =>
    setZones((z) => ({
      ...z,
      map: { ...z.map, points: (z.map?.points ?? []).map((p, j) => (j === index ? { ...p, ...patch } : p)) },
    }));

  return (
    <AdminModal
      title="Zones d’intervention"
      subtitle="Secteurs géographiques affichés sur la page Contact."
      size="md"
      onClose={onClose}
      footer={null}
    >

        <ModalTabs
          tabs={[
            { id: 'bloc', label: 'Bloc' },
            { id: 'qg', label: 'Zone QG' },
            { id: 'paris', label: 'Paris' },
            { id: 'france', label: 'France & Monde' },
            { id: 'carte', label: 'Carte' },
            { id: 'style', label: 'Style' },
          ]}
          active={tab}
          onChange={(t) => setTab(t as any)}
        />

        <div style={{ marginTop: 16 }}>

          {tab === 'bloc' && (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Sur-titre du bloc</label>
                <input type="text" value={zones.eyebrow ?? ""} onChange={(e) => setZones((z) => ({ ...z, eyebrow: e.target.value }))} placeholder="Localisation" style={{ ...inputStyle, width: "100%" }} />

                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", margin: "12px 0 4px" }}>Police, taille et alignement</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    value={zones.eyebrowStyle ?? ""}
                    onChange={(e) => setZones((z) => ({ ...z, eyebrowStyle: e.target.value === "" ? undefined : e.target.value as TitleStyleKey }))}
                    style={{ ...inputStyle, width: 150 }}
                  >
                    <option value="">Police du bloc</option>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input
                    type="number"
                    min={TITLE_FONT_SIZE_MIN}
                    max={TITLE_FONT_SIZE_MAX}
                    value={zones.eyebrowFontSize ?? ""}
                    onChange={(e) => setZones((z) => ({ ...z, eyebrowFontSize: e.target.value === "" ? undefined : Math.min(TITLE_FONT_SIZE_MAX, Math.max(TITLE_FONT_SIZE_MIN, Number(e.target.value))) }))}
                    placeholder="px"
                    style={{ ...inputStyle, width: 72 }}
                  />
                  <select
                    value={zones.eyebrowAlign ?? "center"}
                    onChange={(e) => setZones((z) => ({ ...z, eyebrowAlign: e.target.value as "left" | "center" | "right" }))}
                    style={{ ...inputStyle, width: 110 }}
                  >
                    <option value="left">Gauche</option>
                    <option value="center">Centré</option>
                    <option value="right">Droite</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
                  <input type="color" value={zones.eyebrowColor || "#6b7670"} onChange={(e) => setZones((z) => ({ ...z, eyebrowColor: e.target.value }))} style={{ width: 48, height: 32, padding: 0, border: "1px solid #e6e6e6", borderRadius: 6 }} />
                  <input type="text" value={zones.eyebrowColor ?? ""} onChange={(e) => setZones((z) => ({ ...z, eyebrowColor: e.target.value }))} placeholder="couleur (hex)" style={{ ...inputStyle, width: 130 }} />
                  {zones.eyebrowColor ? <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setZones((z) => ({ ...z, eyebrowColor: undefined }))}>Effacer</button> : null}
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
                    <input type="checkbox" checked={zones.eyebrowUppercase !== false} onChange={(e) => setZones((z) => ({ ...z, eyebrowUppercase: e.target.checked }))} />
                    Capitales
                  </label>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Ligne de bas de bloc</label>
                {(zones.footnotes ?? []).map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <select
                      value={f.icon ?? "compass"}
                      onChange={(e) => setZones((z) => ({ ...z, footnotes: (z.footnotes ?? []).map((x, j) => j === i ? { ...x, icon: e.target.value as ZoneIconKey } : x) }))}
                      style={{ ...inputStyle, width: 130 }}
                    >
                      {ZONE_ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <input
                      type="text"
                      value={f.text}
                      onChange={(e) => setZones((z) => ({ ...z, footnotes: (z.footnotes ?? []).map((x, j) => j === i ? { ...x, text: e.target.value } : x) }))}
                      style={{ ...inputStyle, flex: 1, minWidth: 140 }}
                    />
                    <button type="button" className="btn-ghost" onClick={() => setZones((z) => ({ ...z, footnotes: (z.footnotes ?? []).filter((_, j) => j !== i) }))}>Retirer</button>
                  </div>
                ))}
                <button type="button" className="btn-secondary" onClick={() => setZones((z) => ({ ...z, footnotes: [...(z.footnotes ?? []), { icon: "compass", text: "" }] }))}>Ajouter une mention</button>
              </div>
            </>
          )}

          {tab === 'qg' && (
            <>
              {cardHeaderFields('qg')}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="text" value={qgTitle} onChange={(e) => setZones((z) => ({ ...z, qg: { ...z.qg, title: e.target.value } }))} style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
                  <select value={qgTitleStyle} onChange={(e) => setZones((z) => ({ ...z, qg: { ...z.qg, titleStyle: e.target.value as TitleStyleKey } }))} style={{ ...inputStyle, width: 120 }}>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={qgTitleFontSize} onChange={(e) => { const v = e.target.value === "" ? undefined : Math.min(TITLE_FONT_SIZE_MAX, Math.max(TITLE_FONT_SIZE_MIN, Number(e.target.value))); setZones((z) => ({ ...z, qg: { ...z.qg, titleFontSize: v } })); }} placeholder="px" style={{ ...inputStyle, width: 64 }} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Texte</label>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minHeight: 44, border: "1px solid #e6e6e6", borderRadius: 6, padding: 10, background: "#fff" }} dangerouslySetInnerHTML={{ __html: zones.qg?.text || "<p style='color:#999'>Aucun</p>" }} />
                  <button type="button" className="btn-ghost" onClick={() => setEditingZone("qg")}>Éditer</button>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Téléphone</label>
                <input type="text" value={qgPhone} onChange={(e) => setZones((z) => ({ ...z, qg: { ...z.qg, phone: e.target.value } }))} style={{ ...inputStyle, width: "100%" }} placeholder="06 74 96 64 58" />
              </div>
            </>
          )}

          {tab === 'paris' && (
            <>
              {cardHeaderFields('paris')}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="text" value={parisTitle} onChange={(e) => setZones((z) => ({ ...z, paris: { ...z.paris, title: e.target.value } }))} style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
                  <select value={parisTitleStyle} onChange={(e) => setZones((z) => ({ ...z, paris: { ...z.paris, titleStyle: e.target.value as TitleStyleKey } }))} style={{ ...inputStyle, width: 120 }}>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={parisTitleFontSize} onChange={(e) => { const v = e.target.value === "" ? undefined : Math.min(TITLE_FONT_SIZE_MAX, Math.max(TITLE_FONT_SIZE_MIN, Number(e.target.value))); setZones((z) => ({ ...z, paris: { ...z.paris, titleFontSize: v } })); }} placeholder="px" style={{ ...inputStyle, width: 64 }} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Texte</label>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minHeight: 44, border: "1px solid #e6e6e6", borderRadius: 6, padding: 10, background: "#fff" }} dangerouslySetInnerHTML={{ __html: zones.paris?.text || "<p style='color:#999'>Aucun</p>" }} />
                  <button type="button" className="btn-ghost" onClick={() => setEditingZone("paris")}>Éditer</button>
                </div>
              </div>
            </>
          )}

          {tab === 'france' && (
            <>
              {cardHeaderFields('france')}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="text" value={franceTitle} onChange={(e) => setZones((z) => ({ ...z, france: { ...z.france, title: e.target.value } }))} style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
                  <select value={franceTitleStyle} onChange={(e) => setZones((z) => ({ ...z, france: { ...z.france, titleStyle: e.target.value as TitleStyleKey } }))} style={{ ...inputStyle, width: 120 }}>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={franceTitleFontSize} onChange={(e) => { const v = e.target.value === "" ? undefined : Math.min(TITLE_FONT_SIZE_MAX, Math.max(TITLE_FONT_SIZE_MIN, Number(e.target.value))); setZones((z) => ({ ...z, france: { ...z.france, titleFontSize: v } })); }} placeholder="px" style={{ ...inputStyle, width: 64 }} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Texte</label>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minHeight: 44, border: "1px solid #e6e6e6", borderRadius: 6, padding: 10, background: "#fff" }} dangerouslySetInnerHTML={{ __html: zones.france?.text || "<p style='color:#999'>Aucun</p>" }} />
                  <button type="button" className="btn-ghost" onClick={() => setEditingZone("france")}>Éditer</button>
                </div>
              </div>
            </>
          )}

          {tab === 'carte' && (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Cadrage</label>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Latitude</label>
                    <input type="number" step="0.0001" value={mapCfg.lat ?? ""} onChange={(e) => setMap({ lat: e.target.value === "" ? undefined : Number(e.target.value) })} style={{ ...inputStyle, width: 120 }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Longitude</label>
                    <input type="number" step="0.0001" value={mapCfg.lng ?? ""} onChange={(e) => setMap({ lng: e.target.value === "" ? undefined : Number(e.target.value) })} style={{ ...inputStyle, width: 120 }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Zoom (3–18)</label>
                    <input type="number" min={3} max={18} value={mapCfg.zoom ?? ""} onChange={(e) => setMap({ zoom: e.target.value === "" ? undefined : Math.min(18, Math.max(3, Number(e.target.value))) })} style={{ ...inputStyle, width: 90 }} />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Points remarquables</label>
                {(mapCfg.points ?? []).map((p, i) => (
                  <div key={i} style={{ border: "1px solid #ececec", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                      <input type="text" value={p.label} onChange={(e) => setPoint(i, { label: e.target.value })} placeholder="Nom" style={{ ...inputStyle, flex: 1, minWidth: 130 }} />
                      <input type="text" value={p.detail ?? ""} onChange={(e) => setPoint(i, { detail: e.target.value })} placeholder="Détail (~ 25 min)" style={{ ...inputStyle, width: 140 }} />
                      <select value={p.icon ?? "pin"} onChange={(e) => setPoint(i, { icon: e.target.value as MapPointIconKey })} style={{ ...inputStyle, width: 110 }}>
                        {MAP_ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input type="number" step="0.0001" value={p.lat} onChange={(e) => setPoint(i, { lat: Number(e.target.value) })} placeholder="Latitude" style={{ ...inputStyle, width: 120 }} />
                      <input type="number" step="0.0001" value={p.lng} onChange={(e) => setPoint(i, { lng: Number(e.target.value) })} placeholder="Longitude" style={{ ...inputStyle, width: 120 }} />
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
                        <input type="checkbox" checked={!!p.primary} onChange={(e) => setPoint(i, { primary: e.target.checked })} />
                        Point de départ
                      </label>
                      <button type="button" className="btn-ghost" style={{ marginLeft: "auto" }} onClick={() => setMap({ points: (mapCfg.points ?? []).filter((_, j) => j !== i) })}>Retirer</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-secondary" onClick={() => setMap({ points: [...(mapCfg.points ?? []), { label: "", lat: 48.8566, lng: 2.3522, icon: "pin" }] })}>Ajouter un point</button>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                  Un point hors cadre reste affiché, ramené contre le bord de la carte.
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Lien « Voir sur Google Maps »</label>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Adresse ou recherche (ex. 92140 Clamart)</label>
                <input type="text" value={mapQuery} onChange={(e) => setZones((z) => ({ ...z, mapQuery: e.target.value }))} style={{ ...inputStyle, width: "100%" }} placeholder="92140 Clamart" />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Fournisseur de tuiles</label>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Gabarit XYZ — {"{z}/{x}/{y}"}, et {"{r}"} pour les écrans haute densité</label>
                <input type="text" value={mapCfg.tileUrl ?? ""} onChange={(e) => setMap({ tileUrl: e.target.value })} style={{ ...inputStyle, width: "100%" }} placeholder={DEFAULT_MAP_TILE_URL} />
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", margin: "8px 0 4px" }}>Mention obligatoire du fournisseur</label>
                <input type="text" value={mapCfg.attribution ?? ""} onChange={(e) => setMap({ attribution: e.target.value })} style={{ ...inputStyle, width: "100%" }} placeholder={DEFAULT_MAP_ATTRIBUTION} />
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", marginTop: 10 }}>
                  <input type="checkbox" checked={!!mapCfg.plainTiles} onChange={(e) => setMap({ plainTiles: e.target.checked })} />
                  Le fournisseur sert déjà un fond gris (ne pas désaturer)
                </label>
              </div>
            </>
          )}

          {tab === 'style' && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Couleur de fond (optionnel)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={backgroundColor || "#fafaf9"} onChange={(e) => setZones((z) => ({ ...z, backgroundColor: e.target.value }))} style={{ width: 48, height: 32, padding: 0, border: "1px solid #e6e6e6", borderRadius: 6 }} />
                  <input type="text" value={backgroundColor} onChange={(e) => setZones((z) => ({ ...z, backgroundColor: e.target.value }))} placeholder="ou hex" style={{ ...inputStyle, width: 120 }} />
                  {backgroundColor && (
                    <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setZones((z) => ({ ...z, backgroundColor: undefined }))}>Effacer</button>
                  )}
                </div>
              </div>
              {numberPair("Arrondis de la section", 120, ["borderRadiusTop", "borderRadiusBottom"])}
              {numberPair("Espacement interne vertical (px)", 300, ["paddingTop", "paddingBottom"])}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Marge intérieure horizontale (px)</label>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="number"
                    min={0}
                    max={300}
                    value={zones.paddingX ?? ""}
                    onChange={(e) => setZones((z) => ({ ...z, paddingX: e.target.value === "" ? undefined : Math.max(0, Math.min(300, Number(e.target.value))) }))}
                    placeholder="réglage global"
                    style={{ ...inputStyle, width: 120 }}
                  />
                  {zones.paddingX != null ? (
                    <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setZones((z) => ({ ...z, paddingX: undefined }))}>↺ Réinitialiser</button>
                  ) : null}
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                  Vide : le bloc suit « Marge intérieure des blocs » (Page &gt; Dimensions &amp; mise en page).
                </p>
              </div>
            </>
          )}

        </div>

        {error && <div style={{ color: "crimson", marginBottom: 8 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
        </div>

      {/* Éditeurs de texte riche : AdminModal les empile au-dessus de celui-ci. */}
      {editingZone === "qg" && (
        <RichTextModal title="Éditer zone QG" initial={zones.qg?.text ?? ""} onClose={() => setEditingZone(null)} onSave={(h) => { setZones((z) => ({ ...z, qg: { ...z.qg, text: h } })); setEditingZone(null); }} />
      )}
      {editingZone === "paris" && (
        <RichTextModal title="Éditer zone Paris & Alentours" initial={zones.paris?.text ?? ""} onClose={() => setEditingZone(null)} onSave={(h) => { setZones((z) => ({ ...z, paris: { ...z.paris, text: h } })); setEditingZone(null); }} />
      )}
      {editingZone === "france" && (
        <RichTextModal title="Éditer zone France & Monde" initial={zones.france?.text ?? ""} onClose={() => setEditingZone(null)} onSave={(h) => { setZones((z) => ({ ...z, france: { ...z.france, text: h } })); setEditingZone(null); }} />
      )}
    </AdminModal>
  );
}
