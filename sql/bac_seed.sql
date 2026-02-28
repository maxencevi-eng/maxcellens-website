-- ============================================================
-- Bureau à la Carte — Données initiales (seed)
-- À exécuter APRÈS bac_schema.sql
-- ============================================================

-- ============================================================
-- PARTIE 1 : RÔLES ET VARIANTS
-- ============================================================

-- GROUPE MANAGERS — Rôle 1 : Manager
WITH r1 AS (
  INSERT INTO bac_roles (groupe_slug, nom, description, couleur, actif)
  VALUES ('managers', 'Manager', 'Le responsable d''équipe. Jongle entre les directives du haut et la réalité du terrain.', '#E8A838', true)
  RETURNING id
)
INSERT INTO bac_variants (role_id, lettre, nom, description, emoji) VALUES
  ((SELECT id FROM r1), 'A', 'L''anxieux', 'Anticipe tout ce qui peut mal tourner, le dit à voix haute, souvent raison.', '😰'),
  ((SELECT id FROM r1), 'B', 'Le positif', 'Voit le bon côté de tout. Même les catastrophes. Surtout les catastrophes.', '😄'),
  ((SELECT id FROM r1), 'C', 'Le fataliste', 'S''en fout ouvertement. Pas par malveillance — juste une sagesse résignée.', '🤷');

-- GROUPE MANAGERS — Rôle 2 : Manager adjoint
WITH r2 AS (
  INSERT INTO bac_roles (groupe_slug, nom, description, couleur, actif)
  VALUES ('managers', 'Manager adjoint', 'Fait le travail du manager sans le titre. Compense en permanence, sans jamais le dire.', '#D4921E', true)
  RETURNING id
)
INSERT INTO bac_variants (role_id, lettre, nom, description, emoji) VALUES
  ((SELECT id FROM r2), 'A', 'Le procédurier', 'A un process pour tout. Même pour improviser.', '📋'),
  ((SELECT id FROM r2), 'B', 'Le désabusé', 'A tout vu, tout entendu. Se souvient de tout. Pardonne rien.', '🙄'),
  ((SELECT id FROM r2), 'C', 'Le sauveur', 'Résout les problèmes des autres avant les siens. Sourit toujours.', '🤗');

-- GROUPE ASSISTANTS — Rôle 3 : Assistant
WITH r3 AS (
  INSERT INTO bac_roles (groupe_slug, nom, description, couleur, actif)
  VALUES ('assistants', 'Assistant', 'Sait exactement comment tout fonctionne. N''a pas le droit de le dire.', '#4ECDC4', true)
  RETURNING id
)
INSERT INTO bac_variants (role_id, lettre, nom, description, emoji) VALUES
  ((SELECT id FROM r3), 'A', 'L''ambitieux', 'Fait le travail de trois personnes en espérant que quelqu''un le remarque.', '🌟'),
  ((SELECT id FROM r3), 'B', 'Le discret', 'Présent depuis toujours. Personne ne sait exactement ce qu''il fait. Tout s''effondrerait sans lui.', '😶'),
  ((SELECT id FROM r3), 'C', 'Le revendicatif', 'Connaît ses droits. Les cite volontiers. N''a pas forcément tort.', '😤');

-- GROUPE ASSISTANTS — Rôle 4 : Assistant senior
WITH r4 AS (
  INSERT INTO bac_roles (groupe_slug, nom, description, couleur, actif)
  VALUES ('assistants', 'Assistant senior', 'Le titre "senior" signifie qu''il est là depuis longtemps. Ce n''est pas forcément un avantage.', '#3AB5AD', true)
  RETURNING id
)
INSERT INTO bac_variants (role_id, lettre, nom, description, emoji) VALUES
  ((SELECT id FROM r4), 'A', 'L''ancien', 'Se souvient de comment c''était avant. En parle beaucoup. Souvent nostalgique.', '🧓'),
  ((SELECT id FROM r4), 'B', 'Le formateur', 'Explique tout à tout le monde même quand personne n''a demandé.', '🧑‍🏫'),
  ((SELECT id FROM r4), 'C', 'Le détaché', 'A atteint un niveau de sérénité que les autres confondent avec de la paresse.', '😎');

