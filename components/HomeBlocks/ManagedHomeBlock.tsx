"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import Clients from '../Clients/Clients';

const HomePageClient = dynamic(() => import('./HomePageClient'));

/** An instance reads only its own data and leaves admin controls to the page builder. */
export default function ManagedHomeBlock({ type, data }: { type: string; data: Record<string, any> }) {
  if (type === 'home_clients') return <Clients key={JSON.stringify(data)} premium settingsData={data} />;
  return <HomePageClient key={JSON.stringify(data)} renderOnly={type} initialSettings={{ [type]: JSON.stringify(data) }} />;
}
