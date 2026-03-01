-- ============================================================
-- BUREAU À LA CARTE — INJECTION COMPLÈTE
-- À exécuter dans Supabase SQL Editor (section par section si besoin)
-- Idempotent : ne crée rien si l'élément existe déjà (basé sur le nom/titre)
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- ÉTAPE 0 : Colonnes manquantes sur bac_revelations
-- (delai_suggere et note_interne spécifiques aux annonces)
-- ────────────────────────────────────────────────────────────

ALTER TABLE bac_revelations
  ADD COLUMN IF NOT EXISTS delai_suggere TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS note_interne  TEXT DEFAULT '';


-- ════════════════════════════════════════════════════════════
-- ÉTAPE 1 : bac_roles (8 rôles, 4 groupes)
-- ════════════════════════════════════════════════════════════

INSERT INTO bac_roles (nom, groupe_slug, description, couleur, actif)
SELECT v.nom, v.groupe_slug, v.description, v.couleur, v.actif
FROM (VALUES
  ('Manager',          'managers',        'Le responsable d''équipe. Jongle entre les directives du haut et la réalité du terrain.',           '#E8A838', true),
  ('Manager adjoint',  'managers',        'Fait le travail du manager sans le titre. Compense en permanence, sans jamais le dire.',             '#D4921E', true),
  ('Assistant',        'assistants',      'Sait exactement comment tout fonctionne. N''a pas le droit de le dire.',                             '#4ECDC4', true),
  ('Assistant senior', 'assistants',      'Le titre "senior" signifie qu''il est là depuis longtemps. Ce n''est pas forcément un avantage.',    '#3AB5AD', true),
  ('Chef de projet',   'chefs-de-projet', 'Responsable de tout ce qui a un début, une fin et un budget. Souvent deux sur trois.',               '#6C63FF', true),
  ('Chargé de projet', 'chefs-de-projet', 'Exécute. Beaucoup. Questionne peu. Commence à questionner.',                                         '#5952E8', true),
  ('Directeur',        'directeurs',      'Décide des grandes orientations. Pas toujours au courant des petites réalités.',                     '#E84855', true),
  ('Directeur adjoint','directeurs',      'Prépare, applique et explique les décisions du directeur. Dans cet ordre, idéalement.',              '#C73340', true)
) AS v(nom, groupe_slug, description, couleur, actif)
WHERE NOT EXISTS (SELECT 1 FROM bac_roles r WHERE r.nom = v.nom);


-- ════════════════════════════════════════════════════════════
-- ÉTAPE 2 : bac_variants (3 variants par rôle = 24 variants)
-- ════════════════════════════════════════════════════════════

-- Manager
INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
SELECT r.id, v.lettre, v.nom, v.description, v.emoji
FROM bac_roles r
CROSS JOIN (VALUES
  ('A', 'L''anxieux',  'Anticipe tout ce qui peut mal tourner, le dit à voix haute, souvent raison.', '😰'),
  ('B', 'Le positif',  'Voit le bon côté de tout. Même les catastrophes. Surtout les catastrophes.',  '😄'),
  ('C', 'Le fataliste','S''en fout ouvertement. Pas par malveillance — juste une sagesse résignée.',   '🤷')
) AS v(lettre, nom, description, emoji)
WHERE r.nom = 'Manager'
AND NOT EXISTS (SELECT 1 FROM bac_variants bv WHERE bv.role_id = r.id AND bv.lettre = v.lettre);

-- Manager adjoint
INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
SELECT r.id, v.lettre, v.nom, v.description, v.emoji
FROM bac_roles r
CROSS JOIN (VALUES
  ('A', 'Le procédurier','A un process pour tout. Même pour improviser.',                              '📋'),
  ('B', 'Le désabusé',   'A tout vu, tout entendu. Se souvient de tout. Pardonne rien.',               '🙄'),
  ('C', 'Le sauveur',    'Résout les problèmes des autres avant les siens. Sourit toujours.',           '🤗')
) AS v(lettre, nom, description, emoji)
WHERE r.nom = 'Manager adjoint'
AND NOT EXISTS (SELECT 1 FROM bac_variants bv WHERE bv.role_id = r.id AND bv.lettre = v.lettre);

-- Assistant
INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
SELECT r.id, v.lettre, v.nom, v.description, v.emoji
FROM bac_roles r
CROSS JOIN (VALUES
  ('A', 'L''ambitieux',    'Fait le travail de trois personnes en espérant que quelqu''un le remarque.', '🌟'),
  ('B', 'Le discret',      'Présent depuis toujours. Personne ne sait ce qu''il fait. Tout s''effondrerait sans lui.', '😶'),
  ('C', 'Le revendicatif', 'Connaît ses droits. Les cite volontiers. N''a pas forcément tort.',          '😤')
) AS v(lettre, nom, description, emoji)
WHERE r.nom = 'Assistant'
AND NOT EXISTS (SELECT 1 FROM bac_variants bv WHERE bv.role_id = r.id AND bv.lettre = v.lettre);

-- Assistant senior
INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
SELECT r.id, v.lettre, v.nom, v.description, v.emoji
FROM bac_roles r
CROSS JOIN (VALUES
  ('A', 'L''ancien',    'Se souvient de comment c''était avant. En parle beaucoup. Souvent nostalgique.',                      '🧓'),
  ('B', 'Le formateur', 'Explique tout à tout le monde même quand personne n''a demandé.',                                     '🧑‍🏫'),
  ('C', 'Le détaché',   'A atteint un niveau de sérénité que les autres confondent avec de la paresse.',                      '😎')
) AS v(lettre, nom, description, emoji)
WHERE r.nom = 'Assistant senior'
AND NOT EXISTS (SELECT 1 FROM bac_variants bv WHERE bv.role_id = r.id AND bv.lettre = v.lettre);

-- Chef de projet
INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
SELECT r.id, v.lettre, v.nom, v.description, v.emoji
FROM bac_roles r
CROSS JOIN (VALUES
  ('A', 'Le méthodique', 'Gantt, jalons, livrables. Dort avec son planning. Littéralement.',                                  '📊'),
  ('B', 'L''urgentiste', 'Tout est urgent. Tout. L''urgence est son état naturel, presque confortable.',                      '🔥'),
  ('C', 'Le diplomate',  'Jamais en désaccord ouvert. Reformule jusqu''à ce que tout le monde croit avoir eu raison.',         '🎭')
) AS v(lettre, nom, description, emoji)
WHERE r.nom = 'Chef de projet'
AND NOT EXISTS (SELECT 1 FROM bac_variants bv WHERE bv.role_id = r.id AND bv.lettre = v.lettre);

