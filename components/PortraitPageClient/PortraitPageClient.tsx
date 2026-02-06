"use client";

import React, { Fragment, useState, useEffect } from "react";
import PortraitIntroEditor from "../PortraitIntroEditor/PortraitIntroEditor";
import EditablePortraitGallery from "../PortraitGallery/EditablePortraitGallery";
import { useBlockVisibility, BlockVisibilityToggle, BlockWidthToggle, BlockOrderButtons } from "../BlockVisibility";
import AnimateInView from "../AnimateInView/AnimateInView";
import styles from "./PortraitPageClient.module.css";

const btnWrapStyle: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", position: "absolute", right: 12, top: 12, zIndex: 5 };

const PORTRAIT_GALLERIES = [
  { id: "lifestyle", label: "Lifestyle", settingsKey: "portrait_gallery", uploadFolder: "Portrait/Galerie1" },
  { id: "entreprise", label: "Entreprise", settingsKey: "portrait_gallery_entreprise", uploadFolder: "Portrait/Entreprise" },
  { id: "studio", label: "Studio", settingsKey: "portrait_gallery_studio", uploadFolder: "Portrait/Studio" },
  { id: "couple", label: "Couple", settingsKey: "portrait_gallery_couple", uploadFolder: "Portrait/Couple" },
] as const;
type PortraitGalleryId = (typeof PORTRAIT_GALLERIES)[number]["id"];

export default function PortraitPageClient() {
  const { hiddenBlocks, blockWidthModes, blockOrderPortrait, isAdmin } = useBlockVisibility();
  const hide = (id: string) => !isAdmin && hiddenBlocks.includes(id);
  const blockWidthClass = (id: string) => (blockWidthModes[id] === "max1600" ? "block-width-1600" : "");

  const [activeGallery, setActiveGallery] = useState<PortraitGalleryId>(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1).toLowerCase();
      const validIds = PORTRAIT_GALLERIES.map((g) => g.id);
      if (hash && validIds.includes(hash as PortraitGalleryId)) {
        return hash as PortraitGalleryId;
      }
    }
    return "lifestyle";
  });
  const activeConfig = PORTRAIT_GALLERIES.find((g) => g.id === activeGallery) ?? PORTRAIT_GALLERIES[0];

  // Synchroniser avec le hash de l’URL (ex. /portrait#lifestyle), y compris sur changement de hash
  useEffect(() => {
    if (typeof window === "undefined") return;
    const validIds = PORTRAIT_GALLERIES.map((g) => g.id);

    function syncFromHash() {
      const hash = window.location.hash.slice(1).toLowerCase();
      if (hash && validIds.includes(hash as PortraitGalleryId)) {
        setActiveGallery(hash as PortraitGalleryId);
      }
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  // Mettre à jour le hash quand on change d’onglet (URL partageable)
  function setActiveGalleryWithHash(id: PortraitGalleryId) {
    setActiveGallery(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}#${id}`);
    }
  }

  const introSection = hide("portrait_intro") ? null : (
    <div className={`container ${blockWidthClass("portrait_intro")}`.trim()} style={{ padding: "1.5rem 0", paddingLeft: 0, paddingRight: 0, position: "relative" }}>
      {isAdmin && (
        <div style={btnWrapStyle}>
          <BlockVisibilityToggle blockId="portrait_intro" />
          <BlockWidthToggle blockId="portrait_intro" />
          <BlockOrderButtons page="portrait" blockId="portrait_intro" />
        </div>
      )}
      <AnimateInView variant="fadeUp">
        <PortraitIntroEditor />
      </AnimateInView>
    </div>
  );

  const gallerySection = hide("portrait_gallery") ? null : (
    <div className={`container ${blockWidthClass("portrait_gallery")}`.trim()} style={{ padding: "1.5rem 0", paddingLeft: 0, paddingRight: 0, position: "relative" }}>
      {isAdmin && (
        <div style={btnWrapStyle}>
          <BlockVisibilityToggle blockId="portrait_gallery" />
          <BlockWidthToggle blockId="portrait_gallery" />
          <BlockOrderButtons page="portrait" blockId="portrait_gallery" />
        </div>
      )}
      <nav aria-label="Galeries portrait" className={styles.portraitGalleryNav}>
        <ul className={styles.portraitGalleryNavList}>
          {PORTRAIT_GALLERIES.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                className={styles.portraitGalleryNavBtn}
                onClick={() => setActiveGalleryWithHash(g.id)}
                aria-current={activeGallery === g.id ? "true" : undefined}
              >
                {g.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <AnimateInView variant="slideUp">
        <EditablePortraitGallery
          key={activeGallery}
          items={[]}
          settingsKey={activeConfig.settingsKey}
          uploadFolder={activeConfig.uploadFolder}
          galleryLabel={activeConfig.label}
        />
      </AnimateInView>
    </div>
  );

  const sections: Record<string, React.ReactNode> = {
    portrait_intro: introSection,
    portrait_gallery: gallerySection,
  };

  return (
    <section>
      {blockOrderPortrait.map((blockId) => (
        <Fragment key={blockId}>{sections[blockId] ?? null}</Fragment>
      ))}
    </section>
  );
}
