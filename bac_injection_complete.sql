-- ============================================================
-- BAC — INJECTION SQL COMPLÈTE
-- Révélations (màj colonnes + contenu) + Dénouements (création + injection)
-- ============================================================
-- Exécuter dans l'ordre. Compatible Supabase / PostgreSQL.
-- Dollar-quoting ($$) utilisé pour les apostrophes françaises.
-- ============================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════
-- 1. ALTER TABLE bac_revelations — ajout colonnes
-- ═══════════════════════════════════════════════════════════

ALTER TABLE bac_revelations ADD COLUMN IF NOT EXISTS ton_principal    TEXT NOT NULL DEFAULT '';
ALTER TABLE bac_revelations ADD COLUMN IF NOT EXISTS ton_secondaire   TEXT NOT NULL DEFAULT '';
ALTER TABLE bac_revelations ADD COLUMN IF NOT EXISTS duree_min        INTEGER NOT NULL DEFAULT 1;
ALTER TABLE bac_revelations ADD COLUMN IF NOT EXISTS duree_max        INTEGER NOT NULL DEFAULT 3;
ALTER TABLE bac_revelations ADD COLUMN IF NOT EXISTS fil_rouge        TEXT NOT NULL DEFAULT '';
ALTER TABLE bac_revelations ADD COLUMN IF NOT EXISTS script_json      JSONB NOT NULL DEFAULT '[]';
ALTER TABLE bac_revelations ADD COLUMN IF NOT EXISTS itw_json         JSONB NOT NULL DEFAULT '[]';
ALTER TABLE bac_revelations ADD COLUMN IF NOT EXISTS notes_real_json  JSONB NOT NULL DEFAULT '{"cadrage":"","rythme":"","silences":"","pieges":"","astuce":""}';
ALTER TABLE bac_revelations ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ;


-- ═══════════════════════════════════════════════════════════
-- 2. UPDATE bac_revelations — injection contenu script
-- ═══════════════════════════════════════════════════════════

-- ── Révélation 1 — L'audit surprise ──────────────────────────
UPDATE bac_revelations SET
  script_json = $$[
  {"type":"didascalie","texte":"Une salle quelconque, début de journée. Quelqu'un entre avec l'air de quelqu'un qui a une mauvaise nouvelle mais qui a décidé de la livrer calmement.","style":"ouverture"},
  {"type":"replique","role":"Coordinateur","directive":"Annonce la révélation avec le ton de quelqu'un qui essaie d'avoir l'air calme — et n'y arrive pas complètement. Marquer une pause avant 'dans 48 heures'.","exemple":"Voilà. On vient d'apprendre ce matin qu'un audit externe aura lieu… dans 48 heures. Je vous laisse digérer.","didascalie_replique":"pose le document qu'il tenait, mains libres","utilise_element_perso":false},
  {"type":"didascalie","texte":"Silence. Quelqu'un ouvre la bouche. La referme. Tout le monde regarde ailleurs ou fixe un point.","style":"intermediaire"},
  {"type":"replique","role":"Coordinateur","directive":"Ajoute l'information sur le thème de l'épisode — ce sur quoi tout le monde va devoir se concentrer aujourd'hui","exemple":"L'audit porte sur [LE THÈME]. C'est le fil rouge de notre journée. À vous de jouer.","didascalie_replique":"regard caméra","utilise_element_perso":false},
  {"type":"didascalie","texte":"Les gens repartent. Certains vite. Certains lentement. Personne ne sait vraiment par où commencer.","style":"cloture"}
]$$::jsonb,
  itw_json = $$[
  {"role_cible":"Manager","question":"Un audit en 48 heures. Votre première pensée ?","reponse_a":"Qu'est-ce qu'on n'a pas fait qu'on aurait dû faire. Dans cet ordre.","reponse_b":"Qu'on est prêts ! Enfin… on va être prêts. C'est l'intention qui compte.","reponse_c":"Que ça tombait un jour comme un autre. Y'a pas de bon moment pour un audit."},
  {"role_cible":"Assistant","question":"Vous avez eu l'air surpris. Vous l'étiez vraiment ?","reponse_a":"Surpris non. Inquiet oui. C'est différent.","reponse_b":"Oui ! Mais dans le bon sens. Un audit c'est une opportunité de montrer ce qu'on fait bien.","reponse_c":"J'avais entendu des rumeurs. Donc à moitié."}
]$$::jsonb,
  notes_real_json = $${"cadrage":"Plan serré sur le visage pendant l'annonce. Pan lent vers le groupe pour capter les premières réactions — ne pas couper trop vite.","rythme":"Lent. Le silence après '48 heures' est le moment le plus important. Ne pas le remplir.","silences":"Minimum 4 secondes après l'annonce. Laisser tourner la caméra. Les vraies réactions arrivent après.","pieges":"Ne pas jouer la scène comme un drama — rester dans le registre comédie de bureau. La tension vient du réalisme, pas de la mise en scène.","astuce":"Tourner cette scène en tout premier, avant que les acteurs soient échauffés. Le naturel non-joué est exactement ce qu'on cherche pour l'intro."}$$::jsonb,
  updated_at = now()
WHERE titre = $$L'audit surprise$$;


