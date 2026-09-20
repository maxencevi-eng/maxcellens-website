const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const { test } = require('node:test');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/HomeBlocks/editorialPresentation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { editorialPresentation, editorialClients } = context.exports;
test('legacy styling changes without losing content or deleted statistics', () => {
  const data = { items: [], backgroundColor: '#172622', paddingTop: 200 };
  const result = editorialPresentation('home_stats', data);
  assert.equal(result.items, data.items);
  assert.equal(result.items.length, 0);
  assert.equal(result.backgroundColor, '#f3f1ed');
  assert.equal(data.paddingTop, 200);
});
test('saved choices survive reload, including testimonial card colors', () => {
  for (const key of ['home_stats', 'home_animation', 'home_quote']) {
    const saved = { presentationVersion: 1, textColor: '#ff0000', cardTextColor: '#00ff00', cardBackground: 'transparent', paddingTop: 70, items: [] };
    assert.equal(editorialPresentation(key, saved), saved);
    assert.deepEqual(editorialPresentation(key, JSON.parse(JSON.stringify(saved))), saved);
  }
});
test('unrelated blocks are untouched', () => {
  const data = { paddingTop: 200 };
  assert.equal(editorialPresentation('home_portrait', data), data);
});
test('clients preserve logos and saved style choices', () => {
  const logos = '["logo.webp"]';
  assert.equal(editorialClients({ clients_logos: logos }).clients_logos, logos);
  const saved = { clients_presentation_version: '1', clients_bg: '#123456', clients_padding_top: '70' };
  assert.equal(editorialClients(saved), saved);
});

const richTextContext = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/hasRichTextContent.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, richTextContext);
const { hasRichTextContent } = richTextContext.exports;
test('cleared rich text does not leave a visible block', () => {
  for (const html of ['', '<p><br></p>', '<p class="lexical-p"><span> </span></p>', '<p>&nbsp;&#160;&#xA0;\u200b</p>', '<p></p><p><br></p>', '<!-- empty -->']) {
    assert.equal(hasRichTextContent(html), false, html);
  }
});
test('rich text preserves real text and media-only content', () => {
  for (const html of ['<p>Bonjour</p>', '<p>&amp;</p>', '<p>&#233;</p>', '<img src="image.webp">', '<hr>']) {
    assert.equal(hasRichTextContent(html), true, html);
  }
});
