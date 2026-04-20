import type { Metadata } from 'next';
import PageHeader from '../../components/PageHeader/PageHeader';
import LegalPageClient from '../../components/LegalPage/LegalPageClient';

export const metadata: Metadata = {
  title: 'Mentions légales — Maxcellens',
  description: 'Mentions légales du site Maxcellens — Vidéaste & Photographe.',
  robots: { index: false, follow: false },
};

const defaultSections = [
  {
    title: 'Éditeur du site',
    content: [
      'Le site <strong>maxcellens.fr</strong> est édité par :',
      '<strong>Maxence Viozelange</strong>, exerçant sous le nom commercial <strong>Maxcellens</strong>',
      'Statut : Auto-entrepreneur — Vidéaste & Photographe indépendant',
      'SIRET : <strong>889 577 250 00018</strong>',
      'Siège : Clamart (92140), Île-de-France, France',
      'Email : <a href="mailto:maxcellens@gmail.com">maxcellens@gmail.com</a>',
      'Téléphone : <a href="tel:+33674966458">06 74 96 64 58</a>',
    ],
  },
  {
    title: 'Directeur de la publication',
    content: ['Maxence Viozelange'],
  },
  {
    title: 'Hébergement',
    content: [
      'Ce site est hébergé par :',
      '<strong>Vercel, Inc.</strong>',
      '340 Pine Street, Suite 900, San Francisco, CA 94104, États-Unis',
      'Site : <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>',
      'Base de données : <strong>Supabase, Inc.</strong> — <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a>',
    ],
  },
  {
    title: 'Propriété intellectuelle',
    content: [
      "L'ensemble des contenus présents sur ce site (photographies, vidéos, textes, logos, graphismes) sont la propriété exclusive de Maxence Viozelange, sauf mention contraire.",
      "Toute reproduction, distribution, modification ou utilisation de ces contenus, sans autorisation écrite préalable, est strictement interdite et constitue une contrefaçon sanctionnée par le Code de la propriété intellectuelle.",
    ],
  },
  {
    title: 'Responsabilité',
    content: [
      "Maxcellens s'efforce de fournir des informations exactes et à jour, mais ne saurait être tenu responsable des erreurs ou omissions présentes sur le site, ni de l'utilisation qui pourrait en être faite.",
      "Maxcellens décline toute responsabilité quant au contenu des sites tiers vers lesquels des liens sont proposés.",
    ],
  },
  {
    title: 'Droit applicable',
    content: [
      "Le présent site est soumis au droit français. En cas de litige, les tribunaux compétents sont ceux du ressort du domicile de l'éditeur, sauf disposition légale contraire.",
    ],
  },
  {
    title: 'Contact',
    content: [
      'Pour toute question relative aux mentions légales : <a href="mailto:maxcellens@gmail.com">maxcellens@gmail.com</a>',
    ],
  },
];

export default async function MentionsLegalesPage() {
  return (
    <section>
      <PageHeader
        page="mentions-legales"
        title="Mentions légales"
        subtitle="Informations légales relatives à l'édition et à l'exploitation du site"
        bgImage="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1600&q=80"
      />
      <LegalPageClient
        pageKey="legalPageMentions"
        title="Mentions légales"
        intro="Informations légales relatives à l'édition et à l'exploitation du site maxcellens.fr."
        defaultSections={defaultSections}
      />
    </section>
  );
}
