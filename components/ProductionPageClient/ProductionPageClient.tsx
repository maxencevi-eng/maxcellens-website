"use client";

import React from "react";
import SubmenuPageClient from "../SubmenuPageClient/SubmenuPageClient";

export default function ProductionPageClient() {
  return (
    <SubmenuPageClient
      page="realisation"
      introKey="production_intro"
      videoKey="production"
      videoFolder="Realisation/Videos"
      photoSettingsKey="realisation_photos"
      photoUploadFolder="Realisation/Photos"
      introBlockId="production_intro"
      videosBlockId="production_videos"
      photosBlockId="realisation_photos"
      introTitle=""
      introPlaceholder=""
    />
  );
}
