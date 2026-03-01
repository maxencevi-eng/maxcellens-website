-- ════════════════════════════════════════════════════════════════════
-- BUREAU À LA CARTE — INJECTION COMPLÈTE
-- À exécuter dans Supabase SQL Editor (en une seule fois)
-- Ordre : 1) Migration  2) Thèmes  3) Révélations  4) Rôles+Variants+Scènes
-- ════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────
-- 1. MIGRATION — Colonnes intro/finale sur bac_sessions
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE bac_sessions
  ADD COLUMN IF NOT EXISTS scene_intro_id UUID REFERENCES bac_scenes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scene_finale_id UUID REFERENCES bac_scenes(id) ON DELETE SET NULL;


-- ────────────────────────────────────────────────────────────────────
-- 2. THÈMES (insert si absent)
-- ────────────────────────────────────────────────────────────────────

INSERT INTO bac_themes (titre, description, actif)
SELECT t.titre, t.description, t.actif FROM (VALUES
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
) AS t(titre, description, actif)
WHERE NOT EXISTS (SELECT 1 FROM bac_themes bt WHERE bt.titre = t.titre);


-- ────────────────────────────────────────────────────────────────────
-- 3. RÉVÉLATIONS (insert si absent)
-- ────────────────────────────────────────────────────────────────────

INSERT INTO bac_revelations (titre, description, delai_suggere, note_interne, actif)
SELECT r.titre, r.description, r.delai_suggere, r.note_interne, r.actif FROM (VALUES
  ('L''audit surprise',
   'L''équipe apprend qu''un audit externe aura lieu dans 48 heures. Personne n''est prêt.',
   '48 heures',
   'Annoncer lors de l''intro comme une "info reçue ce matin". Laisser un silence après l''annonce. Ne pas répondre aux questions — "vous en saurez plus en temps voulu". Déclenche immédiatement l''instinct de survie de chaque groupe.',
   true),
  ('La visite du siège',
   'L''équipe apprend qu''une délégation du siège visite les locaux dans 2 jours. Personne n''est prêt.',
   '2 jours',
   'Présenter comme "une bonne nouvelle" avec un sourire légèrement forcé. La tension vient du fait que tout le monde comprend immédiatement les implications sans que ce soit dit.',
   true),
  ('La fusion annoncée',
   'L''équipe apprend qu''un rapprochement avec une autre structure sera officiellement annoncé dans une semaine. Personne n''est prêt.',
   '1 semaine',
   'Ton volontairement flou — "rapprochement", pas "fusion". L''ambiguïté est le moteur. Ne pas préciser qui fusionne avec qui. Chaque groupe projette ses propres craintes.',
   true),
  ('Le déménagement imminent',
   'L''équipe apprend que les bureaux seront déménagés dans un nouveau site dans 3 semaines. Personne n''est prêt.',
   '3 semaines',
   'Révélation concrète et immédiatement personnelle — tout le monde a des affaires, des habitudes, des voisins de bureau. Déclenche des réactions très différentes selon les profils.',
   true),
  ('Le nouveau logiciel',
   'L''équipe apprend que l''ensemble des outils métier seront migrés vers un nouveau système dans 10 jours. Personne n''est prêt.',
   '10 jours',
   'Révélation très universelle — tout le monde a vécu une migration chaotique. Laisser les groupes y projeter leur propre cauchemar. Idéal pour le thème Transformation digitale.',
   true)
) AS r(titre, description, delai_suggere, note_interne, actif)
WHERE NOT EXISTS (SELECT 1 FROM bac_revelations br WHERE br.titre = r.titre);


-- ────────────────────────────────────────────────────────────────────
-- 4. RÔLES, VARIANTS ET SCÈNES
-- ────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_manager       UUID;
  v_manager_adj   UUID;
  v_assistant     UUID;
  v_assistant_sr  UUID;
  v_chef_projet   UUID;
  v_charge_projet UUID;
  v_directeur     UUID;
  v_directeur_adj UUID;
