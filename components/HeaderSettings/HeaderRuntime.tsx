"use client";
import React, { useEffect } from 'react';

function applySettingsToHero(el: HTMLElement, settingsSite: any) {
  try {
    if (settingsSite?.height) el.style.height = `${settingsSite.height.value}${settingsSite.height.unit || '%'}`;
    if (settingsSite?.width) el.style.width = `${settingsSite.width.value}${settingsSite.width.unit || '%'}`;
    const overlay = el.querySelector('[class*="overlay"]') as HTMLElement | null;
    if (overlay && settingsSite?.overlay) {
      overlay.style.backgroundColor = settingsSite.overlay.color || '#000';
      overlay.style.opacity = String(typeof settingsSite.overlay.opacity !== 'undefined' ? settingsSite.overlay.opacity : 0.5);
    }
  } catch (e) {}
}

function applyGlobalSettingsToAllHeroes(settingsSite: any) {
  if (!settingsSite || typeof settingsSite !== 'object') return;
  document.querySelectorAll('[data-measure="hero"]').forEach((el) => applySettingsToHero(el as HTMLElement, settingsSite));
}

export default function HeaderRuntime({ page }: { page?: string }) {
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=header_site_settings');
        if (!resp.ok) return;
        const j = await resp.json();
        const raw = j?.settings?.header_site_settings;
        if (!mounted) return;
        if (raw && typeof raw === 'string') {
          try {
            const s = JSON.parse(raw);
            applyGlobalSettingsToAllHeroes(s);
          } catch (_) {}
        }
      } catch (e) {}
    }
    load();

    function onUpdate(e: any) {
      const detail = e?.detail || {};
      if (detail?.settings_site) applyGlobalSettingsToAllHeroes(detail.settings_site);
      else load();
    }

    window.addEventListener('header-updated', onUpdate as EventListener);
    return () => { mounted = false; window.removeEventListener('header-updated', onUpdate as EventListener); };
  }, [page]);

  return null;
}