-- ── Révélation 2 — La visite du siège ───────────────────────
UPDATE bac_revelations SET
  script_json = $$[
  {"type":"didascalie","texte":"Bureau. Matin. Quelqu'un arrive avec l'énergie de quelqu'un qui va annoncer une bonne nouvelle — mais dont le sourire est légèrement trop grand.","style":"ouverture"},
  {"type":"replique","role":"Coordinateur","directive":"Présenter l'annonce comme une bonne nouvelle tout en laissant filtrer que c'est compliqué. Le sourire doit tenir jusqu'à la fin de la phrase — à peine.","exemple":"Bonne nouvelle ! Une délégation du siège vient nous rendre visite. Dans 2 jours. C'est une vraie reconnaissance du travail qu'on fait.","didascalie_replique":"sourire maintenu, regard qui fait le tour de la pièce","utilise_element_perso":false},
  {"type":"didascalie","texte":"Silence. Quelqu'un hoche la tête. Le hochement dit 'très bien' mais les yeux disent autre chose.","style":"intermediaire"},
  {"type":"replique","role":"Coordinateur","directive":"Précise l'enjeu thématique de la visite — ce qu'ils vont observer","exemple":"Ils viennent regarder comment on gère [LE THÈME]. Autant dire que c'est notre journée la plus importante de l'année.","didascalie_replique":"le sourire a légèrement diminué","utilise_element_perso":false},
  {"type":"didascalie","texte":"Tout le monde repart. Certains sourient encore. Plus personne ne sourit vraiment.","style":"cloture"}
]$$::jsonb,
  itw_json = $$[
  {"role_cible":"Manager","question":"Une visite du siège dans 2 jours. Bonne ou mauvaise nouvelle ?","reponse_a":"Les deux. Surtout mauvaise. Mais j'ai pas dit ça.","reponse_b":"Bonne ! C'est une chance de montrer ce qu'on fait. On est prêts. On sera prêts.","reponse_c":"Neutre. Ils viendront, ils partiront. On verra ce que ça donne."},
  {"role_cible":"Chef de projet","question":"Ce que vous avez pensé mais pas dit à ce moment-là ?","reponse_a":"Que j'avais une liste de 12 choses à corriger avant leur arrivée et 48 heures pour le faire.","reponse_b":"Que c'était excitant ! Vraiment.","reponse_c":"Que ça ne changerait probablement rien sur le fond. Mais que le fond allait quand même devoir être épousseté."}
]$$::jsonb,
  notes_real_json = $${"cadrage":"Filmer le sourire en plan serré — l'expression du coordinateur est le cœur de la scène. Insert sur les visages du groupe pendant l'annonce.","rythme":"Léger et rapide jusqu'au silence. Le silence casse le rythme volontairement.","silences":"Le silence après le hochement de tête. 3 secondes. Caméra sur le groupe.","pieges":"Le coordinateur ne doit pas jouer 'le méchant qui cache quelque chose' — il est sincèrement positif. C'est l'ambivalence du groupe qui fait la scène.","astuce":"Demander au coordinateur-acteur de tenir le sourire une seconde de trop après sa dernière réplique. Ce petit décalage fait tout."}$$::jsonb,
  updated_at = now()
WHERE titre = $$La visite du siège$$;


