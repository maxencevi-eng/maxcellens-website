"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { normalizeBlockData, storagePathsForBlock } from './blocks/registry';
import type { PageBlock } from './pageTypes';

/**
 * Édition des blocs d'une page : ajout, modification, déplacement, suppression.
 *
 * Toutes les opérations sont optimistes — l'écran réagit immédiatement — et
 * reviennent à l'état précédent si le serveur refuse.
 */
export function usePageBlocks(pageId: string, initial: PageBlock[]) {
  const [blocks, setBlocks] = useState<PageBlock[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Signature de la dernière liste initiale appliquée. */
  const initialKey = useRef<string>('');

  /**
   * Resynchronise quand la liste initiale arrive après le montage.
   *
   * Sur une page historique, `pageId` et les blocs sont chargés en asynchrone :
   * le `useState` ci-dessus est alors initialisé avec un tableau vide et ne
   * verrait jamais les blocs réellement enregistrés.
   *
   * On compare une signature plutôt que la référence du tableau, que les
   * appelants recréent à chaque rendu — sinon l'effet écraserait en boucle les
   * modifications optimistes en cours.
   */
  useEffect(() => {
    const key = `${pageId}|${initial.map((b) => `${b.id}:${b.position}`).join(',')}`;
    if (key === initialKey.current) return;
    initialKey.current = key;
    setBlocks(initial);
  }, [pageId, initial]);

  /** Toutes les écritures exigent le jeton de session admin. */
  const authHeaders = useCallback(async (): Promise<HeadersInit | null> => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return null;
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, []);

  const addBlock = useCallback(
    async (type: string, position?: number) => {
      setBusy(true);
      setError(null);
      try {
        const headers = await authHeaders();
        if (!headers) throw new Error('Session expirée — reconnectez-vous.');
        const resp = await fetch(`/api/pages/${pageId}/blocks`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ type, position, data: normalizeBlockData(type, {}) }),
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || 'Ajout impossible');

        const created: PageBlock = json.block;
        setBlocks((prev) => {
          const next = [...prev];
          next.splice(created.position, 0, created);
          // Renumérote localement pour rester aligné sur le serveur
          return next.map((b, i) => ({ ...b, position: i }));
        });
        return created;
      } catch (e: any) {
        setError(e?.message || 'Ajout impossible');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [pageId, authHeaders]
  );

  const updateBlock = useCallback(
    async (blockId: string, patch: Partial<Pick<PageBlock, 'data' | 'visible' | 'widthMode'>>) => {
      const previous = blocks;
      setBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, ...patch } as PageBlock : b))
      );
      try {
        const headers = await authHeaders();
        if (!headers) throw new Error('Session expirée — reconnectez-vous.');
        const resp = await fetch(`/api/blocks/${blockId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(patch),
        });
        if (!resp.ok) {
          const json = await resp.json().catch(() => ({}));
          throw new Error((json as any)?.error || 'Enregistrement impossible');
        }
        setError(null);
        return true;
      } catch (e: any) {
        setBlocks(previous);
        setError(e?.message || 'Enregistrement impossible');
        return false;
      }
    },
    [blocks, authHeaders]
  );

  const moveBlock = useCallback(
    async (blockId: string, direction: 'up' | 'down') => {
      const i = blocks.findIndex((b) => b.id === blockId);
      const j = direction === 'up' ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= blocks.length) return;

      const previous = blocks;
      const next = [...blocks];
      [next[i], next[j]] = [next[j], next[i]];
      const renumbered = next.map((b, k) => ({ ...b, position: k }));
      setBlocks(renumbered);

      try {
        const headers = await authHeaders();
        if (!headers) throw new Error('Session expirée — reconnectez-vous.');
        const resp = await fetch(`/api/pages/${pageId}/blocks`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ order: renumbered.map((b) => b.id) }),
        });
        if (!resp.ok) throw new Error('Réorganisation impossible');
        setError(null);
      } catch (e: any) {
        setBlocks(previous);
        setError(e?.message || 'Réorganisation impossible');
      }
    },
    [blocks, pageId, authHeaders]
  );

  const reorder = useCallback(
    async (order: string[]) => {
      const previous = blocks;
      const byId = new Map(blocks.map((b) => [b.id, b]));
      const next = order
        .map((id, i) => {
          const b = byId.get(id);
          return b ? { ...b, position: i } : null;
        })
        .filter(Boolean) as PageBlock[];
      setBlocks(next);

      try {
        const headers = await authHeaders();
        if (!headers) throw new Error('Session expirée — reconnectez-vous.');
        const resp = await fetch(`/api/pages/${pageId}/blocks`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ order }),
        });
        if (!resp.ok) throw new Error('Réorganisation impossible');
        setError(null);
      } catch (e: any) {
        setBlocks(previous);
        setError(e?.message || 'Réorganisation impossible');
      }
    },
    [blocks, pageId, authHeaders]
  );

  const deleteBlock = useCallback(
    async (blockId: string) => {
      const target = blocks.find((b) => b.id === blockId);
      const previous = blocks;
      setBlocks((prev) => prev.filter((b) => b.id !== blockId).map((b, i) => ({ ...b, position: i })));

      try {
        const headers = await authHeaders();
        if (!headers) throw new Error('Session expirée — reconnectez-vous.');
        const resp = await fetch(`/api/blocks/${blockId}`, { method: 'DELETE', headers });
        if (!resp.ok) throw new Error('Suppression impossible');

        // Nettoyage des médias : sans cela, chaque image supprimée resterait
        // indéfiniment dans le bucket.
        if (target) {
          const paths = storagePathsForBlock(target.type, target.data);
          await Promise.all(
            paths.map((path) =>
              fetch('/api/admin/delete-storage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path }),
              }).catch(() => {})
            )
          );
        }
        setError(null);
      } catch (e: any) {
        setBlocks(previous);
        setError(e?.message || 'Suppression impossible');
      }
    },
    [blocks, authHeaders]
  );

  const duplicateBlock = useCallback(
    async (blockId: string) => {
      const source = blocks.find((b) => b.id === blockId);
      if (!source) return;
      setBusy(true);
      try {
        const headers = await authHeaders();
        if (!headers) throw new Error('Session expirée — reconnectez-vous.');
        const resp = await fetch(`/api/pages/${pageId}/blocks`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: source.type,
            position: source.position + 1,
            widthMode: source.widthMode,
            visible: source.visible,
            // Copie profonde : les deux blocs doivent rester indépendants
            data: JSON.parse(JSON.stringify(source.data)),
          }),
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json?.error || 'Duplication impossible');
        const created: PageBlock = json.block;
        setBlocks((prev) => {
          const next = [...prev];
          next.splice(created.position, 0, created);
          return next.map((b, i) => ({ ...b, position: i }));
        });
        setError(null);
      } catch (e: any) {
        setError(e?.message || 'Duplication impossible');
      } finally {
        setBusy(false);
      }
    },
    [blocks, pageId, authHeaders]
  );

  return {
    blocks,
    busy,
    error,
    clearError: () => setError(null),
    addBlock,
    updateBlock,
    moveBlock,
    reorder,
    deleteBlock,
    duplicateBlock,
  };
}

export default usePageBlocks;
