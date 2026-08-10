"use client";
import { AdminToolbarShell, AdminToolbarButton } from '../admin/AdminToolbar';
import { Pencil } from 'lucide-react';
import { AdminModal, AdminSection, ToggleField } from '../admin';

import useBuiltinPageBlocks from '../PageBuilder/useBuiltinPageBlocks';
import React, { Fragment, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import PageIntroBlock from "../PageIntroBlock/PageIntroBlock";
import EditablePortraitGallery from "../PortraitGallery/EditablePortraitGallery";
import { useBlockVisibility, BlockVisibilityToggle, BlockWidthToggle, BlockOrderButtons } from "../BlockVisibility";
import AnimateInView from "../AnimateInView/AnimateInView";
import styles from "./PortraitPageClient.module.css";

const PORTRAIT_GALLERIES = [
  { id: "lifestyle", label: "Lifestyle", settingsKey: "portrait_gallery", uploadFolder: "Portrait/Galerie1" },
  { id: "studio", label: "Studio", settingsKey: "portrait_gallery_studio", uploadFolder: "Portrait/Studio" },
  { id: "couple", label: "Couple", settingsKey: "portrait_gallery_couple", uploadFolder: "Portrait/Couple" },
  { id: "corporate", label: "Corporate", settingsKey: "corporate_photos", uploadFolder: "Corporate/Photos" },
] as const;
type PortraitGalleryId = (typeof PORTRAIT_GALLERIES)[number]["id"];

export default function PortraitPageClient({ initialTab = "lifestyle" }: { initialTab?: PortraitGalleryId }) {
  const { hiddenBlocks, blockWidthModes, blockOrderPortrait, isAdmin } = useBlockVisibility();

  /* Blocs ajoutés depuis l'administration : leurs sections sont fusionnées
     dans la table ci-dessous et leurs identifiants figurent dans le même
     ordre que les blocs intégrés. */
  const dynamicBlocks = useBuiltinPageBlocks("portrait");
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

  // Changer d’onglet sans modifier l’URL visible
  function setActiveGalleryWithHash(id: PortraitGalleryId) {
    setActiveGallery(id);
  }

  const introSection = hide("portrait_intro") ? null : (
    <div className={`container ${blockWidthClass("portrait_intro")}`.trim()} style={{ padding: "1.5rem 0", paddingLeft: 0, paddingRight: 0, position: "relative" }}>
      {isAdmin && (
        <AdminToolbarShell>
          <BlockVisibilityToggle blockId="portrait_intro" />
          <BlockWidthToggle blockId="portrait_intro" />
          <AdminToolbarButton variant="primary" showLabel icon={<Pencil size={14} aria-hidden="true" />} label="Modifier" onClick={() => setIntroEditOpen(true)} />
          <BlockOrderButtons page="portrait" blockId="portrait_intro" />
        </AdminToolbarShell>
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
        <AdminToolbarShell>
          <BlockVisibilityToggle blockId="portrait_gallery" />
          <BlockWidthToggle blockId="portrait_gallery" />
          <AdminToolbarButton
            variant="primary"
            showLabel
            icon={<Pencil size={14} aria-hidden="true" />}
            label="Modifier les onglets"
            onClick={openTabsModal}
          />
          <BlockOrderButtons page="portrait" blockId="portrait_gallery" />
        </AdminToolbarShell>
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
  const tabsModal = tabsModalOpen ? (
    <AdminModal
      title="Visibilité des onglets"
      subtitle="Onglets de galerie proposés aux visiteurs."
      size="sm"
      onClose={closeTabsModal}
      onSave={saveTabsVisibility}
      saving={tabsSaving}
    >
      <AdminSection description="Les onglets décochés restent visibles pour vous, mais pas pour les visiteurs.">
        {PORTRAIT_GALLERIES.map((g) => (
          <ToggleField
            key={g.id}
            label={g.label}
            checked={!tabsModalDraft.includes(g.id)}
            onChange={() =>
              // `tabsModalDraft` liste les onglets MASQUÉS : cocher le retire.
              toggleTabDraft(g.id)
            }
          />
        ))}
      </AdminSection>
    </AdminModal>
  ) : null;

  const sections: Record<string, React.ReactNode> = {
    portrait_intro: introSection,
    portrait_gallery: gallerySection,
  };

  // Les blocs dynamiques s'ajoutent à la table de rendu, indexés par
  // leur identifiant d'ordre (« dyn:<uuid> »).
  Object.assign(sections, dynamicBlocks.sections);

  return (
    <section className="page-blocks" style={{ position: 'relative', zIndex: 20, background: 'var(--block-bg, var(--bg, #F2F0EB))', borderRadius: '28px 28px 0 0', marginTop: '-28px', width: '100vw', marginLeft: 'calc(50% - 50vw)', boxSizing: 'border-box' as const }}>
      {blockOrderPortrait.map((blockId) => (
        <Fragment key={blockId}>{sections[blockId] ?? null}</Fragment>
      ))}
      {dynamicBlocks.addButton}
      {dynamicBlocks.modals}
      {tabsModal}
    </section>
  );
}
