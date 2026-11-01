import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const script = await readFile(new URL('../scripts/investor-type-embed.js', import.meta.url), 'utf8');

function page(address, initialScroll = 0) {
  const location = {href: address};
  const history = {state: null, replaceState(state, title, url) { location.href = String(url); }};
  class Element {
    constructor(kind = '') { this.kind = kind; this.listeners = {}; this.children = []; this.attributes = {}; this.style = {}; }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    append(...children) { this.children.push(...children); }
    matches() { return this.kind === 'original'; }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; }
    getBoundingClientRect() { return {top: 0}; }
    focus() { this.focused = true; }
    remove() { layout.children = layout.children.filter(child => child !== this); }
    click() { this.listeners.click?.({button: 0, preventDefault() {}}); }
  }
  const banner = new Element('banner');
  const original = new Element('original');
  const sidebar = new Element('sidebar');
  const layout = {
    children: [original, sidebar],
    querySelector() { return this.children.find(child => child.className === 'dm-investor-embed') || null; },
    insertBefore(child) { this.children.unshift(child); }
  };
  sidebar.parentElement = layout;
  const document = {
    querySelector(selector) { return selector === '.dm-shared-sidebar' ? sidebar : null; },
    querySelectorAll() { return [banner]; },
    createElement() { return new Element(); }
  };
  const scrolls = [];
  const window = {location, scrollY: initialScroll, scrollTo(options) { scrolls.push(options.top); this.scrollY = options.top; }};
  vm.runInNewContext(script, {document, window, history, URL});
  return {banner, layout, original, location, scrolls, window};
}

const originalAddress = 'https://datamoney.kr/blog/?category=stocks&page=2#latest';
const opened = page(originalAddress);
assert.equal(opened.layout.querySelector(), null);
opened.banner.click();
assert.ok(opened.layout.querySelector(), 'banner opens the test');
assert.equal(new URL(opened.location.href).searchParams.get('investor_test'), '1');
assert.equal(new URL(opened.location.href).searchParams.get('category'), 'stocks');
assert.equal(new URL(opened.location.href).searchParams.get('page'), '2');
assert.equal(new URL(opened.location.href).hash, '#latest');

const reloaded = page(opened.location.href);
const panel = reloaded.layout.querySelector();
assert.ok(panel, 'reload reopens the test in the current layout');
assert.equal(reloaded.scrolls.length, 0, 'opening the test from its URL does not move the page down');
assert.equal(panel.children[0].children[0].focused, undefined, 'restoring the page does not steal focus');
assert.ok(Object.hasOwn(reloaded.original.attributes, 'data-investor-original-hidden'));
panel.children[0].children[0].click();
assert.equal(reloaded.layout.querySelector(), null);
assert.equal(reloaded.location.href, originalAddress, 'close restores the original page and filters');
assert.ok(!Object.hasOwn(reloaded.original.attributes, 'data-investor-original-hidden'));

const article = page('https://datamoney.kr/blog/example/?investor_test=1');
assert.ok(article.layout.querySelector(), 'article URLs reopen the same embedded view');
assert.equal(new URL(article.location.href).pathname, '/blog/example/');
assert.equal(article.scrolls.length, 1, 'article URLs keep their original positioning behavior');
const scrolledHome = page('https://datamoney.kr/blog/', 300);
scrolledHome.banner.click();
assert.equal(scrolledHome.window.scrollY, 0, 'opening the test on the home page shows the same header position');
scrolledHome.window.scrollY = 200;
scrolledHome.banner.click();
assert.equal(scrolledHome.window.scrollY, 0, 'reselecting an open test also restores the home header position');
scrolledHome.layout.querySelector().children[0].children[0].click();
assert.equal(scrolledHome.window.scrollY, 300, 'closing the test restores the prior home position');
console.log('Investor test stays open after reload and restores the original page: passed');
