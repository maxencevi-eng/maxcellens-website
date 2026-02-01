import type { AnimationSectionData, AnimationCtaData } from "./AnimationBlockModal";

export const DEFAULT_S1: AnimationSectionData = {
  label: "Le concept",
  title: "Votre entreprise en série",
  labelStyle: "p",
  titleStyle: "h2",
  html: "<p>Nous réalisons un épisode de sitcom sur-mesure avec vos équipes. Inspiré des univers de Modern Family, The Office ou Brooklyn 99, le format mêle humour et collaboration : vos collaborateurs deviennent scénaristes, acteurs et techniciens le temps d'une journée.</p><ul><li><strong>Vidéo finale</strong> : 5 à 10 minutes</li><li><strong>Participants</strong> : 5 à 15 personnes</li><li><strong>Format</strong> : team building créatif et mémorable</li></ul>",
  image: { url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80" },
  bgColor: "",
};

export const DEFAULT_S2: AnimationSectionData = {
  label: "Pour qui",
  title: "PME & équipes qui veulent se retrouver",
  labelStyle: "p",
  titleStyle: "h2",
  html: "<p>Ce format s'adresse aux entreprises qui souhaitent renforcer la cohésion et la collaboration. En reflétant votre organigramme (assistants, chefs de projet, managers, direction), chaque groupe contribue à l'histoire et se découvre sous un angle décalé et bienveillant.</p>",
  image: { url: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80" },
  bgColor: "",
};

export const DEFAULT_S3: AnimationSectionData = {
  label: "Déroulé",
  title: "De l'idée au montage",
  labelStyle: "p",
  titleStyle: "h2",
  html: "<p>En amont, vous validez un synopsis et un pré-script. Nous pouvons proposer des thèmes personnalisés (culture d'entreprise, QHSE, etc.). Le jour J, les groupes peaufinent le script avec leurs anecdotes, puis on tourne : les participants gardent leurs prénoms pour un rendu naturel et identitaire.</p>",
  image: { url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80" },
  bgColor: "",
  cards: [
    { title: "Préparation", desc: "Synopsis, pré-script, validation client" },
    { title: "Tournage", desc: "Une demi-journée avec rôles et équipe technique dédiée" },
    { title: "Post-production", desc: "Montage style série, générique, sound design" },
  ],
};

export const DEFAULT_CTA: AnimationCtaData = {
  livrablesTitle: "Livrables",
  budgetTitle: "Durée & budget",
  livrablesTitleStyle: "h2",
  budgetTitleStyle: "h2",
  livrablesHtml: "<p>Un épisode final prêt à diffuser en interne. En option : trailer, bêtisier et making-of pour prolonger l'expérience et les souvenirs.</p>",
  budgetHtml: "<p>Environ 4 jours (préparation, tournage, post-production). À partir de 2 500 € HT. Devis sur mesure selon votre effectif et vos options.</p>",
  buttonLabel: "En discuter ensemble",
  buttonHref: "/contact",
  buttonStyle: "1",
  bgColor: "",
};
