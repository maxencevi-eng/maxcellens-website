import type { Metadata } from "next";
import PageHeader from "../../components/PageHeader/PageHeader";
import AnimationPageClient from "../../components/AnimationEditor/AnimationPageClient";
import { getPageSeo, buildMetadataFromSeo } from "../../lib/pageSeo";
import JsonLdScript from "../../components/SeoCommandCenter/JsonLdScript";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("animation");
  const built = buildMetadataFromSeo(seo);
  if (built) return built;
  return {
    title: "Animation",
    description:
      "Un épisode de série TV personnalisé pour votre entreprise — team building créatif pour PME.",
  };
}

export default async function AnimationPage() {
  return (
    <section>
      <JsonLdScript slug="animation" />
      <PageHeader
        page="animation"
        title="Animation"
        subtitle="Un épisode de série TV personnalisé pour votre entreprise"
        bgImage="https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1600&q=80"
      />
      <AnimationPageClient />
    </section>
  );
}
