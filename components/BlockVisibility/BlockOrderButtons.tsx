"use client";

import React from "react";
import { useBlockVisibility, type BlockOrderPage } from "./BlockVisibilityContext";

const arrowUpSvg = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5" />
    <path d="M5 12l7-7 7 7" />
  </svg>
);

const arrowDownSvg = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14" />
    <path d="M19 12l-7 7-7-7" />
  </svg>
);

const btnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
  padding: 0,
  border: "none",
  borderRadius: 6,
  background: "#111",
  color: "#fff",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
};

type Props = {
  page: BlockOrderPage;
  blockId: string;
  style?: React.CSSProperties;
};

export default function BlockOrderButtons({ page, blockId, style }: Props) {
  const { blockOrderHome, blockOrderContact, blockOrderAnimation, blockOrderRealisation, blockOrderEvenement, blockOrderCorporate, blockOrderPortrait, blockOrderGaleries, isAdmin, moveBlock } = useBlockVisibility();
  if (!isAdmin) return null;
  const order =
    page === "home" ? blockOrderHome
    : page === "contact" ? blockOrderContact
    : page === "animation" ? blockOrderAnimation
    : page === "realisation" ? blockOrderRealisation
    : page === "evenement" ? blockOrderEvenement
    : page === "corporate" ? blockOrderCorporate
    : page === "portrait" ? blockOrderPortrait
    : blockOrderGaleries;
  const index = order.indexOf(blockId);
  const canMoveUp = index > 0;
  const canMoveDown = index >= 0 && index < order.length - 1;
  return (
    <>
      <button
        type="button"
        onClick={() => moveBlock(page, blockId, "up")}
        disabled={!canMoveUp}
        title="Déplacer le bloc vers le haut"
        aria-label="Déplacer le bloc vers le haut"
        style={{ ...btnStyle, ...style, opacity: canMoveUp ? 1 : 0.4, cursor: canMoveUp ? "pointer" : "default" }}
      >
        {arrowUpSvg}
      </button>
      <button
        type="button"
        onClick={() => moveBlock(page, blockId, "down")}
        disabled={!canMoveDown}
        title="Déplacer le bloc vers le bas"
        aria-label="Déplacer le bloc vers le bas"
        style={{ ...btnStyle, ...style, opacity: canMoveDown ? 1 : 0.4, cursor: canMoveDown ? "pointer" : "default" }}
      >
        {arrowDownSvg}
      </button>
    </>
  );
}
