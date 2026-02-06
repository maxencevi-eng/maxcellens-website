import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { hashIp, getClientIp, getGeoFromHeaders } from '../../../../lib/analytics';
import { isBotByServer } from '../../../../lib/bot-detection';

export const dynamic = 'force-dynamic';

type CollectBody = {
  session_id: string;
  session?: { device?: string; os?: string; browser?: string };
  event_type?: 'pageview' | 'click' | 'custom' | 'human_validated';
  path?: string;
  element_id?: string;
  metadata?: Record<string, unknown>;
  duration?: number;
  is_authenticated?: boolean;
  referrer?: string;
  /** Côté client : visite validée comme humaine (interaction ou délai > 1s). */
  human_validated?: boolean;
};

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ ok: false }, { status: 503 });
    const body = (await req.json()) as CollectBody;
    const { session_id, session: sessionInfo, event_type, path, element_id, metadata, duration, is_authenticated, referrer, human_validated } = body;
    if (!session_id) return NextResponse.json({ ok: false }, { status: 400 });

    // Ping léger : uniquement marquer la session comme humaine (pas d'événement)
    if (human_validated === true) {
      try {
        const { error: upErr } = await supabaseAdmin
          .from('analytics_sessions')
          .update({ human_validated: true, updated_at: new Date().toISOString() })
          .eq('session_id', session_id);
        if (upErr && /column.*human_validated/i.test(upErr.message)) {
          // Colonne absente : ignorer silencieusement
        }
      } catch (_) {}
      return NextResponse.json({ ok: true });
    }

    if (!event_type) return NextResponse.json({ ok: false }, { status: 400 });

    // Ne pas enregistrer les visites (sessions ni événements) quand le visiteur est connecté
    if (is_authenticated === true) return NextResponse.json({ ok: true });

    const ip = getClientIp(req.headers);
    const ip_hash = hashIp(ip);
    const { country, city } = getGeoFromHeaders(req.headers);
    const userAgent = req.headers.get('user-agent')?.trim() ?? null;
    const is_bot = isBotByServer(userAgent, ip);

    let referrerValue: string | null = null;
    let includeReferrerInRow = false;
    try {
      const refFromClient = (referrer != null && String(referrer).trim() !== '') ? String(referrer).trim() : null;
      if (event_type === 'pageview' && refFromClient) {
        const { data: existing, error } = await supabaseAdmin.from('analytics_sessions').select('referrer').eq('session_id', session_id).maybeSingle();
        if (!error) {
          const existingReferrer = (existing as { referrer?: string } | null)?.referrer;
          referrerValue = existingReferrer ? existingReferrer : refFromClient;
          includeReferrerInRow = true;
        }
      } else {
        const { data: existing, error } = await supabaseAdmin.from('analytics_sessions').select('referrer').eq('session_id', session_id).maybeSingle();
        if (!error) {
          referrerValue = (existing as { referrer?: string } | null)?.referrer ?? null;
          includeReferrerInRow = true;
        }
      }
    } catch (_) {
      // Colonne referrer absente ou autre erreur : on n'envoie pas referrer pour ne pas faire échouer l'upsert
    }

    const sessionRow: Record<string, unknown> = {
      session_id,
      ip_hash,
      device: sessionInfo?.device ?? null,
      os: sessionInfo?.os ?? null,
      browser: sessionInfo?.browser ?? null,
      country: country ?? null,
      city: city ?? null,
      is_authenticated: false,
      updated_at: new Date().toISOString(),
      is_bot: !!is_bot,
      human_validated: body.human_validated === true ? true : null,
    };
    if (includeReferrerInRow) sessionRow.referrer = referrerValue;
    sessionRow.ip = ip ?? null;
    sessionRow.user_agent = userAgent;

    let { error: sessionError } = await supabaseAdmin
      .from('analytics_sessions')
      .upsert(sessionRow, { onConflict: 'session_id', ignoreDuplicates: false });

    if (sessionError && /column.*ip/i.test(sessionError.message)) {
      delete sessionRow.ip;
      const retry = await supabaseAdmin
        .from('analytics_sessions')
        .upsert(sessionRow, { onConflict: 'session_id', ignoreDuplicates: false });
      sessionError = retry.error;
    }
    if (sessionError && /column.*user_agent/i.test(sessionError.message)) {
      delete sessionRow.user_agent;
      const retry = await supabaseAdmin
        .from('analytics_sessions')
        .upsert(sessionRow, { onConflict: 'session_id', ignoreDuplicates: false });
      sessionError = retry.error;
    }
    if (sessionError && (/column.*is_bot|column.*human_validated/i.test(sessionError.message))) {
      delete sessionRow.is_bot;
      delete sessionRow.human_validated;
      const retry = await supabaseAdmin
        .from('analytics_sessions')
        .upsert(sessionRow, { onConflict: 'session_id', ignoreDuplicates: false });
      sessionError = retry.error;
    }
    if (sessionError) {
      console.error('analytics collect session upsert error', sessionError);
      return NextResponse.json({ ok: false, error: String(sessionError.message) }, { status: 500 });
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
      return NextResponse.json({ ok: false, error: String(eventError.message) }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error('analytics collect error', e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
