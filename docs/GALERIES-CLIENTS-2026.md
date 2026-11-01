# Évolution majeure — Galeries clients (livraison photo)

> Document de proposition. Existant, architecture cible, parcours client, plan de livraison.
> Rédigé le 2026-10-31. Maquette cliquable : [`docs/maquettes/galeries-clients.html`](maquettes/galeries-clients.html).

Objectif : livrer les photos aux clients depuis maxcellens.com, sans passer par Pixieset. On garde ce que Pixieset fait bien (collections, couvertures, mot de passe, téléchargements, favoris) et on ajoute ce qui manque au quotidien : actions groupées, export de la liste des galeries avec liens et mots de passe, partage en un clic, filigrane activable galerie par galerie, le tout aux couleurs du site.

---

## 0. Diagnostic de l'existant

| Élément | Aujourd'hui | Conséquence pour des galeries clients |
|---|---|---|
| `/galeries` + `/galeries/[slug]` | Portfolio **public**, liste stockée en JSON dans `site_settings.gallery_pages`, photos dans `site_settings.gallery_photos_<slug>` | Pas de table, pas de requête, pas de statut ni de mot de passe. Ce modèle tient pour 10 galeries vitrine, pas pour 50 livraisons de 300 photos. |
| Stockage | Bucket Supabase `medias` **public** | Toute URL d'image est lisible sans authentification. Un mot de passe sur la page ne protégerait rien. |
| Upload | Navigateur → route API Vercel → Supabase, après `compressImageClient` (WebP 3200 px, q 85) | Limite de corps Vercel de 4,5 Mo : impossible d'y faire passer un original de 15 à 30 Mo. |
| Auth admin | Session Supabase, `Authorization: Bearer` vérifié par `lib/adminAuth.ts` | On la réutilise telle quelle. |
| UI admin | Noyau `components/admin/` (tokens `--adm-*`, `AdminModal`, `fields/`, registre) | On la réutilise. Le gestionnaire de galeries sera une **page** (`/admin/galeries`), pas une modale : il y a trop de contenu pour une modale. |
| Dépendances utiles déjà présentes | `qrcode.react`, `@dnd-kit/*`, `sharp`, `framer-motion`, `lucide-react` | QR de partage, tri des photos par glisser-déposer et filigrane serveur sans nouvelle dépendance. |

**Décision de principe** : on **ne touche pas** au portfolio `/galeries`. Les galeries clients sont un module séparé, avec leurs propres tables, leur propre bucket et leur URL courte `/client/<slug>`. À terme, une galerie client pourra être publiée dans le portfolio (lot 5).

---

## 1. Ce que le module fait (périmètre fonctionnel)

### 1.1 Côté admin

**Liste des galeries** (`/admin/galeries`)
- Vue grille (couvertures) ou vue tableau (dense, triable).
- Recherche plein texte : titre, client, e-mail, tag.
- Filtres : statut (brouillon / publiée / expirée / archivée), accès (mot de passe / lien direct / publique), tag, date d'évènement, date d'expiration, avec ou sans filigrane.
- Tri par date d'évènement, date de création, nom, nombre de vues.
- **Sélection multiple** : case à cocher, Maj+clic pour une plage, « tout sélectionner » sur le résultat filtré.
- **Actions groupées** : publier / dépublier, changer l'accès, **générer de nouveaux mots de passe**, appliquer un filigrane, appliquer un modèle, fixer une expiration, ajouter un tag, **exporter (CSV)**, mettre à la corbeille, supprimer définitivement (en tapant `SUPPRIMER` pour confirmer).
- Corbeille conservée 30 jours, avec restauration possible.
- Dossiers / clients : regrouper plusieurs galeries (ex. « BNP Paribas » → 9 avril, 7 avril, Summer Party).

**Éditeur de galerie** (`/admin/galeries/[id]`), en 4 onglets comme Pixieset, mais en français :

