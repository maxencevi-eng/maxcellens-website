"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Charge / modifie / enregistre un réglage JSON de `site_settings`.
 *
 * Mutualise le cycle que chaque modale réimplémentait : `useEffect` de
 * chargement, `useState` de brouillon, drapeau `saving`, message d'erreur,
 * `fetch` POST. Expose en plus un `dirty` fiable, dont `AdminModal` se sert
 * pour son garde-fou de fermeture.
 */

export type UseAdminFormOptions<T> = {
  /** Clé dans la table `site_settings`. */
  settingKey: string;
  /** Valeur utilisée tant que rien n'est chargé, et si la clé est absente. */
  defaults: T;
  /** Normalise / migre la valeur brute lue en base. */
  parse?: (raw: string) => T;
  /** Sérialise avant écriture. Par défaut `JSON.stringify`. */
  serialize?: (value: T) => string;
  /** Appelé après un enregistrement réussi. */
  onSaved?: (value: T) => void;
  /** Diffuse `site-settings-updated` après enregistrement (défaut : true). */
  broadcast?: boolean;
};

export type AdminForm<T> = {
  value: T;
  /** Modifie le brouillon. Accepte une valeur ou une fonction de mise à jour. */
  set: (updater: T | ((prev: T) => T)) => void;
  /** Fusion superficielle — raccourci pour les objets plats. */
  patch: (partial: Partial<T>) => void;
  loading: boolean;
  saving: boolean;
  saved: boolean;
  dirty: boolean;
  error: string | null;
  save: () => Promise<void>;
  /** Revient à la dernière valeur enregistrée. */
  reset: () => void;
};

export function useAdminForm<T>({
  settingKey,
  defaults,
  parse,
  serialize,
  onSaved,
  broadcast = true,
}: UseAdminFormOptions<T>): AdminForm<T> {
  const [value, setValue] = useState<T>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Référence de comparaison pour `dirty` : dernier état persisté. */
  const baseline = useRef<string>(JSON.stringify(defaults));
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch(
          `/api/admin/site-settings?keys=${encodeURIComponent(settingKey)}`
        );
        if (!resp.ok) throw new Error('Chargement impossible');
        const json = await resp.json();
        const raw = json?.settings?.[settingKey];
        if (!mounted) return;
        if (raw && typeof raw === 'string') {
          try {
            const parsed = parse ? parse(raw) : (JSON.parse(raw) as T);
            // Fusion avec les défauts : un réglage ajouté après coup ne doit
            // pas rester `undefined` sur les enregistrements existants.
            const merged =
              parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? ({ ...(defaults as any), ...(parsed as any) } as T)
                : parsed;
            setValue(merged);
            baseline.current = JSON.stringify(merged);
          } catch {
            // Valeur illisible en base — on garde les défauts plutôt que de
            // planter la modale.
          }
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Chargement impossible');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // `defaults` et `parse` sont volontairement hors dépendances : ce sont des
    // littéraux recréés à chaque render par les appelants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingKey]);

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
  }, []);

  const set = useCallback((updater: T | ((prev: T) => T)) => {
    setSaved(false);
    setValue((prev) =>
      typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater
    );
  }, []);

  const patch = useCallback(
    (partial: Partial<T>) => {
      set((prev) => ({ ...(prev as any), ...(partial as any) }) as T);
    },
    [set]
  );

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = serialize ? serialize(value) : JSON.stringify(value);
      const resp = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: settingKey, value: payload }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error((j as any)?.error || 'Échec de l’enregistrement');
      }
      baseline.current = JSON.stringify(value);
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2600);

      if (broadcast) {
        try {
          window.dispatchEvent(
            new CustomEvent('site-settings-updated', {
              detail: { key: settingKey, value: payload },
            })
          );
        } catch (_) {}
      }
      onSaved?.(value);
    } catch (e: any) {
      setError(e?.message || 'Échec de l’enregistrement');
    } finally {
      setSaving(false);
    }
  }, [value, settingKey, serialize, onSaved, broadcast]);

  const reset = useCallback(() => {
    try {
      setValue(JSON.parse(baseline.current) as T);
      setSaved(false);
      setError(null);
    } catch (_) {}
  }, []);

  const dirty = JSON.stringify(value) !== baseline.current;

  return { value, set, patch, loading, saving, saved, dirty, error, save, reset };
}

export default useAdminForm;
