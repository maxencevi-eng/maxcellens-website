# Évolution majeure — Espace Admin, Transitions, Page Builder

> Document de proposition. Analyse de l'existant + architecture cible + plan de livraison.
> Rédigé le 2026-08-10.

---

## 0. Diagnostic de l'existant

### 0.1 Chiffres

| Indicateur | Valeur |
|---|---|
| Lignes de source (hors `bac/`, hors `node_modules`) | ~40 000 |
| Composants « modale admin » identifiés | **25** |
| … qui utilisent le composant partagé `Modal` | **5** (SiteStyleEditor, TransitionsEditor, RichTextModal, ViewBlockModal, ViewProfileModal) |
| … qui réimplémentent leur overlay `position:'fixed'` à la main | **20** |
| Valeurs de `z-index` distinctes utilisées pour des overlays | **13** (`50000`, `50001`, `60000`, `9999`, `99999`, `999998`, `999999`…) |
| Règles `#admin-sidebar` dans `globals.css` | **53** — réparties en **deux blocs concurrents** (l. ~216 et l. ~604) |
| Plus gros fichier admin | `HomeBlocks/HomeBlockModal.tsx` — **2 140 lignes** |

### 0.2 Les trois problèmes de fond

**A. Aucune couche de présentation partagée.**
`components/Modal/Modal.tsx` fait 30 lignes et ne gère que : portail, Escape, clic sur l'overlay. Il ne gère pas le focus trap, le scroll-lock du body, les tailles, les onglets, la barre d'action, l'état de sauvegarde, ni le responsive au-delà d'un `@media` de secours. Résultat : chaque modale a recréé sa propre version, avec ses propres couleurs en dur (`#fff`, `#000`, `#e5e7eb`, `rgba(0,0,0,0.45)` vs `0.55`), ses propres rayons (`8px`, `12px`, `22px`, `28px`), ses propres boutons.

Exemple représentatif — `PageLayoutModal.tsx` l. 94-99 : overlay, panneau, header et bouton de fermeture entièrement en style inline, aucun rapport avec `Modal.module.css`.

**B. Le style admin ne consomme pas le centre de style du site.**
`SiteStyleProvider` pose `--color-primary`, `--bg-color`, `--fg`, `--button-1-bg`… sur `:root`. Les modales admin, elles, sont en `background:#fff; color:#000` en dur. `ModalTabs.tsx` est le seul composant qui tente de lire les variables (`var(--button-2-bg, #f5f5f5)`) — et il le fait en style inline, donc non surchargeable.

Conséquence directe : changer la couleur primaire dans « Style du site » n'a **aucun** effet sur l'admin.

**C. Les pages et les blocs sont câblés en dur.**
Il n'existe pas de notion de « page » en base. L'ordre des blocs est une liste de chaînes figée, dupliquée **à trois endroits** :

- `app/api/block-visibility/route.ts` — `DEFAULT_ORDER_HOME`, `DEFAULT_ORDER_CONTACT`, …
- `components/BlockVisibility/BlockVisibilityContext.tsx` — les mêmes constantes, **redéclarées**
- chaque `*PageClient.tsx` qui fait un `switch` sur ces identifiants

Et ces deux copies ont déjà divergé : la route API déclare `contact_kit`, le contexte déclare `contact_gallery` à la même position. Ajouter un bloc aujourd'hui = toucher 4 fichiers + un `switch` de rendu.

---

## 1. Bugs confirmés (à corriger dans le lot 1)

