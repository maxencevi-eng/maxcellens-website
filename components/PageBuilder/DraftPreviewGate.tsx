"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * N'affiche son contenu qu'à un utilisateur connecté.
 *
 * Utilisé par la route attrape-tout pour l'aperçu des brouillons : le rendu
 * serveur ne peut pas lire la session Supabase (stockée dans le navigateur),
 * donc la décision est prise côté client. Le contenu du brouillon transite
 * bien dans la réponse HTML — c'est acceptable pour un brouillon de page
 * publique en préparation, mais il ne faut pas y placer de données sensibles.
 */
export default function DraftPreviewGate({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setAllowed(Boolean((data as any)?.user));
    });
    return () => { mounted = false; };
  }, []);

  if (allowed === null) return null;

  if (!allowed) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 8 }}>Page introuvable</h1>
        <p style={{ color: 'var(--muted, #6b7280)' }}>
          Cette page n’existe pas ou n’est pas encore publiée.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
