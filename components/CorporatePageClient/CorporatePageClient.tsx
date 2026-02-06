"use client";

import React, { Fragment } from "react";
import VideoIntroEditor from "../VideoIntroEditor/VideoIntroEditor";
import EditableVideoGallery from "../VideoGallery/EditableVideoGallery";
import { useBlockVisibility, BlockVisibilityToggle, BlockWidthToggle, BlockOrderButtons } from "../BlockVisibility";
import AnimateInView from "../AnimateInView/AnimateInView";
import { corporateVideos } from "../../data/videos/corporateVideos";

const btnWrapStyle: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", position: "absolute", right: 12, top: 12, zIndex: 5 };

export default function CorporatePageClient() {
  const { hiddenBlocks, blockWidthModes, blockOrderCorporate, isAdmin } = useBlockVisibility();
  const hide = (id: string) => !isAdmin && hiddenBlocks.includes(id);
  const blockWidthClass = (id: string) => (blockWidthModes[id] === "max1600" ? "block-width-1600" : "");

  const introSection = hide("corporate_intro") ? null : (
    <div className={`container ${blockWidthClass("corporate_intro")}`.trim()} style={{ padding: "1.5rem 0", position: "relative" }}>
      {isAdmin && (
        <div style={btnWrapStyle}>
          <BlockVisibilityToggle blockId="corporate_intro" />
          <BlockWidthToggle blockId="corporate_intro" />
          <BlockOrderButtons page="corporate" blockId="corporate_intro" />
        </div>
      )}
      <AnimateInView variant="fadeUp">
        <VideoIntroEditor keyName="corporate_intro" title="" placeholder="" />
      </AnimateInView>
    </div>
  );

  const videosSection = hide("corporate_videos") ? null : (
    <div className={`container ${blockWidthClass("corporate_videos")}`.trim()} style={{ padding: "1.5rem 0", position: "relative" }}>
      {isAdmin && (
        <div style={btnWrapStyle}>
          <BlockVisibilityToggle blockId="corporate_videos" />
          <BlockWidthToggle blockId="corporate_videos" />
          <BlockOrderButtons page="corporate" blockId="corporate_videos" />
        </div>
      )}
      <AnimateInView variant="slideUp" viewportSoon>
        <EditableVideoGallery key="videos_corporate" keyName="videos_corporate" initial={corporateVideos} />
      </AnimateInView>
    </div>
  );

  const sections: Record<string, React.ReactNode> = {
    corporate_intro: introSection,
    corporate_videos: videosSection,
  };

  return (
    <section>
      {blockOrderCorporate.map((blockId) => (
        <Fragment key={blockId}>{sections[blockId] ?? null}</Fragment>
      ))}
    </section>
  );
}