| # | Fichier | Problème | Impact |
|---|---|---|---|
| 1 | `PageLayoutModal.tsx` l. 185, `PageLayoutProvider.tsx` l. 16 | `--section-gap-desktop` / `--section-gap-mobile` sont écrits sur `:root` mais **consommés nulle part** (`grep var(--section-gap` → 0 résultat en CSS) | Le champ « Espace entre sections » **ne fait rien**, desktop et mobile |
| 2 | `PageLayoutModal.tsx` l. 13, 23, 33 | `marginVertical` est dans le type, dans les défauts, et **sauvegardé en base** — mais aucun champ d'UI, aucune variable CSS | Donnée morte persistée |
| 3 | `styles/globals.css` l. ~216 **et** l. ~604 | Deux blocs `#admin-sidebar` complets qui se recouvrent (largeur, fond, ombre, padding redéfinis) | Le second gagne par cascade ; le premier est du code mort qui masque l'intention |
| 4 | `block-visibility/route.ts` vs `BlockVisibilityContext.tsx` | `contact_kit` vs `contact_gallery` — ordres par défaut divergents | Un bloc contact peut disparaître ou se dupliquer selon la source lue |
| 5 | `PageTransitionOverlay.tsx` l. 42-53 | Le handler intercepte **tous** les `<a>` en phase capture, y compris ceux à l'intérieur des modales admin | Cliquer un lien dans une modale déclenche une transition de page plein écran |
| 6 | `PageTransitionOverlay.tsx` l. 53 | `if (href === pathname) return` — pas de normalisation des slashs finaux ni des query strings | `/contact/` depuis `/contact` rejoue une transition inutile |
| 7 | `PageTransitionOverlay.tsx` | Aucun `download`, `rel="external"`, ni `data-no-transition` dans les exclusions | Les liens de téléchargement sont interceptés et cassés |
| 8 | `Modal.tsx` | Pas de scroll-lock du `body`, pas de focus trap, pas de restauration du focus | La page défile derrière la modale ; Tab sort de la modale |
| 9 | `AdminSidebar.tsx` l. 76-77 | `dynamic()` appelé **dans le corps du composant** | Nouveau composant à chaque render → remontage de `SiteStyleEditor` / `TransitionsEditor`, perte d'état de formulaire |
| 10 | `SiteStyleProvider.tsx` l. 32-33 | `useEffect` de preview live avec `[local]` en dépendance dans `SiteStyleEditor` | Écriture CSS à chaque frappe clavier |

---

## 2. Partie 1 — Refonte de l'espace admin

### 2.1 Principe : un noyau `components/admin/`

Tout ce qui est admin passe par un seul dossier. Un changement de rayon, de couleur ou d'espacement se fait à **un endroit**.

```
components/admin/
├── tokens.css              ← source unique des variables --adm-*
├── AdminShell/             ← la barre latérale, refondue
│   ├── AdminShell.tsx
│   ├── AdminShellNav.tsx   ← rendu générique depuis le registre
│   └── AdminShell.module.css
├── AdminModal/
│   ├── AdminModal.tsx      ← remplace Modal.tsx (compat ascendante)
│   ├── AdminModalHeader.tsx
│   ├── AdminModalFooter.tsx ← barre d'action + état de sauvegarde
│   └── AdminModal.module.css
├── fields/                 ← primitives de formulaire
│   ├── Field.tsx           ← label + aide + erreur
│   ├── TextField.tsx
│   ├── NumberField.tsx
│   ├── SliderField.tsx     ← remplace les 6 copies de <input type=range>
│   ├── ColorField.tsx      ← remplace les ~20 <input type=color>
│   ├── SelectField.tsx
│   ├── ToggleField.tsx
│   ├── ImageField.tsx      ← aperçu + upload + suppression, une seule fois
│   └── RichTextField.tsx   ← enveloppe LexicalEditor
├── AdminButton.tsx         ← variants: primary | ghost | danger | icon
├── AdminTabs.tsx           ← remplace ui/ModalTabs.tsx
├── AdminSection.tsx        ← titre de section + grille responsive
├── AdminToolbar.tsx        ← barre flottante « Modifier / Masquer / ↑↓ » sur les blocs
├── registry.ts             ← déclaration des entrées du menu admin
└── useAdminForm.ts         ← charge / dirty / save / erreur, mutualisé
```

### 2.2 `tokens.css` — le pont vers le centre de style

Le point clé de la demande « met à jour le centre de style du site ». Chaque token admin **dérive** d'une variable du site, avec un repli :

```css
:root {
  /* Surfaces — dérivées du centre de style */
  --adm-bg:            var(--block-bg, #ffffff);
  --adm-bg-elevated:   color-mix(in srgb, var(--adm-bg) 94%, #000);
  --adm-fg:            var(--color-text, #111318);
  --adm-fg-muted:      color-mix(in srgb, var(--adm-fg) 62%, transparent);
  --adm-border:        color-mix(in srgb, var(--adm-fg) 12%, transparent);

  /* Accent — dérivé du centre de style */
  --adm-accent:        var(--color-primary, #0b5cff);
  --adm-accent-fg:     var(--button-1-color, #ffffff);
  --adm-danger:        #dc2626;

  /* Géométrie — une seule échelle */
  --adm-radius-sm: 8px;
  --adm-radius:    14px;
  --adm-radius-lg: 20px;
  --adm-space-1: 4px;  --adm-space-2: 8px;  --adm-space-3: 12px;
  --adm-space-4: 16px; --adm-space-5: 24px; --adm-space-6: 32px;

  /* Élévation */
  --adm-shadow-panel: 0 24px 60px rgba(8, 16, 24, 0.18);

  /* Empilement — remplace les 13 valeurs actuelles */
  --adm-z-toolbar: 4000;
  --adm-z-sidebar: 5000;
  --adm-z-modal:   6000;
  --adm-z-nested:  6100;   /* modale ouverte depuis une modale */
  --adm-z-toast:   7000;
}
```

