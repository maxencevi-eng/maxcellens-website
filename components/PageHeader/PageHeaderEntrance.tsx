"use client";

import React, { useEffect, useRef } from "react";
import styles from "./PageHeader.module.css";

export default function PageHeaderEntrance({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => {
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
