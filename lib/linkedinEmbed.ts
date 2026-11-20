/**
 * Publications LinkedIn (vidéos) lisibles dans les galeries du site.
 *
 * Formats acceptés :
 *  - https://www.linkedin.com/feed/update/urn:li:activity:123…/
 *  - https://www.linkedin.com/feed/update/urn:li:ugcPost:123…/  (ou urn:li:share:)
 *  - https://www.linkedin.com/posts/nom_titre-activity-123…-abcd/
 *  - https://www.linkedin.com/embed/feed/update/urn:li:…  (déjà au format intégré)
 *  - https://lnkd.in/…  (lien court, résolu côté serveur)
 *
 * La vidéo (MP4) et sa couverture sont récupérées par /api/linkedin-video,
 * puis lues par le lecteur du site (VideoLightbox).
 */
export function isLinkedInUrl(url: string): boolean {
  return /^https?:\/\/(([a-z]+\.)?linkedin\.com|lnkd\.in)\//i.test(String(url || '').trim());
}

export function isLinkedInShortUrl(url: string): boolean {
  return /^https?:\/\/lnkd\.in\//i.test(String(url || '').trim());
}

/** Image de couverture récupérée côté serveur (redirection vers media.licdn.com). */
export function getLinkedInPosterUrl(url: string): string {
  return `/api/linkedin-video?as=poster&url=${encodeURIComponent(String(url || '').trim())}`;
}

/** Lien d'intégration officiel (iframe). Les liens courts lnkd.in doivent d'abord être résolus. */
export function getLinkedInEmbedUrl(url: string): string | null {
  if (!isLinkedInUrl(url) || isLinkedInShortUrl(url)) return null;
  let raw = String(url).trim();
  try { raw = decodeURIComponent(raw); } catch { /* garder tel quel */ }

  const urn = raw.match(/urn:li:(activity|ugcPost|share):(\d+)/i);
  if (urn) return `https://www.linkedin.com/embed/feed/update/urn:li:${urn[1]}:${urn[2]}?compact=1`;

  // Lien « posts/… -activity-123… »
  const activity = raw.match(/activity-(\d{10,})/i);
  if (activity) return `https://www.linkedin.com/embed/feed/update/urn:li:activity:${activity[1]}?compact=1`;

  return null;
}

export type LinkedInMedia = { src: string | null; poster: string | null; postUrl: string | null; embedUrl: string | null };

// Cache navigateur partagé par toutes les galeries de la page
const cache = new Map<string, Promise<LinkedInMedia | null>>();

/** Récupère (une seule fois par page) le MP4 et la couverture d'une publication LinkedIn. */
export function fetchLinkedInMedia(url: string): Promise<LinkedInMedia | null> {
  const key = String(url || '').trim();
  if (!isLinkedInUrl(key)) return Promise.resolve(null);
  let p = cache.get(key);
  if (!p) {
    p = fetch(`/api/linkedin-video?url=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    p.then((d) => { if (!d) cache.delete(key); });
    cache.set(key, p);
  }
  return p;
}