| Onglet | Contenu |
|---|---|
| **Photos** | Upload par glisser-déposer (dossiers acceptés), progression par fichier, reprise après coupure. Sets (« Accueil », « Discours », « Soirée »…), tri par glisser-déposer, tri auto par date EXIF ou nom, masquer une photo sans la supprimer, définir la couverture, remplacer une photo en gardant sa place. |
| **Design** | Couverture (6 mises en page), point focal, typographie (3 paires de polices), couleur (clair / sable / sombre), grille (justifiée / maçonnerie / carrée, espacement), aperçu bureau / mobile en direct. |
| **Réglages** | *Général* : titre, client, e-mail, date, URL, tags, expiration + rappel. *Accès* : mode d'accès, mot de passe (générer / copier), lien magique, inscription par e-mail. *Filigrane* : activé ou non, choix du modèle. *Téléchargement* : activé ou non, tailles (HD originale / web 2048 px), photo à l'unité ou galerie complète, PIN de téléchargement, limite. *Favoris* : activés ou non, listes nommées, limite de sélection. |
| **Activité** | Vues, visiteurs uniques, téléchargements (photo par photo et ZIP), favoris par visiteur avec export, tentatives de mot de passe échouées. |

**Modèles de filigrane** (réglages globaux) : texte ou logo PNG, position (9 points + mosaïque), taille relative, opacité et marge. Aperçu en direct sur une vraie photo.

**Modèles de galerie (réglages types)** : c'est le point de départ de chaque galerie. « Nouvelle galerie » ouvre un choix de modèle **avant** tout le reste :

| Modèle (exemples livrés) | Accès | Téléchargement | Filigrane | Favoris | Design |
|---|---|---|---|---|---|
| **Corporate — livraison HD** | Mot de passe | Oui : HD + web, unitaire + ZIP | Non | Non | Clair, couverture à gauche |
| **Évènement — soirée** | Lien direct | Oui : web seulement | Non | Oui | Nuit, plein cadre |
| **Épreuves — sélection client** | Mot de passe | **Non** | Oui | Oui (limite de N photos) | Sable, cadre |
| **Portrait — livraison finale** | Mot de passe + PIN | Oui : HD, unitaire | Non | Non | Clair, divisé |

- Un modèle contient **tous** les réglages : design, accès, **téléchargement**, filigrane, favoris, expiration relative (« +6 mois après la date d'évènement »), modèle de message de partage et tags par défaut.
- La galerie **copie** le modèle à sa création : modifier un modèle plus tard ne change pas les galeries déjà livrées. Une action groupée « Appliquer un modèle » permet de le faire volontairement.
- « Enregistrer comme modèle » depuis n'importe quelle galerie.
- Un modèle par défaut (étoile), sélectionné d'office.

**Téléchargement réglé par galerie**, toujours visible dans le bandeau de l'éditeur (pastille `Téléchargement : HD + web` / `Désactivé`) :
- activé ou désactivé ; tailles proposées (originale HD, HD plafonnée 3600 px, web 2048 px) ;
- portée : photo à l'unité, set, galerie complète (ZIP), favoris uniquement ;
- PIN de téléchargement optionnel, limite par visiteur optionnelle ;
- quand c'est désactivé, la page client **n'affiche aucun bouton de téléchargement** et l'API refuse les requêtes (contrôle côté serveur, pas seulement dans l'interface).

**Partage rapide**, depuis la liste ou l'éditeur :
- lien, mot de passe et **lien magique** (accès sans saisir le mot de passe), chacun copiable ;
- **« Copier le message »** : texte prêt à coller dans un e-mail, WhatsApp ou LinkedIn (modèle modifiable) ;
- QR code téléchargeable en PNG/SVG, à mettre sur un carton ou une signature ;
- boutons e-mail (`mailto:` au lot 3, envoi direct depuis le site au lot 5) et WhatsApp.

**Export de la liste** (CSV, ouvrable dans Excel FR : UTF-8 avec BOM, séparateur `;`) :

```
Titre;Client;E-mail;Date évènement;Statut;Accès;Lien;Mot de passe;Lien magique;PIN téléchargement;Expiration;Photos;Vues;Téléchargements;Créée le
20260701 - Pot de départ;Sophie D.;sophie@…;01/07/2026;Publiée;Mot de passe;https://maxcellens.com/client/pot-de-depart-sophie;k7mq4xzp;https://maxcellens.com/client/pot-de-depart-sophie?k=…;;31/12/2026;295;84;212;02/07/2026
```

Exportable pour toute la liste, le résultat filtré ou la sélection.

### 1.2 Côté client — la page de livraison

Parcours : **lien reçu → porte d'accès → couverture → galerie → photo → téléchargement**.

