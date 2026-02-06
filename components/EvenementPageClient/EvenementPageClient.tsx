"use client";

import React, { Fragment } from "react";
import VideoIntroEditor from "../VideoIntroEditor/VideoIntroEditor";
import EditableVideoGallery from "../VideoGallery/EditableVideoGallery";
import { useBlockVisibility, BlockVisibilityToggle, BlockWidthToggle, BlockOrderButtons } from "../BlockVisibility";
import AnimateInView from "../AnimateInView/AnimateInView";
import { evenementVideos } from "../../data/videos/evenementVideos";

const btnWrapStyle: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", position: "absolute", right: 12, top: 12, zIndex: 5 };

export default function EvenementPageClient() {
  const { hiddenBlocks, blockWidthModes, blockOrderEvenement, isAdmin } = useBlockVisibility();
  const hide = (id: string) => !isAdmin && hiddenBlocks.includes(id);
  const blockWidthClass = (id: string) => (blockWidthModes[id] === "max1600" ? "block-width-1600" : "");

  const introSection = hide("evenement_intro") ? null : (
    <div className={`container ${blockWidthClass("evenement_intro")}`.trim()} style={{ padding: "1.5rem 0", position: "relative" }}>
      {isAdmin && (
        <div style={btnWrapStyle}>
          <BlockVisibilityToggle blockId="evenement_intro" />
          <BlockWidthToggle blockId="evenement_intro" />
          <BlockOrderButtons page="evenement" blockId="evenement_intro" />
        </div>
      )}
      <AnimateInView variant="fadeUp">
        <VideoIntroEditor keyName="evenement_intro" title="" placeholder="" />
      </AnimateInView>
    </div>
  );

  const videosSection = hide("evenement_videos") ? null : (
    <div className={`container ${blockWidthClass("evenement_videos")}`.trim()} style={{ padding: "1.5rem 0", position: "relative" }}>
      {isAdmin && (
        <div style={btnWrapStyle}>
          <BlockVisibilityToggle blockId="evenement_videos" />
          <BlockWidthToggle blockId="evenement_videos" />
          <BlockOrderButtons page="evenement" blockId="evenement_videos" />
        </div>
      )}
      <AnimateInView variant="slideUp" viewportSoon>
        <EditableVideoGallery key="videos_evenement" keyName="videos_evenement" initial={evenementVideos} />
      </AnimateInView>
    </div>
  );

  const sections: Record<string, React.ReactNode> = {
    evenement_intro: introSection,
    evenement_videos: videosSection,
  };

  const defaultOrderEvenement = ['evenement_intro', 'evenement_videos'];
  const orderEvenement = blockOrderEvenement?.length ? blockOrderEvenement : defaultOrderEvenement;
  const order = orderEvenement.includes('evenement_videos')
    ? orderEvenement
    : [...orderEvenement, 'evenement_videos'];

  return (
    <section>
      {order.map((blockId) => (
        <Fragment key={blockId}>{sections[blockId] ?? null}</Fragment>
      ))}
    </section>
  );
}
