"use client";

import { AdminToolbarShell, AdminToolbarButton } from '../admin/AdminToolbar';
import { Pencil } from 'lucide-react';
import BuiltinPageBlocks from '../PageBuilder/BuiltinPageBlocks';
import React from "react";
import GalleriesMenuClient from "../GalleriesPages/GalleriesMenuClient";
import { useBlockVisibility, BlockVisibilityToggle, BlockWidthToggle, BlockOrderButtons } from "../BlockVisibility";
import AnimateInView from "../AnimateInView/AnimateInView";

const btnWrapStyle: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", position: "absolute", right: 12, top: 12, zIndex: 5 };

export default function GaleriesPageClient() {
  const { hiddenBlocks, blockWidthModes, blockOrderGaleries, isAdmin } = useBlockVisibility();
  const hide = (id: string) => !isAdmin && hiddenBlocks.includes(id);
  const blockWidthClass = (id: string) => (blockWidthModes[id] === "max1600" ? "block-width-1600" : "");

  const menuSection = hide("galeries_menu") ? null : (
    <div className={`container ${blockWidthClass("galeries_menu")}`.trim()} style={{ padding: "1.5rem 0", position: "relative" }}>
      {isAdmin && (
        <AdminToolbarShell>
          <BlockVisibilityToggle blockId="galeries_menu" />
          <BlockWidthToggle blockId="galeries_menu" />
          <BlockOrderButtons page="galeries" blockId="galeries_menu" />
        </AdminToolbarShell>
      )}
      <AnimateInView variant="fadeUp">
        <GalleriesMenuClient />
      </AnimateInView>
    </div>
  );

  return (
    <section className="page-blocks" style={{ position: 'relative', zIndex: 20, background: 'var(--block-bg, var(--bg, #F2F0EB))', borderRadius: '28px 28px 0 0', marginTop: '-28px', width: '100vw', marginLeft: 'calc(50% - 50vw)', boxSizing: 'border-box' as const }}>
      {blockOrderGaleries.map((blockId) => (
        blockId === "galeries_menu" ? <React.Fragment key={blockId}>{menuSection}</React.Fragment> : null
      ))}
      {/* Blocs ajoutés depuis l’administration, après les blocs intégrés */}
      <BuiltinPageBlocks pageKey="galeries" />
    </section>
  );
}
