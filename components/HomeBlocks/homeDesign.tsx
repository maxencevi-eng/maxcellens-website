"use client";

/**
 * Briques de présentation de la page d'accueil (design « studio ») :
 * ton clair/sombre des panneaux, titres révélés mot à mot, compteurs,
 * timecode du viseur et bouton magnétique.
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import s from "./HomeModern.module.css";

export type Tone = "light" | "dark";

/** Déduit le ton d'un panneau à partir de sa couleur de fond (hex). */
export function toneOf(color: string | undefined, fallback: Tone): Tone {
  const raw = (color || "").trim().replace(/^#/, "");
  const hex = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.36 ? "light" : "dark";
}

/** Styles de panneau réglés depuis l'admin : couleur de fond et marges internes. */
export function panelStyle(data: Record<string, any>): React.CSSProperties | undefined {
  const style: Record<string, string> = {};
  const bg = typeof data.backgroundColor === "string" ? data.backgroundColor.trim() : "";
  if (bg) style["--t-bg"] = /^[0-9a-f]{3,6}$/i.test(bg) ? `#${bg}` : bg;
  if (data.paddingTop != null) style.paddingTop = `${data.paddingTop}px`;
  if (data.paddingBottom != null) style.paddingBottom = `${data.paddingBottom}px`;
  return Object.keys(style).length ? (style as React.CSSProperties) : undefined;
}

/** Transforme le HTML « une ligne par service » en liste de libellés. */
export function htmlToLines(html: string | undefined): string[] {
  if (!html) return [];
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

const EASE = [0.22, 1, 0.36, 1] as const;

/** Titre révélé mot par mot, chaque mot glissant hors d'un masque. */
export function RevealWords({
  text,
  as = "h2",
  className,
  style,
  active,
  delay = 0,
}: {
  text: string;
  as?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Déclenchement piloté (intro) ; sinon à l'entrée dans le viewport. */
  active?: boolean;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  // L'observation porte sur le titre entier : les mots, masqués au départ,
  // ne sont jamais considérés comme visibles par l'IntersectionObserver.
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  if (reduce) return React.createElement(as, { className, style }, text);
  const words = text.split(/\s+/).filter(Boolean);
  const shown = active === undefined ? inView : active;
  return React.createElement(
    as,
    { className, style, ref },
    words.map((word, i) => (
      <React.Fragment key={i}>
        <span className={s.word}>
          <motion.span
            className={s.wordIn}
            initial="hidden"
            animate={shown ? "visible" : "hidden"}
            variants={{ hidden: { y: "108%" }, visible: { y: "0%" } }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.06 }}
          >
            {word}
          </motion.span>
        </span>
        {i < words.length - 1 ? " " : null}
      </React.Fragment>
    )),
  );
}

/** Valeur chiffrée qui compte jusqu'à sa cible quand elle devient visible. */
export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const match = /^(\D*)(\d+)(.*)$/.exec(value);
  const target = match ? Number(match[2]) : 0;
  const animated = match !== null;
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!animated || !inView || reduce) return;
    let frame = 0;
    const start = performance.now();
    const duration = 1600;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setCurrent(Math.round(target * (1 - Math.pow(2, -10 * t))));
      if (t < 1) frame = requestAnimationFrame(tick);
      else setCurrent(target);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduce, target, animated]);

  if (!match || reduce) return <span ref={ref}>{value}</span>;
  return (
    <span ref={ref} aria-label={value}>
      <span aria-hidden="true">{match[1]}{inView ? current : 0}{match[3]}</span>
    </span>
  );
}

/** Timecode de caméra (25 i/s) affiché dans le viseur de l'intro. */
export function Timecode() {
  const reduce = useReducedMotion();
  const [frames, setFrames] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const started = performance.now();
    const id = setInterval(() => setFrames(Math.floor(((performance.now() - started) / 1000) * 25)), 40);
    return () => clearInterval(id);
  }, [reduce]);
  const pad = (n: number) => String(n).padStart(2, "0");
  const ff = frames % 25;
  const secs = Math.floor(frames / 25);
  return (
    <span className={s.timecode}>
      {pad(Math.floor(secs / 3600))}:{pad(Math.floor(secs / 60) % 60)}:{pad(secs % 60)}:{pad(ff)}
    </span>
  );
}

/** Suit légèrement le pointeur (bouton d'appel à l'action). */
export function useMagnetic<T extends HTMLElement>(strength = 0.25) {
  const ref = useRef<T>(null);
  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };
  const onMouseLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };
  return { ref, onMouseMove, onMouseLeave };
}

/** Flèche utilisée dans les boutons pilule et les cartes. */
export function Arrow({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
