"use client";

import React from "react";
import { useBlockVisibility } from "./BlockVisibilityContext";

/** Icône double flèche horizontale (largeur) */
const doubleArrowSvg = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L2 12l5-5" />
    <path d="M17 7l5 5-5 5" />
    <path d="M14 4l-4 16" />
  </svg>
);

type Props = {
  blockId: string;
  style?: React.CSSProperties;
};

export default function BlockWidthToggle({ blockId, style }: Props) {
  const { blockWidthModes, isAdmin, setBlockWidthMode } = useBlockVisibility();
  if (!isAdmin) return null;
  const mode = blockWidthModes[blockId] ?? "full";
  const isMax1600 = mode === "max1600";
  const toggle = () => setBlockWidthMode(blockId, isMax1600 ? "full" : "max1600");
  return (
    <button
      type="button"
      onClick={toggle}
      title={isMax1600 ? "Largeur: max 1600px (cliquer pour passer à 100%)" : "Largeur: 100% (cliquer pour limiter à 1600px)"}
      aria-label={isMax1600 ? "Passer la largeur du bloc à 100%" : "Limiter la largeur du bloc à 1600px"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        padding: 0,
        border: "none",
        borderRadius: 6,
        background: isMax1600 ? "#0f766e" : "#111",
        color: "#fff",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        ...style,
      }}
    >
      {doubleArrowSvg}
    </button>
  );
}
