const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const cache = new Map();
function load(file) {
  const filename = path.resolve(file);
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    module, exports: module.exports, URL,
    require: id => {
      if (id.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, name) => String(name) }) };
      if (!id.startsWith('.')) return require(id);
      const base = path.resolve(path.dirname(filename), id);
      return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx');
    },
  }, { filename });
  cache.set(filename, module.exports);
  return module.exports;
}
const { DEFAULT_PROJECT_CARDS: projects, DEFAULT_SERVICE_CARDS: services, normalizeImageCards, safeCardHref, youtubeCardId, playableCardVideo } = load('components/PageBuilder/blocks/imageCardsDefs.ts');
const { ImageCardsBlock, ServiceImageCardsBlock } = load('components/PageBuilder/blocks/ImageCardsBlock.tsx');

test('new block instances have independent editable cards', () => {
  const first = normalizeImageCards({}, projects);
  const second = normalizeImageCards({}, projects);
  first.cards[0].title = 'Modified';
  assert.notEqual(first.cards[0].title, second.cards[0].title);
});
test('saved edits and removal of every card survive normalization', () => {
  const edited = { ...services, titlePosition: 'right', cards: [], title: 'Custom title', paddingX: 24 };
  const result = normalizeImageCards(JSON.parse(JSON.stringify(edited)), services);
  assert.equal(result.cards.length, 0);
  assert.equal(result.titlePosition, 'right');
  assert.equal(result.title, 'Custom title');
  assert.equal(result.paddingX, 24);
});
test('service cards render real links, alternative text and user colors', () => {
  const data = normalizeImageCards({ cards: [{ title: 'Film', subtitle: 'Corporate', image: { url: '/test.webp' }, alt: 'Film still', href: '/realisation', newTab: true }], cardColor: { source: 'custom', value: '#abcdef' } }, projects);
  const html = renderToStaticMarkup(React.createElement(ServiceImageCardsBlock, { data }));
  assert.match(html, /href="\/realisation"/);
  assert.match(html, /alt="Film still"/);
  assert.match(html, /noopener noreferrer/);
  assert.match(html, /color:#abcdef/);
  assert.match(html, /Corporate/);
});
test('lateral placement switches without changing or dropping cards', () => {
  for (const titlePosition of ['left', 'right']) {
    const data = normalizeImageCards({ titlePosition }, services);
    const html = renderToStaticMarkup(React.createElement(ServiceImageCardsBlock, { data }));
    assert.equal(html.includes('titleRight'), titlePosition === 'right');
    assert.equal((html.match(/class="card"/g) || []).length, 6);
  }
});
test('empty links stay noninteractive; unsafe protocols cannot become links', () => {
  for (const href of ['', 'javascript:alert(1)', 'data:text/html,test', '//example.com']) assert.equal(safeCardHref(href), undefined);
  assert.equal(safeCardHref('/contact'), '/contact');
  const data = normalizeImageCards({ cards: [{ title: 'No link', href: 'javascript:alert(1)' }] }, projects);
  const html = renderToStaticMarkup(React.createElement(ImageCardsBlock, { data }));
  assert.doesNotMatch(html, /href=|javascript:/);
});

test('YouTube watch, shortened and shorts URLs use the same cover', () => {
  for (const url of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ?t=12', 'https://www.youtube.com/shorts/dQw4w9WgXcQ']) {
    assert.equal(youtubeCardId(url), 'dQw4w9WgXcQ');
  }
  assert.equal(youtubeCardId('https://evil.example/watch?v=dQw4w9WgXcQ'), undefined);
});
test('project cards open videos and keep a custom cover instead of a link', () => {
  const live = playableCardVideo({ video: { kind: 'youtube', url: 'https://www.youtube.com/live/dQw4w9WgXcQ' } });
  assert.equal(live.embedUrl, 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  const data = normalizeImageCards({ cards: [{ title: 'Film', image: { url: '/cover.webp' }, video: { kind: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ' } }] }, projects);
  const html = renderToStaticMarkup(React.createElement(ImageCardsBlock, { data }));
  assert.match(html, /<button/);
  assert.match(html, /aria-label="Lire Film"/);
  assert.match(html, /src="\/cover.webp"/);
  assert.doesNotMatch(html, /href=/);
});
test('imported files are played natively; invalid sources stay inactive', () => {
  assert.equal(playableCardVideo({ href: '', video: { kind: 'file', url: '/uploads/film.mp4' } }).kind, 'file');
  assert.equal(playableCardVideo({ href: '', video: { kind: 'file', url: 'javascript:alert(1)' } }), null);
  const data = normalizeImageCards({ cards: [{ title: 'Film', video: { kind: 'file', url: '/uploads/film.mp4' } }] }, projects);
  assert.match(renderToStaticMarkup(React.createElement(ImageCardsBlock, { data })), /<video/);
});
