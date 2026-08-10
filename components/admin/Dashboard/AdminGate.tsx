"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

/**
 * Devine l'état de session AVANT le premier rendu.
 *
 * `supabase.auth.getUser()` est asynchrone : rendre le formulaire de connexion
 * en attendant faisait apparaître l'ancien écran une fraction de seconde avant
 * le tableau de bord. Supabase conserve sa session dans localStorage sous une
 * clé `sb-<ref>-auth-token` ; sa simple présence suffit à choisir le bon écran
 * dès le premier paint. La vérification réelle suit et corrige si besoin.
 *
 * Lecture volontairement permissive : ce n'est qu'un indice d'affichage, la
 * moindre donnée sensible reste protégée par les routes API.
 */
function guessSignedIn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && /^sb-.*-auth-token$/.test(key) && localStorage.getItem(key)) {
        return true;
      }
    }
  } catch (_) {
    // localStorage indisponible (mode privé strict) : on retombe sur `false`
  }
  return false;
}

/**
 * Affiche `signedIn` ou `signedOut` selon la session Supabase.
 *
 * Évite de rendre le tableau de bord — et ses appels API authentifiés — à un
 * visiteur non connecté qui atterrirait sur /admin.
 */
export default function AdminGate({
  signedIn,
  signedOut,
}: {
  signedIn: React.ReactNode;
  signedOut: React.ReactNode;
}) {
  // `null` = rendu serveur / hydratation : on ne rend rien pour que le HTML
  // du serveur et celui du client coïncident.
  const [state, setState] = useState<'pending' | 'in' | 'out'>('pending');

  useEffect(() => {
    let mounted = true;

    // Choix optimiste immédiat, avant même la réponse de Supabase
    setState(guessSignedIn() ? 'in' : 'out');

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setState((data as any)?.user ? 'in' : 'out');
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setState(session?.user ? 'in' : 'out');
    });
    return () => {
      mounted = false;
      try { (listener as any)?.subscription?.unsubscribe?.(); } catch (_) {}
    };
  }, []);

  if (state === 'pending') return null;
  if (state === 'in') return <>{signedIn}</>;
  return <>{signedOut}</>;
}
