"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import HeroRuntime from './HeroRuntime';
import HeaderRuntime from '../HeaderSettings/HeaderRuntime';

const HeroEditorButton = dynamic(() => import('./HeroEditorButton').then(m => m.default), { ssr: false });

export default function HeroEditorClientWrapper({ page }: { page?: string }) {
  if (!page) return null;
  return (
    <>
      <HeroEditorButton page={page} />
      <HeroRuntime />
      <HeaderRuntime page={page} />
    </>
  );
}
