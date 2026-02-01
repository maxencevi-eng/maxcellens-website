import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseUrl, serviceKey } from '../../../lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/** GET : retourne les réglages de mise en page (public, pour appliquer les variables CSS). */
export async function GET() {
  try {
    if (!supabaseAdmin || !supabaseUrl || !serviceKey) {
      return NextResponse.json({ desktop: {}, mobile: {} });
    }
    const { data } = await supabaseAdmin.from('site_settings').select('value').eq('key', 'page_layout').single();
    const raw = (data as any)?.value;
    if (!raw || typeof raw !== 'string') {
      return NextResponse.json({ desktop: defaultDesktop(), mobile: defaultMobile() });
    }
    try {
      const parsed = JSON.parse(raw);
      return NextResponse.json({
        desktop: { ...defaultDesktop(), ...parsed.desktop },
        mobile: { ...defaultMobile(), ...parsed.mobile },
      });
    } catch {
      return NextResponse.json({ desktop: defaultDesktop(), mobile: defaultMobile() });
    }
  } catch (e) {
    console.error('page-layout GET error', e);
    return NextResponse.json({ desktop: defaultDesktop(), mobile: defaultMobile() });
  }
}

function defaultDesktop() {
  return {
    containerMaxWidth: 1200,
    contentInnerMaxWidth: 2000,
    contentInnerMinHeight: 0,
    blockInnerPadding: 24,
    marginHorizontal: 24,
    marginVertical: 0,
    sectionGap: 48,
  };
}

function defaultMobile() {
  return {
    containerMaxWidth: 1000,
    contentInnerMaxWidth: 1200,
    contentInnerMinHeight: 0,
    blockInnerPadding: 16,
    marginHorizontal: 16,
    marginVertical: 0,
    sectionGap: 32,
  };
}
