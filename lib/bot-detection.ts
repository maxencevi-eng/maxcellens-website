/**
 * Détection des crawlers/bots par User-Agent.
 * Utilisé pour filtrer les stats (exclure bots) ou purger les traces bots.
 */

const BOT_PATTERNS = [
  /\b(bot|crawler|spider|slurp|scraper)\b/i,
  /\bgooglebot\b/i,
  /\bbingbot\b/i,
  /\byandexbot\b/i,
  /\bduckduckbot\b/i,
  /\bfacebookexternalhit\b/i,
  /\btwitterbot\b/i,
  /\blinkedinbot\b/i,
  /\bwhatsapp\b/i,
  /\btelegrambot\b/i,
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bpython-requests\b/i,
  /\bheadless\b/i,
  /\bphantom\b/i,
  /\bselenium\b/i,
  /\bpuppeteer\b/i,
  /\bplaywright\b/i,
  /\bhttp\s*client\b/i,
  /\bgo-http-client\b/i,
  /\bjava\s*\/\s*\d/i,  // Java/11 etc. souvent des bots
  /\bapache-httpclient\b/i,
  /\bpostman\b/i,
  /\binsomnia\b/i,
  /\bpetalbot\b/i,
  /\bahrefsbot\b/i,
  /\bsemrushbot\b/i,
  /\bmj12bot\b/i,
];

/**
 * Retourne true si le User-Agent correspond probablement à un bot/crawler.
 * Chaîne vide ou null → false (on ne considère pas comme bot si pas d'UA).
 */
export function isLikelyBot(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? '').trim();
  if (!ua) return false;
  return BOT_PATTERNS.some((re) => re.test(ua));
}
