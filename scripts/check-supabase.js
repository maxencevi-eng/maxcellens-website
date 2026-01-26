require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('ENV presence:', { hasUrl: Boolean(url), hasAnon: Boolean(anon), hasServiceKey: Boolean(key) });
if (!url || !key) {
  console.error('Missing required env vars; aborting');
  process.exit(2);
}

const supabase = createClient(url, key);

(async () => {
  try {
    const out = {};
    const { data, error } = await supabase.from('site_settings').select('*').limit(1).maybeSingle();
    out.site_settings = { error: error ? (error.message || error) : null, data };

    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    out.buckets = { error: bErr ? (bErr.message || bErr) : null, data: buckets };

    const fs = require('fs'); fs.writeFileSync('scripts/supacheck-output.json', JSON.stringify(out, null, 2));
    console.log('Wrote scripts/supacheck-output.json');
  } catch (e) {
    const fs = require('fs'); fs.writeFileSync('scripts/supacheck-output.json', JSON.stringify({ exception: String(e), stack: e && e.stack ? e.stack : null }, null, 2));
    console.error('Wrote scripts/supacheck-output.json with exception');
  }
})();