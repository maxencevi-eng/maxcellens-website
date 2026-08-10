"use client";

import React, { useEffect, useState } from 'react';
import { AdminButton, AdminModal, AdminSection, SliderField } from '../index';

/**
 * Dimensions de la barre de navigation.
 *
 * Extrait du sous-menu « Menu » de l'ancienne barre latérale. Les réglages de
 * contenu du menu (liens, ordre) restent dans MenuEditModal.
 */
export default function NavBarModal({
  onClose,
  onOpenMenuEditor,
  onOpenMobileMenuEditor,
}: {
  onClose: () => void;
  onOpenMenuEditor: () => void;
  onOpenMobileMenuEditor: () => void;
}) {
  const [height, setHeight] = useState(64);
  const [gap, setGap] = useState(6);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=navHeight,navGap');
        if (!resp.ok) return;
        const s = (await resp.json())?.settings || {};
        const h = Number(s.navHeight) || 64;
        const g = Number(s.navGap) || 6;
        setHeight(h);
        setGap(g);
      } catch (_) {}
    })();
  }, []);

  function persist(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch (_) {}
    fetch('/api/admin/site-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    }).catch(() => {});
  }

  function changeHeight(v: number) {
    setHeight(v);
    document.documentElement.style.setProperty('--nav-height', `${v}px`);
    persist('navHeight', String(v));
  }

  function changeGap(v: number) {
    setGap(v);
    // La variable est exprimée en rem : 10 unités du curseur = 1rem
    document.documentElement.style.setProperty('--nav-gap', `${v / 10}rem`);
    persist('navGap', String(v));
  }

  return (
    <AdminModal
      title="Barre de navigation"
      subtitle="Dimensions de la barre. L’aperçu est instantané et enregistré au fil de l’eau."
      size="md"
      onClose={onClose}
      footer={<AdminButton variant="primary" onClick={onClose}>Terminé</AdminButton>}
    >
      <AdminSection title="Dimensions">
        <SliderField
          label="Hauteur de la barre"
          value={height}
          onChange={changeHeight}
          min={40}
          max={120}
        />
        <SliderField
          label="Espace entre les boutons"
          value={gap}
          onChange={changeGap}
          min={2}
          max={20}
          unit=""
          hint={`${(gap / 10).toFixed(2)} rem`}
        />
      </AdminSection>

      <AdminSection
        title="Contenu du menu"
        description="Liens affichés, libellés et ordre."
        columns={2}
      >
        <AdminButton variant="secondary" onClick={onOpenMenuEditor} block>
          Modifier le menu
        </AdminButton>
        <AdminButton variant="secondary" onClick={onOpenMobileMenuEditor} block>
          Modifier le menu mobile
        </AdminButton>
      </AdminSection>
    </AdminModal>
  );
}
