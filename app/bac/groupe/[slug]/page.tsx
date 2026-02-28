// app/bac/groupe/[slug]/page.tsx — legacy route, redirects to /bac/[slug]
import { redirect } from 'next/navigation';

export default async function GroupePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/bac/${slug}`);
}
