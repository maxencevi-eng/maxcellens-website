import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseUrl, serviceKey } from '../../../lib/supabaseAdmin';
import {
  DEFAULT_LAYOUT,
  normalizeLayout,
} from '../../../components/PageLayoutModal/pageLayout';

export const dynamic = 'force-dynamic';

/** GET : réglages de mise en page (public, pour appliquer les variables CSS). */
export async function GET() {
  try {
    if (!supabaseAdmin || !supabaseUrl || !serviceKey) {
      return NextResponse.json(DEFAULT_LAYOUT);
    }
    // maybeSingle : `single()` renvoyait une erreur quand la clé n'existait pas
    // encore, ce qui faisait tomber la route dans son catch générique.
    const { data } = await supabaseAdmin
      .from('site_settings')
      .select('value')
      .eq('key', 'page_layout')
      .maybeSingle();

    const raw = (data as any)?.value;
    if (!raw || typeof raw !== 'string') return NextResponse.json(DEFAULT_LAYOUT);

    try {
      return NextResponse.json(normalizeLayout(JSON.parse(raw)));
    } catch {
      return NextResponse.json(DEFAULT_LAYOUT);
    }
  } catch (e) {
    console.error('page-layout GET error', e);
    return NextResponse.json(DEFAULT_LAYOUT);
  }
}
