"use client";

import React from "react";
import SubmenuPageClient from "../SubmenuPageClient/SubmenuPageClient";

export default function CorporatePageClient() {
  return (
    <SubmenuPageClient
      page="corporate"
      introKey="corporate_intro"
      videoKey="corporate"
      videoFolder="Corporate/Videos"
      photoSettingsKey="corporate_photos"
      photoUploadFolder="Corporate/Photos"
      introBlockId="corporate_intro"
      videosBlockId="corporate_videos"
      photosBlockId="corporate_photos"
      introTitle=""
      introPlaceholder=""
    />
  );
}
