/**
 * Publications LinkedIn (vidéos) intégrables dans les galeries.
 *
 * Formats acceptés :
 *  - https://www.linkedin.com/feed/update/urn:li:activity:123…/
 *  - https://www.linkedin.com/feed/update/urn:li:ugcPost:123…/  (ou urn:li:share:)
 *  - https://www.linkedin.com/posts/nom_titre-activity-123…-abcd/
 *  - https://www.linkedin.com/embed/feed/update/urn:li:…  (déjà au format intégré)
 *
 * LinkedIn ne fournit pas de miniature publique : choisir une image de couverture.
 */
export function isLinkedInUrl(url: string): boolean {
  return /^https?:\/\/([a-z]+\.)?linkedin\.com\//i.test(String(url || '').trim());
}

/** Image de couverture récupérée côté serveur (redirection vers media.licdn.com). */
export function getLinkedInPosterUrl(url: string): string {
  return `/api/linkedin-video?as=poster&url=${encodeURIComponent(String(url || '').trim())}`;
}

export function getLinkedInEmbedUrl(url: string): string | null {
  if (!isLinkedInUrl(url)) return null;
  let raw = String(url).trim();
  try { raw = decodeURIComponent(raw); } catch { /* garder tel quel */ }

  const urn = raw.match(/urn:li:(activity|ugcPost|share):(\d+)/i);
  if (urn) return `https://www.linkedin.com/embed/feed/update/urn:li:${urn[1]}:${urn[2]}?compact=1`;

  // Lien « posts/… -activity-123… »
  const activity = raw.match(/activity-(\d{10,})/i);
  if (activity) return `https://www.linkedin.com/embed/feed/update/urn:li:activity:${activity[1]}?compact=1`;

  return null;
}
