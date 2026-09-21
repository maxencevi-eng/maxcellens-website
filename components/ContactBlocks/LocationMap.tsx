"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin, Plane, TrainFront, Car, Navigation, ChevronRight } from "lucide-react";
import styles from "./LocationMap.module.css";

export type MapPointIcon = "pin" | "plane" | "train" | "car";

export type MapPoint = {
  label: string;
  detail?: string;
  lat: number;
  lng: number;
  icon?: MapPointIcon;
  /** Point de départ : épingle pleine + halo de rayon, au lieu d'une puce. */
  primary?: boolean;
};

export type LocationMapProps = {
  lat: number;
  lng: number;
  zoom: number;
  points?: MapPoint[];
  /** Gabarit de tuiles XYZ. {z}/{x}/{y} sont remplacés ; {r} vaut "@2x" sur écran HiDPI. */
  tileUrl?: string;
  attribution?: string;
  /** Lien du bouton « Voir sur Google Maps ». Absent = pas de bouton. */
  externalUrl?: string;
  externalLabel?: string;
  /** false quand le fournisseur sert déjà un fond gris : pas de filtre CSS. */
  desaturate?: boolean;
  className?: string;
};

/**
 * Carte statique en tuiles XYZ.
 *
 * Un embed Google Maps (`output=embed`) ne peut être ni restylé ni surchargé de
 * repères ancrés géographiquement : le fond vient d'un fournisseur de tuiles et
 * les repères sont des éléments DOM positionnés par la même projection Web
 * Mercator que les tuiles — ils restent donc alignés quels que soient le centre,
 * le zoom et la taille du conteneur.
 *
 * Le défaut (CARTO Positron) ne demande pas de clé. Pour un fournisseur à clé,
 * il suffit de passer `tileUrl` (et `attribution`) : rien d'autre ne change.
 */

const TILE_SIZE = 256;

/** Coordonnées monde en pixels, au zoom donné. */
function project(lat: number, lng: number, zoom: number) {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const siny = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) * scale,
  };
}

const ICONS: Record<MapPointIcon, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  pin: MapPin,
  plane: Plane,
  train: TrainFront,
  car: Car,
};

export default function LocationMap({
  lat,
  lng,
  zoom,
  points = [],
  tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution = "© OpenStreetMap",
  externalUrl,
  externalLabel = "Voir sur Google Maps",
  desaturate = true,
  className,
}: LocationMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Dimensions de repli avant mesure : évite un conteneur vide au premier rendu
  // (et côté serveur, où il n'y a pas de mise en page).
  const [size, setSize] = useState({ w: 1200, h: 440 });
  const [retina, setRetina] = useState(false);

  useEffect(() => {
    setRetina(typeof window !== "undefined" && window.devicePixelRatio > 1.25);
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize({ w: Math.ceil(r.width), h: Math.ceil(r.height) });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const z = Math.round(zoom);
  const center = project(lat, lng, z);
  // Pixel monde du coin haut-gauche du conteneur.
  const originX = center.x - size.w / 2;
  const originY = center.y - size.h / 2;

  const maxTile = Math.pow(2, z);
  const firstX = Math.floor(originX / TILE_SIZE);
  const lastX = Math.floor((originX + size.w) / TILE_SIZE);
  const firstY = Math.floor(originY / TILE_SIZE);
  const lastY = Math.floor((originY + size.h) / TILE_SIZE);

  const tiles: { key: string; src: string; left: number; top: number }[] = [];
  for (let tx = firstX; tx <= lastX; tx++) {
    for (let ty = firstY; ty <= lastY; ty++) {
      if (ty < 0 || ty >= maxTile) continue; // pas de tuile au-delà des pôles
      const wrappedX = ((tx % maxTile) + maxTile) % maxTile; // le monde boucle en longitude
      tiles.push({
        key: `${z}/${tx}/${ty}`,
        src: tileUrl
          .replace("{z}", String(z))
          .replace("{x}", String(wrappedX))
          .replace("{y}", String(ty))
          .replace("{r}", retina ? "@2x" : ""),
        left: tx * TILE_SIZE - originX,
        top: ty * TILE_SIZE - originY,
      });
    }
  }

  // Un repère hors cadre reste visible, ramené contre le bord : les aéroports
  // sont volontairement affichés même quand le cadrage est serré sur la base.
  const EDGE_X = 16;
  // Plus de garde en vertical : une puce est ancrée par son centre et peut
  // passer sur trois lignes en étroit — trop près du bord, elle serait rognée.
  const EDGE_Y = 48;
  const placed = points.map((p, i) => {
    const w = project(p.lat, p.lng, z);
    const x = w.x - originX;
    const y = w.y - originY;
    const clamped = x < EDGE_X || x > size.w - EDGE_X || y < EDGE_Y || y > size.h - EDGE_Y;
    return {
      ...p,
      i,
      x: Math.min(Math.max(x, EDGE_X), Math.max(EDGE_X, size.w - EDGE_X)),
      y: Math.min(Math.max(y, EDGE_Y), Math.max(EDGE_Y, size.h - EDGE_Y)),
      clamped,
      // Une puce qui n'a plus la place de s'étendre vers la droite s'ouvre
      // vers la gauche. 260px = largeur typique d'une puce à deux lignes.
      flip: x > size.w - 260,
    };
  });

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(" ")}>
    <div
      ref={ref}
      className={styles.map}
      data-plain={desaturate ? undefined : "true"}
    >
      <div className={styles.tiles} aria-hidden>
        {tiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element -- tuiles XYZ : l'URL est déjà dimensionnée, next/image n'apporte rien
          <img
            key={t.key}
            src={t.src}
            alt=""
            width={TILE_SIZE}
            height={TILE_SIZE}
            className={styles.tile}
            style={{ left: t.left, top: t.top }}
            draggable={false}
            loading="lazy"
          />
        ))}
      </div>

      <div className={styles.veil} aria-hidden />

      {placed.map((p) => {
        const Icon = ICONS[p.icon ?? "pin"] ?? MapPin;
        if (p.primary && !p.clamped) {
          return (
            <div key={p.i} className={styles.base} style={{ left: p.x, top: p.y }}>
              <span className={styles.baseHalo} aria-hidden />
              <span className={styles.basePin} aria-hidden>
                <MapPin size={22} strokeWidth={2} />
              </span>
              <span className={styles.baseLabel}>
                <strong>{p.label}</strong>
                {p.detail ? <em>{p.detail}</em> : null}
              </span>
            </div>
          );
        }
        return (
          <div
            key={p.i}
            className={`${styles.chip} ${p.flip ? styles.chipFlip : ""}`.trim()}
            style={{ left: p.x, top: p.y }}
          >
            <span className={styles.chipIcon} aria-hidden>
              <Icon size={16} strokeWidth={2} />
            </span>
            <span className={styles.chipText}>
              <strong>{p.label}</strong>
              {p.detail ? <em>{p.detail}</em> : null}
            </span>
          </div>
        );
      })}

      {attribution ? <span className={styles.attribution}>{attribution}</span> : null}
    </div>

    {/* Hors du cadre de la carte : sur mobile il passe sous celle-ci au lieu de
        recouvrir les puces, faute de place. */}
    {externalUrl ? (
      <a className={styles.cta} href={externalUrl} target="_blank" rel="noopener noreferrer">
        <Navigation size={16} strokeWidth={2} aria-hidden />
        {externalLabel}
        <ChevronRight size={15} strokeWidth={2} aria-hidden />
      </a>
    ) : null}
    </div>
  );
}
