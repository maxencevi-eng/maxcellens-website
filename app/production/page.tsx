import PageHeader from '../../components/PageHeader/PageHeader';
import ProductionPageClient from '../../components/ProductionPageClient/ProductionPageClient';

export const metadata = { title: 'Réalisation' };

export default function Production() {
  return (
    <>
      <PageHeader page="production" title="Réalisation" subtitle="Services de production photo & vidéo sur-mesure." bgImage="https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80" />
      <ProductionPageClient />
    </>
  );
}
