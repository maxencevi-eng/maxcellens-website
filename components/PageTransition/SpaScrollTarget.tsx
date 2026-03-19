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
 *
 * Variable module-level (_pendingTarget) pour survivre au double-invoke
 * de React Strict Mode : le 1er run lit sessionStorage et met en cache,
 * le 2nd run utilise le cache même si sessionStorage est déjà vidé.
 */

let _pendingTarget: string | null = null;

export default function SpaScrollTarget() {
  const pathname = usePathname();

  useEffect(() => {
    // Lire sessionStorage une seule fois (Strict Mode safe)
    if (!_pendingTarget) {
      try {
        _pendingTarget = sessionStorage.getItem("spaScrollTarget");
        if (_pendingTarget) sessionStorage.removeItem("spaScrollTarget");
      } catch (_) {}
    }

    const targetId = _pendingTarget;
    if (!targetId) return;

    let fired = false;
    const attempt = () => {
      if (fired) return;
      const el = document.getElementById(targetId);
      if (!el) return;
      fired = true;
      _pendingTarget = null;
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