-- Chargé de projet
INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
SELECT r.id, v.lettre, v.nom, v.description, v.emoji
FROM bac_roles r
CROSS JOIN (VALUES
  ('A', 'Le rapide',        'Livre avant la deadline. Parfois avant d''avoir bien compris la demande.',                       '⚡'),
  ('B', 'Le questionneur',  'Pose des questions pertinentes au mauvais moment. Souvent juste après le lancement.',            '🤔'),
  ('C', 'Le documentariste','Note tout. Envoie des comptes-rendus de 4 pages pour des réunions de 10 minutes.',               '📝')
) AS v(lettre, nom, description, emoji)
WHERE r.nom = 'Chargé de projet'
AND NOT EXISTS (SELECT 1 FROM bac_variants bv WHERE bv.role_id = r.id AND bv.lettre = v.lettre);

-- Directeur
INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
SELECT r.id, v.lettre, v.nom, v.description, v.emoji
FROM bac_roles r
CROSS JOIN (VALUES
  ('A', 'Le visionnaire',  'Parle de disruption, de pivot, d''impact. Rarement de comment exactement.',                      '👔'),
  ('B', 'Le gestionnaire', 'Tableaux de bord, KPIs, reporting. Ce qui n''est pas mesuré n''existe pas.',                     '📰'),
  ('C', 'Le bienveillant', 'Vraiment à l''écoute. Ce qui rend ses décisions incompréhensibles encore plus douloureuses.',    '🤝')
) AS v(lettre, nom, description, emoji)
WHERE r.nom = 'Directeur'
AND NOT EXISTS (SELECT 1 FROM bac_variants bv WHERE bv.role_id = r.id AND bv.lettre = v.lettre);

-- Directeur adjoint
INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
SELECT r.id, v.lettre, v.nom, v.description, v.emoji
FROM bac_roles r
CROSS JOIN (VALUES
  ('A', 'Le miroir',           'Approuve tout ce que dit le directeur. Avec conviction croissante.',                          '🪞'),
  ('B', 'Le médiateur',        'Traduit les décisions d''en haut en quelque chose de digeste pour le terrain. Fait de son mieux.', '⚖️'),
  ('C', 'L''ambitieux discret','Souriant. Attentif. Se souvient de tout. Attend son heure.',                                  '🚀')
) AS v(lettre, nom, description, emoji)
WHERE r.nom = 'Directeur adjoint'
AND NOT EXISTS (SELECT 1 FROM bac_variants bv WHERE bv.role_id = r.id AND bv.lettre = v.lettre);


-- ════════════════════════════════════════════════════════════
-- ÉTAPE 3 : bac_themes (6 thèmes)
-- ════════════════════════════════════════════════════════════

INSERT INTO bac_themes (titre, description, actif)
SELECT v.titre, v.description, v.actif
FROM (VALUES
  ('Culture d''entreprise',
   'L''épisode tourne autour des valeurs, de l''histoire et de l''ADN de votre entreprise. Idéal pour célébrer un anniversaire, accueillir de nouveaux arrivants ou rappeler ce qui vous rend uniques — avec humour et autodérision.',
   true),
  ('RGPD & Cybersécurité',
   'Sensibilisation aux bonnes pratiques numériques version comédie de bureau. Mots de passe sur Post-it, pièces jointes douteuses, WiFi public — tous les classiques y passent, mais cette fois on en rit ensemble.',
   true),
  ('QHSE',
   'La sécurité au travail version sitcom. Procédures ignorées, EPI mal portés, formulaires perdus — l''épisode aborde les enjeux qualité, hygiène et sécurité par le biais du ridicule bienveillant.',
   true),
  ('Onboarding',
   'Un (ou plusieurs) nouveaux arrivent, et personne n''est vraiment prêt à les accueillir. Le thème parfait pour célébrer les intégrations récentes ou préparer les prochaines — vu de l''intérieur et de l''extérieur.',
   true),
  ('Gestion de projet',
   'Deadlines floues, périmètre qui s''élargit, réunions de réunions — l''épisode met en scène les joies universelles de la conduite de projet. Tout le monde se reconnaît. C''est le principe.',
   true),
  ('Transformation digitale',
   'Nouveaux outils, nouvelles méthodes, résistances diverses — l''épisode explore la transformation en cours avec tendresse. Entre ceux qui ont tout adopté et ceux qui ont gardé leur fichier Excel de 2008.',
   true)
) AS v(titre, description, actif)
WHERE NOT EXISTS (SELECT 1 FROM bac_themes t WHERE t.titre = v.titre);


-- ════════════════════════════════════════════════════════════
-- ÉTAPE 4 : bac_revelations (5 révélations / annonces)
-- ════════════════════════════════════════════════════════════

INSERT INTO bac_revelations (
  titre, description, delai_suggere, note_interne,
  ton_principal, ton_secondaire, duree_min, duree_max,
  fil_rouge, script_json, itw_json, notes_real_json, actif
)
SELECT v.titre, v.description, v.delai_suggere, v.note_interne,
       v.ton_principal, v.ton_secondaire, v.duree_min, v.duree_max,
       v.fil_rouge, v.script_json::jsonb, v.itw_json::jsonb,
       v.notes_real_json::jsonb, v.actif
FROM (VALUES
  (
    'L''audit surprise',
    'L''équipe apprend qu''un audit externe aura lieu dans 48 heures. Personne n''est prêt.',
    '48 heures',
    'Annoncer lors de l''intro comme une "info reçue ce matin". Laisser un silence après l''annonce. Ne pas répondre aux questions — "vous en saurez plus en temps voulu". Déclenche immédiatement l''instinct de survie de chaque groupe.',
    '', '', 1, 2, '',
    '[]', '[]',
    '{"cadrage":"","rythme":"","silences":"","pieges":"","astuce":""}',
    true
  ),
  (
    'La visite du siège',
    'L''équipe apprend qu''une délégation du siège visite les locaux dans 2 jours. Personne n''est prêt.',
    '2 jours',
    'Présenter comme "une bonne nouvelle" avec un sourire légèrement forcé. La tension vient du fait que tout le monde comprend immédiatement les implications sans que ce soit dit. Laisser les groupes imaginer ce que "la visite" implique pour eux spécifiquement.',
    '', '', 1, 2, '',
    '[]', '[]',
    '{"cadrage":"","rythme":"","silences":"","pieges":"","astuce":""}',
    true
  ),
  (
    'La fusion annoncée',
    'L''équipe apprend qu''un rapprochement avec une autre structure sera officiellement annoncé dans une semaine. Personne n''est prêt.',
    '1 semaine',
    'Ton volontairement flou — "rapprochement", pas "fusion". L''ambiguïté est le moteur. Ne pas préciser qui fusionne avec qui. Chaque groupe projette ses propres craintes. Particulièrement efficace avec des équipes qui ont vécu des réorganisations.',
    '', '', 1, 2, '',
    '[]', '[]',
    '{"cadrage":"","rythme":"","silences":"","pieges":"","astuce":""}',
    true
  ),
  (
    'Le déménagement imminent',
    'L''équipe apprend que les bureaux seront déménagés dans un nouveau site dans 3 semaines. Personne n''est prêt.',
    '3 semaines',
    'Révélation concrète et immédiatement personnelle — tout le monde a des affaires, des habitudes, des voisins de bureau. Déclenche des réactions très différentes selon les profils. Très efficace pour les scènes de personnalisation.',
    '', '', 1, 2, '',
    '[]', '[]',
    '{"cadrage":"","rythme":"","silences":"","pieges":"","astuce":""}',
    true
  ),
  (
    'Le nouveau logiciel',
    'L''équipe apprend que l''ensemble des outils métier seront migrés vers un nouveau système dans 10 jours. Personne n''est prêt.',
    '10 jours',
    'Révélation très universelle — tout le monde a vécu une migration chaotique. Laisser les groupes y projeter leur propre cauchemar. Idéal pour le thème Transformation digitale.',
    '', '', 1, 2, '',
    '[]', '[]',
    '{"cadrage":"","rythme":"","silences":"","pieges":"","astuce":""}',
    true
  )
) AS v(titre, description, delai_suggere, note_interne, ton_principal, ton_secondaire,
       duree_min, duree_max, fil_rouge, script_json, itw_json, notes_real_json, actif)
