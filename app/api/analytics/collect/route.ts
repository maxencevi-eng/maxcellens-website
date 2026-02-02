import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { hashIp, getClientIp, getGeoFromHeaders } from '../../../../lib/analytics';

export const dynamic = 'force-dynamic';

type CollectBody = {
  session_id: string;
  session?: { device?: string; os?: string; browser?: string };
  event_type: 'pageview' | 'click' | 'custom';
  path?: string;
  element_id?: string;
  metadata?: Record<string, unknown>;
  duration?: number;
  is_authenticated?: boolean;
  referrer?: string;
};

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false }, { status: 503 });
    const body = (await req.json()) as CollectBody;
    const { session_id, session: sessionInfo, event_type, path, element_id, metadata, duration, is_authenticated, referrer } = body;
    if (!session_id || !event_type) return NextResponse.json({ ok: false }, { status: 400 });

    const ip = getClientIp(req.headers);
    const ip_hash = hashIp(ip);
    const { country, city } = getGeoFromHeaders(req.headers);

    let referrerValue: string | null = (referrer != null && String(referrer).trim() !== '') ? String(referrer).trim() : null;
    if (event_type === 'pageview' && referrerValue) {
      const { data: existing } = await supabaseAdmin.from('analytics_sessions').select('referrer').eq('session_id', session_id).maybeSingle();
      const existingReferrer = (existing as { referrer?: string } | null)?.referrer;
      if (existingReferrer) referrerValue = existingReferrer;
    } else {
      const { data: existing } = await supabaseAdmin.from('analytics_sessions').select('referrer').eq('session_id', session_id).maybeSingle();
      referrerValue = (existing as { referrer?: string } | null)?.referrer ?? null;
    }

    const sessionRow = {
      session_id,
      ip_hash,
      device: sessionInfo?.device ?? null,
      os: sessionInfo?.os ?? null,
      browser: sessionInfo?.browser ?? null,
      country: country ?? null,
      city: city ?? null,
      is_authenticated: is_authenticated === true,
      referrer: referrerValue,
      updated_at: new Date().toISOString(),
    };

    const { error: sessionError } = await supabaseAdmin
      .from('analytics_sessions')
      .upsert(sessionRow, { onConflict: 'session_id', ignoreDuplicates: false });

    if (sessionError) {
      console.error('analytics collect session upsert error', sessionError);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    const eventRow = {
      session_id,
      event_type,
      path: path ?? null,
      element_id: element_id ?? null,
      metadata: metadata ?? {},
      duration: duration ?? null,
    };

    const { error: eventError } = await supabaseAdmin.from('analytics_events').insert(eventRow);
    if (eventError) {
      console.error('analytics collect event insert error', eventError);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('analytics collect error', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