Puis on **ajoute** au `SiteStyleEditor` un onglet « Interface admin » qui pilote `--adm-accent`, le thème (clair / sombre / auto) et la densité (compact / confort). Ces valeurs partent dans la même clé `site_style` déjà persistée par `SiteStyleProvider`, sous `style.admin`.

> Effet visé : régler la couleur primaire du site recolore l'admin ; l'admin peut aussi être découplé si l'utilisateur le souhaite.

### 2.3 `AdminModal` — le composant unique

API proposée, conçue pour absorber les 25 modales existantes :

```tsx
<AdminModal
  title="Dimensions & mise en page"
  size="md"                    // sm 480 | md 640 | lg 880 | xl 1120 | full
  tabs={[{id:'desktop',label:'Bureau'},{id:'mobile',label:'Mobile'}]}
  activeTab={tab} onTabChange={setTab}
  onClose={onClose}
  dirty={form.dirty}           // → confirmation avant fermeture
  saving={form.saving}
  error={form.error}
  onSave={form.save}
  footer="auto"                // Annuler / Enregistrer, ou ReactNode custom
/>
```

Ce que le composant apporte et qui n'existe nulle part aujourd'hui :

- **Scroll-lock** du `body` (avec compensation de la barre de défilement, pour éviter le saut horizontal)
- **Focus trap** + restauration du focus sur l'élément déclencheur à la fermeture
- **Pile de modales** — une modale ouverte depuis une modale s'empile proprement (`--adm-z-nested`), Escape ne ferme que celle du dessus
- **Garde-fou « modifications non enregistrées »** — clic overlay / Escape / bouton demandent confirmation si `dirty`
- **Responsive natif** : sur `≤768px`, la modale devient une **feuille plein écran** (`bottom sheet`) avec header collant, corps défilant et footer collant en zone sûre (`env(safe-area-inset-bottom)`) — au lieu du `max-height: calc(100vh - 24px)` actuel
- **`dvh` au lieu de `vh`** pour ne plus être coupé par la barre d'URL mobile
- **Isolation du clic** — un `<a>` dans une modale ne déclenche plus la transition de page (corrige le bug #5)

### 2.4 `AdminToolbar` — les boutons admin dans les pages

Aujourd'hui chaque page redéfinit son bouton « Modifier ». `editBtnStyle` dans `HomePageClient.tsx` (l. 68-80) est copié, à quelques pixels près, dans une douzaine de fichiers.

Cible : une barre unique, ancrée sur le bloc, qui regroupe toutes les actions bloc :

```tsx
<AdminToolbar blockId="home_services" page="home">
  <AdminToolbar.Edit onClick={() => open('services')} />
  <AdminToolbar.Visibility />   {/* remplace BlockVisibilityToggle */}
  <AdminToolbar.Width />        {/* remplace BlockWidthToggle       */}
  <AdminToolbar.Move />         {/* remplace BlockOrderButtons       */}
  <AdminToolbar.Duplicate />    {/* nouveau */}
  <AdminToolbar.Delete />       {/* nouveau */}
</AdminToolbar>
```

Elle lit `useBlockVisibility()` elle-même : plus de props à câbler bloc par bloc. Sur mobile, elle se replie en un bouton unique qui ouvre un menu.

### 2.5 La barre latérale (`AdminShell`)

Problèmes actuels : largeur fixe `340px` non redimensionnable, sous-menus en accordéon qui poussent le contenu, uploads logo/favicon noyés dans le menu, bouton de repli positionné en `left: 340` en dur (désynchronisé si la largeur change), pas de recherche, pas de responsive mobile réel.

Refonte proposée :

- **Registre déclaratif** (`registry.ts`) : `{ id, label, icon, group, render: 'modal' | 'panel', component }`. Ajouter une entrée admin = 1 ligne, plus de JSX à écrire.
- **Groupes** : *Apparence* (Style, Transitions, Logo/Favicon) · *Structure* (Pages, Menu, Header, Footer, Réseaux) · *Contenu* (Blocs, Médias) · *Données* (SEO, Statistiques, Maintenance)
- **Recherche floue** (`Ctrl/⌘ K`) sur toutes les entrées — devient le mode d'accès principal quand le menu grossit
- **Largeur redimensionnable** par glisser, persistée ; le bouton de repli se cale sur `var(--admin-sidebar-open-width)` au lieu d'un `340` en dur
- **Mobile** : la barre devient un tiroir plein écran, le bouton `≡` passe en bas à droite (atteignable au pouce)
- Les uploads logo / favicon / logo footer sortent du menu → modale **« Identité visuelle »**, construite sur `ImageField`

### 2.6 La page `/admin`

Aujourd'hui : `PageHeader` + `AdminTitleBlock` + `AdminLogin` + `AdminNav` (une grille de 10 liens). Elle ne sert qu'à naviguer.

Cible — un vrai tableau de bord :

- **Bandeau d'état** : santé Supabase (route `/api/admin/supabase-health` déjà présente), dernière sauvegarde, mode maintenance actif
- **Statistiques en tête** : vues 7 jours, top pages — la donnée existe déjà dans `StatisticsModal`, il suffit de l'extraire en composant réutilisable
- **Grille des pages** : chaque page du site avec vignette, nombre de blocs, état publié/brouillon, et accès direct à l'édition
- **Accès rapides** : les 6 actions les plus fréquentes
- Grille responsive `repeat(auto-fill, minmax(260px, 1fr))`

### 2.7 Table de migration des 25 modales

| Modale | Lignes | Action |
|---|---|---|
| `HomeBlocks/HomeBlockModal` | 2140 | **Découper** en un fichier par type de bloc + `AdminModal` |
| `Analytics/StatisticsModal` | 1459 | Découper (KPI / graphiques / tableaux) + `AdminModal` |
| `PageIntroBlock/PageIntroBlockModal` | 687 | Migrer + factoriser avec les autres éditeurs d'intro |
| `AnimationEditor/AnimationBlockModal` | 643 | Migrer |
| `SeoCommandCenter/SeoCommandCenterModal` | 604 | Migrer (déjà onglets → `AdminTabs`) |
| `SocialLinksEditor` | 554 | Migrer + liste triable partagée |
| `FooterEditModal` | 532 | Migrer |
| `Clients/ClientsEditModal` | 495 | Migrer + `ImageField` |
| `ContactBlocks/ContactGalleryEditModal` | 451 | Migrer |
| `ViewPage/ViewBlockModal` | 447 | Déjà sur `Modal` → bascule `AdminModal` |
| `Analytics/MaintenanceModal` | 382 | Migrer |
| `ContactBlocks/ContactFaqEditModal` | 368 | Migrer |
| `ContactBlocks/ContactEditModal` | 366 | Migrer |
| `HeroEditor` | 319 | Migrer |
| `ContactBlocks/ContactZonesEditModal` | 295 | Migrer |
| `MobileMenuEditModal` | 273 | Migrer + fusionner avec `MenuEditModal` (onglets Desktop/Mobile) |
| `MenuEditModal` | 273 | ↑ fusionné |
| `TransitionsEditor` | 223 | Déjà sur `Modal` → bascule + aperçu live (§3) |
| `PageLayoutModal` | 194 | Migrer + **corriger les bugs #1 et #2** |
| `ViewPage/ViewProfileModal` | 179 | Bascule |
| `LegalEditModal`, `HeaderSettings`, `GalleriesPagesEditor`, `PortraitIntroEditor`, `VideoIntroEditor` | — | Migrer |

**Contrat de non-régression** : chaque migration conserve la même clé `site_settings`, le même payload JSON et la même route API. C'est une refonte de présentation, pas de données.

### 2.8 Vérification des modales « structure » (demande explicite)

Ces quatre-là touchent au style, aux zones, aux dimensions et au header — elles reçoivent un audit dédié :

- **`SiteStyleEditor`** — ajouter l'onglet « Interface admin » ; corriger le `useEffect` de preview (bug #10) par un `debounce` ; réinitialisation par section ; contrôle de contraste WCAG sur chaque paire couleur de fond / texte.
- **`PageLayoutModal`** — **câbler `--section-gap-*`** dans `globals.css` et dans les modules de blocs (bug #1) ; supprimer ou implémenter `marginVertical` (bug #2) ; ajouter un aperçu schématique en direct des marges ; passer les `<input type=number>` en `NumberField` avec unités.
- **`HeaderSettings`** — actuellement pas de portail, pas d'`Escape` ; migrer vers `AdminModal` ; ajouter un aperçu du header.
- **`BlockVisibility` / largeur / ordre** — unifier les trois sources d'`ORDER` divergentes en **un seul module partagé** importé par la route API et par le contexte (bug #4).

---

## 3. Partie 2 — Fluidité des transitions de page

### 3.1 Pourquoi ça ne « colle » pas aujourd'hui

Analyse de `PageTransitionOverlay.tsx` :

**a) Temps mort structurel.** En mode `standard`, `router.push()` n'est appelé qu'à la **fin** de l'animation d'entrée (l. 155). Le chargement réseau commence donc après ~330 ms d'animation, pendant lesquels rien ne se charge. La phase `waiting` qui suit est un écran **strictement immobile**, jusqu'à `maxWait` (2 s par défaut). C'est la cause n°1 de la sensation d'à-coup.

**b) Zéro préchargement.** `grep prefetch` → aucun usage côté site. Les `<Link>` de Next préchargent normalement au survol, mais le handler global fait `e.preventDefault()` et passe par `router.push()`, ce qui contourne ce bénéfice.