-- GROUPE CHEFS DE PROJET — Rôle 5 : Chef de projet
WITH r5 AS (
  INSERT INTO bac_roles (groupe_slug, nom, description, couleur, actif)
  VALUES ('chefs-de-projet', 'Chef de projet', 'Responsable de tout ce qui a un début, une fin et un budget. Souvent deux sur trois.', '#6C63FF', true)
  RETURNING id
)
INSERT INTO bac_variants (role_id, lettre, nom, description, emoji) VALUES
  ((SELECT id FROM r5), 'A', 'Le méthodique', 'Gantt, jalons, livrables. Dort avec son planning. Littéralement.', '📊'),
  ((SELECT id FROM r5), 'B', 'L''urgentiste', 'Tout est urgent. Tout. L''urgence est son état naturel, presque confortable.', '🔥'),
  ((SELECT id FROM r5), 'C', 'Le diplomate', 'Jamais en désaccord ouvert. Reformule jusqu''à ce que tout le monde croit avoir eu raison.', '🎭');

-- GROUPE CHEFS DE PROJET — Rôle 6 : Chargé de projet
WITH r6 AS (
  INSERT INTO bac_roles (groupe_slug, nom, description, couleur, actif)
  VALUES ('chefs-de-projet', 'Chargé de projet', 'Exécute. Beaucoup. Questionne peu. Commence à questionner.', '#5952E8', true)
  RETURNING id
)
INSERT INTO bac_variants (role_id, lettre, nom, description, emoji) VALUES
  ((SELECT id FROM r6), 'A', 'Le rapide', 'Livre avant la deadline. Parfois avant d''avoir bien compris la demande.', '⚡'),
  ((SELECT id FROM r6), 'B', 'Le questionneur', 'Pose des questions pertinentes au mauvais moment. Souvent juste après le lancement.', '🤔'),
  ((SELECT id FROM r6), 'C', 'Le documentariste', 'Note tout. Envoie des comptes-rendus de 4 pages pour des réunions de 10 minutes.', '📝');

-- GROUPE DIRECTEURS — Rôle 7 : Directeur
WITH r7 AS (
  INSERT INTO bac_roles (groupe_slug, nom, description, couleur, actif)
  VALUES ('directeurs', 'Directeur', 'Décide des grandes orientations. Pas toujours au courant des petites réalités.', '#E84855', true)
  RETURNING id
)
INSERT INTO bac_variants (role_id, lettre, nom, description, emoji) VALUES
  ((SELECT id FROM r7), 'A', 'Le visionnaire', 'Parle de disruption, de pivot, d''impact. Rarement de comment exactement.', '👔'),
  ((SELECT id FROM r7), 'B', 'Le gestionnaire', 'Tableaux de bord, KPIs, reporting. Ce qui n''est pas mesuré n''existe pas.', '📰'),
  ((SELECT id FROM r7), 'C', 'Le bienveillant', 'Vraiment à l''écoute. Ce qui rend ses décisions incompréhensibles encore plus douloureuses.', '🤝');

-- GROUPE DIRECTEURS — Rôle 8 : Directeur adjoint
WITH r8 AS (
  INSERT INTO bac_roles (groupe_slug, nom, description, couleur, actif)
  VALUES ('directeurs', 'Directeur adjoint', 'Prépare les décisions du directeur. Applique les décisions du directeur. Explique les décisions du directeur.', '#C73340', true)
  RETURNING id
)
INSERT INTO bac_variants (role_id, lettre, nom, description, emoji) VALUES
  ((SELECT id FROM r8), 'A', 'Le miroir', 'Approuve tout ce que dit le directeur. Avec conviction croissante.', '🪞'),
  ((SELECT id FROM r8), 'B', 'Le médiateur', 'Traduit les décisions d''en haut en quelque chose de digeste pour le terrain. Fait de son mieux.', '⚖️'),
  ((SELECT id FROM r8), 'C', 'L''ambitieux discret', 'Souriant. Attentif. Se souvient de tout. Attend son heure.', '🚀');


-- ============================================================
-- PARTIE 2 : THÈMES
-- ============================================================

