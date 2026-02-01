"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabase";
import styles from "./AdminNav.module.css";

const MAIN_PAGES: { href: string; label: string }[] = [
  { href: "/", label: "Accueil" },
  { href: "/realisation", label: "Réalisation" },
  { href: "/evenement", label: "Évènement" },
  { href: "/corporate", label: "Corporate" },
  { href: "/portrait", label: "Portrait" },
  { href: "/animation", label: "Animation" },
  { href: "/galeries", label: "Galeries" },
  { href: "/contact", label: "Contact" },
  { href: "/admin", label: "Admin" },
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
      <span className={styles.label}>Pages du site</span>
      <ul className={styles.list}>
        {MAIN_PAGES.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className={isActive(href) ? `${styles.link} ${styles.active}` : styles.link}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
