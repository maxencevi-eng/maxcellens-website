// alias to preserve new slug while reusing existing implementation
import ProductionServicePage, { metadata as productionServiceMetadata } from '../production/page';

export const metadata = productionServiceMetadata;

export default function ServicesRealisationPage() {
  return <ProductionServicePage />;
}
