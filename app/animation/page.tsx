import type { Metadata } from "next";
import PageHeader from "../../components/PageHeader/PageHeader";
import AnimationPageClient from "../../components/AnimationEditor/AnimationPageClient";

export const metadata: Metadata = {
  title: "Animation",
  description:
    "Un épisode de série TV personnalisé pour votre entreprise — team building créatif pour PME.",
};

export default function AnimationPage() {
  return (
    <section>
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