WHERE NOT EXISTS (SELECT 1 FROM bac_revelations r WHERE r.titre = v.titre);


-- ════════════════════════════════════════════════════════════
-- ÉTAPE 5 : bac_scenes (9 scènes complètes)
-- ════════════════════════════════════════════════════════════

-- ─── SCÈNE 01 : L'annonce (intro fixe) ───────────────────────────────────────
INSERT INTO bac_scenes (
  titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
  groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
  champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
  script_json, itw_json, notes_real_json, actif
)
SELECT
  'L''annonce', 'intro', 'Neutre / Solennel', 'Légèrement inquiet', 1, 2, 1,
  ARRAY['managers','assistants','chefs-de-projet','directeurs'], 1, 2,
  'C''est ici que la révélation est annoncée pour la première fois. La scène est portée par le coordinateur (en rôle fictif) ou un "personnage officiel". Elle plante le contexte de tout l''épisode — le ton doit être sérieux juste assez pour que la suite soit drôle.',
  NULL, NULL, NULL,
  '[{"type":"didascalie","texte":"Un couloir ou une salle quelconque. Quelqu''un s''apprête à faire une annonce. Ambiance légèrement solennelle.","style":"ouverture"},{"type":"replique","role":"Coordinateur","directive":"Annonce la révélation avec le ton de quelqu''un qui essaie d''avoir l''air calme mais ne l''est pas tout à fait. Lire [LA RÉVÉLATION] avec un naturel forcé.","exemple":"Donc voilà. On vient d''apprendre que [LA RÉVÉLATION] aura lieu [LE DÉLAI]. Je vous laisse digérer ça.","didascalie_replique":"marque une pause après l''annonce","utilise_element_perso":false},{"type":"didascalie","texte":"Silence. Puis tout le monde repart vaquer à ses occupations comme si rien ne s''était passé. Ce qui est exactement le problème.","style":"cloture"}]'::jsonb,
  '[]'::jsonb,
  '{"cadrage":"Plan serré sur le visage pendant l''annonce. Pan vers le groupe pour capter les premières réactions — furtives, pas jouées.","rythme":"Lent. Le silence après l''annonce est le moment le plus important de cette scène.","silences":"Minimum 4 secondes après [LA RÉVÉLATION]. Ne pas couper.","pieges":"Ne pas rendre la scène comique trop tôt — l''humour vient du contraste avec ce qui suit, pas de la scène elle-même.","astuce":"Si possible tourner cette scène en premier, avant que les acteurs soient échauffés. Le naturel non-joué est exactement ce qu''on cherche."}'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM bac_scenes s WHERE s.titre = 'L''annonce' AND s.acte = 'intro');

-- ─── SCÈNE 02 : La réunion qui n'en finit pas ─────────────────────────────────
INSERT INTO bac_scenes (
  titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
  groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
  champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
  script_json, itw_json, notes_real_json, actif
)
SELECT
  'La réunion qui n''en finit pas', '1', 'Absurde', 'Bureaucratique', 2, 3, 1,
  ARRAY['managers','chefs-de-projet'], 2, 4,
  'La révélation plane en arrière-plan — un participant essaie de l''annoncer mais se fait couper à chaque tentative. Elle reste suspendue jusqu''à la toute fin.',
  'Un outil ou processus interne à citer',
  'Monday, Teams, le CRM, le process de validation',
  4,
  '[{"type":"didascalie","texte":"La réunion semble durer depuis un moment. Tout le monde a l''air légèrement épuisé. Un tableau blanc couvert de schémas incompréhensibles est visible en arrière-plan.","style":"ouverture"},{"type":"replique","role":"Chef de projet","directive":"Lance la réunion avec une énergie légèrement forcée, comme si relancer l''enthousiasme était aussi dans ses attributions","exemple":"Bon, on reprend. Donc on en était à… le point 3 sur 14. Ce qui est plutôt bien pour une réunion d''une heure.","didascalie_replique":"en regardant son écran sans vraiment le voir","utilise_element_perso":false},{"type":"replique","role":"Manager","directive":"Interrompt pour soulever un problème de procédure hors sujet, mais qui lui semble absolument prioritaire","exemple":"Avant d''aller plus loin — est-ce que ce point a bien été validé par le bon circuit ? Parce que la dernière fois on avait eu un retour là-dessus.","didascalie_replique":"","utilise_element_perso":false},{"type":"didascalie","texte":"Léger silence gêné. Quelqu''un note quelque chose sans qu''on sache quoi.","style":"intermediaire"},{"type":"replique","role":"Chef de projet","directive":"Tente de reprendre le contrôle en proposant de mettre le point en parking lot — ce qui revient à repousser le problème","exemple":"On peut peut-être mettre ça en parking lot et y revenir en fin de réunion ? Ou planifier une réunion dédiée ?","didascalie_replique":"avec l''espoir visible que personne ne dira oui","utilise_element_perso":false},{"type":"replique","role":"Manager","directive":"Saisit l''occasion pour mentionner l''outil ou processus personnalisé — à la fois pertinent et complètement hors sujet","exemple":"D''ailleurs tant qu''on est là — est-ce que tout le monde a bien migré vers [ÉLÉMENT PERSONNALISÉ] ? Parce que j''ai encore des gens qui m''envoient des mails.","didascalie_replique":"","utilise_element_perso":true},{"type":"didascalie","texte":"Tout le monde réagit différemment — hochements de tête vagues, regard vers le plafond, quelqu''un sort discrètement son téléphone.","style":"intermediaire"},{"type":"replique","role":"Chef de projet","directive":"Essaie d''annoncer la révélation — c''est le moment prévu — mais se fait couper avant d''avoir pu finir","exemple":"OK, et justement — j''avais quelque chose d''important à annoncer, c''est un peu lié à tout ça en fait…","didascalie_replique":"commence à se lever légèrement","utilise_element_perso":false},{"type":"replique","role":"Manager","directive":"Coupe involontairement en relançant un sous-débat sur le point 3, sans réaliser que quelque chose d''important allait être dit","exemple":"Ah oui avant — sur le point 3, j''avais une question de fond. Ça prendra deux minutes.","didascalie_replique":"","utilise_element_perso":false},{"type":"didascalie","texte":"Le chef de projet se rassoit. La révélation attendra.","style":"cloture"}]'::jsonb,
  '[{"role_cible":"Chef de projet","question":"Vous aviez quelque chose d''important à annoncer en réunion. Ça s''est passé comment ?","reponse_a":"C''était prévu au point 7. On n''y est jamais arrivé. J''ai mis une note dans le compte-rendu pour la prochaine fois.","reponse_b":"C''était urgent ! Ça l''est toujours. Là maintenant ça l''est encore. Vous êtes sûrs qu''on peut pas en parler maintenant ?","reponse_c":"Je pense que tout le monde a bien compris qu''il y avait quelque chose d''important. Parfois ne pas dire les choses c''est aussi une façon de les dire."},{"role_cible":"Manager","question":"Cette réunion a duré combien de temps selon vous ?","reponse_a":"Trop longtemps. Pas assez pour couvrir tout ce qui n''a pas été dit. C''est le problème.","reponse_b":"Honnêtement ? C''était plutôt efficace. On a avancé sur beaucoup de points. Enfin, on en a parlé.","reponse_c":"Je sais plus. À un moment j''ai arrêté de regarder l''heure. Ça aide."}]'::jsonb,
  '{"cadrage":"Plan large d''ouverture pour montrer tout le monde autour de la table et l''état général de fatigue. Ensuite plans rapprochés sur les visages pendant les silences.","rythme":"Commencer lentement — presque trop lentement. Les interruptions s''accélèrent légèrement vers la fin, puis retombent sur le silence final.","silences":"Le silence après ''ça prendra deux minutes'' est le plus important. Ne pas le couper. Laisser la caméra sur le visage du chef de projet. Minimum 3 secondes.","pieges":"Ne pas surjouer l''épuisement — l''absurde doit sembler complètement normal pour les personnages. S''assurer que [ÉLÉMENT PERSONNALISÉ] s''intègre naturellement dans la réplique 4.","astuce":"Tourner d''abord en plan large, puis recommencer pour les inserts de visages. Tourner l''ITW Chef de projet juste après — garder le même niveau d''énergie ''fin de réunion''."}'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM bac_scenes s WHERE s.titre = 'La réunion qui n''en finit pas');

