"use client";

import React from "react";
import { AdminToolbarShell } from '../admin/AdminToolbar';
import useBuiltinPageBlocks from '../PageBuilder/useBuiltinPageBlocks';
import GalleriesMenuClient from "../GalleriesPages/GalleriesMenuClient";
import { useBlockVisibility, BlockVisibilityToggle, BlockWidthToggle, BlockOrderButtons } from "../BlockVisibility";
import AnimateInView from "../AnimateInView/AnimateInView";

export default function GaleriesPageClient() {
  const { hiddenBlocks, blockWidthModes, blockOrderGaleries, isAdmin } = useBlockVisibility();

  /* Blocs ajoutés depuis l'administration : leurs sections sont fusionnées
     dans la table ci-dessous et leurs identifiants figurent dans le même
     ordre que les blocs intégrés. */
  const dynamicBlocks = useBuiltinPageBlocks('galeries');

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

  const sections: Record<string, React.ReactNode> = {
    galeries_menu: menuSection,
  };

  // Les blocs dynamiques s'ajoutent à la table de rendu, indexés par
  // leur identifiant d'ordre (« dyn:<uuid> »).
  Object.assign(sections, dynamicBlocks.sections);

  return (
    <section className="page-blocks" style={{ position: 'relative', zIndex: 20, background: 'var(--block-bg, var(--bg, #F2F0EB))', borderRadius: '28px 28px 0 0', marginTop: '-28px', width: '100vw', marginLeft: 'calc(50% - 50vw)', boxSizing: 'border-box' as const }}>
      {blockOrderGaleries.map((blockId) => (
        <React.Fragment key={blockId}>{sections[blockId] ?? null}</React.Fragment>
      ))}
      {dynamicBlocks.addButton}
      {dynamicBlocks.modals}
    </section>
  );
}
