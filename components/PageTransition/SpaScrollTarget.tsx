"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Composant global — gère le scroll vers une section après navigation SPA.
 *
 * Usage : avant de naviguer, stocker dans sessionStorage :
 *   sessionStorage.setItem("spaScrollTarget", "element-id")
 *
 * Après splash-dismissed, scrollIntoView(block:"center") sur l'élément.
 * Si pas de clé → rien ne se passe.
 */
export default function SpaScrollTarget() {
  const pathname = usePathname();

  useEffect(() => {
    let targetId: string | null = null;
    try {
      targetId = sessionStorage.getItem("spaScrollTarget");
      if (targetId) sessionStorage.removeItem("spaScrollTarget");
    } catch (_) {}

    if (!targetId) return;

    let fired = false;
    const attempt = () => {
      if (fired) return;
      const el = document.getElementById(targetId!);
      if (!el) return;
      fired = true;
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    };

    const onDismiss = () => attempt();
    window.addEventListener("splash-dismissed", onDismiss, { once: true });
    const safety = setTimeout(attempt, 4000);

    return () => {
      clearTimeout(safety);
      window.removeEventListener("splash-dismissed", onDismiss);
    };
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
