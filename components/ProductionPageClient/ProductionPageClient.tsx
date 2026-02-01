"use client";

import React, { Fragment } from "react";
import VideoIntroEditor from "../VideoIntroEditor/VideoIntroEditor";
import EditableVideoGallery from "../VideoGallery/EditableVideoGallery";
import { useBlockVisibility, BlockVisibilityToggle, BlockWidthToggle, BlockOrderButtons } from "../BlockVisibility";
import { productionVideos } from "../../data/videos/productionVideos";

const btnWrapStyle: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", position: "absolute", right: 12, top: 12, zIndex: 5 };

export default function ProductionPageClient() {
  const { hiddenBlocks, blockWidthModes, blockOrderRealisation, isAdmin } = useBlockVisibility();
  const hide = (id: string) => !isAdmin && hiddenBlocks.includes(id);
  const blockWidthClass = (id: string) => (blockWidthModes[id] === "max1600" ? "block-width-1600" : "");

  const introSection = hide("production_intro") ? null : (
    <div className={`container ${blockWidthClass("production_intro")}`.trim()} style={{ padding: "1.5rem 0", position: "relative" }}>
      {isAdmin && (
        <div style={btnWrapStyle}>
          <BlockVisibilityToggle blockId="production_intro" />
          <BlockWidthToggle blockId="production_intro" />
          <BlockOrderButtons page="realisation" blockId="production_intro" />
        </div>
      )}
      <VideoIntroEditor keyName="production_intro" title="" placeholder="" />
    </div>
  );

  const videosSection = hide("production_videos") ? null : (
    <div className={`container ${blockWidthClass("production_videos")}`.trim()} style={{ padding: "1.5rem 0", position: "relative" }}>
      {isAdmin && (
        <div style={btnWrapStyle}>
          <BlockVisibilityToggle blockId="production_videos" />
          <BlockWidthToggle blockId="production_videos" />
          <BlockOrderButtons page="realisation" blockId="production_videos" />
        </div>
      )}
      <EditableVideoGallery keyName="videos_production" initial={productionVideos} />
    </div>
  );

  const sections: Record<string, React.ReactNode> = {
    production_intro: introSection,
    production_videos: videosSection,
  };

  return (
    <section>
      {blockOrderRealisation.map((blockId) => (
        <Fragment key={blockId}>{sections[blockId] ?? null}</Fragment>
      ))}
    </section>
  );
}
