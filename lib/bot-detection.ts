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
  /\bfacebot\b/i,
  /FB_IAB\/FB4A\b/i,       // Facebook In-App Browser (crawler Meta)
  /\bFBJSBridge\b/i,        // Facebook JS Bridge
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
  /\bscreenshot\b/i,
  /\b360spider\b/i,       // Qihoo 360 crawler (se déguise en Chrome)
  /\bsogou\b/i,           // Sogou crawler (Chine)
  /\bbaiduspider\b/i,     // Baidu crawler
  /\bnaverbot\b/i,        // Naver (Corée)
  /\bexabot\b/i,
  /\bia_archiver\b/i,     // Wayback Machine / Alexa
  /\barchive\.org_bot\b/i,
  /\bapplebot\b/i,
  /\bslackbot\b/i,
  /\bdiscordbot\b/i,
  /\bclaudebot\b/i,        // Anthropic AI crawler (se déguise en Chrome/Safari)
  /\bGPTBot\b/i,           // OpenAI GPT crawler
  /\bOAI-SearchBot\b/i,    // OpenAI Search
  /\bChatGPT-User\b/i,     // OpenAI ChatGPT browsing
  /\bPerplexityBot\b/i,    // Perplexity AI crawler
  /\bBrave-AI\b/i,
  /\bDuckAssistBot\b/i,    // DuckDuckGo AI
  /\bcohere-ai\b/i,
  /Nexus 5X Build\/MMB29P/i, // Fingerprint exclusif Googlebot mobile (filet de sécurité)
  /\bdataprovider\.com\b/i,  // Dataprovider scraper
  /\bMJ12bot\b/i,
  /\bSiteAuditBot\b/i,
  /\bSEOkicks\b/i,
  /\bmagpie-crawler\b/i,
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
  // Meta / Facebook datacenters
  '66.220.', '66.221.', '173.252.', '179.60.', '185.60.',
  // Google (Googlebot, Applebot use 66.249.x already above)
  '66.249.',
  // Microsoft / Bing datacenter
  '40.77.', '65.55.', '157.55.',
  // Apple (Applebot) — AS714, exclusivement Apple
  '17.0.', '17.1.', '17.2.', '17.3.', '17.4.', '17.5.', '17.6.', '17.7.', '17.8.', '17.9.',
  '17.10.', '17.11.', '17.12.', '17.13.', '17.14.', '17.15.', '17.16.', '17.17.', '17.18.', '17.19.',
  '17.20.', '17.21.', '17.22.', '17.23.', '17.24.', '17.25.', '17.26.', '17.27.', '17.28.', '17.29.',
  '17.30.', '17.31.', '17.32.', '17.33.', '17.34.', '17.35.', '17.36.', '17.37.', '17.38.', '17.39.',
  '17.40.', '17.41.', '17.42.', '17.43.', '17.44.', '17.45.', '17.46.', '17.47.', '17.48.', '17.49.',
  '17.50.', '17.51.', '17.52.', '17.53.', '17.54.', '17.55.', '17.56.', '17.57.', '17.58.', '17.59.',
  '17.220.', '17.221.', '17.222.', '17.223.', '17.224.', '17.225.', '17.226.', '17.227.', '17.228.', '17.229.',
  '17.230.', '17.231.', '17.232.', '17.233.', '17.234.', '17.235.', '17.236.', '17.237.', '17.238.', '17.239.',
  '17.240.', '17.241.', '17.242.', '17.243.', '17.244.', '17.245.', '17.246.', '17.247.', '17.248.', '17.249.',
  '17.250.', '17.251.', '17.252.', '17.253.', '17.254.', '17.255.',
  // Ahrefs datacenter (Singapour)
  '202.8.',
  // Baidu / Baiduspider (Chine)
  '116.179.',
  // ByteDance / ByteSpider (Chine)
  '111.225.', '110.249.',
  // 360Spider (Chine, Alibaba Cloud)
  '180.153.',
  // OVH Canada (Dataprovider.com)
  '149.56.', '144.217.',
  '51.83.', '51.89.', '51.91.', '51.161.', '51.210.', '51.222.', '54.36.', '54.37.', '54.38.', '54.39.',
  '37.59.', '37.187.', '46.105.', '51.68.', '51.75.', '51.77.',
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
