"use client";

import React from "react";
import GalleriesMenuClient from "../GalleriesPages/GalleriesMenuClient";
import { useBlockVisibility, BlockVisibilityToggle, BlockWidthToggle, BlockOrderButtons } from "../BlockVisibility";

const btnWrapStyle: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", position: "absolute", right: 12, top: 12, zIndex: 5 };

export default function GaleriesPageClient() {
  const { hiddenBlocks, blockWidthModes, blockOrderGaleries, isAdmin } = useBlockVisibility();
  const hide = (id: string) => !isAdmin && hiddenBlocks.includes(id);
  const blockWidthClass = (id: string) => (blockWidthModes[id] === "max1600" ? "block-width-1600" : "");

  const menuSection = hide("galeries_menu") ? null : (
    <div className={`container ${blockWidthClass("galeries_menu")}`.trim()} style={{ padding: "1.5rem 0", position: "relative" }}>
      {isAdmin && (
        <div style={btnWrapStyle}>
          <BlockVisibilityToggle blockId="galeries_menu" />
          <BlockWidthToggle blockId="galeries_menu" />
          <BlockOrderButtons page="galeries" blockId="galeries_menu" />
        </div>
      )}
      <GalleriesMenuClient />
    </div>
  );

  return (
    <section>
      {blockOrderGaleries.map((blockId) => (
        blockId === "galeries_menu" ? <React.Fragment key={blockId}>{menuSection}</React.Fragment> : null
      ))}
    </section>
  );
}
