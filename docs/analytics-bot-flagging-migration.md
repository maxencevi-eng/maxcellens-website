# Migration analytics : colonnes is_bot et human_validated

Pour activer le **flagging des bots** (détection hybride serveur + client, sans supprimer les visites) :

1. **Colonnes à ajouter** sur la table `analytics_sessions` :

```sql
-- Optionnel : si les colonnes n'existent pas, les créer
ALTER TABLE analytics_sessions
  ADD COLUMN IF NOT EXISTS is_bot boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS human_validated boolean DEFAULT null;
```

- **is_bot** : rempli côté serveur (User-Agent + IP datacenter). `true` = probable bot, `false` ou `null` = pas flaggé.
- **human_validated** : rempli côté client après interaction (souris, scroll, touch) ou délai > 1s. `true` = visite validée comme humaine.

2. **Comportement** :
   - Les visites sont **toujours enregistrées** (aucune suppression).
   - En stats, avec « Exclure crawlers / bots » activé : on affiche seulement les sessions où `human_validated = true` OU `is_bot != true` (en cas de doute, on compte la visite).
   - Décocher « Exclure crawlers / bots » affiche toutes les visites, y compris celles flaggées bots.

3. **Sans migration** : le code continue de fonctionner en fallback (filtrage par User-Agent seul, pas de colonnes is_bot / human_validated).