-- ─── SCÈNE 03 : Le mail de toute l'entreprise ─────────────────────────────────
INSERT INTO bac_scenes (
  titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
  groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
  champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
  script_json, itw_json, notes_real_json, actif
)
SELECT
  'Le mail de toute l''entreprise', '1', 'Chaos', 'Comique', 2, 3, 2,
  ARRAY['assistants','chefs-de-projet'], 2, 4,
  'Quelqu''un a envoyé un mail à toute l''entreprise par erreur. Le mail mentionnait la révélation. La scène est la réaction en chaîne : chacun reçoit le mail, le lit, réagit, et commence à répondre à tous.',
  'L''objet du mail envoyé par erreur',
  '"Réunion confidentielle vendredi", "Budget prévisionnel v3 FINAL", "Ne pas transférer"',
  2,
  '[{"type":"didascalie","texte":"Bureau open space. Plusieurs personnes travaillent. Un téléphone vibre. Puis un autre. Puis tous en même temps.","style":"ouverture"},{"type":"replique","role":"Assistant","directive":"Reçoit le mail, le lit, réalise l''ampleur de l''erreur — communique tout ça en une seule phrase sans le dire explicitement","exemple":"Attends… il a envoyé ça à TOUTE l''entreprise ? Avec comme objet ''[ÉLÉMENT PERSONNALISÉ]'' ?","didascalie_replique":"en regardant son écran, voix qui monte légèrement","utilise_element_perso":true},{"type":"replique","role":"Chargé de projet","directive":"Confirme que oui, lui aussi l''a reçu, et ajoute une information qui aggrave la situation","exemple":"Ouais. Et apparemment il a répondu à tous pour s''excuser. Ce qui fait que maintenant tout le monde a aussi l''excuse.","didascalie_replique":"","utilise_element_perso":false},{"type":"didascalie","texte":"Silence de deux secondes pendant que tout le monde absorbe l''information.","style":"intermediaire"},{"type":"replique","role":"Assistant","directive":"Annonce qu''il va répondre à tous pour clarifier, sans réaliser que c''est exactement ce qu''il ne faut pas faire","exemple":"Bon, je réponds à tous pour dire que c''était une erreur et que personne ne doit en parler.","didascalie_replique":"les doigts déjà sur le clavier","utilise_element_perso":false},{"type":"replique","role":"Chargé de projet","directive":"Tente de l''arrêter mais trop tard — et dans la panique envoie lui-même quelque chose","exemple":"Non attends ! Surtout pas répondre à— merde. Je viens d''envoyer un ''merci pour l''info'' à tout le monde.","didascalie_replique":"","utilise_element_perso":false},{"type":"didascalie","texte":"Les téléphones se remettent à vibrer. Tous en même temps. De nouveau.","style":"cloture"}]'::jsonb,
  '[{"role_cible":"Assistant","question":"Quand vous avez reçu ce mail, quelle a été votre première réaction ?","reponse_a":"Honnêtement ? Voir si je pouvais en tirer quelque chose. C''est pas mal comme info.","reponse_b":"J''ai fermé l''onglet. C''est pas mes affaires. Je l''ai rouvert deux minutes après.","reponse_c":"J''ai immédiatement vérifié si mon nom était dans le fil. Parce que si mon nom est dans le fil, ça me concerne."},{"role_cible":"Chargé de projet","question":"Vous avez répondu à tous par accident. Vous assumez ?","reponse_a":"C''était une erreur de parcours. Ça arrive. J''ai déjà documenté le process pour éviter que ça se reproduise.","reponse_b":"C''est fait, on peut pas revenir en arrière. Autant en faire quelque chose d''utile maintenant.","reponse_c":"Mon message était factuel. ''Merci pour l''info''. C''est une information objective. Je le referais."}]'::jsonb,
  '{"cadrage":"Filmer les écrans d''ordinateur en insert pour que le public voie les notifications arriver. Plan d''ensemble pour capter les réactions simultanées.","rythme":"Démarrer calme, accélérer progressivement. Le silence de 2 secondes au milieu est une respiration — ne pas le rater.","silences":"Le silence après ''et que personne ne doit en parler'' avant le clic sur Envoyer. 2 secondes suffisent.","pieges":"Éviter que les acteurs se regardent pour se donner les répliques — ils doivent regarder leurs écrans. Le comique vient du fait qu''ils ne se parlent pas vraiment, ils réagissent à leur écran.","astuce":"Prévoir un vrai son de notification pour les téléphones sur plateau — ça aide les acteurs à réagir au bon moment sans signal de régie."}'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM bac_scenes s WHERE s.titre = 'Le mail de toute l''entreprise');

