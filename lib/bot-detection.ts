/**
 * Détection des crawlers/bots : User-Agent + IP (datacenters).
 * Utilisé pour flagger les sessions (is_bot) sans les supprimer ; filtrage à l'affichage.
 * Zéro faux positifs : en cas de doute (UA vide, IP inconnue), on ne flag pas.
 */

/** Regex robuste : User-Agents connus (crawlers, SEO, scrapers, outils). */
const BOT_UA_PATTERNS = [
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
  /\bpetalbot\b/i,
  /\bahrefsbot\b/i,
  /\bsemrushbot\b/i,
  /\bmj12bot\b/i,
  /\bdotbot\b/i,
  /\brogerbot\b/i,
  /\bscreaming\s*frog\b/i,
  /\bbytespider\b/i,
  /\bccbot\b/i,
  /\bcoveragebot\b/i,
  /\bdatanyze\b/i,
  /\bheadless\b/i,
  /\bphantom\b/i,
  /\bselenium\b/i,
  /\bpuppeteer\b/i,
  /\bplaywright\b/i,
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bpython-requests\b/i,
  /\bpython-urllib\b/i,
  /\bgo-http-client\b/i,
  /\bjava\s*\/\s*\d/i,
  /\bapache-httpclient\b/i,
  /\bpostman\b/i,
  /\binsomnia\b/i,
  /\bhttp\s*client\b/i,
  /\bgo\s*http\b/i,
  /\baxios\b/i,
  /\bnode-fetch\b/i,
  /\blighthouse\b/i,
  /\bgtmetrix\b/i,
  /\bpingdom\b/i,
  /\buptimerobot\b/i,
  /\bmonitor\b/i,
  /\bcheck\s*url\b/i,
  /\bfeed\s*validator\b/i,
  /\bw3c\s*validator\b/i,
];

/**
 * Retourne true si le User-Agent correspond à un bot/crawler connu.
 * Chaîne vide ou null → false (pas de faux positif).
 */
export function isLikelyBot(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? '').trim();
  if (!ua) return false;
  return BOT_UA_PATTERNS.some((re) => re.test(ua));
}

/**
 * Préfixes IPv4 connus pour hébergeurs / datacenters (AWS, GCP, Azure, OVH, etc.).
 * Conservateur : on ne flag que des plages très typiques (risque de VPN d'entreprise).
 * En cas de doute, on ne flag pas (zéro faux positif).
 */
const DATACENTER_IP_PREFIXES: string[] = [
  '3.0.', '3.1.', '3.2.', '3.3.', '3.4.', '3.5.', '13.32.', '13.33.', '13.34.', '13.35.', '13.36.', '13.37.', '13.38.', '13.39.',
  '18.64.', '18.65.', '18.66.', '18.67.', '18.68.', '18.69.', '18.70.', '18.71.', '18.72.', '18.73.', '18.74.', '18.75.', '18.76.', '18.77.', '18.78.', '18.79.',
  '34.64.', '34.65.', '34.66.', '34.67.', '34.68.', '34.69.', '34.70.', '34.71.', '34.72.', '34.73.', '34.74.', '34.75.', '34.76.', '34.77.', '34.78.', '34.79.',
  '35.152.', '35.153.', '35.154.', '35.155.', '35.156.', '35.157.', '35.158.', '35.159.',
  '52.0.', '52.1.', '52.2.', '52.3.', '52.4.', '52.5.', '52.6.', '52.7.', '52.8.', '52.9.',
  '54.64.', '54.65.', '54.66.', '54.67.', '54.68.', '54.69.', '54.70.', '54.71.', '54.72.', '54.73.', '54.74.', '54.75.', '54.76.', '54.77.', '54.78.', '54.79.',
  '64.233.', '66.102.', '66.249.', '72.14.', '74.125.', '108.177.', '142.250.', '172.217.', '173.194.', '209.85.', '216.58.', '216.239.',
  '51.83.', '51.89.', '51.91.', '51.161.', '51.210.', '51.222.', '54.36.', '54.37.', '54.38.', '54.39.',
  '37.59.', '37.187.', '46.105.', '51.68.', '51.75.', '51.77.', '51.77.', '51.83.', '51.89.', '51.91.', '54.36.', '54.37.', '54.38.', '54.39.',
];

function isPrivateOrLocal(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return true;
  const trimmed = ip.trim();
  if (/^127\.|^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\.|^::1$|^fc00:|^fe80:/i.test(trimmed)) return true;
  return false;
}

/**
 * Retourne true si l'IP ressemble à une plage connue datacenter/cloud.
 * IP privée/localhost → false (pas de flag). En cas de doute → false.
 */
export function isLikelyDatacenterIp(ip: string | null | undefined): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const trimmed = ip.trim();
  if (!trimmed || isPrivateOrLocal(trimmed)) return false;
  return DATACENTER_IP_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

/**
 * Détection côté serveur : bot si UA bot OU IP datacenter.
 * En cas de doute (UA vide, IP inconnue), retourne false (on compte la visite).
 */
export function isBotByServer(userAgent: string | null | undefined, ip: string | null | undefined): boolean {
  if (isLikelyBot(userAgent)) return true;
  if (isLikelyDatacenterIp(ip)) return true;
  return false;
}
