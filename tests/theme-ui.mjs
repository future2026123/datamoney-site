import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const require = createRequire(new URL('../workers/package.json', import.meta.url));
const {JSDOM} = require('jsdom');
const source = await readFile(new URL('../scripts/theme.js', import.meta.url), 'utf8');
const key = 'datamoney-color-mode';

function setup(url, saved, systemDark = false, storageFails = false, markup = '<header class="dm-site-header"><a href="/">데이터머니</a><nav class="dm-site-nav"></nav></header>') {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${markup}<main></main></body></html>`,
    {url, runScripts:'outside-only'});
  const {window} = dom;
  if (saved) window.localStorage.setItem(key, saved);
  if (storageFails) Object.defineProperty(window, 'localStorage', {get(){throw new Error('unavailable');}});
  const handlers = [];
  const media = {matches:systemDark, addEventListener(name, fn){if(name==='change') handlers.push(fn);}};
  window.matchMedia = () => media;
  window.eval(source);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return {window, document:window.document, media, setSystem(dark){media.matches=dark;handlers.forEach(fn=>fn());}};
}

const page = setup('https://datamoney.kr/blog/example/', null, true);
assert.equal(page.document.documentElement.dataset.dmTheme, 'dark', 'system dark applies before UI interaction');
assert.equal(page.document.documentElement.dataset.dmPage, 'article');
const button = page.document.querySelector('.dm-theme-toggle');
const menu = page.document.querySelector('.dm-theme-menu');
assert.ok(button && menu && menu.hidden);
button.click(); assert.equal(menu.hidden, false); assert.equal(button.getAttribute('aria-expanded'), 'true');
page.document.querySelector('[data-dm-theme-value="light"]').click();
assert.equal(page.document.documentElement.dataset.dmTheme, 'light');
assert.equal(page.window.localStorage.getItem(key), 'light');
assert.equal(menu.hidden, true);
page.setSystem(false); page.setSystem(true);
assert.equal(page.document.documentElement.dataset.dmTheme, 'light', 'manual choice overrides device changes');
button.click();page.document.querySelector('[data-dm-theme-value="system"]').click();
assert.equal(page.document.documentElement.dataset.dmTheme, 'dark');
page.setSystem(false);assert.equal(page.document.documentElement.dataset.dmTheme, 'light');
button.click();page.document.dispatchEvent(new page.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
assert.equal(menu.hidden, true);assert.equal(page.document.activeElement, button);

const next = setup('https://datamoney.kr/tools/etf-calculator', 'dark', false);
assert.equal(next.document.documentElement.dataset.dmTheme, 'dark');
assert.equal(next.document.documentElement.dataset.dmPage, 'calculator');
next.window.dispatchEvent(new next.window.StorageEvent('storage',{key,newValue:'light'}));
assert.equal(next.document.documentElement.dataset.dmTheme, 'light', 'another tab or parent can change the mode');
const embedded = setup('https://datamoney.kr/tools/investor-type/?embed=1', 'dark');
assert.equal(embedded.document.documentElement.dataset.dmTheme, 'dark');
assert.equal(embedded.document.querySelector('.dm-theme-control'), null, 'embedded tests use the parent control');
const investor = setup('https://datamoney.kr/tools/investor-type/', 'dark', false, false,
  '<div class="shell"><header><a href="/">데이터머니</a><a href="/blog/">블로그</a></header></div>');
assert.equal(investor.document.querySelector('.shell > header > a:last-child')?.textContent, '블로그', 'the theme control preserves existing last-child navigation styles');
assert.ok(investor.document.querySelector('.shell > header > .dm-theme-control'));
const noStorage = setup('https://datamoney.kr/search/', null, false, true);
noStorage.document.querySelector('[data-dm-theme-value="dark"]').click();
assert.equal(noStorage.document.documentElement.dataset.dmTheme, 'dark', 'mode still works when storage is unavailable');
console.log('Theme: system preference, manual selection, persistence, embedding and keyboard controls passed');
