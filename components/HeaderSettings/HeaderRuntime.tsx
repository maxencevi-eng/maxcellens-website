"use client";
import React, { useEffect } from 'react';

function applySettings(page: string | undefined, settingsSite: any) {
  try {
    const selector = `[data-measure="hero"][data-page="${page}"]`;
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return;
    if (settingsSite?.height) el.style.height = `${settingsSite.height.value}${settingsSite.height.unit || '%'}`;
    if (settingsSite?.width) el.style.width = `${settingsSite.width.value}${settingsSite.width.unit || '%'}`;
    // overlay element
    const overlay = el.querySelector('[class*="overlay"]') as HTMLElement | null;
    if (overlay && settingsSite?.overlay) {
      overlay.style.backgroundColor = settingsSite.overlay.color || '#000';
      overlay.style.opacity = String(typeof settingsSite.overlay.opacity !== 'undefined' ? settingsSite.overlay.opacity : 0.5);
    }
  } catch (e) {}
}

export default function HeaderRuntime({ page }: { page?: string }) {
  useEffect(() => {
    const p = page || (document.querySelector('[data-measure="hero"]')?.getAttribute('data-page') || undefined);
    if (!p) return;
    let mounted = true;

    async function load() {
      try {
        const resp = await fetch(`/api/admin/hero?slug=${encodeURIComponent(p)}&raw=1`);
        if (!resp.ok) return;
        const j = await resp.json();
        const d = j?.data || {};
        const s = d?.settings_site || {};
        if (!mounted) return;
        applySettings(p, s);
      } catch (e) {}
    }
    load();

    function onUpdate(e: any) {
      const detail = e?.detail || {};
      if (detail?.page && detail.page !== p) return;
      if (detail?.settings_site) applySettings(p, detail.settings_site);
      else load();
    }

    window.addEventListener('header-updated', onUpdate as EventListener);
    return () => { mounted = false; window.removeEventListener('header-updated', onUpdate as EventListener); };
  }, [page]);

  return null;
}