-- ─── SCÈNE 04 : La formation obligatoire ──────────────────────────────────────
INSERT INTO bac_scenes (
  titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
  groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
  champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
  script_json, itw_json, notes_real_json, actif
)
SELECT
  'La formation obligatoire', '1', 'Résigné', 'Comique', 2, 3, 1,
  ARRAY['assistants','managers'], 2, 3,
  'Pendant la formation en ligne obligatoire, quelqu''un reçoit une notification liée à la révélation. Personne ne regarde vraiment la formation, mais tout le monde fait semblant.',
  'Le nom de la formation obligatoire',
  '"Formation RGPD", "Module sécurité incendie", "e-learning intégration"',
  1,
  '[{"type":"didascalie","texte":"Une salle de formation ou des bureaux. Plusieurs personnes sont devant leur écran, casque sur les oreilles — ou pas. La formation tourne en arrière-plan.","style":"ouverture"},{"type":"replique","role":"Manager","directive":"Décrit ce qu''il est censé faire avec le ton de quelqu''un qui fait autre chose en même temps","exemple":"Donc on a tous la [ÉLÉMENT PERSONNALISÉ] à finir avant vendredi. C''est 45 minutes, ça se met en fond.","didascalie_replique":"en répondant à des mails pendant qu''il parle","utilise_element_perso":true},{"type":"replique","role":"Assistant","directive":"Demande innocemment si on peut vraiment faire autre chose en même temps, sachant que tout le monde le fait déjà","exemple":"On est censés vraiment regarder ou juste finir les modules ?","didascalie_replique":"","utilise_element_perso":false},{"type":"replique","role":"Manager","directive":"Répond de façon à ne pas répondre — tout en validant implicitement qu''on peut faire autre chose","exemple":"Il y a un quiz à la fin. Sur les grandes lignes. C''est faisable.","didascalie_replique":"sans lever les yeux","utilise_element_perso":false},{"type":"didascalie","texte":"Un téléphone vibre. L''assistant le regarde furtivement.","style":"intermediaire"},{"type":"replique","role":"Assistant","directive":"Réagit à la notification liée à la révélation sans pouvoir en parler ouvertement — crée un malaise discret","exemple":"Hm. OK. C''est… intéressant comme info.","didascalie_replique":"repose le téléphone face écran vers le bas","utilise_element_perso":false},{"type":"replique","role":"Manager","directive":"Perçoit que quelque chose s''est passé mais fait le choix de ne pas creuser — trop de choses à gérer","exemple":"Quoi ?","didascalie_replique":"","utilise_element_perso":false},{"type":"replique","role":"Assistant","directive":"Botte en touche avec une réponse qui ne dit rien mais intrigue","exemple":"Non, rien. Je regardais la formation.","didascalie_replique":"regard caméra","utilise_element_perso":false},{"type":"didascalie","texte":"La formation continue de tourner. Personne ne la regarde.","style":"cloture"}]'::jsonb,
  '[{"role_cible":"Manager","question":"Vous suivez ce genre de formation comment ?","reponse_a":"J''anticipe. Je bloque du temps, je fais rien d''autre. C''est 45 minutes, autant les passer bien.","reponse_b":"En multitâche. Le temps c''est du temps. Et honnêtement la formation tourne toute seule très bien.","reponse_c":"Je délègue le clic. Pas officiellement. Mais c''est comme ça que ça marche."},{"role_cible":"Assistant","question":"Vous avez reçu une notification pendant la formation. C''était quoi ?","reponse_a":"Je peux pas en parler. Mais c''est important. Et ça me concerne directement.","reponse_b":"Rien de spécial. Enfin. Pas encore.","reponse_c":"Un truc confidentiel. Ce qui veut dire que tout le monde le saura demain matin."}]'::jsonb,
  '{"cadrage":"Insert sur l''écran de formation qui tourne — le son de la vidéo e-learning en fond audio crée l''atmosphère. Plan sur les visages qui regardent ailleurs.","rythme":"Lent et plat — c''est voulu. C''est une scène de non-événement. L''humour est dans l''absence d''action.","silences":"Le silence après ''Non, rien. Je regardais la formation.'' avec le regard caméra. Minimum 2 secondes.","pieges":"Ne pas rendre la notification trop mystérieuse — l''acteur doit jouer la retenue, pas le secret dramatique.","astuce":"Préparer un vrai écran de formation e-learning en fond — n''importe lequel, ça ne s''entend pas vraiment. Le réalisme du décor compte beaucoup."}'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM bac_scenes s WHERE s.titre = 'La formation obligatoire');

-- ─── SCÈNE 05 : Le couloir de la vérité ──────────────────────────────────────
INSERT INTO bac_scenes (
  titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
  groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
  champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
  script_json, itw_json, notes_real_json, actif
)
SELECT
  'Le couloir de la vérité', '1', 'Drama', 'The Office', 1, 2, 2,
  ARRAY['directeurs','managers'], 2, 2,
  'Deux personnes qui savent toutes les deux la révélation se croisent dans le couloir. Elles font semblant de ne pas savoir — et savent que l''autre sait qu''elles savent.',
  NULL, NULL, NULL,
  '[{"type":"didascalie","texte":"Un couloir. Deux personnes arrivent de directions opposées. Elles se voient de loin. Quelque chose passe sur leurs visages.","style":"ouverture"},{"type":"replique","role":"Directeur","directive":"Salutation hyper normale. Trop normale. Le genre de normalité qui dit ''je cache quelque chose''","exemple":"Bonjour ! Bonne journée ?","didascalie_replique":"sourire légèrement trop large","utilise_element_perso":false},{"type":"replique","role":"Manager","directive":"Répond avec la même énergie forcée — les deux jouent le même jeu et le savent","exemple":"Oui, très bien ! Et vous ? Tout roule ?","didascalie_replique":"","utilise_element_perso":false},{"type":"replique","role":"Directeur","directive":"Ouvre la porte à un échange sur le sujet réel — de façon suffisamment vague pour pouvoir se rétracter","exemple":"Oui oui. Bon. C''est une période… chargée, hein.","didascalie_replique":"en hochant la tête avec signification","utilise_element_perso":false},{"type":"replique","role":"Manager","directive":"Valide sans confirmer — la conversation avance sans rien dire","exemple":"Ah ça oui. On a tous… beaucoup de choses en tête en ce moment.","didascalie_replique":"","utilise_element_perso":false},{"type":"didascalie","texte":"Un silence. Les deux se regardent. Tout est dit. Rien n''est dit.","style":"intermediaire"},{"type":"replique","role":"Directeur","directive":"Clôt la conversation avec une formule creuse qui confirme que rien ne sera dit ici","exemple":"Bon. On en reparlera. Bonne continuation !","didascalie_replique":"","utilise_element_perso":false},{"type":"replique","role":"Manager","directive":"Idem — reprend sa route comme si la conversation n''avait pas eu lieu","exemple":"Vous de même !","didascalie_replique":"regard caméra","utilise_element_perso":false},{"type":"didascalie","texte":"Ils repartent chacun de leur côté. Exactement comme avant.","style":"cloture"}]'::jsonb,
  '[{"role_cible":"Directeur","question":"Vous saviez quelque chose dans ce couloir ?","reponse_a":"Je suis au courant de beaucoup de choses. C''est mon rôle de l''être. Et de savoir quand en parler.","reponse_b":"Les indicateurs que j''avais me donnaient une image assez claire de la situation, oui.","reponse_c":"Bien sûr. Et lui aussi. Et on sait tous les deux que l''autre sait. C''est ça la communication non-violente."},{"role_cible":"Manager","question":"Vous avez eu l''impression de vous comprendre dans ce couloir ?","reponse_a":"Parfaitement. Et c''est exactement ce qui m''a angoissé.","reponse_b":"Oui ! C''est ça qui est bien avec une bonne équipe — parfois les mots ne sont pas nécessaires.","reponse_c":"On s''est très bien compris. Ça ne change rien à rien, mais au moins on se comprend."}]'::jsonb,
  '{"cadrage":"Filmer le couloir en plan large d''abord pour voir l''approche des deux personnages. Puis alterner en plan américain sur chaque visage pendant l''échange.","rythme":"Lent et mesuré. Chaque réplique doit laisser un léger temps avant la suivante — comme si les deux choisissaient soigneusement leurs mots.","silences":"Le silence du regard mutuel au milieu est la scène. Minimum 4 secondes. Ne pas couper.","pieges":"Ne pas jouer ''le secret'' de façon dramatique — c''est une comédie de bureau, pas un thriller. L''humour vient du sous-texte absurde, pas de la tension.","astuce":"Tourner l''ITW juste après, dans le même couloir si possible. Demander aux acteurs de rester dans l''état de la scène."}'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM bac_scenes s WHERE s.titre = 'Le couloir de la vérité');

