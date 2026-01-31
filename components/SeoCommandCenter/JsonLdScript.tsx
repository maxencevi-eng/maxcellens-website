/**
 * Injection JSON-LD côté serveur (SSR). À placer dans la page pour que les robots voient le script.
 */
import { getPageSeo } from '../../lib/pageSeo';

type Props = { slug: string };

export default async function JsonLdScript({ slug }: Props) {
  const seo = await getPageSeo(slug);
  if (!seo?.json_ld?.trim()) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: seo.json_ld.trim() }}
    />
  );
}
