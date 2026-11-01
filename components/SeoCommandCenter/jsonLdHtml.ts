/**
 * Sérialise un JSON-LD pour un `<script type="application/ld+json">`.
 *
 * Échapper `<` empêche une valeur contenant `</script>` de refermer la balise
 * et d'injecter du HTML dans la page. Accepte un objet ou une chaîne JSON déjà
 * saisie (centre SEO) ; une chaîne invalide est ignorée.
 */
export function jsonLdHtml(value: unknown): string {
  let json: string;
  if (typeof value === 'string') {
    try {
      json = JSON.stringify(JSON.parse(value));
    } catch {
      return '';
    }
  } else {
    json = JSON.stringify(value);
  }
  return json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
