const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function fixture(initial = {}) {
  const rows = new Map(Object.entries(initial));
  const db = { from: () => ({
    select: () => {
      let key;
      const query = {
        eq: (_, value) => { key = value; return query; },
        maybeSingle: async () => ({ data: rows.has(key) ? { value: rows.get(key) } : null }),
        then: resolve => Promise.resolve({ data: [...rows].map(([key, value]) => ({ key, value })) }).then(resolve),
      };
      return query;
    },
    upsert: async changes => { for (const row of changes) rows.set(row.key, row.value); return {}; },
    delete: () => ({ eq: async (_, key) => { rows.delete(key); return {}; } }),
  }) };
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(file);
    if (cache.has(filename)) return cache.get(filename);
    const module = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    vm.runInNewContext(source, { module, exports: module.exports, require: id => {
      if (id.endsWith('supabaseAdmin')) return { supabaseAdmin: db };
      if (id.endsWith('sanitizeBlockData')) return { sanitizeBlockData: async (_, data) => data };
      return load(path.resolve(path.dirname(filename), id) + '.ts');
    } });
    cache.set(filename, module.exports);
    return module.exports;
  }
  return { ...load('lib/managedHomeBlocks.ts'), rows, ...load('components/HomeBlocks/managedHomeDefs.ts') };
}
test('all ten historical blocks preserve data, visibility and width', async () => {
  const f = fixture({ home_stats: '{"items":[]}', block_visibility: '["home_quote"]', block_width_mode: '{"home_stats":"max1600"}' });
  const blocks = await f.readManagedHomeBlocks('page', true);
  assert.equal(blocks.length, 10);
  const stats = blocks.find(b => b.type === 'home_stats');
  assert.equal(stats.data.items.length, 0);
  assert.equal(stats.widthMode, 'max1600');
  assert.equal((await f.readManagedHomeBlocks('page', false)).some(b => b.type === 'home_quote'), false);
});
test('deleting a historical block removes it for admin and public on reload', async () => {
  const f = fixture({ home_stats: '{"items":[{"value":"5+","label":"Years"}]}' });
  await f.mutateManagedHomeBlock('legacy:home_stats', {}, true);
  assert.equal(f.rows.has('home_stats'), false);
  for (const admin of [true, false]) assert.equal((await f.readManagedHomeBlocks('page', admin)).some(b => b.type === 'home_stats'), false);
  await assert.rejects(() => f.mutateManagedHomeBlock('legacy:home_stats', { data: {} }));
});
test('historical editing preserves other blocks and supports visibility changes', async () => {
  const f = fixture({ home_cta: '{"title":"Keep me"}' });
  await f.mutateManagedHomeBlock('legacy:home_stats', { data: { items: [], textColor: '#123456' }, visible: false, widthMode: 'max1600' });
  assert.equal(JSON.parse(f.rows.get('home_cta')).title, 'Keep me');
  const stats = (await f.readManagedHomeBlocks('page', true)).find(b => b.type === 'home_stats');
  assert.equal(stats.data.textColor, '#123456');
  assert.equal(stats.visible, false);
});
test('new instances use independent defaults and unknown legacy IDs cannot write settings', async () => {
  const f = fixture();
  const a = f.homeBlockDefaults('home_stats');
  const b = f.homeBlockDefaults('home_stats');
  a.items[0].value = 'Changed';
  assert.notEqual(a.items[0].value, b.items[0].value);
  await assert.rejects(() => f.mutateManagedHomeBlock('legacy:arbitrary_setting', { data: {} }));
});
