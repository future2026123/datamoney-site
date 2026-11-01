import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

class Element {
  constructor(tag = 'div') { this.tag = tag; this.children = []; this.attrs = {}; this.textContent = ''; }
  append(...children) { this.children.push(...children); }
  setAttribute(name, value) { this.attrs[name] = value; }
}
const source = await readFile(new URL('../blog/related-articles.js', import.meta.url), 'utf8');
const sidebarSource = await readFile(new URL('../scripts/blog-tags.js', import.meta.url), 'utf8');
const make = (path, title, primary_tags, tags = primary_tags) => ({path, title, primary_tags, tags, thumbnail: '/blog/thumbnails/example.jpg', card_title: title});
const current = make('/blog/current/', '월배당 ETF', ['ETF', '월배당 ETF', '분배금']);
const direct = make('/blog/direct/', '커버드콜 분배금', ['커버드콜', '분배금']);
const broad = make('/blog/broad/', '반도체 ETF', ['ETF']);
const legacy = make('/blog/legacy/', 'ISA 계좌', ['ISA'], ['ISA', '분배금']);
const articles = [current, direct, broad, legacy,
  ...[1, 2, 3, 4, 5].map((i) => make(`/blog/new-${i}/`, `새 글 ${i}`, ['분배금'])),
  make('https://example.com/', '외부', ['분배금'])];

async function render(path, data, ok = true) {
  const sections = [];
  const reactions = {before: (section) => sections.push(section)};
  const document = {querySelector: (selector) => selector === '.dm-end-actions' ? reactions : null,
    createElement: (tag) => new Element(tag)};
  vm.runInNewContext(source, {document, location: {pathname: path}, URL,
    fetch: async () => ({ok, json: async () => ({articles: data})})});
  await new Promise((resolve) => setImmediate(resolve));
  return sections;
}
const result = await render('/blog/current/', articles);
assert.equal(result.length, 1, 'insert a recommendation section before reactions');
const aside = result[0];
assert.equal(aside.tag, 'aside', 'the narration and search index skip the recommendation section');
assert.equal(aside.children[0].textContent, '함께 읽으면 좋은 글');
const links = aside.children[1].children.map((li) => li.children[0]);
assert.equal(links.length, 3, 'show at most three');
assert.equal(links[0].children[0].tag, 'img');
assert.equal(links[0].children[0].src, '/blog/thumbnails/example.jpg');
assert.equal(links[0].children[0].alt, '', 'the link title supplies the accessible name');
assert.equal(links[0].children[0].loading, 'lazy');
assert.ok(links.some((link) => link.href === '/blog/direct/'));
assert.ok(!links.some((link) => ['/blog/current/', '/blog/broad/', '/blog/legacy/', 'https://example.com/'].includes(link.href)),
  'exclude current article, generic-only overlap, legacy keywords and external links');
const later = make('/blog/added/', '새 분배금 글', ['분배금']);
const refreshed = await render('/blog/current/', [current, later]);
assert.equal(refreshed[0].children[1].children[0].children[0].href, '/blog/added/', 'new tagged articles become recommendations automatically');
const goal = await render('/blog/goal/', [make('/blog/goal/', '경제적 자유', ['경제적 자유', '재무목표']),
  make('/blog/save/', '적립식 투자', ['적립식 투자']), make('/blog/unrelated/', '보험료', ['생활금융'])]);
assert.equal(goal[0].children[1].children[0].children[0].href, '/blog/save/');
const titleMatch = await render('/blog/loan/', [make('/blog/loan/', '대출', ['금리']),
  make('/blog/deposit/', '파킹통장 금리 비교', ['예금'])]);
assert.equal(titleMatch[0].children[1].children[0].children[0].href, '/blog/deposit/', 'a meaningful tag can match another article title');
assert.equal((await render('/blog/current/', [current, broad, legacy])).length, 0, 'hide the section when no meaningful match exists');
assert.equal((await render('/blog/current/', [current, {...direct, thumbnail: ''}])).length, 0, 'skip related posts without a thumbnail');
assert.equal((await render('/blog/current/', [current, {...direct, thumbnail: 'https://example.com/img.jpg'}])).length, 0, 'do not load unrelated external images');
assert.equal((await render('/blog/current/', [current, {...direct, thumbnail: '/blog/thumbnails/../private.jpg'}])).length, 0, 'reject paths outside the thumbnail directory');
assert.equal((await render('/blog/current/', [current, {...direct, thumbnail: '/blog/thumbnails/한글 썸네일.png'}])).length, 1, 'support valid Korean thumbnail filenames');
assert.equal((await render('/blog/current/', articles, false)).length, 0, 'do not affect the article when the index is unavailable');
let fetchCount = 0;
const inserted = [], tagCard = new Element(), tagContent = new Element();
const sharedContext = vm.createContext({
  document: {querySelector: () => ({before: (section) => inserted.push(section)}),
    getElementById: (id) => ({'blog-tags': tagCard, 'blog-tags-content': tagContent})[id],
    createElement: (tag) => new Element(tag)},
  location: {pathname: '/blog/current/'}, URL,
  fetch: async () => { fetchCount++; return {ok: true, json: async () => ({articles, tags: [{name:'분배금', count:2}]})}; }
});
vm.runInContext(source, sharedContext);
vm.runInContext(sidebarSource, sharedContext);
await new Promise((resolve) => setImmediate(resolve));
assert.equal(fetchCount, 1, 'the sidebar and recommendations share one index request');
assert.equal(inserted.length, 1);
assert.equal(tagCard.hidden, false);
console.log('Related articles: relevance, placement, no self-link, automatic updates and failure handling passed');
