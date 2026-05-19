export function parseVideoUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);

    // YouTube watch
    if ((u.hostname === 'youtube.com' || u.hostname === 'www.youtube.com') && u.pathname === '/watch') {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }

    // YouTube Shorts
    if ((u.hostname === 'youtube.com' || u.hostname === 'www.youtube.com') && u.pathname.startsWith('/shorts/')) {
      const id = u.pathname.split('/shorts/')[1]?.split('/')[0]?.split('?')[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    // youtu.be short link
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('?')[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    // Vimeo
    if (u.hostname === 'vimeo.com' || u.hostname === 'www.vimeo.com') {
      const id = u.pathname.replace(/^\//, '').split('/')[0].split('?')[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }

    return null;
  } catch (_) {
    return null;
  }
}

export function getVideoLabel(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') return 'YouTube';
    if (u.hostname.includes('vimeo.com')) return 'Vimeo';
    if (u.hostname.includes('instagram.com')) return 'Instagram';
  } catch (_) {}
  return '';
}
