"use client";

import React, { useEffect, useState } from "react";
import styles from "./PageHeader.module.css";

// Un seul header animé par session (chargement / refresh), pas en navigation
let hasAnimatedHeader = false;

type State = "pending" | "animate" | "idle";

export default function PageHeaderEntrance({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>("pending");

  useEffect(() => {
    if (hasAnimatedHeader) {
      setState("idle");
      return;
    }
    hasAnimatedHeader = true;
    setState("animate");
  }, []);

  const className =
    state === "pending"
      ? styles.headerEntrancePending
      : state === "animate"
        ? styles.headerEntrance
        : styles.headerEntranceIdle;

  return (
    <div className={className} data-page-header-entrance>
      {children}
    </div>
  );
}
