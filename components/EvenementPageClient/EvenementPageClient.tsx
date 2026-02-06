"use client";

import React from "react";
import SubmenuPageClient from "../SubmenuPageClient/SubmenuPageClient";

export default function EvenementPageClient() {
  return (
    <SubmenuPageClient
      page="evenement"
      introKey="evenement_intro"
      videoKey="evenement"
      videoFolder="Evenement/Videos"
      photoSettingsKey="evenement_photos"
      photoUploadFolder="Evenement/Photos"
      introBlockId="evenement_intro"
      videosBlockId="evenement_videos"
      photosBlockId="evenement_photos"
      introTitle=""
      introPlaceholder=""
    />
  );
}