-- ─── SCÈNE 06 : La machine à café ────────────────────────────────────────────
INSERT INTO bac_scenes (
  titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
  groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
  champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
  script_json, itw_json, notes_real_json, actif
)
SELECT
  'La machine à café', '2', 'Sitcom', 'Existentiel', 2, 3, 2,
  ARRAY['assistants','managers'], 2, 3,
  'Une conversation anodine autour de la machine à café dégénère en débat sur le sens du travail, la place de chacun — et finit par effleurer la révélation sans jamais la nommer.',
  NULL, NULL, NULL,
  '[{"type":"didascalie","texte":"Coin café. Quelqu''un attend que son café coule. Un autre arrive.","style":"ouverture"},{"type":"replique","role":"Assistant","directive":"Ouvre la conversation avec quelque chose de parfaitement banal","exemple":"T''as vu le café ? Ils ont encore changé les dosettes.","didascalie_replique":"","utilise_element_perso":false},{"type":"replique","role":"Manager","directive":"Répond mais enchaîne immédiatement sur quelque chose de plus profond — la transition est abrupte et assumée","exemple":"Ouais. Enfin… ça change quoi au fond ? Le café c''est le café.","didascalie_replique":"air pensif","utilise_element_perso":false},{"type":"replique","role":"Assistant","directive":"Rebondit sur la profondeur inattendue — y va franchement","exemple":"T''es en train de me faire une métaphore sur le café là ?","didascalie_replique":"","utilise_element_perso":false},{"type":"replique","role":"Manager","directive":"Ne confirme ni n''infirme — continue sur sa lancée","exemple":"Je dis juste que des fois on change les choses et ça change pas grand chose. Et des fois on change rien et tout change quand même.","didascalie_replique":"","utilise_element_perso":false},{"type":"didascalie","texte":"Un silence. L''assistant regarde son café.","style":"intermediaire"},{"type":"replique","role":"Assistant","directive":"Essaie de ramener la conversation au concret — mais la réflexion sur la révélation transparaît dans la question","exemple":"C''est rapport à… ce qui se passe en ce moment ?","didascalie_replique":"prudemment","utilise_element_perso":false},{"type":"replique","role":"Manager","directive":"Esquive — mais de façon qui confirme implicitement que oui","exemple":"Ça parle de café.","didascalie_replique":"boit une gorgée, regard caméra","utilise_element_perso":false},{"type":"didascalie","texte":"Ils restent un moment en silence. Le café continue de couler.","style":"cloture"}]'::jsonb,
  '[{"role_cible":"Manager","question":"Vous parliez de café ou d''autre chose dans cette conversation ?","reponse_a":"Des deux. En même temps. La vie c''est ça.","reponse_b":"Du café ! C''est important le café. Ça structure la journée. C''est un moment de connexion.","reponse_c":"Je sais plus. Au bout d''un moment les frontières deviennent floues."},{"role_cible":"Assistant","question":"Vous avez compris ce qu''il voulait dire ?","reponse_a":"Oui. Et je pense qu''il savait que j''avais compris. C''est confortable quelque part.","reponse_b":"Je crois. Mais je suis pas sûr qu''il ait voulu dire quelque chose de précis. Parfois les gens parlent juste.","reponse_c":"J''ai compris qu''il évitait de répondre. Ce qui en soi est une réponse."}]'::jsonb,
  '{"cadrage":"Filmer serré sur les visages. La machine à café doit être visible mais pas le centre du cadre. Insert sur la tasse qui se remplit pendant les silences.","rythme":"Décontracté mais mesuré. Ce n''est pas une scène qui s''emballe — elle flotte.","silences":"Le silence après ''C''est rapport à ce qui se passe en ce moment ?'' est central. 3 secondes minimum.","pieges":"Ne pas jouer la mélancolie — rester dans la légèreté. Le comique vient du décalage entre le sujet (le café) et la profondeur du ton, pas d''une vraie tristesse.","astuce":"Laisser les acteurs improviser légèrement autour des répliques. Cette scène supporte bien les variations de formulation."}'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM bac_scenes s WHERE s.titre = 'La machine à café');

