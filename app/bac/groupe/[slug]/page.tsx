// app/bac/groupe/[slug]/page.tsx
import GroupeClient from '../../../../components/bac/GroupeInterface';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Groupe',
  robots: { index: false, follow: false },
};

export default async function GroupePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <GroupeClient slug={slug} />;
}
