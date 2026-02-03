import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { hashIp } from '../../../../../lib/analytics';

export const dynamic = 'force-dynamic';

const RETENTION_MONTHS = 3;

export async function GET(req: Request) {
  return POST(req);
}

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '')?.trim();
  if (!token || !supabaseAdmin) return null;
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * POST /api/admin/analytics/purge
 * Supprime les sessions analytics de plus de 3 mois (les événements sont supprimés en CASCADE).
 * Protégé par : JWT admin (Authorization: Bearer) OU secret cron (header X-Cron-Secret = CRON_SECRET).
 * Pour planifier : Vercel Cron (vercel.json) ou cron-job.org en appelant cette URL avec le secret.
 */
export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });

    const url = new URL(req.url);
    const authHeader = req.headers.get('authorization')?.trim();
    const cronSecret =
      req.headers.get('x-cron-secret')?.trim() ||
      url.searchParams.get('secret')?.trim() ||
      (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '');
    const expectedSecret = process.env.CRON_SECRET;
    const isCron = !!expectedSecret && cronSecret === expectedSecret;
    const user = await getAuthUser(req);

    if (!isCron && !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const purgeAll = url.searchParams.get('all') === '1' || url.searchParams.get('all') === 'true';
    const purgeIp = url.searchParams.get('ip')?.trim() || null;

    let deleted: { id: string }[] = [];

    if (purgeIp) {
      // Purge par IP : supprimer uniquement les sessions dont l'IP (hash) correspond
      const ipHash = hashIp(purgeIp);
      if (!ipHash) {
        return NextResponse.json({ error: 'IP invalide ou vide' }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from('analytics_sessions')
        .delete()
        .eq('ip_hash', ipHash)
        .select('id');
      if (error) {
        console.error('analytics purge by ip error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      deleted = data ?? [];
      const count = deleted.length;
      return NextResponse.json({ ok: true, deleted: count, byIp: true });
    }

    if (purgeAll) {
      // Purge totale : toutes les sessions (les événements sont supprimés en CASCADE)
      const { data, error } = await supabaseAdmin
        .from('analytics_sessions')
        .delete()
        .gte('created_at', '1970-01-01T00:00:00.000Z')
        .select('id');
      if (error) {
        console.error('analytics purge all error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      deleted = data ?? [];
    } else {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
      const cutoffStr = cutoff.toISOString();

      const { data, error } = await supabaseAdmin
        .from('analytics_sessions')
        .delete()
        .lt('created_at', cutoffStr)
        .select('id');

      if (error) {
        console.error('analytics purge error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      deleted = data ?? [];
    }

    const count = deleted?.length ?? 0;
    return NextResponse.json({ ok: true, deleted: count, all: purgeAll });
  } catch (err: unknown) {
    console.error('analytics purge error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
