// Crée les déclinaisons de taille manquantes (480 / 960 / 1600 / 2400 px)
// des images WebP du bucket Supabase « medias ». Voir lib/imageVariants.ts.
//
//   node scripts/backfill-image-variants.mjs          # traite les images sans déclinaisons
//   node scripts/backfill-image-variants.mjs --dry    # liste seulement
//
// Lit NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local.
// Idempotent : une image dont les quatre déclinaisons existent est ignorée.
import fs from 'fs';
import sharp from 'sharp';

const WIDTHS = [480, 960, 1600, 2400];
const CONCURRENCY = 6;
const dry = process.argv.includes('--dry');

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
const auth = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
const variantPath = (p, w) => p.replace(/\.webp$/i, `.w${w}.webp`);
const isVariant = (p) => /\.w\d+\.webp$/i.test(p);

async function list(prefix = '') {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await fetch(`${base}/storage/v1/object/list/medias`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000, offset }),
    });
    const items = await r.json();
    if (!Array.isArray(items)) throw new Error(JSON.stringify(items));
    for (const it of items) {
      const full = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null) out.push(...(await list(full)));
      else out.push(full);
    }
    if (items.length < 1000) break;
  }
  return out;
}

const enc = (p) => p.split('/').map(encodeURIComponent).join('/');

async function processImage(path) {
  const r = await fetch(`${base}/storage/v1/object/medias/${enc(path)}`, { headers: auth });
  if (!r.ok) throw new Error(`lecture ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  for (const w of WIDTHS) {
    const out = await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const up = await fetch(`${base}/storage/v1/object/medias/${enc(variantPath(path, w))}`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'image/webp', 'x-upsert': 'true', 'Cache-Control': 'max-age=31536000' },
      body: out,
    });
    if (!up.ok) throw new Error(`envoi ${w}px ${up.status} ${await up.text()}`);
  }
}

const all = await list();
const existing = new Set(all);
const todo = all.filter((p) => /\.webp$/i.test(p) && !isVariant(p) && WIDTHS.some((w) => !existing.has(variantPath(p, w))));
console.log(`${all.length} fichiers, ${todo.length} images à décliner`);
if (dry) process.exit(0);

let done = 0;
const failed = [];
const queue = [...todo];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      try {
        await processImage(p);
      } catch (e) {
        failed.push(`${p} — ${e.message}`);
      }
      if (++done % 25 === 0 || done === todo.length) console.log(`${done}/${todo.length}`);
    }
  })
);
if (failed.length) {
  console.error(`${failed.length} échec(s) :\n${failed.join('\n')}`);
  process.exit(1);
}
console.log('Terminé.');