-- ─── SCÈNE 07 : Le nouveau ─────────────────────────────────────────────────────
INSERT INTO bac_scenes (
  titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
  groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
  champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
  script_json, itw_json, notes_real_json, actif
)
SELECT
  'Le nouveau', '2', 'Naïf', 'Décalé', 2, 3, 1,
  ARRAY['assistants','chefs-de-projet'], 2, 3,
  'Un nouveau (ou quelqu''un qui joue ce rôle) pose des questions innocentes sur l''organisation — et ses questions révèlent l''absurdité des process en place, et indirectement l''impact de la révélation sur l''équipe.',
  'Un process interne réel à expliquer',
  '"la validation des congés", "le process de commande", "la demande de badge visiteur"',
  3,
  '[{"type":"didascalie","texte":"Bureau. Quelqu''un explique le fonctionnement à un nouveau — avec toute la patience de quelqu''un qui l''a déjà expliqué vingt fois.","style":"ouverture"},{"type":"replique","role":"Chargé de projet","directive":"Introduit le nouveau avec un enthousiasme légèrement forcé","exemple":"Donc voilà, bienvenue ! On est une super équipe. Tu vas voir, c''est très fluide ici.","didascalie_replique":"","utilise_element_perso":false},{"type":"replique","role":"Assistant","directive":"Pose une question innocente sur quelque chose d''absolument basique qui devrait être simple","exemple":"Et pour… avoir accès au serveur, ça marche comment ?","didascalie_replique":"stylo levé, prêt à noter","utilise_element_perso":false},{"type":"replique","role":"Chargé de projet","directive":"Explique le process réel — qui est objectivement absurde — avec le ton de quelqu''un qui trouve ça parfaitement normal","exemple":"Alors pour [ÉLÉMENT PERSONNALISÉ], il faut d''abord remplir le formulaire F7, le faire valider par ton N+1, puis par le service concerné, et ensuite t''envoies le mail à l''adresse dédiée. Qui est la même que le support, mais c''est pas pareil.","didascalie_replique":"","utilise_element_perso":true},{"type":"replique","role":"Assistant","directive":"Pose une question de suivi qui révèle l''absurdité de la procédure","exemple":"Et si mon N+1 est absent ?","didascalie_replique":"","utilise_element_perso":false},{"type":"replique","role":"Chargé de projet","directive":"Répond avec une solution de contournement qui est encore plus compliquée que le process initial","exemple":"T''attends. Ou alors tu demandes au N+1 du N+1, mais faut que ce soit explicitement délégué, ce qui nécessite un autre formulaire.","didascalie_replique":"","utilise_element_perso":false},{"type":"replique","role":"Assistant","directive":"Note tout ça scrupuleusement — et pose une question finale qui révèle qu''il a tout compris de la vraie situation","exemple":"Et en ce moment… c''est le bon moment pour commencer ? J''ai entendu des choses dans les couloirs.","didascalie_replique":"lève les yeux du carnet","utilise_element_perso":false},{"type":"replique","role":"Chargé de projet","directive":"Marque une pause — et répond avec une formule qui dit tout sans rien dire","exemple":"C''est toujours le bon moment pour apprendre les process. Surtout maintenant.","didascalie_replique":"regard caméra","utilise_element_perso":false},{"type":"didascalie","texte":"Le nouveau repose son stylo. Peut-être qu''il a compris quelque chose.","style":"cloture"}]'::jsonb,
  '[{"role_cible":"Assistant","question":"Votre premier jour, première impression ?","reponse_a":"Très organisé. Beaucoup de process. J''aime bien les process. J''ai trois pages de notes.","reponse_b":"Super accueil ! Tout le monde est sympa. J''ai pas encore tout compris mais ça viendra.","reponse_c":"C''est intéressant. J''ai l''impression que tout le monde sait quelque chose que moi je sais pas encore."},{"role_cible":"Chargé de projet","question":"Vous aimez bien accueillir les nouveaux ?","reponse_a":"C''est important de bien transmettre. J''ai un document d''onboarding. Sur 14 pages.","reponse_b":"J''adore ! C''est frais comme regard. Des fois ils posent des questions qu''on s''est arrêté de se poser.","reponse_c":"Je fais ce qu''il faut. Et là en particulier c''est un bon timing pour savoir comment les choses marchent."}]'::jsonb,
  '{"cadrage":"Plan sur le carnet de notes du nouveau pour les inserts — on lit ce qu''il écrit. Plan sur le visage du chargé de projet pendant les explications — l''expression de quelqu''un qui récite quelque chose d''absurde avec conviction.","rythme":"Régulier, comme une vraie formation. S''accélère légèrement à la fin avec la question sur ''les choses dans les couloirs''.","silences":"La pause avant ''C''est toujours le bon moment'' doit être marquée — 2 secondes.","pieges":"Le nouveau doit avoir l''air sincèrement intéressé, pas ironique. C''est quand la naïveté est jouée sans second degré que la scène est drôle.","astuce":"Préparer un vrai faux formulaire F7 à montrer à la caméra. Un détail visuel suffit à ancrer le réalisme."}'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM bac_scenes s WHERE s.titre = 'Le nouveau');

-- ─── SCÈNE 08 : Le Powerpoint de la mort ─────────────────────────────────────
INSERT INTO bac_scenes (
  titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
  groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
  champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
  script_json, itw_json, notes_real_json, actif
)
SELECT
  'Le Powerpoint de la mort', '2', 'Satire corporate', 'Absurde', 2, 3, 2,
  ARRAY['managers','chefs-de-projet'], 2, 4,
  'Quelqu''un présente un Powerpoint de 47 slides pour un sujet simple. La slide 12 contient sans le vouloir une référence à la révélation — personne ne sait si c''est intentionnel.',
  'Le sujet de la présentation',
  '"le bilan de la semaine", "la nouvelle politique de déplacement", "le plan de formation Q3"',
  1,
  '[{"type":"didascalie","texte":"Salle de réunion. Quelqu''un est debout devant un écran. La slide affichée indique ''Slide 4 / 47''.","style":"ouverture"},{"type":"replique","role":"Chef de projet","directive":"Lance la présentation avec une énergie totalement disproportionnée par rapport au sujet — comme si 47 slides pour ça était parfaitement raisonnable","exemple":"Donc voilà, j''ai préparé une présentation sur [ÉLÉMENT PERSONNALISÉ]. 47 slides. J''aurais pu en faire moins mais je voulais être complet.","didascalie_replique":"","utilise_element_perso":true},{"type":"replique","role":"Manager","directive":"Réagit en essayant de rester professionnel malgré l''absurdité évidente","exemple":"47… c''est… très complet en effet. On a combien de temps ?","didascalie_replique":"","utilise_element_perso":false},{"type":"replique","role":"Chef de projet","directive":"Répond avec le timing réel — qui est impossible — avec le même calme","exemple":"J''ai bloqué deux heures. Mais si on va vite on peut peut-être s''en sortir en 90 minutes.","didascalie_replique":"fait avancer les slides","utilise_element_perso":false},{"type":"didascalie","texte":"La slide 12 apparaît à l''écran. Elle contient une référence visible à la révélation — personne n''en parle.","style":"intermediaire"},{"type":"replique","role":"Manager","directive":"Remarque la slide 12 mais pose la question de façon à pouvoir l''ignorer si nécessaire","exemple":"La slide 12, c''est… informatif. C''est là depuis longtemps dans ta présentation ?","didascalie_replique":"","utilise_element_perso":false},{"type":"replique","role":"Chef de projet","directive":"Répond de façon à clore le sujet immédiatement et reprendre le fil","exemple":"Contexte général. On en reparlera. Slide 13.","didascalie_replique":"clique avant la fin de sa phrase","utilise_element_perso":false},{"type":"didascalie","texte":"La présentation continue. Il reste 34 slides.","style":"cloture"}]'::jsonb,
  '[{"role_cible":"Chef de projet","question":"47 slides pour ça. Vous assumez ?","reponse_a":"Complètement. Une slide = une idée. 47 idées, 47 slides. C''est la règle.","reponse_b":"J''aurais pu en faire 50. J''ai coupé des trucs.","reponse_c":"Le fond est là. La forme c''est secondaire. Enfin. La forme c''est important aussi. D''où les 47 slides."},{"role_cible":"Manager","question":"La slide 12. Vous avez voulu en savoir plus ?","reponse_a":"J''ai noté. Je vérifierai. Ça peut pas rester sans réponse.","reponse_b":"Je lui fais confiance. Si c''était important, il en aurait parlé. Il y a peut-être une slide dédiée plus loin.","reponse_c":"Non. Parfois vaut mieux pas savoir. Y''a encore 34 slides."}]'::jsonb,
  '{"cadrage":"Plan large sur la salle pour montrer l''écran et les participants. Insert sur les visages pendant la slide 12. Filmer l''écran avec la slide 12 visible clairement.","rythme":"Régulier et légèrement soporifique — c''est voulu. Le rythme doit reproduire l''effet d''une vraie longue présentation.","silences":"Le silence après l''apparition de la slide 12 avant que quelqu''un prenne la parole. 3 secondes.","pieges":"Le présentateur ne doit pas avoir l''air de se rendre compte que sa présentation est absurde. C''est exactement ce qui la rend drôle.","astuce":"Préparer un vrai Powerpoint de 47 slides (même vide) à projeter. La slide 12 doit avoir un titre lié à la révélation — une phrase vague suffit."}'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM bac_scenes s WHERE s.titre = 'Le Powerpoint de la mort');