-- ── Révélation 3 — La fusion annoncée ───────────────────────
UPDATE bac_revelations SET
  script_json = $$[
  {"type":"didascalie","texte":"Salle de réunion. Tout le monde est là — ce qui est inhabituel. Quelqu'un ferme la porte.","style":"ouverture"},
  {"type":"replique","role":"Coordinateur","directive":"Utiliser le mot 'rapprochement' — jamais 'fusion'. Le ton est mesuré, presque administratif. Laisser le mot 'officiellement' traîner.","exemple":"Voilà. Dans une semaine, nous annoncerons officiellement un rapprochement avec une autre structure. Je voulais que vous le sachiez avant.","didascalie_replique":"pose les mains à plat sur la table","utilise_element_perso":false},
  {"type":"didascalie","texte":"Silence long. Quelqu'un formule une question à mi-voix. Personne ne répond.","style":"intermediaire"},
  {"type":"replique","role":"Coordinateur","directive":"Anticipe la vraie question sans y répondre — et ramène sur le thème de l'épisode","exemple":"Je sais ce que vous vous demandez. Pour l'instant, ce que je peux dire c'est que [LE THÈME] reste notre priorité. C'est ce qui nous définit. C'est ce qu'on va montrer aujourd'hui.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"didascalie","texte":"La porte se rouvre. Les gens sortent. Lentement, et en chuchotant.","style":"cloture"}
]$$::jsonb,
  itw_json = $$[
  {"role_cible":"Directeur","question":"'Rapprochement'. Vous avez choisi ce mot. Pourquoi pas fusion ?","reponse_a":"Parce que ce n'est pas encore acté. Les mots ont un impact. 'Rapprochement' laisse des options.","reponse_b":"C'est le terme officiel ! Et il est juste. On se rapproche. C'est positif.","reponse_c":"Parce que 'fusion' fait peur. 'Rapprochement' fait moins peur. La réalité reste la même."},
  {"role_cible":"Manager","question":"La question que personne n'a osé poser — c'était quoi ?","reponse_a":"Est-ce qu'on garde nos postes. Évidemment.","reponse_b":"Comment ça va se passer concrètement ! C'est la question utile.","reponse_c":"Avec qui. Parce que selon avec qui, tout change."}
]$$::jsonb,
  notes_real_json = $${"cadrage":"Plan large d'ouverture pour montrer tout le monde dans la salle. Puis resserrer progressivement sur le coordinateur. Finir sur les visages à la sortie.","rythme":"Lent et solennel. Pas de rupture de rythme — la gravité s'installe doucement.","silences":"Le silence long après l'annonce est le plus important de cette révélation. 5 secondes minimum. Ne pas couper sur la question chuchotée — la laisser exister sans réponse.","pieges":"Éviter le ton dramatique de feuilleton. Rester dans le registre du réel — une vraie annonce en entreprise n'est jamais théâtrale.","astuce":"Fermer la porte au début de la scène est un détail qui crée immédiatement l'atmosphère. S'assurer que ce geste est filmé."}$$::jsonb,
  updated_at = now()
WHERE titre = $$La fusion annoncée$$;


-- ── Révélation 4 — Le déménagement imminent ─────────────────
UPDATE bac_revelations SET
  script_json = $$[
  {"type":"didascalie","texte":"Open space ou salle commune. Quelqu'un arrive avec un plan imprimé — ou quelque chose qui ressemble à un plan.","style":"ouverture"},
  {"type":"replique","role":"Coordinateur","directive":"Annoncer comme un fait accompli — pas une mauvaise nouvelle, juste une réalité. Le ton est pratique et légèrement trop rapide.","exemple":"Voilà, donc c'est confirmé — on déménage dans 3 semaines. Nouveau site. Nouvelles dispositions. Les détails arrivent, mais c'est acté.","didascalie_replique":"montre vaguement le plan sans vraiment l'expliquer","utilise_element_perso":false},
  {"type":"didascalie","texte":"Quelqu'un regarde autour de lui comme pour mémoriser l'endroit. Quelqu'un d'autre regarde sa plante verte.","style":"intermediaire"},
  {"type":"replique","role":"Coordinateur","directive":"Faire le lien avec le thème de la journée — c'est le moment de montrer comment l'équipe gère le changement","exemple":"Et justement — aujourd'hui on parle de [LE THÈME]. C'est peut-être le meilleur moment pour en parler. Vraiment.","didascalie_replique":"regard caméra","utilise_element_perso":false},
  {"type":"didascalie","texte":"Quelqu'un demande si les places seront attribuées ou libres. La vraie question de la journée.","style":"cloture"}
]$$::jsonb,
  itw_json = $$[
  {"role_cible":"Assistant","question":"Votre première pensée en apprenant le déménagement ?","reponse_a":"Mes affaires. J'ai beaucoup d'affaires. Ça va prendre du temps à trier.","reponse_b":"Nouveau départ ! Nouvelle énergie ! Je suis vraiment enthousiaste.","reponse_c":"Que c'est comme ça. On déménage. On s'adapte. On survit."},
  {"role_cible":"Manager","question":"Places attribuées ou libres — c'est vraiment la question importante ?","reponse_a":"C'est LA question. La place détermine les dynamiques. C'est stratégique.","reponse_b":"Dans le fond non. Mais pour les gens c'est concret. C'est par là qu'on commence.","reponse_c":"C'est la question qu'on peut poser. Les vraies questions, on les garde pour plus tard."}
]$$::jsonb,
  notes_real_json = $${"cadrage":"Montrer l'espace actuel — les bureaux, les affaires personnelles visibles. Ce que les gens vont quitter. Sans insister, juste montrer.","rythme":"Pratique et rapide — comme une vraie annonce opérationnelle. Le côté émotionnel émerge dans les réactions, pas dans le discours.","silences":"Le silence pendant que quelqu'un regarde autour de lui. 3 secondes. Laisser la caméra observer.","pieges":"Ne pas jouer la tristesse du déménagement — rester dans le registre comédie. La plante verte est un gag visuel suffisant.","astuce":"Si possible, filmer dans le vrai espace de travail de l'entreprise. Le réalisme du décor crée une résonance immédiate avec le public."}$$::jsonb,
  updated_at = now()
WHERE titre = $$Le déménagement imminent$$;


-- ── Révélation 5 — Le nouveau logiciel ──────────────────────
UPDATE bac_revelations SET
  script_json = $$[
  {"type":"didascalie","texte":"Bureau. Quelqu'un projette un écran — une interface inconnue, colorée, visiblement différente de ce que tout le monde utilise.","style":"ouverture"},
  {"type":"replique","role":"Coordinateur","directive":"Annoncer la migration avec l'enthousiasme de quelqu'un qui a été briefé par le département IT et répète les mots clés sans forcément y croire","exemple":"Donc voilà — dans 10 jours on migre vers le nouveau système. C'est plus intuitif, plus performant, et ça va vraiment simplifier notre quotidien.","didascalie_replique":"désigne l'écran d'un geste large","utilise_element_perso":false},
  {"type":"didascalie","texte":"Quelqu'un lève la main. Plusieurs questions arrivent en même temps. Trop de questions.","style":"intermediaire"},
  {"type":"replique","role":"Coordinateur","directive":"Couper les questions avec bienveillance — et ramener sur le thème de l'épisode comme antidote","exemple":"On aura le temps pour les questions. Ce qui est sûr c'est que [LE THÈME] — c'est exactement ce dont on a besoin pour traverser ça ensemble. C'est pour ça qu'on est là aujourd'hui.","didascalie_replique":"coupe doucement d'un geste de la main","utilise_element_perso":false},
  {"type":"didascalie","texte":"L'interface reste projetée. Personne ne la regarde vraiment. Tout le monde la regarde quand même.","style":"cloture"}
]$$::jsonb,
  itw_json = $$[
  {"role_cible":"Chef de projet","question":"'Plus intuitif, plus performant.' Vous y avez cru ?","reponse_a":"Non. Mais j'ai noté les questions à poser au support le jour J.","reponse_b":"Oui ! Les nouveaux outils c'est toujours une opportunité. Il faut juste le temps d'adaptation.","reponse_c":"J'ai entendu 'dans 10 jours'. Tout le reste était du bruit."},
  {"role_cible":"Assistant","question":"Vous avez levé la main. C'était quoi votre question ?","reponse_a":"Est-ce que les données de l'ancien système sont migrées. Parce que j'ai 3 ans d'archives dedans.","reponse_b":"Comment ça marche ! Je voulais comprendre tout de suite.","reponse_c":"Est-ce qu'on peut garder l'ancien en parallèle. La réponse était non. Je le savais."}
]$$::jsonb,
  notes_real_json = $${"cadrage":"L'écran projeté doit être visible en arrière-plan tout au long de la scène. Insert sur les visages face à l'interface inconnue.","rythme":"Vif au départ — l'annonce est rapide, presque commerciale. Ralentit sur les questions qui arrivent.","silences":"Le silence final face à l'interface projetée. 3 secondes. La caméra peut faire un lent zoom arrière pour montrer tout le groupe face à l'écran.","pieges":"Le coordinateur ne doit pas avoir l'air de mentir — il est sincèrement convaincu, ou du moins il joue le jeu. C'est plus drôle que le cynisme.","astuce":"Préparer une vraie fausse interface à projeter — même une capture d'un logiciel inconnu suffit. Le visuel est fondamental pour cette scène."}$$::jsonb,
  updated_at = now()
WHERE titre = $$Le nouveau logiciel$$;


-- ═══════════════════════════════════════════════════════════
-- 3. CREATE TABLE bac_denouements
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bac_denouements (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titre            TEXT        NOT NULL,
  type             TEXT        CHECK (type IN ('coherent', 'twist')),
  description_courte TEXT      DEFAULT '',
  note_interne     TEXT        DEFAULT '',
  script_json      JSONB       NOT NULL DEFAULT '[]',
  itw_json         JSONB       NOT NULL DEFAULT '[]',
  notes_real_json  JSONB       NOT NULL DEFAULT '{"cadrage":"","rythme":"","silences":"","pieges":"","astuce":""}',
  actif            BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ
);

-- Colonnes manquantes si la table existait déjà sans elles
ALTER TABLE bac_denouements ADD COLUMN IF NOT EXISTS type             TEXT        CHECK (type IN ('coherent', 'twist'));
ALTER TABLE bac_denouements ADD COLUMN IF NOT EXISTS description_courte TEXT       DEFAULT '';
ALTER TABLE bac_denouements ADD COLUMN IF NOT EXISTS note_interne     TEXT        DEFAULT '';
ALTER TABLE bac_denouements ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ;


-- ═══════════════════════════════════════════════════════════
-- 4. INSERT bac_denouements (idempotent : DELETE + INSERT)
-- ═══════════════════════════════════════════════════════════

DELETE FROM bac_denouements WHERE titre IN (
  $$C'était un exercice$$,
  $$Finalement repoussé$$,
  $$L'équipe pilote$$,
  $$Ça n'aura pas lieu$$,
  $$Une bonne nouvelle cachée$$,
  $$On ne saura jamais$$,
  $$L'équipe décide$$,
  $$Retour à la normale, mais différent$$
);


-- ── D1 — C'était un exercice (twist) ────────────────────────
INSERT INTO bac_denouements (titre, type, description_courte, note_interne, script_json, itw_json, notes_real_json, actif)
VALUES (
  $$C'était un exercice$$,
  'twist',
  $$La révélation n'était pas réelle — c'était un test de résilience organisationnelle. Tout le monde a réussi.$$,
  $$Le twist le plus déstabilisant. Jouer sur le fait que la réaction collective était "la vraie réponse attendue". Les acteurs peuvent trouver ça rassurant ou encore plus inquiétant selon leur variant.$$,
  $$[
  {"type":"didascalie","texte":"Tout le monde est réuni. La journée touche à sa fin. Quelqu'un s'apprête à parler — avec l'énergie de quelqu'un qui garde quelque chose pour la fin.","style":"ouverture"},
  {"type":"replique","role":"Coordinateur","directive":"Annoncer le twist avec un calme total — comme si c'était la suite logique évidente de tout ce qui s'est passé","exemple":"Donc voilà. [LA RÉVÉLATION] — c'était un exercice. Un scénario conçu pour observer comment vous gérez l'incertitude ensemble.","didascalie_replique":"laisse la phrase se poser","utilise_element_perso":false},
  {"type":"didascalie","texte":"Silence. Puis quelqu'un rit. Puis quelqu'un d'autre. Puis quelqu'un ne rit pas du tout.","style":"intermediaire"},
  {"type":"replique","role":"Coordinateur","directive":"Confirmer que c'était réel dans la forme, fictif dans le fond — et que ça ne change rien à la qualité de ce qu'ils ont produit","exemple":"Tout ce que vous avez fait aujourd'hui — c'était vous. La pression était artificielle. Les réactions, elles, ne l'étaient pas.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"replique","role":"Manager","directive":"Réagir selon son variant — entre soulagement, irritation et philosophie","exemple":"Donc on a vraiment cru à tout ça pour… un exercice.","didascalie_replique":"regard caméra","utilise_element_perso":false},
  {"type":"didascalie","texte":"Quelqu'un se lève pour partir. S'arrête. Revient s'asseoir. Il a besoin d'une seconde.","style":"cloture"}
]$$::jsonb,
  $$[
  {"role_cible":"Manager","question":"C'était un exercice. Comment vous vous sentez maintenant que vous le savez ?","reponse_a":"Soulagé et légèrement vexé. Dans cet ordre.","reponse_b":"Pareil qu'avant ! Ce qu'on a fait avait de la valeur. Peu importe le contexte.","reponse_c":"Ça ne change rien. On aurait réagi pareil avec une vraie révélation. C'est ça le truc."},
  {"role_cible":"Assistant","question":"Vous avez ri quand c'est sorti. C'était quoi ce rire ?","reponse_a":"De la nervosité. Clairement.","reponse_b":"Du soulagement ! Et de la fierté. On s'en est bien sortis !","reponse_c":"Je sais pas. C'est sorti. Parfois le corps répond avant le cerveau."}
]$$::jsonb,
  $${"cadrage":"Plan d'ensemble pour voir toutes les réactions en même temps quand le twist tombe. Ne pas choisir une seule personne — le collectif est le sujet.","rythme":"Lent et mesuré jusqu'au twist. Puis laisser le chaos des réactions exister librement quelques secondes avant de reprendre.","silences":"Le silence juste après l'annonce du twist — avant les rires. C'est 2 secondes maximum mais elles sont cruciales.","pieges":"Ne pas jouer la révélation du twist de façon trop théâtrale — plus c'est calme, plus c'est percutant.","astuce":"Tourner la réaction en plan large d'abord, puis repasser pour les inserts de visages. Les vraies réactions ne se reproduisent pas — il faut les capturer du premier coup."}$$::jsonb,
  true
);


-- ── D2 — Finalement repoussé (coherent) ─────────────────────
INSERT INTO bac_denouements (titre, type, description_courte, note_interne, script_json, itw_json, notes_real_json, actif)
VALUES (
  $$Finalement repoussé$$,
  'coherent',
  $$La révélation aura bien lieu, mais le délai a été repoussé. On a du temps. Pas beaucoup. Mais du temps.$$,
  $$Dénouement doux-amer — rassurant et légèrement absurde. Tout le stress de l'épisode était prématuré. Ce qui ne le rend pas moins réel.$$,
  $$[
  {"type":"didascalie","texte":"Fin de journée. Tout le monde est réuni, dans un état de fatigue productive. L'atmosphère est celle d'après-bataille.","style":"ouverture"},
  {"type":"replique","role":"Coordinateur","directive":"Annoncer le report comme une bonne nouvelle — en sachant que tout le monde va réaliser dans la seconde que c'est aussi absurde","exemple":"Donc voilà — bonne nouvelle. [LA RÉVÉLATION] est repoussée. Plusieurs semaines supplémentaires. On a du temps.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"didascalie","texte":"Un silence. Le genre de silence où les gens font le calcul de tout ce qu'ils ont vécu dans la journée.","style":"intermediaire"},
  {"type":"replique","role":"Chef de projet","directive":"Formuler l'absurdité de la situation avec un calme parfait","exemple":"Donc ce matin on avait [LE DÉLAI]. Là on a plus. C'est bien. C'est très bien.","didascalie_replique":"hoche la tête lentement","utilise_element_perso":false},
  {"type":"replique","role":"Coordinateur","directive":"Confirmer avec la même philosophie — et pointer que ce qui a été fait aujourd'hui reste valable","exemple":"Ce que vous avez produit aujourd'hui — ça servira. Le délai change, pas le fond.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"replique","role":"Assistant","directive":"Clore avec une réplique qui dit tout sans insister","exemple":"Bien. On recommence dans quelques semaines alors.","didascalie_replique":"regard caméra","utilise_element_perso":false},
  {"type":"didascalie","texte":"Quelqu'un ramasse ses affaires. Tout le monde suit. La prochaine fois ils seront prêts. Probablement.","style":"cloture"}
]$$::jsonb,
  $$[
  {"role_cible":"Chef de projet","question":"Le report. Bonne ou mauvaise nouvelle ?","reponse_a":"Bonne pour le planning. Mauvaise pour l'énergie dépensée aujourd'hui. Mitigée globalement.","reponse_b":"Excellente ! Plus de temps c'est toujours mieux. On va vraiment bien se préparer maintenant.","reponse_c":"C'est neutre. Ça arrive. On recommence. C'est la vie d'une organisation."},
  {"role_cible":"Assistant","question":"'On recommence dans quelques semaines.' Vous étiez sérieux ?","reponse_a":"Oui. Et j'ai déjà commencé à préparer la prochaine fois.","reponse_b":"Bien sûr ! On sera encore mieux préparés.","reponse_c":"À moitié. D'ici là il se passera autre chose. Il se passe toujours autre chose."}
]$$::jsonb,
  $${"cadrage":"Plan sur les visages fatigués mais dignes. Cette scène se joue dans les expressions plus que dans les mots.","rythme":"Lent et épuisé — c'est la fin de journée, ça doit se sentir.","silences":"Le silence de calcul après l'annonce du report. 4 secondes. Laisser les acteurs faire ce calcul pour de vrai.","pieges":"Éviter le ton amer ou cynique — la douceur-amère fonctionne, le cynisme tue la scène.","astuce":"Tourner en fin de journée réelle si possible. L'état des acteurs en fin de session est exactement ce qu'il faut pour cette scène."}$$::jsonb,
  true
);


-- ── D3 — L'équipe pilote (coherent) ─────────────────────────
INSERT INTO bac_denouements (titre, type, description_courte, note_interne, script_json, itw_json, notes_real_json, actif)
VALUES (
  $$L'équipe pilote$$,
  'coherent',
  $$Cette équipe est désignée pour piloter la transition en premier. C'est une responsabilité. C'est aussi une forme de compliment, dit-on.$$,
  $$Dénouement ambigu — être "pilote" peut être une promotion ou un cobaye. Laisser les acteurs choisir leur lecture selon leur variant.$$,
  $$[
  {"type":"didascalie","texte":"Réunion de clôture. Tout le monde est là. Une légère tension anticipatoire — on attend une décision.","style":"ouverture"},
  {"type":"replique","role":"Directeur","directive":"Annoncer la désignation comme pilote avec le ton de quelqu'un qui offre un cadeau dont il n'est pas sûr qu'il sera reçu comme tel","exemple":"Après réflexion — et en regardant ce que vous avez fait aujourd'hui — vous avez été désignés équipe pilote pour [LA RÉVÉLATION]. Vous serez les premiers.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"didascalie","texte":"Silence. Quelqu'un lève un sourcil. Quelqu'un d'autre ferme les yeux brièvement.","style":"intermediaire"},
  {"type":"replique","role":"Manager","directive":"Réagir selon son variant — entre fierté prudente, enthousiasme, et fatalisme","exemple":"On est… pilotes. C'est-à-dire qu'on passe en premier.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"replique","role":"Directeur","directive":"Confirmer avec une formule qui peut être lue comme encourageante ou comme une mise en garde","exemple":"Exactement. Tout le monde vous regardera. C'est une vraie responsabilité.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"replique","role":"Assistant","directive":"Conclure avec la réplique qu'on pense tous tout bas","exemple":"Et si ça se passe mal — c'est nous les cobayes ?","didascalie_replique":"regard caméra","utilise_element_perso":false},
  {"type":"didascalie","texte":"Personne ne répond à cette question. Ce qui est en soi une réponse.","style":"cloture"}
]$$::jsonb,
  $$[
  {"role_cible":"Directeur","question":"Équipe pilote — vous leur avez offert quoi exactement ?","reponse_a":"La visibilité et la responsabilité. Ce sont les deux faces d'une même opportunité.","reponse_b":"Une chance unique ! Être pilote c'est façonner la méthode pour tout le monde.","reponse_c":"Une accélération. Ils auraient vécu ça de toute façon. Là ils le vivent en premier."},
  {"role_cible":"Assistant","question":"Cobayes ou pionniers ?","reponse_a":"Les deux. La question est de savoir lequel prime à la fin.","reponse_b":"Pionniers ! Et fiers de l'être.","reponse_c":"Cobayes qui se font appeler pionniers. C'est souvent la même chose."}
]$$::jsonb,
  $${"cadrage":"Plan sur le directeur pendant l'annonce, puis pan vers le groupe pour voir les réactions en temps réel.","rythme":"Solennel au départ, puis légèrement déstabilisé par la question finale.","silences":"Le silence final après la question 'cobayes ?' — ne pas répondre. La caméra reste sur le groupe. 4 secondes.","pieges":"Le directeur ne doit pas avoir l'air de se rendre compte de l'ambiguïté — c'est l'absence de conscience qui rend la scène drôle.","astuce":"La question finale peut être improvisée par l'acteur selon son variant — l'écrire comme une option, pas une obligation."}$$::jsonb,
  true
);


-- ── D4 — Ça n'aura pas lieu (twist) ─────────────────────────
INSERT INTO bac_denouements (titre, type, description_courte, note_interne, script_json, itw_json, notes_real_json, actif)
VALUES (
  $$Ça n'aura pas lieu$$,
  'twist',
  $$La révélation est annulée. Complètement. Sans explication. Tout redevient comme avant. Ce qui est presque plus perturbant.$$,
  $$Le twist le plus radical. Fonctionne particulièrement bien si les groupes ont beaucoup investi émotionnellement dans leurs scènes. Le silence après l'annonce doit être long.$$,
  $$[
  {"type":"didascalie","texte":"Fin de journée. Quelqu'un entre avec une feuille ou un téléphone — l'air de quelqu'un qui vient d'apprendre quelque chose.","style":"ouverture"},
  {"type":"replique","role":"Coordinateur","directive":"Annoncer l'annulation comme un fait — sans explication, sans commentaire, sans interprétation. Le plus neutre possible.","exemple":"Donc voilà. [LA RÉVÉLATION] n'aura pas lieu. Décision prise en haut. Aucune autre information pour l'instant.","didascalie_replique":"pose la feuille","utilise_element_perso":false},
  {"type":"didascalie","texte":"Silence très long. Quelqu'un regarde ses notes de la journée. Quelqu'un ferme son carnet.","style":"intermediaire"},
  {"type":"replique","role":"Chef de projet","directive":"Formuler l'absurdité de la journée entière avec un calme surhumain","exemple":"Tout ce qu'on a fait aujourd'hui…","didascalie_replique":"laisse la phrase en suspens","utilise_element_perso":false},
  {"type":"replique","role":"Coordinateur","directive":"Compléter honnêtement — sans chercher à arranger les choses","exemple":"N'est pas perdu. Vous avez travaillé ensemble. Ça, ça reste.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"replique","role":"Manager","directive":"Réagit selon son variant — acceptation, ironie douce ou soulagement","exemple":"Ah. Bien.","didascalie_replique":"regard caméra","utilise_element_perso":false},
  {"type":"didascalie","texte":"Les gens commencent à partir. Comme si c'était un mardi ordinaire.","style":"cloture"}
]$$::jsonb,
  $$[
  {"role_cible":"Chef de projet","question":"'Tout ce qu'on a fait aujourd'hui…' — vous alliez dire quoi ?","reponse_a":"Que c'était du travail réel sur un problème fictif. Ce qui pose une vraie question sur la valeur du travail.","reponse_b":"Que c'était quand même une super journée ! Le contexte change pas ce qu'on a produit.","reponse_c":"Je sais plus. La phrase s'est arrêtée toute seule."},
  {"role_cible":"Manager","question":"'Ah. Bien.' C'était sincère ?","reponse_a":"C'était tout ce que j'avais à dire. Je traitais l'information.","reponse_b":"Oui ! Soulagement total. Une bonne nouvelle c'est une bonne nouvelle.","reponse_c":"C'était le son que j'ai produit. Je laisse les autres décider ce que ça voulait dire."}
]$$::jsonb,
  $${"cadrage":"Plan fixe sur le groupe pendant l'annonce. Ne pas bouger la caméra. L'immobilité du cadre amplifie le choc.","rythme":"Très lent après l'annonce. Laisser le silence vivre.","silences":"Le silence après 'ça n'aura pas lieu' est le plus long de tout l'épisode. 6 secondes minimum. Ne pas couper.","pieges":"Éviter toute musique ou tout effet sonore — le silence doit être pur. Et ne pas laisser les acteurs essayer de rendre la scène plus positive qu'elle ne l'est.","astuce":"Dire aux acteurs de ne rien jouer — juste recevoir l'information. Les meilleures réactions sont celles qu'on ne joue pas."}$$::jsonb,
  true
);


-- ── D5 — Une bonne nouvelle cachée (twist) ──────────────────
INSERT INTO bac_denouements (titre, type, description_courte, note_interne, script_json, itw_json, notes_real_json, actif)
VALUES (
  $$Une bonne nouvelle cachée$$,
  'twist',
  $$Derrière la révélation se cachait une opportunité que personne n'avait vue venir.$$,
  $$Le dénouement feel-good. À utiliser avec modération — l'astuce est de laisser les acteurs rester légèrement sceptiques même face à la bonne nouvelle.$$,
  $$[
  {"type":"didascalie","texte":"Clôture de journée. Quelqu'un arrive avec une énergie différente — pas de tension, pas de solennité. Quelque chose de léger.","style":"ouverture"},
  {"type":"replique","role":"Directeur","directive":"Lâcher la bonne nouvelle avec le ton de quelqu'un qui en est lui-même un peu surpris","exemple":"Donc voilà. Ce que j'ai appris ce soir — [LA RÉVÉLATION] s'accompagne d'un budget supplémentaire. Dédié à notre équipe. C'était dans le package depuis le début.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"didascalie","texte":"Silence. Puis quelqu'un demande de répéter. Pour être sûr.","style":"intermediaire"},
  {"type":"replique","role":"Manager","directive":"Formule la méfiance saine qui est dans la tête de tout le monde","exemple":"Un budget. Pour compenser le fait que… ou pour financer le…","didascalie_replique":"","utilise_element_perso":false},
  {"type":"replique","role":"Directeur","directive":"Répondre avec honnêteté — oui c'est les deux, et c'est quand même bien","exemple":"Les deux, probablement. Mais c'est réel. Et c'est pour vous.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"replique","role":"Assistant","directive":"Clore avec la réplique qui ramène tout le monde sur terre sans éteindre la bonne nouvelle","exemple":"On verra ce que ça donne concrètement. Mais… c'est bien.","didascalie_replique":"regard caméra","utilise_element_perso":false},
  {"type":"didascalie","texte":"Quelqu'un sourit. Vraiment cette fois.","style":"cloture"}
]$$::jsonb,
  $$[
  {"role_cible":"Directeur","question":"Vous le saviez depuis le début, le budget ?","reponse_a":"Non. Ça s'est décidé dans la journée. En partie à cause de ce que vous avez tous montré.","reponse_b":"Oui ! Et c'est pour ça que j'avais confiance. Il y avait un plan.","reponse_c":"Disons que j'avais des indications. Mais rien de confirmé avant ce soir."},
  {"role_cible":"Assistant","question":"'C'est bien.' Vous étiez convaincu ?","reponse_a":"À 70%. Les 30% restants attendent de voir les chiffres.","reponse_b":"Complètement ! C'est une super nouvelle et je l'assume.","reponse_c":"Je prends. On verra après. Mais je prends."}
]$$::jsonb,
  $${"cadrage":"Filmer le sourire final en plan serré — c'est l'image de clôture de l'épisode. Laisser la caméra sur ce visage quelques secondes.","rythme":"Progressivement plus léger — c'est la seule scène de l'épisode qui se termine sur une montée.","silences":"Le silence de vérification après l'annonce — 2 secondes avant que quelqu'un parle.","pieges":"Ne pas sombrer dans l'euphorie — le scepticisme résiduel est ce qui rend la scène juste et crédible.","astuce":"Le sourire final doit être spontané — si l'acteur le joue, ça se voit. Trouver quelque chose de concret à lui dire juste avant la prise pour provoquer un vrai sourire."}$$::jsonb,
  true
);


-- ── D6 — On ne saura jamais (twist) ─────────────────────────
INSERT INTO bac_denouements (titre, type, description_courte, note_interne, script_json, itw_json, notes_real_json, actif)
VALUES (
  $$On ne saura jamais$$,
  'twist',
  $$Aucune décision finale n'est communiquée. L'incertitude devient la nouvelle normalité.$$,
  $$Le dénouement le plus réaliste. Puissant pour finir sur une note existentielle sans être dramatique.$$,
  $$[
  {"type":"didascalie","texte":"Fin de journée. Tout le monde attend. Quelqu'un vérifie son téléphone. Puis un autre.","style":"ouverture"},
  {"type":"replique","role":"Coordinateur","directive":"Annoncer l'absence de réponse avec une honnêteté totale — pas d'excuse, pas de discours","exemple":"Donc voilà. Pas de décision finale ce soir. Sur [LA RÉVÉLATION] — rien n'est tranché. On continue à travailler sans savoir.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"didascalie","texte":"Quelqu'un hoche la tête. Comme si c'était exactement ce qu'il s'attendait à entendre.","style":"intermediaire"},
  {"type":"replique","role":"Manager","directive":"Réagir selon son variant — avec l'acceptation propre à chaque personnalité","exemple":"Et c'est comme ça depuis combien de temps maintenant ?","didascalie_replique":"","utilise_element_perso":false},
  {"type":"replique","role":"Coordinateur","directive":"Répondre honnêtement — et pointer que cette capacité à fonctionner dans le flou est peut-être la vraie compétence","exemple":"Un moment. Et vous continuez quand même. C'est ça qui est remarquable.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"replique","role":"Assistant","directive":"Clore avec une réplique simple et vraie","exemple":"On fait avec ce qu'on a. C'est comme ça.","didascalie_replique":"regard caméra","utilise_element_perso":false},
  {"type":"didascalie","texte":"Les gens partent un par un. L'incertitude reste. Elle est chez elle ici.","style":"cloture"}
]$$::jsonb,
  $$[
  {"role_cible":"Manager","question":"Pas de réponse. Vous gérez comment l'incertitude au quotidien ?","reponse_a":"Je liste ce que je contrôle et je me concentre là-dessus. Le reste n'existe pas pour moi.","reponse_b":"Je reste positif ! L'absence de mauvaise nouvelle c'est déjà une bonne nouvelle.","reponse_c":"Je fais comme si de rien n'était. Tout le monde fait pareil. Ça tient."},
  {"role_cible":"Assistant","question":"'C'est comme ça.' Vous trouviez ça normal ?","reponse_a":"Normal non. Habituel oui. C'est différent.","reponse_b":"C'est la réalité d'une organisation vivante. Ça change, ça évolue, c'est sain.","reponse_c":"J'avais arrêté d'attendre une réponse depuis un moment. Ce soir n'était pas une surprise."}
]$$::jsonb,
  $${"cadrage":"Plan large qui se vide progressivement à mesure que les gens partent. Finir sur un espace presque vide. Symbolique et efficace.","rythme":"Lent et régulier — sans pic émotionnel. C'est le rythme de quelque chose qui continue.","silences":"Le silence après 'C'est comme ça' avec le regard caméra. 5 secondes. C'est le dernier plan de l'épisode si ce dénouement est choisi.","pieges":"Ne pas rendre la scène mélancolique — la sérénité face à l'incertitude est de la force, pas de la résignation.","astuce":"Demander à l'acteur du dernier regard caméra de penser à quelque chose de concret et vrai dans sa vie professionnelle. Le regard sera réel."}$$::jsonb,
  true
);


-- ── D7 — L'équipe décide (coherent) ─────────────────────────
INSERT INTO bac_denouements (titre, type, description_courte, note_interne, script_json, itw_json, notes_real_json, actif)
VALUES (
  $$L'équipe décide$$,
  'coherent',
  $$Sans décision venue d'en haut, l'équipe prend elle-même position. Ensemble. Pour la première fois.$$,
  $$Le dénouement le plus fédérateur — idéal pour des sessions orientées cohésion. Fonctionne mieux si des scènes de l'épisode ont montré des frictions qui se résolvent ici.$$,
  $$[
  {"type":"didascalie","texte":"Fin de journée. Pas de décision d'en haut. Quelqu'un pose une question simple au groupe.","style":"ouverture"},
  {"type":"replique","role":"Chef de projet","directive":"Poser la question comme une évidence — avec une légère surprise que personne ne l'ait posée avant","exemple":"En attendant qu'on nous dise quoi faire sur [LA RÉVÉLATION] — on décide comment on travaille, nous ?","didascalie_replique":"","utilise_element_perso":false},
  {"type":"didascalie","texte":"Un silence. Pas d'hésitation — juste le temps de réaliser que c'est possible.","style":"intermediaire"},
  {"type":"replique","role":"Manager","directive":"Confirmer — avec la légèreté de quelqu'un qui réalise que c'était simple depuis le début","exemple":"Ouais. On fait comment on veut. C'est dans notre périmètre.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"replique","role":"Assistant","directive":"Ajouter la contribution concrète — ce que le groupe va réellement décider","exemple":"Alors on décide qu'on continue à travailler comme aujourd'hui. Ensemble. Ça a bien marché.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"replique","role":"Directeur","directive":"Valider avec l'autorité nécessaire — et l'humilité de quelqu'un qui réalise que l'équipe n'avait pas besoin de lui pour ça","exemple":"Je valide. Et franchement — vous n'aviez pas besoin que je le dise.","didascalie_replique":"regard caméra","utilise_element_perso":false},
  {"type":"didascalie","texte":"Tout le monde repart avec quelque chose de décidé. Ce n'est pas grand chose. Mais c'est le leur.","style":"cloture"}
]$$::jsonb,
  $$[
  {"role_cible":"Chef de projet","question":"Pourquoi vous avez posé cette question-là à ce moment-là ?","reponse_a":"Parce que c'était le seul levier actionnable. Les autres étaient hors périmètre.","reponse_b":"Parce que j'en avais besoin ! Et je pense que tout le monde aussi.","reponse_c":"Parce que quelqu'un devait la poser. Ça aurait pu être n'importe qui."},
  {"role_cible":"Directeur","question":"'Vous n'aviez pas besoin que je le dise.' C'était dur à admettre ?","reponse_a":"Non. C'est un fait. Le reconnaître est dans mon intérêt à long terme.","reponse_b":"Pas du tout ! Au contraire — c'est exactement ce qu'on veut. Des équipes autonomes.","reponse_c":"Un peu. Mais c'est sain. On grandit tous dans cette histoire."}
]$$::jsonb,
  $${"cadrage":"Plan sur le groupe — tout le monde dans le cadre quand la décision est prise. C'est un moment collectif, pas individuel.","rythme":"Progressivement plus léger et plus énergique — en miroir inverse de l'intro.","silences":"Le silence après la question du chef de projet. 3 secondes. Le groupe réalise que c'est possible — laisser ce moment exister.","pieges":"Ne pas en faire un discours de motivation. La force est dans la simplicité — une décision banale prise ensemble.","astuce":"Si des frictions ont eu lieu entre acteurs dans les scènes précédentes, les faire se regarder brièvement ici — le non-verbal fait le récit de réconciliation sans qu'on ait besoin de le jouer."}$$::jsonb,
  true
);


-- ── D8 — Retour à la normale, mais différent (coherent) ─────
INSERT INTO bac_denouements (titre, type, description_courte, note_interne, script_json, itw_json, notes_real_json, actif)
VALUES (
  $$Retour à la normale, mais différent$$,
  'coherent',
  $$La révélation a eu lieu. C'est derrière eux. Tout ressemble à avant. Mais quelque chose a changé.$$,
  $$Le dénouement le plus sobre et souvent le plus juste. Éviter tout discours inspirant — la force est dans la subtilité.$$,
  $$[
  {"type":"didascalie","texte":"Quelques jours après. Même espace, même équipe. Les marques du changement sont là si on cherche — mais discrètes.","style":"ouverture"},
  {"type":"replique","role":"Coordinateur","directive":"Constater simplement — avec la voix de quelqu'un qui observe de l'extérieur ce qu'il a lui-même vécu","exemple":"[LA RÉVÉLATION] a eu lieu comme prévu. C'est fait. On est de l'autre côté maintenant.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"didascalie","texte":"Un silence de reconnaissance — pas de douleur, pas d'euphorie. Juste le fait que quelque chose est passé.","style":"intermediaire"},
  {"type":"replique","role":"Manager","directive":"Noter un détail concret qui a changé — petit, précis, réel","exemple":"Les réunions du lundi durent moins longtemps depuis. Personne a décidé ça. C'est juste comme ça.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"replique","role":"Assistant","directive":"Ajouter son propre détail — dans le même registre de concret","exemple":"On se dit bonjour différemment aussi. Je sais pas comment expliquer. C'est juste différent.","didascalie_replique":"","utilise_element_perso":false},
  {"type":"replique","role":"Coordinateur","directive":"Clore sans conclusion — juste l'observation finale","exemple":"C'est ça le changement. Ça ressemble à rien de grand. Et pourtant.","didascalie_replique":"regard caméra","utilise_element_perso":false},
  {"type":"didascalie","texte":"Tout le monde reprend ce qu'il faisait. Mais autrement.","style":"cloture"}
]$$::jsonb,
  $$[
  {"role_cible":"Manager","question":"'Les réunions du lundi durent moins longtemps.' C'est une bonne chose ?","reponse_a":"C'est une donnée. Je note. On verra si ça tient.","reponse_b":"Oui ! Signe de maturité collective. On va droit au sujet maintenant.","reponse_c":"Je sais pas si c'est bon ou mauvais. Mais c'est réel. Et c'est nous qui l'avons fait."},
  {"role_cible":"Assistant","question":"Comment vous diriez bonjour différemment ?","reponse_a":"On se regarde en disant bonjour. Ce qui semble basique. Ça l'était pas forcément avant.","reponse_b":"Avec plus de sincérité ! On a traversé quelque chose ensemble. Ça se sent.","reponse_c":"Je pourrais pas expliquer. C'est subtil. Mais c'est là."}
]$$::jsonb,
  $${"cadrage":"Les mêmes cadres que l'intro si possible — mêmes endroits, mêmes personnes, légèrement différents. Le montage fera le travail de comparaison.","rythme":"Doux et posé. C'est une scène de contemplation, pas d'action.","silences":"Le silence après 'Et pourtant.' — dernier silence de l'épisode. 5 secondes. Finir là-dessus.","pieges":"Ne pas chercher à expliquer ce qui a changé — le laisser sous-entendu. Tout ce qui est nommé perd de sa puissance ici.","astuce":"Si c'est possible en logistique, filmer cette scène dans le même espace que l'intro avec les mêmes acteurs aux mêmes endroits. Le spectateur fera la comparaison inconsciemment."}$$::jsonb,
  true
);


-- ═══════════════════════════════════════════════════════════
-- 5. ALTER TABLE bac_sessions — ajout denouement_id
-- ═══════════════════════════════════════════════════════════

ALTER TABLE bac_sessions
  ADD COLUMN IF NOT EXISTS denouement_id UUID REFERENCES bac_denouements(id);

-- NOTE : theme_id conservé intentionnellement pour ne pas perdre de données existantes.
-- Supprimer après vérification : ALTER TABLE bac_sessions DROP COLUMN theme_id;

COMMIT;
