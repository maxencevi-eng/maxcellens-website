"use client";

import React, { useEffect } from 'react';

export default function PageLayoutProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function apply(data: { desktop?: any; mobile?: any }) {
      const desktop = data?.desktop ?? {};
      const mobile = data?.mobile ?? {};
      const root = document.documentElement;
      root.style.setProperty('--container-max-width-desktop', `${desktop.containerMaxWidth ?? 1200}px`);
      root.style.setProperty('--content-inner-max-width-desktop', `${desktop.contentInnerMaxWidth ?? 2000}px`);
      root.style.setProperty('--content-inner-min-height-desktop', `${desktop.contentInnerMinHeight ?? 0}px`);
      root.style.setProperty('--block-inner-padding-desktop', `${desktop.blockInnerPadding ?? 24}px`);
      root.style.setProperty('--container-margin-x-desktop', `${desktop.marginHorizontal ?? 24}px`);
      root.style.setProperty('--section-gap-desktop', `${desktop.sectionGap ?? 48}px`);
      root.style.setProperty('--container-max-width-mobile', `${mobile.containerMaxWidth ?? 1000}px`);
      root.style.setProperty('--content-inner-max-width-mobile', `${mobile.contentInnerMaxWidth ?? 1200}px`);
      root.style.setProperty('--content-inner-min-height-mobile', `${mobile.contentInnerMinHeight ?? 0}px`);
      root.style.setProperty('--block-inner-padding-mobile', `${mobile.blockInnerPadding ?? 16}px`);
      root.style.setProperty('--container-margin-x-mobile', `${mobile.marginHorizontal ?? 16}px`);
      root.style.setProperty('--section-gap-mobile', `${mobile.sectionGap ?? 32}px`);
    }
    fetch('/api/page-layout')
      .then((r) => r.json())
      .then(apply)
      .catch(() => {});
    const handler = (e: CustomEvent) => apply(e.detail || {});
    window.addEventListener('page-layout-updated', handler as EventListener);
    return () => window.removeEventListener('page-layout-updated', handler as EventListener);
  }, []);
  return <>{children}</>;
}
