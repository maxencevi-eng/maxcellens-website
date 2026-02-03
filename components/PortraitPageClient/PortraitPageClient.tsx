"use client";

import React, { Fragment } from "react";
import PortraitIntroEditor from "../PortraitIntroEditor/PortraitIntroEditor";
import EditablePortraitGallery from "../PortraitGallery/EditablePortraitGallery";
import { useBlockVisibility, BlockVisibilityToggle, BlockWidthToggle, BlockOrderButtons } from "../BlockVisibility";
import AnimateInView from "../AnimateInView/AnimateInView";

const btnWrapStyle: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", position: "absolute", right: 12, top: 12, zIndex: 5 };

export default function PortraitPageClient() {
  const { hiddenBlocks, blockWidthModes, blockOrderPortrait, isAdmin } = useBlockVisibility();
  const hide = (id: string) => !isAdmin && hiddenBlocks.includes(id);
  const blockWidthClass = (id: string) => (blockWidthModes[id] === "max1600" ? "block-width-1600" : "");

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
      <AnimateInView variant="slideUp">
        <EditablePortraitGallery items={[]} />
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
