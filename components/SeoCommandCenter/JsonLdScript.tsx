/**
 * Injection JSON-LD côté serveur (SSR). À placer dans la page pour que les robots voient le script.
 */
import { getPageSeo } from '../../lib/pageSeo';
import { jsonLdHtml } from './jsonLdHtml';

type Props = { slug: string };

export default async function JsonLdScript({ slug }: Props) {
  const seo = await getPageSeo(slug);
  const html = seo?.json_ld?.trim() ? jsonLdHtml(seo.json_ld) : '';
  if (!html) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: html }} />;
}