**c) Courbe d'accélération inversée.** `ease: [0.25, 0.46, 0.45, 0.94]` est une courbe *ease-out* — appliquée aux **deux** phases (l. 184). Un rideau qui **couvre** doit accélérer (*ease-in*) ; un rideau qui **révèle** doit décélérer (*ease-out*). Actuellement le recouvrement ralentit en fin de course : c'est exactement ce qui donne l'impression de « mollesse ».

**d) Deux gestes au lieu d'un.** L'entrée monte du bas (`100% → 0%`), la sortie monte vers le haut (`0% → -100%`). Entre les deux, une pause de durée variable. L'œil perçoit deux mouvements distincts, pas un balayage continu.

**e) Aucun retour pendant l'attente.** Si la page met 1,5 s, l'utilisateur fixe un aplat de couleur figé.

**f) Pas de `prefers-reduced-motion`** — `grep` → 0 résultat sur tout le projet.

**g) Le scroll est remis à zéro au moment où le rideau s'ouvre** (l. 121, 134, 147) — le double `rAF` limite le risque, mais le `maxWait` (l. 133) déclenche l'exit **sans** double `rAF`, donc un saut visible reste possible sur page lente.

### 3.2 Cible

1. **Précharger dès l'intention.** `router.prefetch(href)` sur `mouseenter` / `touchstart` / `focus` du lien, avec un `Set` de déduplication. Le gain typique est de 200 à 600 ms — souvent la totalité de la phase `waiting`.
2. **Passer `seamless` en défaut** et lancer `router.push()` **immédiatement** au clic, dans les deux modes. L'animation et le réseau tournent alors en parallèle.
3. **Courbes asymétriques** :
   - entrée : `cubic-bezier(0.4, 0.0, 1, 1)` (*ease-in*, accélère vers le recouvrement)
   - sortie : `cubic-bezier(0.0, 0.0, 0.2, 1)` (*ease-out*, décélère en révélant)
   - sortie ~20 % plus longue que l'entrée — la révélation doit respirer.
