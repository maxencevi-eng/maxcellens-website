"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';

export type TransitionSettings = {
  enabled: boolean;
  overlayColor: string;
  duration: number; // seconds (0.3 – 1.2)
};

const defaultSettings: TransitionSettings = {
  enabled: true,
  overlayColor: '#172622',
  duration: 0.6,
};

const TransitionContext = createContext<{
  settings: TransitionSettings;
  setSettings: (s: TransitionSettings) => void;
  saveSettings: (s?: TransitionSettings) => Promise<void>;
}>({
  settings: defaultSettings,
  setSettings: () => {},
  saveSettings: async () => {},
});

export function useTransitionSettings() {
  return useContext(TransitionContext);
}

export default function TransitionProvider({ children }: { children: React.ReactNode }) {
  const [settings, _setSettings] = useState<TransitionSettings>(defaultSettings);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=page_transitions');
        if (!resp.ok) return;
        const json = await resp.json();
        const raw = json?.settings?.page_transitions;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (mounted) _setSettings({ ...defaultSettings, ...parsed });
        }
      } catch (e) {
        console.warn('Failed to load page_transitions', e);
      }
    }
    load();

    // Listen for admin updates
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.key === 'page_transitions' && detail?.value) {
        try {
          const parsed = JSON.parse(detail.value);
          _setSettings({ ...defaultSettings, ...parsed });
        } catch {}
      }
    }
    window.addEventListener('site-settings-updated', onUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('site-settings-updated', onUpdate);
    };
  }, []);

  async function saveSettings(s?: TransitionSettings) {
    const toSave = s || settings;
    try {
      await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'page_transitions', value: JSON.stringify(toSave) }),
      });
      // Notify other components
      window.dispatchEvent(new CustomEvent('site-settings-updated', {
        detail: { key: 'page_transitions', value: JSON.stringify(toSave) },
      }));
    } catch (e) {
      console.warn('saveSettings (transitions) failed', e);
    }
  }

  return (
    <TransitionContext.Provider value={{ settings, setSettings: _setSettings, saveSettings }}>
      {children}
    </TransitionContext.Provider>
  );
}
