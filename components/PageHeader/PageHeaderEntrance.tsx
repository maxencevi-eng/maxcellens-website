"use client";

import React, { useEffect, useRef } from "react";
import styles from "./PageHeader.module.css";

// Module-level flag: once dismissed, any new instance shows immediately (e.g. back navigation)
let _dismissed = false;

export default function PageHeaderEntrance({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Already dismissed (back navigation, or subsequent SPA navigations)
    if (_dismissed) {
      el.setAttribute("data-entrance", "animate");
      return;
    }
    const handler = () => {
      _dismissed = true;
      el.setAttribute("data-entrance", "animate");
    };
    window.addEventListener("splash-dismissed", handler, { once: true });
    return () => window.removeEventListener("splash-dismissed", handler);
  }, []);

  return (
    <div ref={ref} className={styles.headerEntranceWrap} data-page-header-entrance>
      {children}
    </div>
  );
}