INSERT INTO bac_themes (titre, description, actif) VALUES
  ('Culture d''entreprise', 'L''épisode tourne autour des valeurs, de l''histoire et de l''ADN de votre entreprise. Idéal pour célébrer un anniversaire, accueillir de nouveaux arrivants ou rappeler ce qui vous rend uniques — avec humour et autodérision.', true),
  ('RGPD & Cybersécurité', 'Sensibilisation aux bonnes pratiques numériques version comédie de bureau. Mots de passe sur Post-it, pièces jointes douteuses, WiFi public — tous les classiques y passent, mais cette fois on en rit ensemble.', true),
  ('QHSE', 'La sécurité au travail version sitcom. Procédures ignorées, EPI mal portés, formulaires perdus — l''épisode aborde les enjeux de qualité, hygiène et sécurité par le biais du ridicule bienveillant.', true),
  ('Onboarding', 'Un (ou plusieurs) nouveaux arrivent, et personne n''est vraiment prêt à les accueillir. Le thème parfait pour célébrer les intégrations récentes ou préparer les prochaines — vu de l''intérieur et de l''extérieur.', true),
  ('Gestion de projet', 'Deadlines floues, périmètre qui s''élargit, réunions de réunions — l''épisode met en scène les joies universelles de la conduite de projet. Tout le monde se reconnaît. C''est le principe.', true),
  ('Transformation digitale', 'Nouveaux outils, nouvelles méthodes, résistances diverses — l''épisode explore la transformation en cours avec tendresse. Entre ceux qui ont tout adopté et ceux qui ont gardé leur fichier Excel de 2008.', true);


-- ============================================================
-- PARTIE 3 : RÉVÉLATIONS
-- ============================================================

INSERT INTO bac_revelations (titre, description, delai_suggere, note_interne, actif) VALUES
  (
    'L''audit surprise',
    'L''équipe apprend qu''un audit externe aura lieu dans 48 heures. Personne n''est prêt.',
    '48 heures',
    'Annoncer lors de l''intro comme une "info reçue ce matin". Laisser un silence après l''annonce. Ne pas répondre aux questions — "vous en saurez plus en temps voulu". Déclenche immédiatement l''instinct de survie de chaque groupe.',
    true
  ),
  (
    'La visite du siège',
    'L''équipe apprend qu''une délégation du siège (ou d''un client stratégique) visite les locaux dans 2 jours. Personne n''est prêt.',
    '2 jours',
    'Présenter comme "une bonne nouvelle" avec un sourire légèrement forcé. La tension vient du fait que tout le monde comprend immédiatement les implications sans que ce soit dit. Laisser les groupes imaginer ce que "la visite" implique pour eux spécifiquement.',
    true
  ),
  (
    'La fusion annoncée',
    'L''équipe apprend qu''un rapprochement avec une autre structure sera officiellement annoncé dans une semaine. Personne n''est prêt.',
    '1 semaine',
    'Ton volontairement flou — "rapprochement", pas "fusion". L''ambiguïté est le moteur de la scène. Ne pas préciser qui fusionne avec qui. Chaque groupe projette ses propres craintes. Particulièrement efficace avec des équipes qui ont vécu des reorganisations.',
    true
  ),
  (
    'Le déménagement imminent',
    'L''équipe apprend que les bureaux seront déménagés dans un nouveau site dans 3 semaines. Personne n''est prêt.',
    '3 semaines',
    'Révélation concrète et immédiatement personnelle — tout le monde a des affaires, des habitudes, des voisins de bureau. Déclenche des réactions très différentes selon les profils : l''anxieux catastrophise, le positif trouve des avantages, le fataliste hausse les épaules. Très efficace pour les scènes de personnalisation.',
    true
  ),
  (
    'Le nouveau logiciel',
    'L''équipe apprend que l''ensemble des outils métier seront migrés vers un nouveau système dans 10 jours. Personne n''est prêt.',
    '10 jours',
    'Révélation très universelle — tout le monde a vécu une migration chaotique. Exploiter le fait que "le nouveau logiciel" n''est pas nommé (ça pourrait être n''importe lequel). Laisser les groupes y projeter leur propre cauchemar. Idéal pour le thème Transformation digitale.',
    true
  );


-- ============================================================
-- PARTIE 4 : SCÈNE MODÈLE COMPLÈTE
-- "La réunion qui n'en finit pas" — Acte 1
-- ============================================================

-- On a besoin des IDs des rôles "Chef de projet" et "Manager"
-- pour les répliques. On les récupère dynamiquement.

DO $$
DECLARE
  v_chef_de_projet_id UUID;
  v_manager_id UUID;
