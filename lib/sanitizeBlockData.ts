/**
 * Assainissement du HTML porté par les blocs, avant écriture en base.
 *
 * Le rendu utilise `dangerouslySetInnerHTML` : c'est ICI que la confiance est
 * établie, pas au rendu. Un bloc enregistré est donc toujours sûr, y compris
 * s'il a été écrit par un appel direct à l'API.
 */

/** Balises et attributs autorisés dans un bloc « Texte ». */
const RICH_TEXT_OPTIONS = {
  allowedTags: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'figure', 'figcaption',
    'hr', 'code', 'pre', 'sub', 'sup', 'small', 'mark',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    '*': ['style', 'class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  // Les styles inline sont bornés : pas de position/z-index qui pourraient
  // recouvrir l'interface, pas d'url() qui pourrait fuiter une requête.
  allowedStyles: {
    '*': {
      color: [/^.*$/],
      'background-color': [/^.*$/],
      'text-align': [/^(left|right|center|justify)$/],
      'font-size': [/^\d+(?:\.\d+)?(px|rem|em|%)$/],
      'font-weight': [/^(normal|bold|[1-9]00)$/],
      'font-style': [/^(normal|italic)$/],
      'text-decoration': [/^.*$/],
      margin: [/^[\d\s.pxremt%-]+$/],
      padding: [/^[\d\s.pxremt%-]+$/],
    },
  },
} as const;

/**
 * Intégrations externes.
 * `iframe` est autorisé, mais uniquement vers une liste d'hôtes connus :
 * accepter n'importe quelle source reviendrait à laisser un tiers injecter du
 * contenu arbitraire dans le site.
 */
const EMBED_ALLOWED_HOSTS = [
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'youtu.be',
  'player.vimeo.com',
  'vimeo.com',
  'www.google.com',
  'maps.google.com',
  'open.spotify.com',
  'w.soundcloud.com',
  'calendly.com',
  'docs.google.com',
];

const EMBED_OPTIONS = {
  allowedTags: ['iframe', 'div', 'p', 'a', 'span'],
  allowedAttributes: {
    iframe: [
      'src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen',
      'loading', 'title', 'referrerpolicy',
    ],
    a: ['href', 'target', 'rel'],
    '*': ['class', 'style'],
  },
  allowedSchemes: ['https'],
  allowedIframeHostnames: EMBED_ALLOWED_HOSTS,
} as const;

async function run(html: string, options: any): Promise<string> {
  try {
    const mod = await import('sanitize-html');
    const sanitize = (mod as any).default || mod;
    return sanitize(String(html || ''), options);
  } catch (e) {
    // Si la bibliothèque est indisponible, on refuse le HTML plutôt que de
    // l'enregistrer tel quel.
    console.error('sanitize-html indisponible', e);
    return '';
  }
}

/**
 * Assainit les champs HTML d'un bloc selon son type.
 * Les types sans HTML sont renvoyés inchangés.
 */
export async function sanitizeBlockData(
  type: string,
  data: any
): Promise<any> {
  if (!data || typeof data !== 'object') return data;

  if (type === 'richtext') {
    return { ...data, html: await run(data.html, RICH_TEXT_OPTIONS) };
  }

  if (type === 'embed') {
    return { ...data, html: await run(data.html, EMBED_OPTIONS) };
  }

  if (type === 'columns') {
    // Les blocs imbriqués passent par la même vérification.
    const columns = Array.isArray(data.columns) ? data.columns : [];
    const cleaned = await Promise.all(
      columns.map(async (col: any) =>
        Array.isArray(col)
          ? Promise.all(
              col.map(async (n: any) => ({
                ...n,
                data: await sanitizeBlockData(String(n?.type || ''), n?.data),
              }))
            )
          : []
      )
    );
    return { ...data, columns: cleaned };
  }

  return data;
}

export { EMBED_ALLOWED_HOSTS };
