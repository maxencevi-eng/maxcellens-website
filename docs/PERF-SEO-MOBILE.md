# SEO / Performance mobile (Lighthouse)

## 1. Durées de mise en cache efficaces

- **Next.js** : Les assets `/_next/static/*` et les fichiers statics (ico, images, fonts) en racine ont déjà un cache long (1 an ou 24h selon le type) via `next.config.mjs`.
- **Supabase Storage** (images, polices) : Le TTL est géré par Supabase (souvent 1h par défaut). Pour améliorer le score :
  - Dans le **dashboard Supabase** : Storage → votre bucket → Policies ou Settings.
  - Si vous utilisez un **CDN** (ex. Cloudflare) devant Supabase, configurez des en-têtes `Cache-Control: public, max-age=31536000` pour les objets du bucket.
  - Sinon, via l’API Storage vous ne pouvez pas modifier les en-têtes de réponse des fichiers servis ; seul un proxy ou un CDN peut les surcharger.

## 2. Requêtes bloquantes (CSS)

- Les chunks CSS du build (Vercel) peuvent bloquer le premier rendu. Côté projet on limite la taille des bundles (e.g. `optimizePackageImports` dans `next.config.mjs`).
- Pour aller plus loin : réduire les imports CSS globaux, découper les feuilles par route, ou utiliser un outil d’extraction de critical CSS (hors scope config actuelle).

## 3. Ancien JavaScript (polyfills)

- Un fichier `.browserslistrc` cible les navigateurs récents pour limiter les polyfills et la taille du JS.
- Si le rapport signale encore des “legacy” bytes, vérifier qu’aucune dépendance lourde ne force des cibles trop anciennes.
