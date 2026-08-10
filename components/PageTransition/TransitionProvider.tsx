"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_TRANSITION_SETTINGS,
  normalizeTransitionSettings,
  type TransitionSettings,
} from './transitionSettings';

export type { TransitionSettings };

const TransitionContext = createContext<{
  settings: TransitionSettings;
  setSettings: (s: TransitionSettings) => void;
  saveSettings: (s?: TransitionSettings) => Promise<void>;
}>({
  settings: DEFAULT_TRANSITION_SETTINGS,
  setSettings: () => {},
  saveSettings: async () => {},
});

export function useTransitionSettings() {
  return useContext(TransitionContext);
}

export default function TransitionProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<TransitionSettings>(DEFAULT_TRANSITION_SETTINGS);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=page_transitions');
        if (!resp.ok) return;
        const json = await resp.json();
        const raw = json?.settings?.page_transitions;
        if (raw && mounted) {
          setSettings(normalizeTransitionSettings(JSON.parse(raw)));
        }
      } catch (e) {
        console.warn('Failed to load page_transitions', e);
      }
    })();

    // Mise à jour depuis l'éditeur admin, sans rechargement
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.key !== 'page_transitions' || !detail?.value) return;
      try {
        setSettings(normalizeTransitionSettings(JSON.parse(detail.value)));
      } catch {
        // valeur illisible : on conserve les réglages courants
      }
    }
    window.addEventListener('site-settings-updated', onUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('site-settings-updated', onUpdate);
    };
  }, []);

  const saveSettings = useCallback(
    async (s?: TransitionSettings) => {
      const toSave = s || settings;
      const payload = JSON.stringify(toSave);
      try {
        await fetch('/api/admin/site-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'page_transitions', value: payload }),
        });
        window.dispatchEvent(
          new CustomEvent('site-settings-updated', {
            detail: { key: 'page_transitions', value: payload },
          })
        );
      } catch (e) {
        console.warn('saveSettings (transitions) failed', e);
      }
    },
    [settings]
  );

  const value = useMemo(
    () => ({ settings, setSettings, saveSettings }),
    [settings, saveSettings]
  );

  return <TransitionContext.Provider value={value}>{children}</TransitionContext.Provider>;
}