BEGIN

  -- ── Rôles ──────────────────────────────────────────────────────────

  INSERT INTO bac_roles (groupe_slug, nom, description, couleur, actif)
  SELECT 'managers', 'Manager', 'Le responsable d''équipe. Jongle entre les directives du haut et la réalité du terrain.', '#E8A838', true
  WHERE NOT EXISTS (SELECT 1 FROM bac_roles WHERE groupe_slug = 'managers' AND nom = 'Manager');
  SELECT id INTO v_manager FROM bac_roles WHERE groupe_slug = 'managers' AND nom = 'Manager';

  INSERT INTO bac_roles (groupe_slug, nom, description, couleur, actif)
  SELECT 'managers', 'Manager adjoint', 'Fait le travail du manager sans le titre. Compense en permanence, sans jamais le dire.', '#D4921E', true
  WHERE NOT EXISTS (SELECT 1 FROM bac_roles WHERE groupe_slug = 'managers' AND nom = 'Manager adjoint');
  SELECT id INTO v_manager_adj FROM bac_roles WHERE groupe_slug = 'managers' AND nom = 'Manager adjoint';

  INSERT INTO bac_roles (groupe_slug, nom, description, couleur, actif)
  SELECT 'assistants', 'Assistant', 'Sait exactement comment tout fonctionne. N''a pas le droit de le dire.', '#4ECDC4', true
  WHERE NOT EXISTS (SELECT 1 FROM bac_roles WHERE groupe_slug = 'assistants' AND nom = 'Assistant');
  SELECT id INTO v_assistant FROM bac_roles WHERE groupe_slug = 'assistants' AND nom = 'Assistant';

  INSERT INTO bac_roles (groupe_slug, nom, description, couleur, actif)
  SELECT 'assistants', 'Assistant senior', 'Le titre "senior" signifie qu''il est là depuis longtemps. Ce n''est pas forcément un avantage.', '#3AB5AD', true
  WHERE NOT EXISTS (SELECT 1 FROM bac_roles WHERE groupe_slug = 'assistants' AND nom = 'Assistant senior');
  SELECT id INTO v_assistant_sr FROM bac_roles WHERE groupe_slug = 'assistants' AND nom = 'Assistant senior';

  INSERT INTO bac_roles (groupe_slug, nom, description, couleur, actif)
  SELECT 'chefs-de-projet', 'Chef de projet', 'Responsable de tout ce qui a un début, une fin et un budget. Souvent deux sur trois.', '#6C63FF', true
  WHERE NOT EXISTS (SELECT 1 FROM bac_roles WHERE groupe_slug = 'chefs-de-projet' AND nom = 'Chef de projet');
  SELECT id INTO v_chef_projet FROM bac_roles WHERE groupe_slug = 'chefs-de-projet' AND nom = 'Chef de projet';

  INSERT INTO bac_roles (groupe_slug, nom, description, couleur, actif)
  SELECT 'chefs-de-projet', 'Chargé de projet', 'Exécute. Beaucoup. Questionne peu. Commence à questionner.', '#5952E8', true
  WHERE NOT EXISTS (SELECT 1 FROM bac_roles WHERE groupe_slug = 'chefs-de-projet' AND nom = 'Chargé de projet');
  SELECT id INTO v_charge_projet FROM bac_roles WHERE groupe_slug = 'chefs-de-projet' AND nom = 'Chargé de projet';

  INSERT INTO bac_roles (groupe_slug, nom, description, couleur, actif)
  SELECT 'directeurs', 'Directeur', 'Décide des grandes orientations. Pas toujours au courant des petites réalités.', '#E84855', true
  WHERE NOT EXISTS (SELECT 1 FROM bac_roles WHERE groupe_slug = 'directeurs' AND nom = 'Directeur');
  SELECT id INTO v_directeur FROM bac_roles WHERE groupe_slug = 'directeurs' AND nom = 'Directeur';

  INSERT INTO bac_roles (groupe_slug, nom, description, couleur, actif)
  SELECT 'directeurs', 'Directeur adjoint', 'Prépare, applique et explique les décisions du directeur. Dans cet ordre, idéalement.', '#C73340', true
  WHERE NOT EXISTS (SELECT 1 FROM bac_roles WHERE groupe_slug = 'directeurs' AND nom = 'Directeur adjoint');
  SELECT id INTO v_directeur_adj FROM bac_roles WHERE groupe_slug = 'directeurs' AND nom = 'Directeur adjoint';


  -- ── Variants ───────────────────────────────────────────────────────

  -- Manager
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_manager, 'A', 'L''anxieux', 'Anticipe tout ce qui peut mal tourner, le dit à voix haute, souvent raison.', '😰'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_manager AND lettre = 'A');
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_manager, 'B', 'Le positif', 'Voit le bon côté de tout. Même les catastrophes. Surtout les catastrophes.', '😄'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_manager AND lettre = 'B');
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_manager, 'C', 'Le fataliste', 'S''en fout ouvertement. Pas par malveillance — juste une sagesse résignée.', '🤷'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_manager AND lettre = 'C');

  -- Manager adjoint
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_manager_adj, 'A', 'Le procédurier', 'A un process pour tout. Même pour improviser.', '📋'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_manager_adj AND lettre = 'A');
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_manager_adj, 'B', 'Le désabusé', 'A tout vu, tout entendu. Se souvient de tout. Pardonne rien.', '🙄'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_manager_adj AND lettre = 'B');
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_manager_adj, 'C', 'Le sauveur', 'Résout les problèmes des autres avant les siens. Sourit toujours.', '🤗'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_manager_adj AND lettre = 'C');

  -- Assistant
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_assistant, 'A', 'L''ambitieux', 'Fait le travail de trois personnes en espérant que quelqu''un le remarque.', '🌟'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_assistant AND lettre = 'A');
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_assistant, 'B', 'Le discret', 'Présent depuis toujours. Personne ne sait ce qu''il fait. Tout s''effondrerait sans lui.', '😶'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_assistant AND lettre = 'B');
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_assistant, 'C', 'Le revendicatif', 'Connaît ses droits. Les cite volontiers. N''a pas forcément tort.', '😤'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_assistant AND lettre = 'C');

  -- Assistant senior
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_assistant_sr, 'A', 'L''ancien', 'Se souvient de comment c''était avant. En parle beaucoup. Souvent nostalgique.', '🧓'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_assistant_sr AND lettre = 'A');
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_assistant_sr, 'B', 'Le formateur', 'Explique tout à tout le monde même quand personne n''a demandé.', '🧑‍🏫'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_assistant_sr AND lettre = 'B');
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_assistant_sr, 'C', 'Le détaché', 'A atteint un niveau de sérénité que les autres confondent avec de la paresse.', '😎'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_assistant_sr AND lettre = 'C');

  -- Chef de projet
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_chef_projet, 'A', 'Le méthodique', 'Gantt, jalons, livrables. Dort avec son planning. Littéralement.', '📊'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_chef_projet AND lettre = 'A');
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_chef_projet, 'B', 'L''urgentiste', 'Tout est urgent. Tout. L''urgence est son état naturel, presque confortable.', '🔥'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_chef_projet AND lettre = 'B');
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_chef_projet, 'C', 'Le diplomate', 'Jamais en désaccord ouvert. Reformule jusqu''à ce que tout le monde croit avoir eu raison.', '🎭'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_chef_projet AND lettre = 'C');

  -- Chargé de projet
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_charge_projet, 'A', 'Le rapide', 'Livre avant la deadline. Parfois avant d''avoir bien compris la demande.', '⚡'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_charge_projet AND lettre = 'A');
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_charge_projet, 'B', 'Le questionneur', 'Pose des questions pertinentes au mauvais moment. Souvent juste après le lancement.', '🤔'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_charge_projet AND lettre = 'B');
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_charge_projet, 'C', 'Le documentariste', 'Note tout. Envoie des comptes-rendus de 4 pages pour des réunions de 10 minutes.', '📝'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_charge_projet AND lettre = 'C');

  -- Directeur
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_directeur, 'A', 'Le visionnaire', 'Parle de disruption, de pivot, d''impact. Rarement de comment exactement.', '👔'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_directeur AND lettre = 'A');
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_directeur, 'B', 'Le gestionnaire', 'Tableaux de bord, KPIs, reporting. Ce qui n''est pas mesuré n''existe pas.', '📰'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_directeur AND lettre = 'B');
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_directeur, 'C', 'Le bienveillant', 'Vraiment à l''écoute. Ce qui rend ses décisions incompréhensibles encore plus douloureuses.', '🤝'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_directeur AND lettre = 'C');

  -- Directeur adjoint
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_directeur_adj, 'A', 'Le miroir', 'Approuve tout ce que dit le directeur. Avec conviction croissante.', '🪞'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_directeur_adj AND lettre = 'A');
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_directeur_adj, 'B', 'Le médiateur', 'Traduit les décisions d''en haut en quelque chose de digeste pour le terrain. Fait de son mieux.', '⚖️'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_directeur_adj AND lettre = 'B');
  INSERT INTO bac_variants (role_id, lettre, nom, description, emoji)
  SELECT v_directeur_adj, 'C', 'L''ambitieux discret', 'Souriant. Attentif. Se souvient de tout. Attend son heure.', '🚀'
  WHERE NOT EXISTS (SELECT 1 FROM bac_variants WHERE role_id = v_directeur_adj AND lettre = 'C');


  -- ── Scènes ─────────────────────────────────────────────────────────
  -- Note : role_id = 'coordinateur' (chaîne) pour la scène intro — rôle hors casting.
  -- Les autres scenes utilisent les UUIDs récupérés ci-dessus.

  -- SCÈNE 01 — L'annonce (intro)
  IF NOT EXISTS (SELECT 1 FROM bac_scenes WHERE titre = 'L''annonce') THEN
    INSERT INTO bac_scenes (titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
      groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
      champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
      script_json, itw_json, notes_real_json, actif)
    VALUES (
      'L''annonce', 'intro', 'Neutre / Solennel', 'Légèrement inquiet', 1, 2, 1,
      ARRAY['managers','assistants','chefs-de-projet','directeurs'], 1, 2,
      'C''est ici que la révélation est annoncée pour la première fois. Elle plante le contexte de tout l''épisode — le ton doit être sérieux juste assez pour que la suite soit drôle.',
      NULL, NULL, NULL,
      jsonb_build_array(
        jsonb_build_object('type','didascalie','texte','Un couloir ou une salle quelconque. Quelqu''un s''apprête à faire une annonce. Ambiance légèrement solennelle.','style','ouverture'),
        jsonb_build_object('type','replique','role_id','coordinateur','directive','Annonce la révélation avec le ton de quelqu''un qui essaie d''avoir l''air calme mais ne l''est pas tout à fait. Lire [LA RÉVÉLATION] avec un naturel forcé.','exemple','Donc voilà. On vient d''apprendre que [LA RÉVÉLATION] aura lieu [LE DÉLAI]. Je vous laisse digérer ça.','didascalie','marque une pause après l''annonce','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','Silence. Puis tout le monde repart vaquer à ses occupations comme si rien ne s''était passé. Ce qui est exactement le problème.','style','cloture')
      ),
      jsonb_build_array(),
      jsonb_build_object(
        'cadrage','Plan serré sur le visage pendant l''annonce. Pan vers le groupe pour capter les premières réactions — furtives, pas jouées.',
        'rythme','Lent. Le silence après l''annonce est le moment le plus important de cette scène.',
        'silences','Minimum 4 secondes après [LA RÉVÉLATION]. Ne pas couper.',
        'pieges','Ne pas rendre la scène comique trop tôt — l''humour vient du contraste avec ce qui suit.',
        'astuce','Si possible tourner cette scène en premier, avant que les acteurs soient échauffés.'
      ),
      true
    );
  END IF;

  -- SCÈNE 02 — La réunion qui n'en finit pas (acte 1)
  IF NOT EXISTS (SELECT 1 FROM bac_scenes WHERE titre = 'La réunion qui n''en finit pas') THEN
    INSERT INTO bac_scenes (titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
      groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
      champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
      script_json, itw_json, notes_real_json, actif)
    VALUES (
      'La réunion qui n''en finit pas', '1', 'Absurde', 'Bureaucratique', 2, 3, 1,
      ARRAY['managers','chefs-de-projet'], 2, 4,
      'La révélation plane en arrière-plan — un participant essaie de l''annoncer mais se fait couper à chaque tentative.',
      'Un outil ou processus interne à citer', '"Monday, Teams, le CRM, le process de validation"', 4,
      jsonb_build_array(
        jsonb_build_object('type','didascalie','texte','La réunion semble durer depuis un moment. Tout le monde a l''air légèrement épuisé. Un tableau blanc couvert de schémas incompréhensibles est visible en arrière-plan.','style','ouverture'),
        jsonb_build_object('type','replique','role_id',v_chef_projet::text,'directive','Lance la réunion avec une énergie légèrement forcée','exemple','Bon, on reprend. Donc on en était à… le point 3 sur 14. Ce qui est plutôt bien pour une réunion d''une heure.','didascalie','en regardant son écran sans vraiment le voir','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_manager::text,'directive','Interrompt pour soulever un problème de procédure hors sujet','exemple','Avant d''aller plus loin — est-ce que ce point a bien été validé par le bon circuit ? Parce que la dernière fois on avait eu un retour là-dessus.','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','Léger silence gêné. Quelqu''un note quelque chose sans qu''on sache quoi.','style','intermediaire'),
        jsonb_build_object('type','replique','role_id',v_chef_projet::text,'directive','Tente de reprendre le contrôle en proposant de mettre le point en parking lot','exemple','On peut peut-être mettre ça en parking lot et y revenir en fin de réunion ? Ou planifier une réunion dédiée ?','didascalie','avec l''espoir visible que personne ne dira oui','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_manager::text,'directive','Saisit l''occasion pour mentionner l''outil ou processus personnalisé','exemple','D''ailleurs tant qu''on est là — est-ce que tout le monde a bien migré vers [ÉLÉMENT PERSONNALISÉ] ? Parce que j''ai encore des gens qui m''envoient des mails.','didascalie','','utilise_champ_perso',true),
        jsonb_build_object('type','didascalie','texte','Tout le monde réagit différemment — hochements de tête vagues, regard vers le plafond, quelqu''un sort discrètement son téléphone.','style','intermediaire'),
        jsonb_build_object('type','replique','role_id',v_chef_projet::text,'directive','Essaie d''annoncer la révélation — c''est le moment prévu — mais se fait couper avant d''avoir pu finir','exemple','OK, et justement — j''avais quelque chose d''important à annoncer, c''est un peu lié à tout ça en fait…','didascalie','commence à se lever légèrement','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_manager::text,'directive','Coupe involontairement en relançant un sous-débat sur le point 3','exemple','Ah oui avant — sur le point 3, j''avais une question de fond. Ça prendra deux minutes.','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','Le chef de projet se rassoit. La révélation attendra.','style','cloture')
      ),
      jsonb_build_array(
        jsonb_build_object('role_id',v_chef_projet::text,'question','Vous aviez quelque chose d''important à annoncer en réunion. Ça s''est passé comment ?','reponses_par_variant',jsonb_build_object('A','C''était prévu au point 7. On n''y est jamais arrivé. J''ai mis une note dans le compte-rendu.','B','C''était urgent ! Ça l''est toujours. Là maintenant ça l''est encore.','C','Je pense que tout le monde a bien compris qu''il y avait quelque chose d''important. Parfois ne pas dire les choses c''est aussi une façon de les dire.')),
        jsonb_build_object('role_id',v_manager::text,'question','Cette réunion a duré combien de temps selon vous ?','reponses_par_variant',jsonb_build_object('A','Trop longtemps. Pas assez pour couvrir tout ce qui n''a pas été dit.','B','Honnêtement ? C''était plutôt efficace. On a avancé sur beaucoup de points. Enfin, on en a parlé.','C','Je sais plus. À un moment j''ai arrêté de regarder l''heure. Ça aide.'))
      ),
      jsonb_build_object(
        'cadrage','Plan large d''ouverture pour montrer tout le monde autour de la table. Ensuite plans rapprochés sur les visages pendant les silences.',
        'rythme','Commencer lentement. Les interruptions s''accélèrent légèrement vers la fin, puis retombent sur le silence final.',
        'silences','Le silence après "ça prendra deux minutes" est le plus important. Minimum 3 secondes.',
        'pieges','Ne pas surjouer l''épuisement — l''absurde doit sembler complètement normal pour les personnages.',
        'astuce','Tourner d''abord en plan large, puis recommencer pour les inserts de visages.'
      ),
      true
    );
  END IF;

  -- SCÈNE 03 — Le mail de toute l'entreprise (acte 1)
  IF NOT EXISTS (SELECT 1 FROM bac_scenes WHERE titre = 'Le mail de toute l''entreprise') THEN
    INSERT INTO bac_scenes (titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
      groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
      champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
      script_json, itw_json, notes_real_json, actif)
    VALUES (
      'Le mail de toute l''entreprise', '1', 'Chaos', 'Comique', 2, 3, 2,
      ARRAY['assistants','chefs-de-projet'], 2, 4,
      'Quelqu''un a envoyé un mail à toute l''entreprise par erreur. Le mail mentionnait la révélation. La scène est la réaction en chaîne.',
      'L''objet du mail envoyé par erreur', '"Réunion confidentielle vendredi", "Budget prévisionnel v3 FINAL", "Ne pas transférer"', 2,
      jsonb_build_array(
        jsonb_build_object('type','didascalie','texte','Bureau open space. Plusieurs personnes travaillent. Un téléphone vibre. Puis un autre. Puis tous en même temps.','style','ouverture'),
        jsonb_build_object('type','replique','role_id',v_assistant::text,'directive','Reçoit le mail, le lit, réalise l''ampleur de l''erreur','exemple','Attends… il a envoyé ça à TOUTE l''entreprise ? Avec comme objet "[ÉLÉMENT PERSONNALISÉ]" ?','didascalie','en regardant son écran, voix qui monte légèrement','utilise_champ_perso',true),
        jsonb_build_object('type','replique','role_id',v_charge_projet::text,'directive','Confirme que oui, lui aussi l''a reçu, et ajoute une information qui aggrave la situation','exemple','Ouais. Et apparemment il a répondu à tous pour s''excuser. Ce qui fait que maintenant tout le monde a aussi l''excuse.','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','Silence de deux secondes pendant que tout le monde absorbe l''information.','style','intermediaire'),
        jsonb_build_object('type','replique','role_id',v_assistant::text,'directive','Annonce qu''il va répondre à tous pour clarifier, sans réaliser que c''est exactement ce qu''il ne faut pas faire','exemple','Bon, je réponds à tous pour dire que c''était une erreur et que personne ne doit en parler.','didascalie','les doigts déjà sur le clavier','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_charge_projet::text,'directive','Tente de l''arrêter mais trop tard — et dans la panique envoie lui-même quelque chose','exemple','Non attends ! Surtout pas répondre à— merde. Je viens d''envoyer un "merci pour l''info" à tout le monde.','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','Les téléphones se remettent à vibrer. Tous en même temps. De nouveau.','style','cloture')
      ),
      jsonb_build_array(
        jsonb_build_object('role_id',v_assistant::text,'question','Quand vous avez reçu ce mail, quelle a été votre première réaction ?','reponses_par_variant',jsonb_build_object('A','Honnêtement ? Voir si je pouvais en tirer quelque chose. C''est pas mal comme info.','B','J''ai fermé l''onglet. C''est pas mes affaires. Je l''ai rouvert deux minutes après.','C','J''ai immédiatement vérifié si mon nom était dans le fil. Parce que si mon nom est dans le fil, ça me concerne.')),
        jsonb_build_object('role_id',v_charge_projet::text,'question','Vous avez répondu à tous par accident. Vous assumez ?','reponses_par_variant',jsonb_build_object('A','C''était une erreur de parcours. J''ai documenté le process pour éviter que ça se reproduise.','B','C''est fait, on peut pas revenir en arrière. Autant en faire quelque chose d''utile maintenant.','C','Mon message était factuel. "Merci pour l''info". C''est une information objective. Je le referais.'))
      ),
      jsonb_build_object(
        'cadrage','Filmer les écrans d''ordinateur en insert pour que le public voie les notifications arriver. Plan d''ensemble pour capter les réactions simultanées.',
        'rythme','Démarrer calme, accélérer progressivement.',
        'silences','Le silence après "et que personne ne doit en parler" avant le clic sur Envoyer. 2 secondes suffisent.',
        'pieges','Éviter que les acteurs se regardent — ils doivent regarder leurs écrans.',
        'astuce','Prévoir un vrai son de notification pour les téléphones sur plateau.'
      ),
      true
    );
  END IF;

  -- SCÈNE 04 — La formation obligatoire (acte 1)
  IF NOT EXISTS (SELECT 1 FROM bac_scenes WHERE titre = 'La formation obligatoire') THEN
    INSERT INTO bac_scenes (titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
      groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
      champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
      script_json, itw_json, notes_real_json, actif)
    VALUES (
      'La formation obligatoire', '1', 'Résigné', 'Comique', 2, 3, 1,
      ARRAY['assistants','managers'], 2, 3,
      'Pendant la formation en ligne obligatoire, quelqu''un reçoit une notification liée à la révélation. Personne ne regarde vraiment la formation, mais tout le monde fait semblant.',
      'Le nom de la formation obligatoire', '"Formation RGPD", "Module sécurité incendie", "e-learning intégration"', 1,
      jsonb_build_array(
        jsonb_build_object('type','didascalie','texte','Une salle de formation ou des bureaux. Plusieurs personnes sont devant leur écran, casque sur les oreilles. La formation tourne en arrière-plan.','style','ouverture'),
        jsonb_build_object('type','replique','role_id',v_manager::text,'directive','Décrit ce qu''il est censé faire avec le ton de quelqu''un qui fait autre chose en même temps','exemple','Donc on a tous la [ÉLÉMENT PERSONNALISÉ] à finir avant vendredi. C''est 45 minutes, ça se met en fond.','didascalie','en répondant à des mails pendant qu''il parle','utilise_champ_perso',true),
        jsonb_build_object('type','replique','role_id',v_assistant::text,'directive','Demande innocemment si on peut vraiment faire autre chose en même temps','exemple','On est censés vraiment regarder ou juste finir les modules ?','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_manager::text,'directive','Répond de façon à ne pas répondre','exemple','Il y a un quiz à la fin. Sur les grandes lignes. C''est faisable.','didascalie','sans lever les yeux','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','Un téléphone vibre. L''assistant le regarde furtivement.','style','intermediaire'),
        jsonb_build_object('type','replique','role_id',v_assistant::text,'directive','Réagit à la notification liée à la révélation sans pouvoir en parler ouvertement','exemple','Hm. OK. C''est… intéressant comme info.','didascalie','repose le téléphone face écran vers le bas','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_manager::text,'directive','Perçoit que quelque chose s''est passé mais fait le choix de ne pas creuser','exemple','Quoi ?','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_assistant::text,'directive','Botte en touche avec une réponse qui ne dit rien mais intrigue','exemple','Non, rien. Je regardais la formation.','didascalie','regard caméra','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','La formation continue de tourner. Personne ne la regarde.','style','cloture')
      ),
      jsonb_build_array(
        jsonb_build_object('role_id',v_manager::text,'question','Vous suivez ce genre de formation comment ?','reponses_par_variant',jsonb_build_object('A','J''anticipe. Je bloque du temps, je fais rien d''autre. C''est 45 minutes, autant les passer bien.','B','En multitâche. Le temps c''est du temps. Et honnêtement la formation tourne toute seule très bien.','C','Je délègue le clic. Pas officiellement. Mais c''est comme ça que ça marche.')),
        jsonb_build_object('role_id',v_assistant::text,'question','Vous avez reçu une notification pendant la formation. C''était quoi ?','reponses_par_variant',jsonb_build_object('A','Je peux pas en parler. Mais c''est important. Et ça me concerne directement.','B','Rien de spécial. Enfin. Pas encore.','C','Un truc confidentiel. Ce qui veut dire que tout le monde le saura demain matin.'))
      ),
      jsonb_build_object(
        'cadrage','Insert sur l''écran de formation qui tourne. Plan sur les visages qui regardent ailleurs.',
        'rythme','Lent et plat — c''est voulu. L''humour est dans l''absence d''action.',
        'silences','Le silence après "Non, rien. Je regardais la formation." avec le regard caméra. Minimum 2 secondes.',
        'pieges','Ne pas rendre la notification trop mystérieuse.',
        'astuce','Préparer un vrai écran de formation e-learning en fond.'
      ),
      true
    );
  END IF;

  -- SCÈNE 05 — Le couloir de la vérité (acte 1)
  IF NOT EXISTS (SELECT 1 FROM bac_scenes WHERE titre = 'Le couloir de la vérité') THEN
    INSERT INTO bac_scenes (titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
      groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
      champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
      script_json, itw_json, notes_real_json, actif)
    VALUES (
      'Le couloir de la vérité', '1', 'Drama', 'The Office', 1, 2, 2,
      ARRAY['directeurs','managers'], 2, 2,
      'Deux personnes qui savent toutes les deux la révélation se croisent dans le couloir. Elles font semblant de ne pas savoir — et savent que l''autre sait qu''elles savent.',
      NULL, NULL, NULL,
      jsonb_build_array(
        jsonb_build_object('type','didascalie','texte','Un couloir. Deux personnes arrivent de directions opposées. Quelque chose passe sur leurs visages.','style','ouverture'),
        jsonb_build_object('type','replique','role_id',v_directeur::text,'directive','Salutation hyper normale. Trop normale.','exemple','Bonjour ! Bonne journée ?','didascalie','sourire légèrement trop large','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_manager::text,'directive','Répond avec la même énergie forcée','exemple','Oui, très bien ! Et vous ? Tout roule ?','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_directeur::text,'directive','Ouvre la porte à un échange sur le sujet réel — de façon suffisamment vague pour pouvoir se rétracter','exemple','Oui oui. Bon. C''est une période… chargée, hein.','didascalie','en hochant la tête avec signification','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_manager::text,'directive','Valide sans confirmer — la conversation avance sans rien dire','exemple','Ah ça oui. On a tous… beaucoup de choses en tête en ce moment.','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','Un silence. Les deux se regardent. Tout est dit. Rien n''est dit.','style','intermediaire'),
        jsonb_build_object('type','replique','role_id',v_directeur::text,'directive','Clôt la conversation avec une formule creuse','exemple','Bon. On en reparlera. Bonne continuation !','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_manager::text,'directive','Reprend sa route comme si la conversation n''avait pas eu lieu','exemple','Vous de même !','didascalie','regard caméra','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','Ils repartent chacun de leur côté. Exactement comme avant.','style','cloture')
      ),
      jsonb_build_array(
        jsonb_build_object('role_id',v_directeur::text,'question','Vous saviez quelque chose dans ce couloir ?','reponses_par_variant',jsonb_build_object('A','Je suis au courant de beaucoup de choses. C''est mon rôle de l''être. Et de savoir quand en parler.','B','Les indicateurs que j''avais me donnaient une image assez claire de la situation, oui.','C','Bien sûr. Et lui aussi. Et on sait tous les deux que l''autre sait. C''est ça la communication non-violente.')),
        jsonb_build_object('role_id',v_manager::text,'question','Vous avez eu l''impression de vous comprendre dans ce couloir ?','reponses_par_variant',jsonb_build_object('A','Parfaitement. Et c''est exactement ce qui m''a angoissé.','B','Oui ! C''est ça qui est bien avec une bonne équipe — parfois les mots ne sont pas nécessaires.','C','On s''est très bien compris. Ça ne change rien à rien, mais au moins on se comprend.'))
      ),
      jsonb_build_object(
        'cadrage','Filmer le couloir en plan large d''abord. Puis alterner en plan américain sur chaque visage.',
        'rythme','Lent et mesuré. Chaque réplique doit laisser un léger temps avant la suivante.',
        'silences','Le silence du regard mutuel au milieu est la scène. Minimum 4 secondes. Ne pas couper.',
        'pieges','Ne pas jouer "le secret" de façon dramatique — c''est une comédie de bureau, pas un thriller.',
        'astuce','Tourner l''ITW juste après, dans le même couloir si possible.'
      ),
      true
    );
  END IF;

  -- SCÈNE 06 — La machine à café (acte 2)
  IF NOT EXISTS (SELECT 1 FROM bac_scenes WHERE titre = 'La machine à café') THEN
    INSERT INTO bac_scenes (titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
      groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
      champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
      script_json, itw_json, notes_real_json, actif)
    VALUES (
      'La machine à café', '2', 'Sitcom', 'Existentiel', 2, 3, 2,
      ARRAY['assistants','managers'], 2, 3,
      'Une conversation anodine autour de la machine à café finit par effleurer la révélation sans jamais la nommer.',
      NULL, NULL, NULL,
      jsonb_build_array(
        jsonb_build_object('type','didascalie','texte','Coin café. Quelqu''un attend que son café coule. Un autre arrive.','style','ouverture'),
        jsonb_build_object('type','replique','role_id',v_assistant::text,'directive','Ouvre la conversation avec quelque chose de parfaitement banal','exemple','T''as vu le café ? Ils ont encore changé les dosettes.','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_manager::text,'directive','Répond mais enchaîne immédiatement sur quelque chose de plus profond','exemple','Ouais. Enfin… ça change quoi au fond ? Le café c''est le café.','didascalie','air pensif','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_assistant::text,'directive','Rebondit sur la profondeur inattendue','exemple','T''es en train de me faire une métaphore sur le café là ?','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_manager::text,'directive','Ne confirme ni n''infirme — continue sur sa lancée','exemple','Je dis juste que des fois on change les choses et ça change pas grand chose. Et des fois on change rien et tout change quand même.','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','Un silence. L''assistant regarde son café.','style','intermediaire'),
        jsonb_build_object('type','replique','role_id',v_assistant::text,'directive','Essaie de ramener la conversation au concret — mais la réflexion sur la révélation transparaît','exemple','C''est rapport à… ce qui se passe en ce moment ?','didascalie','prudemment','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_manager::text,'directive','Esquive — mais de façon qui confirme implicitement que oui','exemple','Ça parle de café.','didascalie','boit une gorgée, regard caméra','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','Ils restent un moment en silence. Le café continue de couler.','style','cloture')
      ),
      jsonb_build_array(
        jsonb_build_object('role_id',v_manager::text,'question','Vous parliez de café ou d''autre chose dans cette conversation ?','reponses_par_variant',jsonb_build_object('A','Des deux. En même temps. La vie c''est ça.','B','Du café ! C''est important le café. Ça structure la journée.','C','Je sais plus. Au bout d''un moment les frontières deviennent floues.')),
        jsonb_build_object('role_id',v_assistant::text,'question','Vous avez compris ce qu''il voulait dire ?','reponses_par_variant',jsonb_build_object('A','Oui. Et je pense qu''il savait que j''avais compris. C''est confortable quelque part.','B','Je crois. Mais je suis pas sûr qu''il ait voulu dire quelque chose de précis. Parfois les gens parlent juste.','C','J''ai compris qu''il évitait de répondre. Ce qui en soi est une réponse.'))
      ),
      jsonb_build_object(
        'cadrage','Filmer serré sur les visages. Insert sur la tasse qui se remplit pendant les silences.',
        'rythme','Décontracté mais mesuré. Ce n''est pas une scène qui s''emballe — elle flotte.',
        'silences','Le silence après "C''est rapport à ce qui se passe en ce moment ?" est central. 3 secondes minimum.',
        'pieges','Ne pas jouer la mélancolie — rester dans la légèreté.',
        'astuce','Laisser les acteurs improviser légèrement autour des répliques. Cette scène supporte bien les variations.'
      ),
      true
    );
  END IF;

  -- SCÈNE 07 — Le nouveau (acte 2)
  IF NOT EXISTS (SELECT 1 FROM bac_scenes WHERE titre = 'Le nouveau') THEN
    INSERT INTO bac_scenes (titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
      groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
      champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
      script_json, itw_json, notes_real_json, actif)
    VALUES (
      'Le nouveau', '2', 'Naïf', 'Décalé', 2, 3, 1,
      ARRAY['assistants','chefs-de-projet'], 2, 3,
      'Un nouveau pose des questions innocentes sur l''organisation — et ses questions révèlent l''absurdité des process en place, et indirectement l''impact de la révélation sur l''équipe.',
      'Un process interne réel à expliquer', '"la validation des congés", "le process de commande", "la demande de badge visiteur"', 3,
      jsonb_build_array(
        jsonb_build_object('type','didascalie','texte','Bureau. Quelqu''un explique le fonctionnement à un nouveau — avec toute la patience de quelqu''un qui l''a déjà expliqué vingt fois.','style','ouverture'),
        jsonb_build_object('type','replique','role_id',v_charge_projet::text,'directive','Introduit le nouveau avec un enthousiasme légèrement forcé','exemple','Donc voilà, bienvenue ! On est une super équipe. Tu vas voir, c''est très fluide ici.','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_assistant::text,'directive','Pose une question innocente sur quelque chose d''absolument basique','exemple','Et pour… avoir accès au serveur, ça marche comment ?','didascalie','stylo levé, prêt à noter','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_charge_projet::text,'directive','Explique le process réel — qui est objectivement absurde — avec le ton de quelqu''un qui trouve ça parfaitement normal','exemple','Alors pour [ÉLÉMENT PERSONNALISÉ], il faut d''abord remplir le formulaire F7, le faire valider par ton N+1, puis par le service concerné, et ensuite t''envoies le mail à l''adresse dédiée. Qui est la même que le support, mais c''est pas pareil.','didascalie','','utilise_champ_perso',true),
        jsonb_build_object('type','replique','role_id',v_assistant::text,'directive','Pose une question de suivi qui révèle l''absurdité de la procédure','exemple','Et si mon N+1 est absent ?','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_charge_projet::text,'directive','Répond avec une solution de contournement encore plus compliquée','exemple','T''attends. Ou alors tu demandes au N+1 du N+1, mais faut que ce soit explicitement délégué, ce qui nécessite un autre formulaire.','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_assistant::text,'directive','Pose une question finale qui révèle qu''il a tout compris de la vraie situation','exemple','Et en ce moment… c''est le bon moment pour commencer ? J''ai entendu des choses dans les couloirs.','didascalie','lève les yeux du carnet','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_charge_projet::text,'directive','Marque une pause — et répond avec une formule qui dit tout sans rien dire','exemple','C''est toujours le bon moment pour apprendre les process. Surtout maintenant.','didascalie','regard caméra','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','Le nouveau repose son stylo. Peut-être qu''il a compris quelque chose.','style','cloture')
      ),
      jsonb_build_array(
        jsonb_build_object('role_id',v_assistant::text,'question','Votre premier jour, première impression ?','reponses_par_variant',jsonb_build_object('A','Très organisé. Beaucoup de process. J''aime bien les process. J''ai trois pages de notes.','B','Super accueil ! Tout le monde est sympa. J''ai pas encore tout compris mais ça viendra.','C','C''est intéressant. J''ai l''impression que tout le monde sait quelque chose que moi je sais pas encore.')),
        jsonb_build_object('role_id',v_charge_projet::text,'question','Vous aimez bien accueillir les nouveaux ?','reponses_par_variant',jsonb_build_object('A','C''est important de bien transmettre. J''ai un document d''onboarding. Sur 14 pages.','B','J''adore ! C''est frais comme regard. Des fois ils posent des questions qu''on s''est arrêté de se poser.','C','Je fais ce qu''il faut. Et là en particulier c''est un bon timing pour savoir comment les choses marchent.'))
      ),
      jsonb_build_object(
        'cadrage','Plan sur le carnet de notes du nouveau pour les inserts. Plan sur le visage du chargé de projet pendant les explications.',
        'rythme','Régulier, comme une vraie formation. S''accélère légèrement à la fin.',
        'silences','La pause avant "C''est toujours le bon moment" doit être marquée — 2 secondes.',
        'pieges','Le nouveau doit avoir l''air sincèrement intéressé, pas ironique.',
        'astuce','Préparer un vrai faux formulaire F7 à montrer à la caméra.'
      ),
      true
    );
  END IF;

  -- SCÈNE 08 — Le Powerpoint de la mort (acte 2)
  IF NOT EXISTS (SELECT 1 FROM bac_scenes WHERE titre = 'Le Powerpoint de la mort') THEN
    INSERT INTO bac_scenes (titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
      groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
      champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
      script_json, itw_json, notes_real_json, actif)
    VALUES (
      'Le Powerpoint de la mort', '2', 'Satire corporate', 'Absurde', 2, 3, 2,
      ARRAY['managers','chefs-de-projet'], 2, 4,
      'Quelqu''un présente un Powerpoint de 47 slides pour un sujet simple. La slide 12 contient une référence à la révélation — personne ne sait si c''est intentionnel.',
      'Le sujet de la présentation', '"le bilan de la semaine", "la nouvelle politique de déplacement", "le plan de formation Q3"', 1,
      jsonb_build_array(
        jsonb_build_object('type','didascalie','texte','Salle de réunion. Quelqu''un est debout devant un écran. La slide affichée indique "Slide 4 / 47".','style','ouverture'),
        jsonb_build_object('type','replique','role_id',v_chef_projet::text,'directive','Lance la présentation avec une énergie totalement disproportionnée par rapport au sujet','exemple','Donc voilà, j''ai préparé une présentation sur [ÉLÉMENT PERSONNALISÉ]. 47 slides. J''aurais pu en faire moins mais je voulais être complet.','didascalie','','utilise_champ_perso',true),
        jsonb_build_object('type','replique','role_id',v_manager::text,'directive','Réagit en essayant de rester professionnel malgré l''absurdité évidente','exemple','47… c''est… très complet en effet. On a combien de temps ?','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_chef_projet::text,'directive','Répond avec le timing réel — qui est impossible — avec le même calme','exemple','J''ai bloqué deux heures. Mais si on va vite on peut peut-être s''en sortir en 90 minutes.','didascalie','fait avancer les slides','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','La slide 12 apparaît à l''écran. Elle contient une référence visible à la révélation — personne n''en parle.','style','intermediaire'),
        jsonb_build_object('type','replique','role_id',v_manager::text,'directive','Remarque la slide 12 mais pose la question de façon à pouvoir l''ignorer si nécessaire','exemple','La slide 12, c''est… informatif. C''est là depuis longtemps dans ta présentation ?','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_chef_projet::text,'directive','Répond de façon à clore le sujet immédiatement et reprendre le fil','exemple','Contexte général. On en reparlera. Slide 13.','didascalie','clique avant la fin de sa phrase','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','La présentation continue. Il reste 34 slides.','style','cloture')
      ),
      jsonb_build_array(
        jsonb_build_object('role_id',v_chef_projet::text,'question','47 slides pour ça. Vous assumez ?','reponses_par_variant',jsonb_build_object('A','Complètement. Un bon livrable c''est un livrable complet. J''avais des annexes aussi mais j''ai coupé.','B','En mode sprint j''aurais pu faire 15. Mais là c''était une présentation stratégique.','C','Je l''ai compressée. La version initiale était sur 63 slides.')),
        jsonb_build_object('role_id',v_manager::text,'question','La slide 12. Vous pensiez quoi en la voyant ?','reponses_par_variant',jsonb_build_object('A','J''ai vu. J''ai calculé les implications. J''ai décidé d''en parler après. On en parle toujours après.','B','Je savais pas si c''était intentionnel ou pas. Et j''ai décidé que c''était mieux de pas savoir.','C','Rien. J''étais mentalement à la slide 47. C''est une technique de survie.'))
      ),
      jsonb_build_object(
        'cadrage','Insert sur l''écran de présentation — la slide 12 doit être lisible à l''image. Plan sur les visages pendant ce moment.',
        'rythme','Monotone et stable — c''est exactement le ton d''une vraie présentation corporate. Ne pas le casser.',
        'silences','Le silence après "La slide 12, c''est… informatif." doit tenir 3 secondes.',
        'pieges','Ne pas rendre la présentation trop drôle en elle-même — l''humour vient de la normalité absolue du présentateur.',
        'astuce','Préparer un vrai Powerpoint avec une vraie slide 12 qui fait référence à la révélation.'
      ),
      true
    );
  END IF;

  -- SCÈNE 09 — La deadline (acte 3)
  IF NOT EXISTS (SELECT 1 FROM bac_scenes WHERE titre = 'La deadline') THEN
    INSERT INTO bac_scenes (titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
      groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
      champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
      script_json, itw_json, notes_real_json, actif)
    VALUES (
      'La deadline', '3', 'Thriller', 'Comédie', 2, 3, 3,
      ARRAY['chefs-de-projet','assistants'], 2, 4,
      '2 heures avant une échéance critique — qui coïncide avec l''annonce de la révélation — chacun gère la pression différemment.',
      'Le livrable à rendre', '"le rapport annuel", "la présentation client", "le planning consolidé"', 1,
      jsonb_build_array(
        jsonb_build_object('type','didascalie','texte','Bureau. 14h00 affiché quelque part. Une ambiance de tension contenue. Des gens qui tapent vite.','style','ouverture'),
        jsonb_build_object('type','replique','role_id',v_charge_projet::text,'directive','Annonce l''état de la situation avec un calme qui cache à peine la panique','exemple','Donc on a deux heures pour finir [ÉLÉMENT PERSONNALISÉ]. J''ai fait le point : on est à 60%. C''est jouable.','didascalie','voix légèrement trop contrôlée','utilise_champ_perso',true),
        jsonb_build_object('type','replique','role_id',v_assistant::text,'directive','Répond en révélant que son estimation de 60% est optimiste','exemple','60% si on compte pas la partie validation. Qui représente à peu près 40% du travail.','didascalie','sans lever les yeux de son écran','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_charge_projet::text,'directive','Absorbe l''information et recalcule à voix haute de façon chaotique','exemple','OK donc en vrai on est à… 36%. En deux heures. C''est… on peut le faire si tout le monde reste focus.','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','Quelqu''un ouvre un onglet de navigateur non professionnel. Le referme immédiatement.','style','intermediaire'),
        jsonb_build_object('type','replique','role_id',v_assistant::text,'directive','Soulève le problème réel — qui dépasse la deadline elle-même','exemple','Et de toute façon… vu ce qui va se passer demain matin, est-ce que ce rendu a encore du sens ?','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_charge_projet::text,'directive','Refuse d''ouvrir ce débat — la deadline est la deadline','exemple','On livre. On réfléchit après. C''est comme ça que ça marche.','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_assistant::text,'directive','Accepte — mais avec une réserve qui reste en suspension','exemple','OK. On livre. Et demain ?','didascalie','regard caméra','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','Chargé de projet ne répond pas. Les claviers reprennent.','style','cloture')
      ),
      jsonb_build_array(
        jsonb_build_object('role_id',v_charge_projet::text,'question','36% en deux heures. Vous y croyiez vraiment ?','reponses_par_variant',jsonb_build_object('A','J''y croyais parce qu''on n''avait pas le choix d''y croire. C''est une compétence en soi.','B','À 100%. On l''a fait. Enfin… à 80%. Ce qui est déjà bien.','C','Non. Mais dire non ça sert à rien à deux heures de la deadline.')),
        jsonb_build_object('role_id',v_assistant::text,'question','"Et demain ?". Vous pensiez à quoi exactement ?','reponses_par_variant',jsonb_build_object('A','À tout ce qui va changer. Et à tout ce qu''il va falloir refaire.','B','Je sais pas. C''est sorti. C''est une vraie question.','C','À rien de précis. C''était juste la question évidente. Que personne voulait poser.'))
      ),
      jsonb_build_object(
        'cadrage','Filmer avec une légère instabilité pour créer la tension. Inserts sur les écrans, les montres, les mains qui tapent.',
        'rythme','Rapide au début, puis ralenti sur la question "Et demain ?" et le silence final.',
        'silences','Le silence final après la question sans réponse. 4 secondes minimum. Les claviers qui reprennent brisent le silence — pas une voix.',
        'pieges','Éviter le jeu trop dramatique — rester dans la comédie malgré la tension.',
        'astuce','Afficher une vraie horloge en fond de plan — numérique de préférence, qui défile.'
      ),
      true
    );
  END IF;

  -- SCÈNE 10 — Le team building raté (acte 3)
  IF NOT EXISTS (SELECT 1 FROM bac_scenes WHERE titre = 'Le team building raté') THEN
    INSERT INTO bac_scenes (titre, acte, ton_principal, ton_secondaire, duree_min, duree_max, difficulte,
      groupes_concernes, nb_intervenants_min, nb_intervenants_max, fil_rouge,
      champ_perso_label, champ_perso_exemple, champ_perso_replique_cible,
      script_json, itw_json, notes_real_json, actif)
    VALUES (
      'Le team building raté', '3', 'Feel-good', 'Autodérision', 2, 3, 1,
      ARRAY['managers','assistants','chefs-de-projet','directeurs'], 3, 5,
      'L''équipe est en train de rater une activité team building avec brio — et c''est précisément dans cet échec collectif que quelqu''un annonce enfin la révélation. Tout le monde l''entend, mais ça ne change pas grand chose à l''ambiance.',
      'Le nom de l''activité team building ratée', '"l''escape game", "le défi cohésion", "le quiz d''équipe"', 1,
      jsonb_build_array(
        jsonb_build_object('type','didascalie','texte','Une activité team building en cours — ou plutôt en train de s''effondrer doucement. Tout le monde fait semblant que ça se passe bien.','style','ouverture'),
        jsonb_build_object('type','replique','role_id',v_manager::text,'directive','Lance l''activité avec un enthousiasme légèrement forcé','exemple','Allez ! [ÉLÉMENT PERSONNALISÉ], tout le monde est prêt ? L''objectif c''est la cohésion. Et peut-être aussi de s''amuser un peu.','didascalie','en regardant si quelqu''un est vraiment motivé','utilise_champ_perso',true),
        jsonb_build_object('type','replique','role_id',v_assistant::text,'directive','Réagit avec une politesse qui cache un enthousiasme nul','exemple','C''est super. Vraiment. Je suis prêt.','didascalie','visiblement pas prêt','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','L''activité commence. Ce n''est pas un succès.','style','intermediaire'),
        jsonb_build_object('type','replique','role_id',v_chef_projet::text,'directive','Annonce la révélation de façon totalement plate, au milieu de l''activité','exemple','Au fait — tant qu''on est tous là — vous êtes au courant pour [LA RÉVÉLATION] ?','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_manager::text,'directive','Confirme que oui, tout le monde est au courant','exemple','Oui. On sait. C''est... oui.','didascalie','','utilise_champ_perso',false),
        jsonb_build_object('type','replique','role_id',v_directeur::text,'directive','Décide de continuer l''activité comme si de rien n''était','exemple','Bon. On continue. Qui a le prochain indice ?','didascalie','regard caméra','utilise_champ_perso',false),
        jsonb_build_object('type','didascalie','texte','L''activité continue. Quelqu''un la rate. L''équipe rit. C''était peut-être le but depuis le début.','style','cloture')
      ),
      jsonb_build_array(
        jsonb_build_object('role_id',v_manager::text,'question','Comment s''est passé le team building ?','reponses_par_variant',jsonb_build_object('A','On a pas gagné. Mais on a quand même réussi quelque chose, je crois. Je suis pas sûr de quoi.','B','C''était génial ! Enfin, objectivement raté. Mais dans la bonne ambiance. Ce qui compte.','C','On n''a pas gagné. Ce qui prouve que j''avais raison depuis le début. Sur tout.')),
        jsonb_build_object('role_id',v_chef_projet::text,'question','Vous avez annoncé la révélation là, comme ça, pendant le team building ?','reponses_par_variant',jsonb_build_object('A','C''était le bon moment. Tout le monde était là. C''était pratique.','B','J''avais ça dans mes notes depuis le matin. Il fallait que ça soit dit.','C','Je savais pas trop comment l''amener. Et là c''est sorti. Voilà.'))
      ),
      jsonb_build_object(
        'cadrage','Plan large pour montrer l''ensemble du groupe. Inserts sur les visages pendant l''annonce de la révélation.',
        'rythme','Léger, presque décontracté. L''annonce de la révélation doit tomber dans un silence absurde.',
        'silences','Le silence après "Oui. On sait." est le plus drôle. Ne pas le couper. 3 secondes minimum.',
        'pieges','Ne pas jouer l''émotion sur la révélation — c''est la réaction blasée qui est drôle.',
        'astuce','Tourner l''activité team building pour de vrai avant le script — les acteurs seront naturellement dans cet état.'
      ),
      true
    );
  END IF;

END $$;
