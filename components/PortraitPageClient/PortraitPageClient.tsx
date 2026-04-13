"use client";

import React, { Fragment, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import PageIntroBlock from "../PageIntroBlock/PageIntroBlock";
import EditablePortraitGallery from "../PortraitGallery/EditablePortraitGallery";
import { useBlockVisibility, BlockVisibilityToggle, BlockWidthToggle, BlockOrderButtons } from "../BlockVisibility";
import AnimateInView from "../AnimateInView/AnimateInView";
import styles from "./PortraitPageClient.module.css";

const btnWrapStyle: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", position: "absolute", right: 12, top: 12, zIndex: 5 };

const PORTRAIT_GALLERIES = [
  { id: "lifestyle", label: "Lifestyle", settingsKey: "portrait_gallery", uploadFolder: "Portrait/Galerie1" },
  { id: "studio", label: "Studio", settingsKey: "portrait_gallery_studio", uploadFolder: "Portrait/Studio" },
  { id: "couple", label: "Couple", settingsKey: "portrait_gallery_couple", uploadFolder: "Portrait/Couple" },
  { id: "corporate", label: "Corporate", settingsKey: "corporate_photos", uploadFolder: "Corporate/Photos" },
] as const;
type PortraitGalleryId = (typeof PORTRAIT_GALLERIES)[number]["id"];

export default function PortraitPageClient({ initialTab = "lifestyle" }: { initialTab?: PortraitGalleryId }) {
  const { hiddenBlocks, blockWidthModes, blockOrderPortrait, isAdmin } = useBlockVisibility();
  const hide = (id: string) => !isAdmin && hiddenBlocks.includes(id);
  const blockWidthClass = (id: string) => (blockWidthModes[id] === "max1600" ? "block-width-1600" : "");

  // État initial = prop du serveur (?tab=) → bonne galerie dès le premier rendu
  const [activeGallery, setActiveGallery] = useState<PortraitGalleryId>(initialTab);
  const [introEditOpen, setIntroEditOpen] = useState(false);

  // Visibilité des onglets pour les non-admins
  const [hiddenTabs, setHiddenTabs] = useState<string[]>([]);
  const [tabsModalOpen, setTabsModalOpen] = useState(false);
  const [tabsModalDraft, setTabsModalDraft] = useState<string[]>([]);
  const [tabsSaving, setTabsSaving] = useState(false);

  // Charger la config de visibilité des onglets
  useEffect(() => {
    fetch('/api/admin/site-settings?keys=portrait_tabs_visibility')
      .then(r => r.json())
      .then(data => {
        const raw = data?.settings?.portrait_tabs_visibility;
        if (raw) {
          try { setHiddenTabs(JSON.parse(raw)); } catch (_) {}
        }
      })
      .catch(() => {});
  }, []);

  // Si l'onglet actif est caché pour non-admin, switcher vers le premier visible
  useEffect(() => {
    if (isAdmin) return;
    const visibleIds = PORTRAIT_GALLERIES.map(g => g.id).filter(id => !hiddenTabs.includes(id));
    if (visibleIds.length > 0 && !visibleIds.includes(activeGallery)) {
      setActiveGallery(visibleIds[0]);
    }
  }, [hiddenTabs, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  function openTabsModal() {
    setTabsModalDraft([...hiddenTabs]);
    setTabsModalOpen(true);
  }
  function closeTabsModal() { setTabsModalOpen(false); }

  function toggleTabDraft(id: string) {
    setTabsModalDraft(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function saveTabsVisibility() {
    setTabsSaving(true);
    try {
      await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'portrait_tabs_visibility', value: JSON.stringify(tabsModalDraft) }),
      });
      setHiddenTabs(tabsModalDraft);
      setTabsModalOpen(false);
    } catch (_) {} finally {
      setTabsSaving(false);
    }
  }

  // Synchroniser avec le hash de l’URL (ex. /portrait#lifestyle), y compris sur changement de hash
  // Après hydratation : sync avec le hash (ex. /portrait#entreprise)
  useEffect(() => {
    const validIds = PORTRAIT_GALLERIES.map((g) => g.id);
    // spaTabTarget is consumed only once on mount (stored by PageTransitionOverlay)
    let spaTabConsumed = false;

    function syncFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab")?.toLowerCase();
      if (tab && validIds.includes(tab as PortraitGalleryId)) {
        setActiveGallery(tab as PortraitGalleryId);
        return;
      }
      const hash = window.location.hash.slice(1).toLowerCase();
      if (hash && validIds.includes(hash as PortraitGalleryId)) {
        setActiveGallery(hash as PortraitGalleryId);
        return;
      }
      // On first call only: read tab stored by PageTransitionOverlay (strips ?tab= from URL)
      if (!spaTabConsumed) {
        spaTabConsumed = true;
        try {
          const stored = sessionStorage.getItem("spaTabTarget");
          if (stored) {
            sessionStorage.removeItem("spaTabTarget");
            const lower = stored.toLowerCase();
            if (validIds.includes(lower as PortraitGalleryId)) {
              setActiveGallery(lower as PortraitGalleryId);
            }
          }
        } catch (_) {}
      }
    }

    syncFromUrl();
    window.addEventListener("hashchange", syncFromUrl);
    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("hashchange", syncFromUrl);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, []);

  // Même page — richtext link avec ?tab= sans rechargement
  useEffect(() => {
    const validIds = PORTRAIT_GALLERIES.map((g) => g.id);
    const onSamePageTab = (e: Event) => {
      const tab = (e as CustomEvent).detail?.tab?.toLowerCase() as PortraitGalleryId;
      if (tab && validIds.includes(tab)) {
        setActiveGalleryWithHash(tab);
      }
    };
    window.addEventListener('spa-same-page-tab', onSamePageTab);
    return () => window.removeEventListener('spa-same-page-tab', onSamePageTab);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mettre à jour le hash quand on change d’onglet (URL partageable)
  function setActiveGalleryWithHash(id: PortraitGalleryId) {
    setActiveGallery(id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", id);
      url.hash = "";
      window.history.replaceState(null, "", url.pathname + "?" + url.searchParams.toString());
    }
  }

  const introSection = hide("portrait_intro") ? null : (
    <div className={`container ${blockWidthClass("portrait_intro")}`.trim()} style={{ padding: "1.5rem 0", paddingLeft: 0, paddingRight: 0, position: "relative" }}>
      {isAdmin && (
        <div style={btnWrapStyle}>
          <BlockVisibilityToggle blockId="portrait_intro" />
          <BlockWidthToggle blockId="portrait_intro" />
          <button className={styles.editBtn} onClick={() => setIntroEditOpen(true)}>
            Modifier
          </button>
          <BlockOrderButtons page="portrait" blockId="portrait_intro" />
        </div>
      )}
      <AnimateInView variant="fadeUp">
        <PageIntroBlock
          pageKey="portrait"
          settingsKey="portrait_intro"
          blockId="portrait_intro"
          externalEditOpen={introEditOpen}
          onExternalEditClose={() => setIntroEditOpen(false)}
        />
      </AnimateInView>
    </div>
  );

  // Onglets visibles selon le rôle
  const visibleGalleries = PORTRAIT_GALLERIES.filter(g => isAdmin || !hiddenTabs.includes(g.id));

  const gallerySection = hide("portrait_gallery") ? null : (
    <div className={`container ${blockWidthClass("portrait_gallery")}`.trim()} style={{ padding: "1.5rem 0", paddingLeft: 0, paddingRight: 0, position: "relative" }}>
      {isAdmin && (
        <div style={btnWrapStyle}>
          <BlockVisibilityToggle blockId="portrait_gallery" />
          <BlockWidthToggle blockId="portrait_gallery" />
          <button className={styles.editBtn} onClick={openTabsModal}>
            Modifier les onglets
          </button>
          <BlockOrderButtons page="portrait" blockId="portrait_gallery" />
        </div>
      )}
      <nav id="portrait-gallery-nav" aria-label="Galeries portrait" className={styles.portraitGalleryNav}>
        <ul className={styles.portraitGalleryNavList}>
          {visibleGalleries.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                className={styles.portraitGalleryNavBtn}
                onClick={() => setActiveGalleryWithHash(g.id)}
                aria-current={activeGallery === g.id ? "true" : undefined}
              >
                {g.label}
                {isAdmin && hiddenTabs.includes(g.id) && (
                  <span style={{ marginLeft: 6, fontSize: '0.75rem', opacity: 0.5 }}>(caché)</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {/* Toutes les galeries restent montées — changement d'onglet instantané (display CSS uniquement) */}
      {PORTRAIT_GALLERIES.map((g) => (
        <div key={g.id} style={{ display: activeGallery === g.id ? "block" : "none" }}>
          <EditablePortraitGallery
            items={[]}
            settingsKey={g.settingsKey}
            uploadFolder={g.uploadFolder}
            galleryLabel={g.label}
          />
        </div>
      ))}
    </div>
  );

  // Modal de gestion de la visibilité des onglets
  const tabsModal = tabsModalOpen && typeof document !== 'undefined' ? createPortal(
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '70px 16px 32px', overflowY: 'auto' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) closeTabsModal(); }}
    >
      <div style={{ width: '95%', maxWidth: 500, background: '#fff', borderRadius: 8, padding: 24, alignSelf: 'flex-start', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Visibilité des onglets</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={closeTabsModal} className="btn-ghost">Annuler</button>
            <button onClick={saveTabsVisibility} className="btn-primary" disabled={tabsSaving}>
              {tabsSaving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
        <p style={{ margin: '0 0 16px', color: 'var(--muted, #666)', fontSize: 14 }}>
          Cochez les onglets à <strong>afficher</strong> pour les visiteurs non-connectés.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PORTRAIT_GALLERIES.map((g) => {
            const isVisible = !tabsModalDraft.includes(g.id);
            return (
              <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 14px', borderRadius: 6, border: '1px solid #eee', background: isVisible ? '#f9fafb' : '#fff' }}>
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => toggleTabDraft(g.id)}
                  style={{ width: 18, height: 18, accentColor: '#213431', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 500, fontSize: 15 }}>{g.label}</span>
                {!isVisible && (
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: '#999' }}>Caché aux visiteurs</span>
                )}
              </label>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  const sections: Record<string, React.ReactNode> = {
    portrait_intro: introSection,
    portrait_gallery: gallerySection,
  };

  return (
    <section style={{ position: 'relative', zIndex: 20, background: 'var(--block-bg, var(--bg, #F2F0EB))', borderRadius: '28px 28px 0 0', marginTop: '-28px', width: '100vw', marginLeft: 'calc(50% - 50vw)', boxSizing: 'border-box' as const }}>
      {blockOrderPortrait.map((blockId) => (
        <Fragment key={blockId}>{sections[blockId] ?? null}</Fragment>
      ))}
      {tabsModal}
    </section>
  );
}