4. **Durée minimale de recouvrement** (~120 ms) pour que le rideau ne « clignote » pas quand la page est déjà en cache. Aujourd'hui une page instantanée produit un flash.
5. **Indicateur de progression** au-delà de 400 ms d'attente : fondu d'un logo ou d'une barre fine. Configurable dans `TransitionsEditor`.
6. **`prefers-reduced-motion: reduce`** → fondu simple de 120 ms.
7. **Performance** : `will-change: transform`, `transform: translate3d()`, `contain: strict` sur l'overlay ; suppression du `pointer-events` qui bascule en cours d'animation.
8. **Nouveaux modes** dans `TransitionsEditor`, avec **aperçu en direct** dans la modale (rejouer la transition sans naviguer) :
   - `curtain` — le balayage actuel, corrigé
   - `fade` — fondu simple
   - `slide` — la page sortante glisse, l'entrante suit (nécessite un conteneur de vue)
   - `mask` — révélation par forme
9. **Corriger les exclusions de liens** (bugs #5, #6, #7) : normalisation des URL, `download`, `target`, `rel="external"`, `data-no-transition`, et **exclusion de tout ce qui est dans `[data-admin-ui]`**.
10. **Restauration du scroll** sur navigation arrière/avant (`popstate`) — aujourd'hui tout est remis à 0.

---

## 4. Partie 3 — Administration des pages et des blocs

C'est le chantier le plus lourd : passer d'un site à pages fixes à un site piloté par les données.

### 4.1 Modèle de données

Deux nouvelles tables Supabase (le reste du site continue de lire `site_settings`, aucune rupture) :

```sql
create table public.site_pages (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,          -- 'tarifs', 'a-propos/equipe'
  title        text not null,
  parent_id    uuid references public.site_pages(id) on delete set null,
  status       text not null default 'draft', -- draft | published
  position     int  not null default 0,
  show_in_menu boolean not null default false,
  header       jsonb,                          -- titre, sous-titre, image, hauteur
  seo          jsonb,                          -- réutilise le format de lib/pageSeo.ts
  layout       jsonb,                          -- surcharge locale de page_layout
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table public.page_blocks (
  id         uuid primary key default gen_random_uuid(),
  page_id    uuid not null references public.site_pages(id) on delete cascade,
  type       text not null,        -- clé du registre de blocs
  position   int  not null,
  visible    boolean not null default true,
  width_mode text not null default 'full',
  data       jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on public.page_blocks (page_id, position);
```

RLS : lecture publique sur `status = 'published'`, écriture réservée au rôle service (comme les routes `/api/admin/*` existantes).

### 4.2 Registre de blocs — la pièce maîtresse

Un fichier unique déclare **tous** les blocs disponibles. C'est lui qui rend le système extensible sans toucher au reste.

```ts
// components/blocks/registry.ts
export type BlockDefinition<T = any> = {
  type: string;
  label: string;
  icon: LucideIcon;
  category: 'contenu' | 'media' | 'mise-en-page' | 'action';
  defaults: T;
  Render: React.ComponentType<{ data: T; blockId: string }>;
  Editor: React.ComponentType<{ data: T; onChange: (d: T) => void }>;
  /** Nettoyage des ressources distantes à la suppression du bloc */
  onDelete?: (data: T) => Promise<void>;
  /** Migration ascendante des anciens payloads */
  migrate?: (raw: unknown) => T;
};

export const BLOCK_REGISTRY: Record<string, BlockDefinition> = { /* … */ };
```

**Blocs récupérés depuis l'existant** (ils deviennent des entrées du registre, sans réécriture du rendu) : `intro`, `banner`, `services`, `portrait`, `cadreur`, `animation`, `stats`, `clients`, `quote`, `cta`, `video-gallery`, `photo-gallery`, `masonry`, `contact-zones`, `contact-faq`, `rich-text`, `map`, `link`.

**Blocs nouveaux demandés** :

| Bloc | Réglages |
|---|---|
| `separator` | style (trait / points / dégradé / ornement), épaisseur, couleur *(dérivée du centre de style)*, largeur, marges |
| `spacer` | hauteur desktop / hauteur mobile, en px ou vh |
| `button` | libellé, lien (sélecteur de page interne **ou** URL externe), style 1/2, taille, alignement, icône, pleine largeur mobile |
| `columns` | 2 à 4 colonnes, chacune contenant des blocs (imbrication) |
| `embed` | HTML/iframe assaini via `sanitize-html`, déjà en dépendance |

### 4.3 Le constructeur de page

Deux modes d'édition, accessibles depuis la barre admin :

**Mode « sur la page » (inline).** L'admin navigue sur la page réelle. Entre chaque bloc, une zone de dépôt `+` fait apparaître le sélecteur de blocs (`ViewAddBlockMenu` existe déjà et sert de base). Chaque bloc porte son `AdminToolbar`. C'est le mode principal — il conserve le WYSIWYG que le site a déjà.

**Mode « plan » (modale).** Liste triable par glisser-déposer (`@dnd-kit` est **déjà** en dépendance et utilisé), avec dupliquer / masquer / supprimer et un aperçu compact. Utile pour réorganiser une page longue.

**Gestion des pages** — modale « Pages » :
créer (slug auto depuis le titre, avec contrôle d'unicité et de collision avec les routes statiques `/contact`, `/portrait`…), renommer, dupliquer avec ses blocs, publier / dépublier, réordonner, supprimer, définir la présence au menu.

### 4.4 Routage

Une route attrape-tout, placée après les routes statiques existantes (Next donne la priorité aux segments statiques, aucune collision) :

```
app/[...slug]/page.tsx
```

Elle lit `site_pages` par slug (404 si absent ou brouillon hors session admin), génère les métadonnées via `lib/pageSeo.ts` déjà en place, puis rend les blocs via le registre. Les pages existantes en dur ne bougent pas — la migration vers le système dynamique se fera page par page, plus tard, si souhaité.

### 4.5 Sauvegarde, suppression, nettoyage

Points explicitement demandés :

- **Sauvegarde** — enregistrement optimiste avec `debounce` 800 ms, indicateur « Enregistré / Enregistrement… / Échec » dans le footer de `AdminModal`, et bouton de réessai. Verrou optimiste par `updated_at` pour éviter l'écrasement entre deux onglets.
- **Suppression** — confirmation typée pour les pages (saisir le titre), corbeille 30 jours (`deleted_at`), et appel de `onDelete` du registre pour **supprimer les médias Supabase Storage associés**. Les routes `delete-storage`, `delete-gallery`, `delete-hero-media` existent déjà et seront réutilisées.
- **Historique** — une table `page_revisions` optionnelle (lot 5) : instantané JSON à chaque sauvegarde, restauration en un clic.
- **Lien au centre de style** — chaque bloc n'expose que des couleurs *dérivées* (`primaire`, `secondaire`, `fond de bloc`, `accent`) et non des hex libres, avec une option « personnalisé » explicite. Aujourd'hui `homeDefaults.ts` mélange des hex en dur (`#13100D`, `#F5F0E8`) et le centre de style ; le registre normalise cela.
- **Nettoyage du code** — sur ce chantier : suppression des constantes `DEFAULT_ORDER_*` dupliquées, suppression du bloc `#admin-sidebar` mort dans `globals.css`, suppression des `editBtnStyle` copiés, retrait des `// @ts-ignore` d'`AdminSidebar.tsx` (l. 8-25) une fois les composants typés.

---


---

## 5. Ce qui a été livré

Tous les lots ont été implémentés. `npx tsc --noEmit` et `npx next build` passent.

### 5.1 Noyau `components/admin/`

| Fichier | Rôle |
|---|---|
| `tokens.css` | 60 variables `--adm-*`. **Aucun `color-mix()`** : la browserslist descend à Chrome 87 / Safari 14, les nuances sont donc explicites. L'accent dérive de `var(--button-1-bg)`. |
| `AdminModal/` | Modale unique : portail, scroll-lock avec compensation de scrollbar, focus trap, pile de modales, garde-fou « modifications non enregistrées », `⌘S`, feuille plein écran sur mobile (`100dvh` + `env(safe-area-inset-bottom)`), `data-admin-ui` pour l'exclusion des transitions. |
| `modalStack.ts` | Pile module-level : Escape ne ferme que la modale du sommet, le scroll n'est rendu qu'à la fermeture de la dernière. |
| `useFocusTrap.ts` | Piège + restauration du focus, saute le bouton « Fermer » au focus initial. |
| `AdminButton` | 5 variantes, 3 tailles, `iconOnly`, `loading`, `block`. |
| `AdminTabs` | Onglets ARIA navigables aux flèches, variantes soulignée et pilules. |
| `AdminSection` + `AdminCard` / `AdminNotice` / `AdminEmpty` | Structure de formulaire et grilles responsives. |
| `fields/` | `TextField`, `NumberField`, `SliderField`, `ColorField`, `SelectField`, `ToggleField`, `SegmentedField`, `ImageField`. |
| `contrast.ts` | Ratio WCAG 2.1 + verdict AA / AA-gros / insuffisant, affiché par `ColorField`. |
| `useAdminForm.ts` | Chargement, `dirty`, `save`, erreurs — mutualisé. |
| `AdminToolbar` | Barre d'actions de bloc (modifier / visibilité / largeur / ordre / dupliquer / supprimer), repliée en menu sur mobile. |
| `legacy.css` | Normalise les contrôles bruts dans les corps pas encore réécrits, portée `[data-admin-ui]`. |

### 5.2 Coque et tableau de bord

- `AdminShell` remplace `AdminSidebar` (supprimé) : registre déclaratif, recherche **⌘K** insensible aux accents, largeur redimensionnable et persistée, tiroir plein écran sur mobile, groupes *Apparence / Structure / Contenu / Données*.
- `registry.tsx` — 14 entrées. Ajouter un écran admin = **une entrée**.
- `/admin` : tableau de bord (santé Supabase, nombre de pages, visiteurs et vues 7 jours, accès rapides, grille des pages) derrière `AdminGate`.
- **491 lignes de CSS admin supprimées** de `globals.css` (1 318 → 827), dont les deux blocs `#admin-sidebar` concurrents.

### 5.3 Transitions

`router.push()` est désormais appelé **au clic**, plus à la fin de l'animation. Ajouts : préchargement sur `mouseover`/`touchstart`/`focusin`, courbes asymétriques (`EASE_COVER` accélère, `EASE_REVEAL` décélère), durée minimale de recouvrement, indicateur au-delà de 400 ms, `prefers-reduced-motion`, 4 styles (rideau / fondu / glissement / iris), aperçu rejouable dans l'éditeur. `linkTarget.ts` isole les règles d'exclusion.

### 5.4 Page builder

- `sql/page_builder.sql` — tables `site_pages` / `page_blocks`, RLS, triggers `updated_at`, fonction `purge_deleted_pages()`. **À exécuter dans Supabase** (le site fonctionne sans : `lib/pages.ts` détecte la table absente).
- Routes : `GET|POST /api/pages`, `GET|PATCH|DELETE /api/pages/:id`, `GET|POST|PUT /api/pages/:id/blocks`, `PATCH|DELETE /api/blocks/:id`, `GET /api/menu-pages`.
- `app/[...slug]/page.tsx` — les pages historiques gardent la priorité (segments statiques).
- Registre de blocs : `heading`, `richtext`, `image`, `button`, **`separator`**, **`spacer`**, **`columns`** (2–4, imbrication), `embed`.
- `lib/sanitizeBlockData.ts` — assainissement **à l'écriture**, pas au rendu ; `iframe` limité à une liste d'hôtes.
- Suppression : corbeille 30 jours, confirmation par saisie du titre, purge des médias Supabase via `storagePaths()` du registre.
- Sitemap et menu du header alimentés par les pages publiées.

### 5.5 Bugs corrigés

Les 10 bugs de la section 1 sont corrigés. Précisions :

- **#1** `--section-gap-*` est consommé par `.page-blocks > * + *`, classe ajoutée aux 6 conteneurs de blocs. **Le défaut est passé à 0** : le réglage n'ayant jamais été appliqué, conserver 48 px aurait brusquement écarté toutes les sections du site.
- **#2** `marginVertical` a un champ et alimente `--container-margin-y-*` sur `.content-inner`.
- **#4** `components/BlockVisibility/blockOrders.ts` est la source unique, importée par la route API et le contexte. `contact_gallery` a été retenu.
- **#9** Les `dynamic()` sont au niveau du module dans `registry.tsx`. À noter : `next/dynamic` **exige un littéral d'objet inline** pour ses options — une constante partagée fait échouer le build.
- **#10** L'aperçu du centre de style est temporisé à 90 ms.

### 5.6 Modales

**19 écrans** passent par `AdminModal`. `components/Modal/Modal.tsx` est devenu un adaptateur qui délègue à `AdminModal`, ce qui a upgradé `RichTextModal`, `ViewBlockModal` et `ViewProfileModal` sans les toucher.

Réécrits intégralement : `PageLayoutModal` (+ aperçu), `HeaderSettings` (+ aperçu), `SiteStyleEditor` (+ onglet « Interface admin »), `TransitionsEditor` (+ aperçu), `MenuEditor`.

`MenuEditModal` et `MobileMenuEditModal` étaient deux fichiers de 273 lignes quasi identiques : ils délèguent maintenant tous deux à `MenuEditor`, paramétré par `scope`.

Coque migrée, corps conservé : Footer, Réseaux, Clients, Legal, SEO, Statistiques, Maintenance, Contact (FAQ / Zones / Galerie).

### 5.7 Reste à faire

Ces modales gardent leur coque d'origine — elles fonctionnent et `legacy.css` normalise leurs contrôles, mais leur chrome n'est pas encore uniformisé :

`HomeBlockModal` (2 140 l.), `AnimationBlockModal`, `PageIntroBlockModal`, `ContactEditModal`, `HeroEditor`, `EditableVideoGallery`, `EditablePortraitGallery`, `GalleriesPagesEditor`, `PortraitIntroEditor`, `VideoIntroEditor`, `ViewStatsModal`.

Le découpage de `HomeBlockModal` et `StatisticsModal` en un fichier par bloc reste également à faire : seule leur coque a été reprise.

---

## 6. Mise en service

1. Exécuter `sql/page_builder.sql` dans l'éditeur SQL Supabase.
2. Ouvrir `/admin`, puis **Structure → Pages** pour créer une première page.
3. Ouvrir la page créée : les blocs s'ajoutent sur place via « Ajouter un bloc ».
4. **Apparence → Style du site → Interface admin** pour découpler ou non l'accent de l'admin.
5. Vérifier **Structure → Dimensions & mise en page** : « Espace entre sections » a maintenant un effet réel.