BEGIN
  SELECT id INTO v_chef_de_projet_id FROM bac_roles WHERE nom = 'Chef de projet' AND groupe_slug = 'chefs-de-projet' LIMIT 1;
  SELECT id INTO v_manager_id FROM bac_roles WHERE nom = 'Manager' AND groupe_slug = 'managers' LIMIT 1;

  INSERT INTO bac_scenes (
    titre, acte, ton_principal, ton_secondaire,
    duree_min, duree_max, difficulte,
    groupes_concernes, nb_intervenants_min, nb_intervenants_max,
    fil_rouge,
    champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
    script_json, itw_json, notes_real_json,
    actif
  ) VALUES (
    'La réunion qui n''en finit pas',
    '1',
    'Absurde',
    'Bureaucratique',
    2, 3, 1,
    ARRAY['managers', 'chefs-de-projet'],
    2, 4,
    'La réunion tourne autour d''un ordre du jour anodin — mais la révélation plane en arrière-plan. L''un des participants essaie de l''annoncer sans jamais y parvenir : quelqu''un coupe toujours la parole, relance un débat de procédure, ou demande à recaler la réunion. La révélation reste suspendue jusqu''à la toute fin.',
    'Un outil ou processus interne à citer',
    'Monday, Teams, le CRM, le process de validation',
    4,
    -- script_json
    jsonb_build_array(
      -- Bloc 1: Didascalie ouverture
      jsonb_build_object(
        'type', 'didascalie',
        'texte', 'La réunion semble durer depuis un moment. Tout le monde a l''air légèrement épuisé. Un tableau blanc couvert de schémas incompréhensibles est visible en arrière-plan.',
        'style', 'ouverture'
      ),
      -- Bloc 2: Réplique #1 — Chef de projet
      jsonb_build_object(
        'type', 'replique',
        'role_id', v_chef_de_projet_id,
        'directive', 'Lance la réunion avec une énergie légèrement forcée, comme si relancer l''enthousiasme était aussi dans ses attributions',
        'exemple', 'Bon, on reprend. Donc on en était à… le point 3 sur 14. Ce qui est plutôt bien pour une réunion d''une heure.',
        'utilise_champ_perso', false,
        'didascalie', 'en regardant son écran sans vraiment le voir'
      ),
      -- Bloc 3: Réplique #2 — Manager
      jsonb_build_object(
        'type', 'replique',
        'role_id', v_manager_id,
        'directive', 'Interrompt pour soulever un problème de procédure qui n''a rien à voir avec l''ordre du jour, mais qui lui semble absolument prioritaire',
        'exemple', 'Avant d''aller plus loin — est-ce que ce point a bien été validé par le bon circuit ? Parce que la dernière fois on avait eu un retour là-dessus.',
        'utilise_champ_perso', false,
        'didascalie', ''
      ),
      -- Bloc 4: Didascalie intermédiaire
      jsonb_build_object(
        'type', 'didascalie',
        'texte', 'Léger silence gêné. Quelqu''un note quelque chose sans qu''on sache quoi.',
        'style', 'intermediaire'
      ),
      -- Bloc 5: Réplique #3 — Chef de projet
      jsonb_build_object(
        'type', 'replique',
        'role_id', v_chef_de_projet_id,
        'directive', 'Tente de reprendre le contrôle de la réunion en proposant de "recaler" le point problématique — ce qui revient à repousser le problème sans le résoudre',
        'exemple', 'On peut peut-être mettre ça en parking lot et y revenir en fin de réunion ? Ou planifier une réunion dédiée ?',
        'utilise_champ_perso', false,
        'didascalie', 'avec l''espoir visible que personne ne dira oui'
      ),
      -- Bloc 6: Réplique #4 — Manager (CHAMP PERSO)
      jsonb_build_object(
        'type', 'replique',
        'role_id', v_manager_id,
        'directive', 'Saisit l''occasion pour mentionner l''outil ou processus interne du champ personnalisé — de façon à la fois pertinente et complètement hors sujet',
        'exemple', 'D''ailleurs tant qu''on est là — est-ce que tout le monde a bien migré vers [ÉLÉMENT PERSONNALISÉ] ? Parce que j''ai encore des gens qui m''envoient des mails.',
        'utilise_champ_perso', true,
        'didascalie', ''
      ),
      -- Bloc 7: Didascalie intermédiaire
      jsonb_build_object(
        'type', 'didascalie',
        'texte', 'Tout le monde réagit différemment — hochements de tête vagues, regard vers le plafond, quelqu''un sort discrètement son téléphone.',
        'style', 'intermediaire'
      ),
      -- Bloc 8: Réplique #5 — Chef de projet
      jsonb_build_object(
        'type', 'replique',
        'role_id', v_chef_de_projet_id,
        'directive', 'Essaie d''annoncer la révélation — c''est le moment prévu — mais se fait couper avant d''avoir pu finir sa phrase',
        'exemple', 'OK, et justement — j''avais quelque chose d''important à annoncer, c''est un peu lié à tout ça en fait…',
        'utilise_champ_perso', false,
        'didascalie', 'commence à se lever légèrement'
      ),
      -- Bloc 9: Réplique #6 — Manager
      jsonb_build_object(
        'type', 'replique',
        'role_id', v_manager_id,
        'directive', 'Coupe involontairement en relançant un sous-débat sur le point 3, sans réaliser que quelque chose d''important allait être dit',
        'exemple', 'Ah oui avant — sur le point 3, j''avais une question de fond. Ça prendra deux minutes.',
        'utilise_champ_perso', false,
        'didascalie', ''
      ),
      -- Bloc 10: Didascalie clôture
      jsonb_build_object(
        'type', 'didascalie',
        'texte', 'Le chef de projet se rassoit. La révélation attendra.',
        'style', 'cloture'
      )
    ),
    -- itw_json
    jsonb_build_array(
      -- ITW Question 1 — Chef de projet
      jsonb_build_object(
        'role_id', v_chef_de_projet_id,
        'question', 'Vous aviez quelque chose d''important à annoncer en réunion. Ça s''est passé comment ?',
        'reponse_variant_a', 'C''était prévu au point 7. On n''y est jamais arrivé. J''ai mis une note dans le compte-rendu pour la prochaine fois.',
        'reponse_variant_b', 'C''était urgent ! Ça l''est toujours. Là maintenant ça l''est encore. Vous êtes sûrs qu''on peut pas en parler maintenant ?',
        'reponse_variant_c', 'Je pense que tout le monde a bien compris qu''il y avait quelque chose d''important. Parfois ne pas dire les choses c''est aussi une façon de les dire.'
      ),
      -- ITW Question 2 — Manager
      jsonb_build_object(
        'role_id', v_manager_id,
        'question', 'Cette réunion a duré combien de temps selon vous ?',
        'reponse_variant_a', 'Trop longtemps. Pas assez pour couvrir tout ce qui n''a pas été dit. C''est le problème.',
        'reponse_variant_b', 'Honnêtement ? C''était plutôt efficace. On a avancé sur beaucoup de points. Enfin, on en a parlé.',
        'reponse_variant_c', 'Je sais plus. À un moment j''ai arrêté de regarder l''heure. Ça aide.'
      )
    ),
    -- notes_real_json
    jsonb_build_object(
      'cadrage', 'Plan large d''ouverture pour montrer tout le monde autour de la table et l''état général de fatigue. Ensuite plans rapprochés sur les visages pendant les silences — c''est là que tout se joue. Le tableau blanc en arrière-plan doit être visible mais illisible.',
      'rythme', 'Commencer lentement — presque trop lentement. Le rythme doit donner l''impression que la réunion dure depuis un moment avant même qu''elle commence. Les interruptions s''accélèrent légèrement vers la fin, puis retombent sur le silence final.',
      'silences', 'Le silence après "ça prendra deux minutes" est le plus important de la scène. Ne pas le couper. Laisser la caméra sur le visage du chef de projet qui réalise qu''il va devoir attendre encore. Minimum 3 secondes.',
      'pieges', 'Ne pas jouer la comédie trop large — la force de la scène vient du réalisme. Si les acteurs surjouent l''épuisement, ça devient caricatural. L''absurde doit sembler complètement normal pour les personnages. Aussi : s''assurer que [ÉLÉMENT PERSONNALISÉ] est bien intégré naturellement dans la réplique 4 — ça ne doit pas sonner comme une insertion forcée.',
      'astuce', 'Tourner d''abord la scène complète en plan large (une seule caméra), puis recommencer pour les inserts de visages. L''ITW du Chef de projet se tourne juste après — demander au comédien de garder le même niveau d''énergie "fin de réunion", pas de reset entre les deux.'
    ),
    true
  );
END $$;

-- ============================================================
-- VÉRIFICATION — Compteurs
-- ============================================================
-- Décommentez ces lignes pour vérifier l'injection :
-- SELECT 'bac_roles' AS "table", count(*) FROM bac_roles;
-- SELECT 'bac_variants' AS "table", count(*) FROM bac_variants;
-- SELECT 'bac_themes' AS "table", count(*) FROM bac_themes;
-- SELECT 'bac_revelations' AS "table", count(*) FROM bac_revelations;
-- SELECT 'bac_scenes' AS "table", count(*) FROM bac_scenes;
