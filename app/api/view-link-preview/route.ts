import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return NextResponse.json({ title: url, faviconUrl: null, imageUrl: null });
    }

    const html = await res.text();

    function getMeta(name: string): string | null {
      const patterns = [
        new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, 'i'),
        new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
      ];
      for (const re of patterns) {
        const m = html.match(re);
        if (m?.[1]) return m[1].trim();
      }
      return null;
    }

    // Title
    const ogTitle = getMeta('og:title');
    const twitterTitle = getMeta('twitter:title');
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = ogTitle || twitterTitle || titleMatch?.[1]?.trim() || null;

    // OG image
    const ogImage = getMeta('og:image');
    const twitterImage = getMeta('twitter:image');
    let imageUrl = ogImage || twitterImage || null;

    // Favicon
    const faviconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i)
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);
    let faviconUrl = faviconMatch?.[1] || null;

    // Resolve relative URLs
    const base = new URL(url);
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      try { imageUrl = new URL(imageUrl, base).href; } catch (_) { imageUrl = null; }
    }
    if (faviconUrl && !/^https?:\/\//i.test(faviconUrl)) {
      try { faviconUrl = new URL(faviconUrl, base).href; } catch (_) {}
    }
    // Fallback favicon
    if (!faviconUrl) {
      faviconUrl = `${base.origin}/favicon.ico`;
    }

    return NextResponse.json({ title, faviconUrl, imageUrl });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return NextResponse.json({ error: 'Timeout' }, { status: 408 });
    }
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