-- ─── SCÈNE 09 : La deadline ────────────────────────────────────────────────────
INSERT INTO bac_scenes (
  titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
  groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
  champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
  script_json, itw_json, notes_real_json, actif
)
SELECT
  'La deadline', '3', 'Thriller', 'Comédie', 2, 3, 3,
  ARRAY['chefs-de-projet','assistants'], 2, 4,
  '2 heures avant une échéance critique — qui coïncide avec l''annonce de la révélation — chacun gère la pression différemment. Certains travaillent vraiment, d''autres se paralysent.',
  'Le livrable à rendre',
  '"le rapport annuel", "la présentation client", "le planning consolidé"',
  1,
  '[{"type":"didascalie","texte":"Bureau. 14h00 affiché quelque part. Une ambiance de tension contenue. Des gens qui tapent vite.","style":"ouverture"},{"type":"replique","role":"Chargé de projet","directive":"Annonce l''état de la situation avec un calme qui cache à peine la panique","exemple":"Donc on a deux heures pour finir [ÉLÉMENT PERSONNALISÉ]. J''ai fait le point : on est à 60%. C''est jouable.","didascalie_replique":"voix légèrement trop contrôlée","utilise_element_perso":true},{"type":"replique","role":"Assistant","directive":"Répond en révélant que son estimation de 60% est optimiste — avec des détails précis","exemple":"60% si on compte pas la partie validation. Qui représente à peu près 40% du travail.","didascalie_replique":"sans lever les yeux de son écran","utilise_element_perso":false},{"type":"replique","role":"Chargé de projet","directive":"Absorbe l''information et recalcule à voix haute de façon chaotique","exemple":"OK donc en vrai on est à… 36%. En deux heures. C''est… on peut le faire si tout le monde reste focus.","didascalie_replique":"","utilise_element_perso":false},{"type":"didascalie","texte":"Quelqu''un ouvre un onglet de navigateur non professionnel. Le referme immédiatement.","style":"intermediaire"},{"type":"replique","role":"Assistant","directive":"Soulève le problème réel — qui dépasse la deadline elle-même","exemple":"Et de toute façon… vu ce qui va se passer demain matin, est-ce que ce rendu a encore du sens ?","didascalie_replique":"","utilise_element_perso":false},{"type":"replique","role":"Chargé de projet","directive":"Refuse d''ouvrir ce débat — la deadline est la deadline","exemple":"On livre. On réfléchit après. C''est comme ça que ça marche.","didascalie_replique":"","utilise_element_perso":false},{"type":"replique","role":"Assistant","directive":"Accepte — mais avec une réserve qui reste en suspension","exemple":"OK. On livre. Et demain ?","didascalie_replique":"regard caméra","utilise_element_perso":false},{"type":"didascalie","texte":"Chargé de projet ne répond pas. Les claviers reprennent.","style":"cloture"}]'::jsonb,
  '[{"role_cible":"Chargé de projet","question":"36% en deux heures. Vous y croyiez vraiment ?","reponse_a":"J''y croyais parce qu''on n''avait pas le choix d''y croire. C''est une compétence en soi.","reponse_b":"À 100%. On l''a fait. Enfin… à 80%. Ce qui est déjà bien.","reponse_c":"Non. Mais dire non ça sert à rien à deux heures de la deadline."},{"role_cible":"Assistant","question":"''Et demain ?''. Vous pensiez à quoi exactement ?","reponse_a":"À tout ce qui va changer. Et à tout ce qu''il va falloir refaire.","reponse_b":"Je sais pas. C''est sorti. C''est une vraie question.","reponse_c":"À rien de précis. C''était juste la question évidente. Que personne voulait poser."}]'::jsonb,
  '{"cadrage":"Filmer avec une légère instabilité — main légèrement moins stable que d''habitude pour créer la tension. Inserts sur les écrans, les montres, les mains qui tapent.","rythme":"Rapide au début, puis ralenti sur la question ''Et demain ?'' et le silence final.","silences":"Le silence final après la question sans réponse est le plus important de la scène. 4 secondes minimum. Les claviers qui reprennent brisent le silence — pas une voix.","pieges":"Éviter le jeu trop dramatique — rester dans la comédie malgré la tension. Le rire vient de la reconnaissance du situation, pas de la dramaturgie.","astuce":"Afficher une vraie horloge en fond de plan — numérique de préférence, qui défile. Ça ancre la tension sans qu''on ait besoin de la jouer."}'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM bac_scenes s WHERE s.titre = 'La deadline');


-- ════════════════════════════════════════════════════════════
-- RÉSUMÉ
-- ════════════════════════════════════════════════════════════
-- Tables injectées :
--   bac_roles         : 8 rôles (managers ×2, assistants ×2, chefs-de-projet ×2, directeurs ×2)
--   bac_variants      : 24 variants (3 par rôle)
--   bac_themes        : 6 thèmes
--   bac_revelations   : 5 révélations (avec colonnes delai_suggere + note_interne ajoutées)
--   bac_scenes        : 9 scènes complètes (scènes 01–09)
--
-- ⚠️  NON INJECTÉ :
--   bac_denouements   : contenu non disponible dans le document fourni
--                       → À créer manuellement via l'interface admin /bac/admin/dashboard/revelations
--                         ou en fournissant les données dans une prochaine session
--   Scène 10 (Le team building raté) : données tronquées dans la source
-- ════════════════════════════════════════════════════════════

COMMIT;
