import type { Metadata } from 'next';
import PageHeader from '../../components/PageHeader/PageHeader';
import LegalPageClient from '../../components/LegalPage/LegalPageClient';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Politique de confidentialité et gestion des données personnelles — Maxcellens.',
  robots: { index: false, follow: false },
};

const defaultSections = [
  {
    title: "Responsable du traitement",
    content: [
      "<strong>Maxence Viozelange EI</strong> (Maxcellens)",
      "Clamart (92140), Île-de-France, France",
      "E-mail : <a href=\"mailto:maxcellens@gmail.com\">maxcellens@gmail.com</a>",
    ],
  },
  {
    title: "Données collectées",
    content: [
      "Maxcellens collecte uniquement les données nécessaires à son activité :",
      "<strong>Formulaire de contact</strong> : nom, adresse e-mail, téléphone (facultatif), type de projet et message. Ces informations sont transmises par e-mail à Maxcellens pour répondre à votre demande ; elles ne sont ni revendues ni utilisées à des fins publicitaires.",
      "<strong>Galeries clients</strong> : les galeries sont privées et servent uniquement à livrer les photos et vidéos d'une prestation. Elles ne sont accessibles que par lien personnel (et, le cas échéant, mot de passe). Peuvent y être enregistrés : le nom et l'adresse e-mail saisis à l'ouverture lorsque la galerie le demande, les photos mises en favoris, les commentaires laissés sur les photos et l'historique des consultations et téléchargements. Une empreinte chiffrée et non réversible de l'adresse IP sert uniquement à bloquer les tentatives d'accès abusives.",
      "<strong>Statistiques de visite</strong> : un outil de mesure interne (sans Google Analytics ni service publicitaire) enregistre les pages consultées, la durée de visite, la provenance et le type d'appareil. L'adresse IP est conservée uniquement pour exclure les robots et les visites internes : elle n'est visible que par l'administrateur du site, et n'est jamais publiée ni transmise à des tiers.",
      "<strong>Contenus tiers</strong> : certaines pages intègrent des vidéos (YouTube, Vimeo) ou une carte (OpenStreetMap). Leur affichage transmet votre adresse IP à ces services, selon leurs propres politiques de confidentialité.",
    ],
  },
  {
    title: "Base légale du traitement",
    content: [
      "<strong>Formulaire de contact</strong> : mesures précontractuelles prises à votre demande (réponse à votre message, devis).",
      "<strong>Galeries clients</strong> : exécution du contrat de prestation (livraison des fichiers).",
      "<strong>Statistiques de visite</strong> : intérêt légitime de l'éditeur à mesurer l'audience de son site et à en améliorer le contenu.",
    ],
  },
  {
    title: "Cookies et stockage local",
    content: [
      "Ce site n'utilise aucun cookie publicitaire ni de traçage commercial.",
      "Seuls des cookies strictement nécessaires peuvent être déposés : accès à une galerie client après saisie du mot de passe (30 jours), identification du visiteur d'une galerie pour mémoriser ses favoris, session de l'espace Bureau à la carte (12 heures) et session de l'administrateur.",
      "La mesure d'audience interne utilise le stockage de session du navigateur, effacé à la fermeture de l'onglet.",
    ],
  },
  {
    title: "Hébergement et sous-traitants",
    content: [
      "Les données transitent ou sont stockées chez les prestataires suivants :",
      "<strong>Vercel Inc.</strong> (hébergement du site) — États-Unis.",
      "<strong>Supabase Inc.</strong> (base de données et stockage des médias du site).",
      "<strong>Cloudflare Inc.</strong> (stockage des fichiers des galeries clients — Cloudflare R2).",
      "<strong>Brevo</strong> (Sendinblue SAS, Paris, France) : envoi des e-mails du formulaire de contact et des notifications.",
      "Les transferts hors de l'Union européenne sont encadrés par les Clauses Contractuelles Types de la Commission européenne et, le cas échéant, par le Data Privacy Framework UE–États-Unis.",
    ],
  },
  {
    title: "Durée de conservation",
    content: [
      "<strong>Demandes de contact</strong> : conservées le temps nécessaire au traitement de votre demande, puis 3 ans au maximum après le dernier échange.",
      "<strong>Galeries clients</strong> : accessibles pendant la période de livraison indiquée lors de leur envoi ; à son terme, la galerie, ses fichiers et les données associées (favoris, commentaires, historique) sont supprimés.",
      "<strong>Statistiques de visite</strong> : 3 mois, puis suppression automatique.",
    ],
  },
  {
    title: "Vos droits (RGPD)",
    content: [
      "Conformément au Règlement Général sur la Protection des Données (RGPD — UE 2016/679), vous disposez des droits suivants :",
      "<strong>Accès, rectification, effacement, opposition, limitation</strong> du traitement de vos données, ainsi que <strong>portabilité</strong> des données que vous avez fournies.",
      "Pour exercer ces droits : <a href=\"mailto:maxcellens@gmail.com\">maxcellens@gmail.com</a>. Vous disposez également du droit de déposer une réclamation auprès de la <a href=\"https://www.cnil.fr\" target=\"_blank\" rel=\"noopener noreferrer\">CNIL</a>.",
    ],
  },
  {
    title: "Sécurité",
    content: [
      "Maxcellens met en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données : connexion HTTPS, accès restreint et authentifié aux outils d'administration, galeries protégées par lien personnel et mot de passe, mots de passe chiffrés.",
    ],
  },
  {
    title: "Mise à jour",
    content: [
      "Cette politique peut être mise à jour à tout moment. <em>Dernière mise à jour : novembre 2026</em>",
    ],
  },
];

export default async function PolitiqueConfidentialitePage() {
  return (
    <section>
      <PageHeader
        seoTitleAs="p"
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
