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
};

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false }, { status: 503 });
    const body = (await req.json()) as CollectBody;
    const { session_id, session: sessionInfo, event_type, path, element_id, metadata, duration, is_authenticated } = body;
    if (!session_id || !event_type) return NextResponse.json({ ok: false }, { status: 400 });

    const ip = getClientIp(req.headers);
    const ip_hash = hashIp(ip);
    const { country, city } = getGeoFromHeaders(req.headers);

    const sessionRow = {
      session_id,
      ip_hash,
      device: sessionInfo?.device ?? null,
      os: sessionInfo?.os ?? null,
      browser: sessionInfo?.browser ?? null,
      country: country ?? null,
      city: city ?? null,
      is_authenticated: is_authenticated === true,
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
