"use client";

import React, { Fragment, useState, useEffect } from "react";
import PageIntroBlock from "../PageIntroBlock/PageIntroBlock";
import EditableVideoGallery from "../VideoGallery/EditableVideoGallery";
import EditablePortraitGallery from "../PortraitGallery/EditablePortraitGallery";
import { useBlockVisibility, BlockVisibilityToggle, BlockWidthToggle, BlockOrderButtons } from "../BlockVisibility";
import AnimateInView from "../AnimateInView/AnimateInView";
import styles from "./SubmenuPageClient.module.css";

const btnWrapStyle: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", position: "absolute", right: 12, top: 12, zIndex: 5 };

export type SubmenuTab = "film" | "photo";

interface SubmenuPageClientProps {
  page: "realisation" | "evenement" | "corporate";
  introKey: string;
  videoKey: string;
  videoFolder: string;
  photoSettingsKey: string;
  photoUploadFolder: string;
  introBlockId: string;
  videosBlockId: string;
  photosBlockId: string;
  initialTab?: SubmenuTab;
}

export default function SubmenuPageClient({
  page,
  introKey,
  videoKey,
  videoFolder,
  photoSettingsKey,
  photoUploadFolder,
  introBlockId,
  videosBlockId,
  photosBlockId,
  initialTab = "film",
}: SubmenuPageClientProps) {
  const { 
    hiddenBlocks, 
    blockWidthModes, 
    blockOrderRealisation,
    blockOrderEvenement,
    blockOrderCorporate,
    isAdmin 
  } = useBlockVisibility();
  
  const hide = (id: string) => !isAdmin && hiddenBlocks.includes(id);
  const blockWidthClass = (id: string) => (blockWidthModes[id] === "max1600" ? "block-width-1600" : "");

  // Get the correct block order based on page
  const blockOrder = page === "realisation" 
    ? blockOrderRealisation 
    : page === "evenement" 
      ? blockOrderEvenement 
      : blockOrderCorporate;

  const [activeTab, setActiveTab] = useState<SubmenuTab>(initialTab);
  const [introEditOpen, setIntroEditOpen] = useState(false);

  // Synchroniser avec l'URL (?tab=film ou ?tab=photo) ou sessionStorage (navigation SPA propre)
  useEffect(() => {
    const validTabs: SubmenuTab[] = ["film", "photo"];

    // SPA navigation: tab stored in sessionStorage (URL is kept clean)
    try {
      const spaTab = sessionStorage.getItem('spaTabTarget') as SubmenuTab;
      if (spaTab && validTabs.includes(spaTab)) {
        sessionStorage.removeItem('spaTabTarget');
        setActiveTab(spaTab);
        return;
      }
    } catch (_) {}

    function syncFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab")?.toLowerCase() as SubmenuTab;
      if (tab && validTabs.includes(tab)) {
        setActiveTab(tab);
      }
    }

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  // Même page — richtext link avec ?tab= sans rechargement
  useEffect(() => {
    const validTabs: SubmenuTab[] = ["film", "photo"];
    const onSamePageTab = (e: Event) => {
      const tab = (e as CustomEvent).detail?.tab as SubmenuTab;
      if (tab && validTabs.includes(tab)) {
        setActiveTabWithHash(tab);
      }
    };
    window.addEventListener('spa-same-page-tab', onSamePageTab);
    return () => window.removeEventListener('spa-same-page-tab', onSamePageTab);
  }, []);

  // Changer d'onglet sans modifier l'URL visible
  function setActiveTabWithHash(tab: SubmenuTab) {
    setActiveTab(tab);
  }

  const introSection = hide(introBlockId) ? null : (
    <div className={`container ${blockWidthClass(introBlockId)}`.trim()} style={{ padding: "1.5rem 0", position: "relative" }}>
      {isAdmin && (
        <div style={btnWrapStyle}>
          <BlockVisibilityToggle blockId={introBlockId} />
          <BlockWidthToggle blockId={introBlockId} />
          <button className={styles.editBtn} onClick={() => setIntroEditOpen(true)}>
            Modifier
          </button>
          <BlockOrderButtons page={page} blockId={introBlockId} />
        </div>
      )}
      <AnimateInView variant="fadeUp">
        <PageIntroBlock
          pageKey={page}
          settingsKey={introKey}
          blockId={introBlockId}
          externalEditOpen={introEditOpen}
          onExternalEditClose={() => setIntroEditOpen(false)}
        />
      </AnimateInView>
    </div>
  );

  const submenuNav = (
    <nav id="submenu-gallery-nav" aria-label={`Menu ${page}`} className={styles.submenuNav}>
      <ul className={styles.submenuNavList}>
        <li>
          <button
            type="button"
            className={styles.submenuNavBtn}
            onClick={() => setActiveTabWithHash("film")}
            aria-current={activeTab === "film" ? "true" : undefined}
          >
            Film
          </button>
        </li>
        <li>
          <button
            type="button"
            className={styles.submenuNavBtn}
            onClick={() => setActiveTabWithHash("photo")}
            aria-current={activeTab === "photo" ? "true" : undefined}
          >
            Photo
          </button>
        </li>
      </ul>
    </nav>
  );

  const filmSection = hide(videosBlockId) ? null : (
    <div className={`container ${blockWidthClass(videosBlockId)}`.trim()} style={{ padding: "1.5rem 0", position: "relative" }}>
      {isAdmin && (
        <div style={btnWrapStyle}>
          <BlockVisibilityToggle blockId={videosBlockId} />
          <BlockWidthToggle blockId={videosBlockId} />
          <BlockOrderButtons page={page} blockId={videosBlockId} />
        </div>
      )}
      <AnimateInView variant="slideUp" viewportSoon>
        <EditableVideoGallery key={`videos_${videoKey}`} keyName={`videos_${videoKey}`} initial={[]} />
      </AnimateInView>
    </div>
  );

  const photoSection = hide(photosBlockId) ? null : (
    <div className={`container ${blockWidthClass(photosBlockId)}`.trim()} style={{ padding: "1.5rem 0", position: "relative" }}>
      {isAdmin && (
        <div style={btnWrapStyle}>
          <BlockVisibilityToggle blockId={photosBlockId} />
          <BlockWidthToggle blockId={photosBlockId} />
          <BlockOrderButtons page={page} blockId={photosBlockId} />
        </div>
      )}
      <EditablePortraitGallery
        key={`photos_${photoSettingsKey}`}
        items={[]}
        settingsKey={photoSettingsKey}
        uploadFolder={photoUploadFolder}
        galleryLabel="Galerie Photo"
      />
    </div>
  );

  const sections: Record<string, React.ReactNode> = {
    [introBlockId]: introSection,
    [videosBlockId]: (
      <div className="container" style={{ padding: "1rem 0" }}>
        {submenuNav}
        {/* Both sections stay mounted — tab switch is instant (CSS display only, no reload) */}
        <div style={{ display: activeTab === "film" ? "block" : "none" }}>{filmSection}</div>
        <div style={{ display: activeTab === "photo" ? "block" : "none" }}>{photoSection}</div>
      </div>
    ),
  };

  // Ordre par défaut pour les pages avec sous-menu
  const defaultOrder = [introBlockId, videosBlockId];
  const order = blockOrder?.length ? blockOrder : defaultOrder;

  return (
    <section style={{ position: 'relative', zIndex: 20, background: 'var(--block-bg, var(--bg, #F2F0EB))', borderRadius: '28px 28px 0 0', marginTop: '-28px', width: '100vw', marginLeft: 'calc(50% - 50vw)', boxSizing: 'border-box' as const }}>
      {order.map((blockId) => (
        <Fragment key={blockId}>{sections[blockId] ?? null}</Fragment>
      ))}
    </section>
  );
}
