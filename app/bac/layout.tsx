// app/bac/layout.tsx — Isolated layout for Bureau à la Carte
import '../../styles/bac.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: {
    default: 'Bureau à la Carte',
    template: '%s | Bureau à la Carte',
  },
  robots: { index: false, follow: false },
};

export default function BacLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bac-root">
      {children}
    </div>
  );
}
