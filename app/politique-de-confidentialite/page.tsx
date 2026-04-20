import type { Metadata } from 'next';
import PageHeader from '../../components/PageHeader/PageHeader';
import LegalPageClient from '../../components/LegalPage/LegalPageClient';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Maxcellens',
  description: 'Politique de confidentialité et gestion des données personnelles — Maxcellens.',
  robots: { index: false, follow: false },
};

const defaultSections = [
  {
    title: 'Responsable du traitement',
    content: [
      '<strong>Maxence Viozelange</strong> (Maxcellens)',
      'Clamart (92140), Île-de-France, France',
      'Email : <a href="mailto:maxcellens@gmail.com">maxcellens@gmail.com</a>',
    ],
  },
  {
    title: 'Données collectées',
    content: [
      'Maxcellens collecte uniquement les données strictement nécessaires à son activité :',
      "<strong>Formulaire de contact</strong> : nom, adresse e-mail, message. Ces données sont utilisées exclusivement pour répondre à votre demande et ne sont jamais transmises à des tiers.",
      "<strong>Statistiques de visite</strong> : données de navigation anonymisées collectées via un système interne (pages visitées, durée de session, provenance géographique approximative). Ces données ne permettent pas de vous identifier personnellement et ne sont jamais transmises à des tiers.",
    ],
  },
  {
    title: 'Base légale du traitement',
    content: [
      "<strong>Formulaire de contact</strong> : exécution de mesures précontractuelles (réponse à votre demande).",
      "<strong>Analytics et statistiques</strong> : intérêt légitime de l'éditeur à analyser l'audience de son site et à en améliorer le contenu.",
    ],
  },
  {
    title: 'Cookies',
    content: [
      "Ce site n'utilise aucun cookie publicitaire ou de traçage commercial.",
      "Un cookie de session technique peut être déposé lors d'une authentification administrateur. Il est strictement nécessaire au fonctionnement du site.",
    ],
  },
  {
    title: 'Hébergement et sous-traitants',
    content: [
      'Les données collectées transitent ou sont stockées chez les prestataires suivants :',
      "<strong>Vercel, Inc.</strong> (hébergement web) — San Francisco, CA, États-Unis. Conformité aux transferts internationaux via les Clauses Contractuelles Types (CCT).",
      "<strong>Supabase, Inc.</strong> (base de données) — Conformité via CCT.",
    ],
  },
  {
    title: 'Durée de conservation',
    content: [
      "<strong>Données de contact</strong> : conservées pendant la durée nécessaire au traitement de votre demande, puis supprimées dans un délai de 3 ans maximum.",
      "<strong>Données analytics</strong> : conservées 12 mois (système interne).",
    ],
  },
  {
    title: 'Vos droits (RGPD)',
    content: [
      'Conformément au Règlement Général sur la Protection des Données (RGPD — UE 2016/679), vous disposez des droits suivants :',
      "<strong>Accès, rectification, effacement, opposition, limitation</strong> du traitement de vos données.",
      "Pour exercer ces droits : <a href=\"mailto:maxcellens@gmail.com\">maxcellens@gmail.com</a>. Vous disposez également du droit de déposer une réclamation auprès de la <a href=\"https://www.cnil.fr\" target=\"_blank\" rel=\"noopener noreferrer\">CNIL</a>.",
    ],
  },
  {
    title: 'Sécurité',
    content: [
      "Maxcellens met en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données : connexion HTTPS, base de données sécurisée, accès restreint.",
    ],
  },
  {
    title: 'Mise à jour',
    content: [
      "Cette politique peut être mise à jour à tout moment. <em>Dernière mise à jour : mars 2026</em>",
    ],
  },
];

export default async function PolitiqueConfidentialitePage() {
  return (
    <section>
      <PageHeader
        page="politique-de-confidentialite"
        title="Politique de confidentialité"
        subtitle="Comment vos données personnelles sont collectées et protégées"
        bgImage="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80"
      />
      <LegalPageClient
        pageKey="legalPagePolitique"
        title="Politique de confidentialité"
        intro="Maxcellens s'engage à protéger la vie privée de ses visiteurs. Cette page décrit comment vos données personnelles sont collectées, utilisées et protégées."
        defaultSections={defaultSections}
      />
    </section>
  );
}
