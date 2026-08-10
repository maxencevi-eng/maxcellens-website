"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabase";
import styles from "./AdminNav.module.css";

const MAIN_PAGES: { href: string; label: string; description: string }[] = [
  { href: "/", label: "Accueil", description: "Voir et modifier l’introduction du site" },
  { href: "/realisation", label: "Réalisation", description: "Accéder à la section portfolio vidéo" },
  { href: "/evenement", label: "Évènement", description: "Modifier la page événements et reportages" },
  { href: "/corporate", label: "Corporate", description: "Gérer la page entreprise et témoignages" },
  { href: "/portrait", label: "Portrait", description: "Mettre à jour les galeries portrait" },
  { href: "/animation", label: "Animation", description: "Piloter les contenus animation" },
  { href: "/galeries", label: "Galeries", description: "Organiser les collections photo" },
  { href: "/contact", label: "Contact", description: "Mettre à jour les informations de contact" },
  { href: "/bac", label: "Bureau à la Carte", description: "Accéder à l’espace B.A.C " },
  { href: "/admin", label: "Admin", description: "Retour au tableau de bord principal" },
];

export default function AdminNav() {
  const [user, setUser] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser((data as any)?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      try {
        (listener as any)?.subscription?.unsubscribe?.();
      } catch (_) {}
    };
  }, []);

  if (!user) return null;

  function isActive(href: string) {
    if (!pathname) return false;
    const p = pathname.replace(/\/+$/, "") || "/";
    const h = href.replace(/\/+$/, "") || "/";
    return (h === "/" && p === "/") || p === h || (h !== "/" && p.startsWith(h + "/"));
  }

  return (
    <nav className={styles.nav} aria-label="Menu du site (admin)">
      <div className={styles.header}>
        <div>
          <span className={styles.label}>Pages du site</span>
          <p className={styles.description}>Choisissez une section pour la modifier.</p>
        </div>
        <span className={styles.status}>En ligne</span>
      </div>
      <ul className={styles.grid}>
        {MAIN_PAGES.map(({ href, label, description }) => (
          <li key={href}>
            <Link
              href={href}
              className={isActive(href) ? `${styles.link} ${styles.active}` : styles.link}
            >
              <span className={styles.tileTitle}>{label}</span>
              <span className={styles.tileDescription}>{description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
