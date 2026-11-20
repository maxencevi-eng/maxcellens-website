import { NextResponse } from 'next/server';
import { getLinkedInEmbedUrl } from '@/lib/linkedinEmbed';

/**
 * Récupère, à partir d'une publication LinkedIn publique, le fichier MP4 et
 * l'image de couverture (lus dans la page d'intégration officielle).
 *
 *  GET /api/linkedin-video?url=…              → { src, poster }
 *  GET /api/linkedin-video?url=…&as=poster    → redirection vers l'image de couverture
 *
 * Seules les adresses linkedin.com sont acceptées (pas de requête vers un hôte arbitraire).
 */
const CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

function decodeEntities(s: string) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function isLicdn(url: string) {
  try {
    const h = new URL(url).hostname;
    return h === 'licdn.com' || h.endsWith('.licdn.com');
  } catch {
    return false;
  }
}

async function resolve(postUrl: string): Promise<{ src: string | null; poster: string | null } | null> {
  const embed = getLinkedInEmbedUrl(postUrl);
  if (!embed) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(embed.replace(/\?.*$/, ''), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return { src: null, poster: null };
    const html = await res.text();

    let src: string | null = null;
    const sourcesAttr = html.match(/data-sources="([^"]+)"/);
    if (sourcesAttr) {
      try {
        const list = JSON.parse(decodeEntities(sourcesAttr[1])) as Array<{ src?: string; type?: string; 'data-bitrate'?: number }>;
        const mp4 = list
          .filter((s) => s?.src && (!s.type || s.type.includes('mp4')) && isLicdn(s.src))
          .sort((a, b) => (b['data-bitrate'] || 0) - (a['data-bitrate'] || 0));
        src = mp4[0]?.src || null;
      } catch { /* format inattendu */ }
    }

    const posterAttr = html.match(/data-poster-url="([^"]+)"/);
    let poster = posterAttr ? decodeEntities(posterAttr[1]) : null;
    if (!poster) {
      const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      poster = og ? decodeEntities(og[1]) : null;
    }
    if (poster && !isLicdn(poster)) poster = null;

    return { src, poster };
  } catch {
    return { src: null, poster: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url') || '';
  const data = await resolve(url);
  if (!data) return NextResponse.json({ error: 'Adresse LinkedIn invalide' }, { status: 400 });

  if (searchParams.get('as') === 'poster') {
    if (!data.poster) return new NextResponse(null, { status: 404 });
    return NextResponse.redirect(data.poster, { status: 302, headers: { 'Cache-Control': CACHE } });
  }

  return NextResponse.json(data, { headers: { 'Cache-Control': data.src || data.poster ? CACHE : 'no-store' } });
}
