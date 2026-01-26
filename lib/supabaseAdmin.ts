import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
export const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.warn('Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY in environment — admin features will be disabled.');
}

// Only create the admin client when both URL and service key are present
export const supabaseAdmin = (supabaseUrl && serviceKey) ? createClient(supabaseUrl, serviceKey) : null as any;

export async function getHeaderForPage(page: string) {
  if (!supabaseUrl || !serviceKey || !supabaseAdmin) {
    // running in an environment without admin credentials; return null rather than throwing
    console.warn('getHeaderForPage skipped: missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL');
    return null;
  }

  try {
    // Helper to convert a storage path to a public URL when needed
    async function toPublicUrl(val: any) {
      if (!val || typeof val !== 'string') return val;
      if (/^https?:\/\//i.test(val)) return val; // already a URL
      if (!supabaseAdmin) return val; // cannot convert without admin client
      try {
        // supabase.getPublicUrl has different shapes; be flexible
        const res = await supabaseAdmin.storage.from('medias').getPublicUrl(val as string);
        // new clients return { data: { publicUrl } }
        if (res && (res as any).data) return (res as any).data.publicUrl || (res as any).data.publicURL || val;
        // older client shapes
        if ((res as any).publicUrl) return (res as any).publicUrl;
        return val;
      } catch (e) {
        console.warn('toPublicUrl failed for', val, e);
        return val;
      }
    }

    // Prefer explicit hero stored in site_settings (used as a fallback storage when headers table lacks columns)
    try {
      const key = `hero_${page}`;
      const { data: s, error: sErr } = await supabaseAdmin.from('site_settings').select('*').eq('key', key).limit(1).maybeSingle();
      if (!sErr && s && typeof s.value === 'string') {
        try {
          const parsed = JSON.parse(s.value);
          const settings = parsed?.settings || {};

          // normalize URLs in settings (slides, url, poster)
          if (Array.isArray(settings.slides)) {
            const conv = await Promise.all(settings.slides.map((p: any) => toPublicUrl(p)));
            settings.slides = conv;
          }
          if (settings.url) settings.url = await toPublicUrl(settings.url);
          if (settings.poster) settings.poster = await toPublicUrl(settings.poster);

          // emulate headers row shape
          return { page, mode: parsed.mode, settings, public_url: settings?.url || null } as any;
        } catch (e) {
          console.warn('Failed to parse hero from site_settings', e);
        }
      }
    } catch (e) {
      console.warn('fallback getHeaderForPage site_settings failed', e);
    }

    // Otherwise use headers table if present
    const { data, error } = await supabaseAdmin.from('headers').select('*').eq('page', page).limit(1).maybeSingle();
    if (error) {
      console.error('supabaseAdmin.getHeaderForPage error', error);
    }
    if (data) {
      // normalize public columns and settings if present
      try {
        if ((data as any).public_url && typeof (data as any).public_url === 'string') (data as any).public_url = await toPublicUrl((data as any).public_url);
        if ((data as any).settings && (data as any).settings.slides && Array.isArray((data as any).settings.slides)) {
          const conv = await Promise.all((data as any).settings.slides.map((p: any) => toPublicUrl(p)));
          (data as any).settings.slides = conv;
        }
        if ((data as any).settings && (data as any).settings.url) (data as any).settings.url = await toPublicUrl((data as any).settings.url);
        if ((data as any).settings && (data as any).settings.poster) (data as any).settings.poster = await toPublicUrl((data as any).settings.poster);
      } catch (e) { console.warn('Failed to normalize header urls', e); }

      return data;
    }

    return null;
  } catch (err) {
    console.error('getHeaderForPage unexpected error', err);
    return null;
  }
}