1. **Porte d'accès** (si mot de passe) : la couverture floutée en fond, le titre, un seul champ, « Accéder aux photos ». Mot de passe insensible à la casse et aux espaces. Le lien magique saute cette étape.
2. **Couverture plein écran** : titre, date et lieu, bouton « Voir les photos ». Logo Maxcellens discret.
3. **Barre collante** : nom de la galerie, onglets des sets, ♥ favoris (compteur), ⬇ « Télécharger » (seulement si la galerie l'autorise), ▷ **Diaporama**, partager.
   - *Diaporama* : plein écran, fondu enchaîné, 4 s par photo (réglable), pause au toucher, musique optionnelle définie dans le modèle.
4. **Grille justifiée** façon planche contact, avec chargement progressif (vignette 640 px floue d'abord, puis 2048 px).
5. **Visionneuse** : plein écran, flèches, glissement au doigt, ♥, ⬇ unitaire, compteur « 42 / 295 », préchargement des photos voisines.
6. **Téléchargement** : choix de la taille (HD originale / web), de la portée (toute la galerie / un set / les favoris) et PIN si activé. Le ZIP se construit en streaming dans le navigateur, donc pas de fichier de 4 Go à générer côté serveur.
7. **Pied de page** : « Photos : Maxcellens », contact, lien vers le site. Bandeau « Disponible jusqu'au 31 décembre 2026 » si la galerie expire.
8. **Favoris** : au premier ♥, on demande le prénom et l'e-mail une seule fois. La sélection est visible dans l'onglet *Activité* et exportable en liste de noms de fichiers pour la retouche.

**Galerie expirée ou supprimée** : page propre « Cette galerie n'est plus disponible — contactez Maxcellens », jamais une 404 brute.

Toutes les pages client sont en `noindex, nofollow`, exclues du sitemap et sans aperçu de lien (pas d'Open Graph) quand la galerie est protégée.

---

### 1.3 Cas d'usage prioritaire : séance de portraits corporate

Volume type : **80 galeries de 6 à 12 photos** (une par collaborateur) le même jour, plus quelques galeries ponctuelles de 300 à 1 000 photos.

Créer 80 galeries une par une n'est pas réaliste. D'où la **création en lot** (lot 1) :

1. « **Import en masse** » : déposer toutes les photos d'un coup (fichiers ou dossiers).
2. Former les groupes (un groupe = une galerie) : à la main (sélection, Maj+clic, nom saisi à côté du bouton de création), ou automatiquement : **toutes les N photos**, **par pause** entre deux prises de vue (EXIF), **par sous-dossier**, **par nom de fichier**.
3. Pour chaque groupe : nom (= titre et URL `/client/…`) et modèle. Dossier de destination (existant ou nouveau), publication activée par défaut.
4. « Créer les N galeries » : les galeries sont créées et publiées, puis les photos sont envoyées dans la bonne galerie, avec une seule barre de progression globale.
5. Écran final : liens et mots de passe, **copie en un clic** ou **export CSV/Excel**.

Les galeries s'organisent ensuite en **dossiers** (barre latérale) : glisser une galerie, ou une sélection, sur un dossier pour l'y ranger.

Corrections après coup : glisser une photo d'une galerie à l'autre, ou ajouter un retardataire dans le dossier de la séance.

Le dossier de séance montre aussi le **suivi** : qui a ouvert sa galerie et qui a téléchargé (colonnes dans la vue tableau, utile pour relancer).

## 2. Architecture

### 2.1 Modèle de données (Supabase / Postgres)

Migration `supabase/migrations/2026110x_client_galleries.sql` :

```sql
create table client_galleries (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  client_name     text,
  client_email    text,
  event_date      date,
  folder_id       uuid references client_gallery_folders(id) on delete set null,
  tags            text[] not null default '{}',

  status          text not null default 'draft'
                  check (status in ('draft','published','archived')),
  access_mode     text not null default 'password'
                  check (access_mode in ('password','link','public')),
  password_enc    text,          -- chiffré AES-GCM (réversible : nécessaire pour l'export)
  access_version  int  not null default 1,   -- +1 = révoque tous les accès ouverts
  magic_link_enabled boolean not null default true,
  email_gate      boolean not null default false,
  expires_at      timestamptz,
  expiry_reminder_days int,

  watermark_id    uuid references watermarks(id) on delete set null,
  download        jsonb not null default '{"enabled":true,"sizes":["original","web"],"zip":true}',
  download_pin_enc text,
  favorites       jsonb not null default '{"enabled":false,"lists":[],"limit":null}',
  design          jsonb not null default '{}',   -- couverture, typo, couleur, grille
  cover_photo_id  uuid,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz,
  deleted_at      timestamptz                   -- corbeille
);

create table client_gallery_sets   (id uuid pk, gallery_id uuid fk cascade, name text, position int);
create table client_gallery_photos (
  id uuid pk, gallery_id uuid fk cascade, set_id uuid fk set null, position int,
  filename text, width int, height int, bytes bigint, taken_at timestamptz,
  placeholder text,                 -- dataURL 16 px pour le flou de chargement
  hidden boolean default false,
  wm_version text                   -- hash du filigrane appliqué au rendu « wm »
);
create table watermarks            (id uuid pk, name text, kind text, text text, image_path text,
                                    position text, scale real, opacity real, margin real, tiled boolean);
create table client_gallery_templates(id uuid pk, name text, description text, is_default boolean,
                                      settings jsonb,   -- design, access, download, watermark, favorites, expiry_offset, share_message, tags
                                      position int, created_at timestamptz);
-- client_galleries.template_id uuid (traçabilité : « créée depuis le modèle X »), réglages copiés à la création
create table client_gallery_folders(id uuid pk, name text, position int);
create table client_gallery_visitors (id uuid pk, gallery_id uuid fk cascade, email text, name text, created_at timestamptz);
create table client_gallery_favorites(gallery_id uuid, visitor_id uuid, photo_id uuid, list text, created_at timestamptz,
                                      primary key (visitor_id, photo_id, list));
create table client_gallery_events (id bigserial pk, gallery_id uuid, type text, photo_id uuid,
                                    visitor_id uuid, ip_hash text, ua text, created_at timestamptz default now());
```

RLS activée sur toutes les tables **sans aucune policy pour `anon`**. Tout passe par les routes serveur (`supabaseAdmin`), comme le reste du site.

**Pourquoi un mot de passe chiffré et non haché** : vous voulez pouvoir le réafficher, le copier et l'exporter. C'est un code de partage, pas un mot de passe de compte. On le chiffre avec `GALLERY_SECRET` (variable d'environnement Vercel), donc une fuite de la base seule ne l'expose pas.

**Format des mots de passe générés** : 8 lettres et chiffres aléatoires (ex. `k7mq4xzp`), sans mot reconnaissable ni caractère confondable (0/o, 1/l/i). Saisie insensible à la casse.

### 2.2 Stockage

Nouveau bucket **privé** `client-galleries` :

```
client-galleries/
└── <galleryId>/
    ├── original/<photoId>.jpg      ← fichier livré tel quel (téléchargement HD)
    ├── web/<photoId>.webp          ← 2048 px, propre
    ├── thumb/<photoId>.webp        ← 640 px, propre
    └── wm/<photoId>.webp           ← 2048 px filigrané (si filigrane actif)
```

**Aucune URL publique.** Le serveur vérifie l'accès, puis renvoie des URL signées Supabase (`createSignedUrls`, en lot, durée 1 h). Si le filigrane est actif, le client ne reçoit **que** des URL `wm/` et `thumb/` (vignettes filigranées elles aussi), et `original/` n'est signé que par la route de téléchargement, si celui-ci est autorisé.

**Upload sans passer par Vercel** : l'admin demande `POST /api/admin/client-galleries/[id]/upload-urls`, qui répond avec des URL d'upload signées (`createSignedUploadUrl`). Le navigateur envoie l'original **directement** à Supabase, puis génère `web`, `thumb` et éventuellement `wm` par canvas (même principe que `compressImageClient`) et les envoie aussi. On lance 4 envois en parallèle. On contourne ainsi la limite de 4,5 Mo et les fonctions serverless ne coûtent rien.

**Filigrane** : appliqué au moment de générer le rendu `wm/`, donc incrusté dans les pixels et impossible à retirer côté client. Si on change de filigrane ou qu'on l'active après coup, une **régénération** se lance dans l'onglet admin avec une barre de progression (environ 2 à 3 min pour 300 photos). `wm_version` permet de ne retraiter que les photos concernées. Pour une galerie sans filigrane, on ne génère pas de rendu `wm/`.

### 2.3 Volumes et coûts — **décision à prendre**

Estimation (originaux ≤ 5 Mo, rendus ~1 Mo par photo) : séance de portraits de 80 × 10 photos ≈ **5 Go** ; galerie de 1 000 photos ≈ **6 Go** ; année chargée ≈ **35 à 40 Go**.

**Décision : option B, tout le stockage photo sur R2** (originaux et rendus), Supabase gratuit pour la base.

| Option | Pour | Contre |
|---|---|---|
| **A. Tout sur Supabase** (plan Pro) | Une seule brique, URL signées natives, rien à ajouter | Le quota inclus est vite consommé (~20 galeries/an ≈ 80 Go) et la bande passante sortante est facturée au-delà du forfait : un client qui télécharge 4 Go plusieurs fois coûte cher |
| **B. Originaux sur Cloudflare R2**, rendus web sur Supabase | Sortie de données **gratuite** sur R2, stockage bon marché : idéal pour les téléchargements HD | Une brique de plus (clé R2, URL signées S3) |

Recommandation : **commencer en A** derrière une petite interface `lib/clientGalleries/storage.ts` (`signUpload`, `signDownload`, `remove`), puis **basculer les originaux en B** dès que le volume le justifie, sans toucher au reste. On ajoute aussi une règle d'archivage : X mois après l'expiration, suppression des originaux et conservation des rendus web (option par galerie).

*(Tarifs à vérifier sur les pages officielles au moment du choix.)*

### 2.4 Contrôle d'accès

```
GET  /client/<slug>                 → page serveur : lit la galerie, vérifie statut, expiration et accès
POST /api/client/<slug>/unlock      → { password } → cookie signé
GET  /api/client/<slug>/photos      → liste + URL signées (vignettes et rendus)
POST /api/client/<slug>/download    → { photoIds | set | 'all', size, pin? } → URL signées des originaux
POST /api/client/<slug>/favorite    → { photoId, list, on }
POST /api/client/<slug>/visitor     → { name, email } (inscription / favoris)
```

- **Cookie d'accès** `g_<galleryId>` = `HMAC(GALLERY_SECRET, galleryId | access_version | exp)`, en `httpOnly`, `SameSite=Lax`, valable 30 jours. Changer le mot de passe incrémente `access_version`, ce qui ferme tous les accès déjà ouverts.
- **Lien magique** `/client/<slug>?k=<jeton>` : jeton = HMAC de `galleryId | access_version`. Il pose le cookie puis redirige vers l'URL propre, pour que le jeton ne reste pas dans l'historique. Il est révocable comme le mot de passe.
- **Anti-force brute** : 8 échecs en 15 min par IP hachée → blocage de 15 min. Les échecs sont journalisés dans `client_gallery_events` et visibles dans *Activité*.
- `proxy.ts` : on n'y touche pas pour `/client/*`, car la vérification se fait dans la page serveur, qui a besoin de la base.
- `robots.ts` : `Disallow: /client/`. Toutes les pages : `noindex`.

### 2.5 Téléchargement ZIP

Générer un ZIP de 4 Go dans une fonction Vercel n'est pas possible (temps et mémoire limités). Le ZIP est donc **construit dans le navigateur, en streaming** :

- la route `/download` renvoie la liste des URL signées des originaux ;
- la lib `client-zip` (~6 Ko) assemble le ZIP à la volée pendant que le navigateur l'écrit sur disque (`showSaveFilePicker` sur Chrome/Edge, service worker de streaming ailleurs) ;
- la mémoire reste constante quelle que soit la taille, et une barre de progression s'affiche (« 128 / 295 photos »).

Repli simple sur mobile : téléchargement par set, ou photo par photo.

### 2.6 Arborescence du code

```
app/
├── client/[slug]/page.tsx                    ← page client (serveur)
├── client/[slug]/not-available.tsx
├── admin/galeries/page.tsx              ← liste
├── admin/galeries/[id]/page.tsx         ← éditeur
└── api/
    ├── client/[slug]/{unlock,photos,download,favorite,visitor}/route.ts
    └── admin/client-galleries/
        ├── route.ts                     ← GET liste (filtres) / POST création
        ├── bulk/route.ts                ← actions groupées
        ├── export/route.ts              ← CSV
        ├── [id]/route.ts                ← GET / PATCH / DELETE
        ├── [id]/upload-urls/route.ts
        ├── [id]/photos/route.ts         ← ordre, sets, masquage, suppression
        ├── [id]/activity/route.ts
        └── watermarks/route.ts, templates/route.ts
lib/clientGalleries/
├── db.ts            ← accès tables (serveur)
├── access.ts        ← cookie HMAC, lien magique, rate-limit
├── crypto.ts        ← chiffrement des mots de passe / PIN
├── passwords.ts     ← générateur aléatoire (8 caractères)
├── storage.ts       ← interface de stockage (Supabase aujourd'hui, R2 demain)
├── renditions.ts    ← (client) canvas → web / thumb / wm
└── csv.ts
components/ClientGallery/            ← page de livraison (côté client)
├── Gate.tsx  Cover.tsx  StickyBar.tsx  JustifiedGrid.tsx
├── Lightbox.tsx  DownloadDialog.tsx  FavoritesDrawer.tsx
└── ClientGallery.module.css
components/admin/ClientGalleries/    ← admin, sur le noyau components/admin
├── GalleryList.tsx  GalleryCard.tsx  GalleryTable.tsx  BulkBar.tsx
├── GalleryEditor/{PhotosTab,DesignTab,SettingsTab,ActivityTab}.tsx
├── Uploader.tsx  ShareDialog.tsx  WatermarkEditor.tsx
```

Une entrée « Galeries clients » s'ajoute au **registre** admin et au tableau de bord (raccourci + KPI : galeries actives, vues sur 7 jours, galeries qui expirent ce mois-ci).

---

## 3. Design

Maquette : `docs/maquettes/galeries-clients.html` (ouvrir dans le navigateur, onglets en haut).

**Admin** : on suit les tokens `--adm-*` (blanc cassé chaud, vert sombre `#213431`, rayons 13/20 px). Pas de vert Pixieset : l'accent vient du centre de style du site.

**Page client** : c'est la vitrine. Elle doit paraître plus soignée que Pixieset, pas seulement équivalente.
- Typographie : titres en Playfair Display (déjà chargée sur le site), texte en sans-serif système.
- Trois ambiances : **Clair** (fond `#F2F0EB`), **Sable** (fond `#E9E3D8`), **Nuit** (fond `#141816`, recommandé pour les soirées).
- Couvertures : Plein cadre centré, Plein cadre à gauche, Divisé, Cadre, Bandeau, Minimal.
- Grille justifiée par défaut (respecte les formats, sans recadrage), avec espacement réglable.
- Animations sobres : fondu des photos à l'apparition, sans effet gadget. `prefers-reduced-motion` est respecté.
- Mobile d'abord pour la visionneuse : glissement, double-tap pour zoomer, barre d'action au pouce.

---

## 4. Plan de livraison

| Lot | Contenu | Résultat livrable |
|---|---|---|
| **1. Fondations** | Migration SQL, bucket privé, `lib/clientGalleries/*`, upload direct + rendus, liste admin (grille), **modèles de galerie + création depuis un modèle**, éditeur onglet Photos + Réglages (général, accès, téléchargement), page `/client/[slug]` avec porte d'accès et grille simple | On peut créer une galerie depuis un modèle, uploader 300 photos et l'envoyer protégée par mot de passe |
| **2. Page de livraison** | Couvertures, ambiances, typo, grille justifiée, visionneuse, diaporama, sets, téléchargement unitaire et ZIP streaming selon le réglage de la galerie, onglet Design avec aperçu | La page client est au niveau d'un vrai livrable |
| **3. Gestion & partage** | Vue tableau, recherche, filtres, sélection multiple, actions groupées, corbeille, export CSV, modale Partager (message, QR, lien magique), filigranes (éditeur + régénération) | Toutes les demandes du brief sont couvertes |
| **4. Interaction client** | Favoris + listes + export pour la retouche, inscription e-mail, PIN de téléchargement, expiration + page « plus disponible », onglet Activité, KPI dans le tableau de bord | Suivi de ce que le client a vu, aimé et téléchargé |
| **5. Confort** | Dossiers clients, dupliquer une galerie, envoi d'e-mail depuis le site (Resend) avec rappel d'expiration automatique, publier une galerie dans le portfolio `/galeries`, archivage des originaux, bascule R2 | Gain de temps à chaque livraison |

Chaque lot fait l'objet d'un commit autonome qui ne casse pas le site. Les lots 1 et 2 suffisent pour arrêter Pixieset sur les nouvelles livraisons.

---

## 5. Décisions

| # | Sujet | Décision (2026-10-31) |
|---|---|---|
| 1 | Stockage | Supabase actuellement en **plan gratuit**, qui ne suffit pas (voir 2.3). **En attente** : Supabase Pro, ou fichiers photo sur Cloudflare R2 avec Supabase gratuit gardé pour la base. |
| 2 | URL client | **`/client/<slug>`** |
| 3 | Migration Pixieset | **Aucune reprise** : seulement les nouvelles livraisons. |
| 4 | Affichage / HD | Affichage **adapté à la connexion** (voir 2.7). Le téléchargement livre **toujours l'original intact**, quand la galerie l'autorise. |
| 5 | Envoi d'e-mails (lot 5) | À décider plus tard. |

### 2.7 Affichage adapté à la connexion (rappel de la décision 4)

- Trois rendus générés à l'upload : `thumb` 640 px, `screen` 1600 px et `web` 2560 px (WebP). Les originaux ne sont **jamais** utilisés pour l'affichage.
- Grille : `srcset`/`sizes` pour que le navigateur choisisse 640 ou 1600 px selon la taille de l'écran et sa densité.
- Visionneuse : 1600 px par défaut, 2560 px seulement sur grand écran **et** bonne connexion (`navigator.connection.effectiveType === '4g'` et pas de `saveData`). Sinon on reste en 1600 px.
- Placeholder flou de 16 px stocké en base, affiché immédiatement, puis fondu vers l'image réelle.
- Téléchargement : l'**original intact** (octets d'origine, EXIF conservés), plus une option « Web » pour les envois rapides.

---

## 6. Implémentation (2026-11-01) et mise en service

Tous les lots sont développés en une fois. Ajouts demandés en cours de route : **livraison de vidéos et de documents**, **jauge d'espace en direct**, **présentations enrichies** (6 couvertures, 4 ambiances, mot d'accueil).

### 6.1 Ce qui existe

| Zone | Fichiers |
|---|---|
| Base | `supabase/migrations/20261101000000_client_galleries.sql` (tables, compteurs, 2 filigranes et 4 modèles de départ) |
| Serveur | `lib/clientGalleries/` : `r2.ts` (URL signées SigV4, vérifiées contre le vecteur AWS), `security.ts`, `db.ts`, `mutations.ts`, `public.ts`, `types.ts` |
| API admin | `app/api/admin/client-galleries/` : liste, création, `batch` (séance), `bulk`, `[id]`, `[id]/photos`, `[id]/sets`, `[id]/activity`, `templates`, `watermarks`, `folders` |
| API client | `app/api/client/[slug]/` : `unlock`, `magic`, `visitor`, `view`, `favorite`, `download` |
| Page client | `app/client/[slug]/page.tsx` + `components/ClientGallery/` |
| Admin | `/admin/galeries` et `/admin/galeries/[id]` + `components/admin/ClientGalleries/` ; tuile sur le tableau de bord |

**Types de fichiers.** Les photos (JPEG, PNG, WebP, AVIF) reçoivent des aperçus 640 / 1600 / 2560 px et le filigrane éventuel. Les vidéos (MP4, MOV…) ont une image extraite comme vignette et sont lues en streaming dans la visionneuse. Les documents (PDF, ZIP, TIFF, HEIC…) apparaissent dans une section « Documents » avec deux boutons : Ouvrir et Télécharger. Taille maximale : 40 Mo par photo, 2 Go par vidéo ou document.

**Jauge d'espace.** Elle additionne le poids réel stocké sur R2 (originaux + aperçus) et le compare aux 10 Go gratuits. Elle est visible dans la liste et dans l'éditeur, avancée en direct pendant un envoi, et rafraîchie toutes les 30 s et au retour sur l'onglet.

### 6.2 Mise en service — dans l'ordre

1. **Base** : Supabase → SQL Editor → coller et exécuter `supabase/migrations/20261101000000_client_galleries.sql`.
2. **Cloudflare R2** :
   1. Créez un compte sur dash.cloudflare.com, puis ouvrez **R2** et activez l'offre (carte bancaire demandée, offre gratuite de 10 Go).
   2. **Create bucket** → nom `maxcellens-galeries`, en laissant l'accès public **désactivé**.
   3. Dans le bucket, ouvrez **Settings → CORS Policy** et collez :
      ```json
      [
        {
          "AllowedOrigins": ["https://maxcellens.com", "https://www.maxcellens.com", "http://localhost:3000"],
          "AllowedMethods": ["GET", "PUT", "HEAD"],
          "AllowedHeaders": ["*"],
          "ExposeHeaders": ["ETag", "Content-Length"],
          "MaxAgeSeconds": 86400
        }
      ]
      ```
      (adaptez les domaines réels du site).
   4. **R2 → Manage API tokens → Create API token**, permission **Object Read & Write**, limitée à ce bucket. Notez l'*Access Key ID*, le *Secret Access Key* et l'*Account ID*.
3. **Variables d'environnement** (Vercel → Settings → Environment Variables, et `.env.local` en local) :
   ```
   R2_ACCOUNT_ID=…
   R2_ACCESS_KEY_ID=…
   R2_SECRET_ACCESS_KEY=…
   R2_BUCKET=maxcellens-galeries
   GALLERY_SECRET=…   # 32+ caractères aléatoires, à ne plus changer ensuite
   ```
   Redéployez.
4. **Vérification** : ouvrez `/admin/galeries`. Le bandeau « R2 non configuré » doit avoir disparu. Créez une galerie de test, envoyez 2-3 photos, puis ouvrez **Aperçu**.

### 6.3 Limites connues

- Le ZIP se construit dans le navigateur. Sur Chrome et Edge, il s'écrit directement sur le disque, sans limite de taille. Sur Safari et Firefox, il passe par la mémoire : au-delà de ~1,8 Go, le client est invité à télécharger section par section.
- Les photos TIFF / HEIC ne sont pas décodables par le navigateur : elles sont livrées comme documents, sans aperçu.
- Le filigrane ne s'applique qu'aux aperçus des photos. Les originaux téléchargés restent intacts, et les vignettes de vidéos ne sont pas filigranées.
- L'envoi d'e-mails depuis le site (rappel d'expiration automatique) n'est pas inclus : le partage passe par « Copier le message », mailto ou WhatsApp.

---

## 7. Mode review vidéo (2026-11-03)

Réglage **« Mode review des vidéos »** (galerie → Réglages, et dans les modèles). Quand il est actif :

- **Côté client** : un clic sur une vidéo ouvre `/client/<slug>/review/<vidéo>`. On y trouve le lecteur, des repères de commentaires sur la ligne de temps et un fil de commentaires horodatés. La vidéo se met en pause pendant la saisie et le commentaire est lié à l'instant (option « Sans moment » pour une remarque générale). On peut répondre en fil, et supprimer ses propres commentaires. Bouton **« J'ai terminé ma review »** avec un mot facultatif. Le client s'identifie (nom + e-mail) avant de commenter.
- **Côté admin** : onglet **Reviews** de la galerie. Il liste les vidéos avec leurs compteurs et le badge « Nouvelle review », et ouvre la même salle pour répondre (« Maxcellens »), marquer « Traité » ou supprimer. Filtre « À traiter ». Les événements « Commentaire » et « Review terminée » apparaissent dans **Activité**.
- **E-mail** : un seul envoi quand le client valide sa review (pas à chaque commentaire). Il contient les commentaires ajoutés depuis sa validation précédente et un lien direct vers l'onglet Reviews. Une même personne ne peut pas valider deux fois en moins de 2 minutes.

### Mise en service
1. Supabase → SQL Editor : exécuter `supabase/migrations/20261103000000_client_gallery_reviews.sql` (et `20261102000000_client_gallery_folders_tree.sql` si ce n'est pas déjà fait).
2. Créer un compte gratuit sur **resend.com** avec l'adresse qui doit recevoir les notifications, puis **API Keys → Create API Key**.
3. Variables (Vercel + `.env.local`) :
   ```
   RESEND_API_KEY=re_…
   NOTIFY_EMAIL=adresse du compte Resend
   # MAIL_FROM=Maxcellens <galeries@maxcellens.com>   ← seulement après avoir validé le domaine dans Resend
   ```
   Sans domaine validé, Resend envoie depuis `onboarding@resend.dev`, uniquement vers l'adresse du compte. C'est suffisant pour se notifier soi-même.

## 8. Nom des fichiers sous forme de légende

Présentation → Style → **« Afficher le nom des fichiers »** : le nom (sans l'extension) apparaît au-dessus de chaque vignette côté client. C'est un réglage de présentation, donc il fait aussi partie des modèles.
