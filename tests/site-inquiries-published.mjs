import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const require = createRequire(new URL('../workers/package.json', import.meta.url));
const {JSDOM} = require('jsdom');
const contact = await readFile(new URL('../scripts/contact.js', import.meta.url), 'utf8');
const theme = await readFile(new URL('../scripts/theme.js', import.meta.url), 'utf8');
const pages = [
  ['index.html', '/'], ['blog/index.html', '/blog/'],
  ['blog/why-we-want-financial-freedom-ep01/index.html', '/blog/why-we-want-financial-freedom-ep01/'],
  ['search/index.html', '/search/'], ['tools/index.html', '/tools/'],
  ['tools/etf_calculator/index.html', '/tools/etf_calculator/'],
  ['tools/investor-type/index.html', '/tools/investor-type/'],
  ['about/index.html', '/about/'], ['privacy/index.html', '/privacy/'],
  ['account/result/index.html', '/account/result/'], ['contact/index.html', '/contact/']
];
for (const [file, path] of pages) {
  const html = await readFile(new URL('../' + file, import.meta.url), 'utf8');
  assert.match(html, /\/scripts\/contact\.js\?v=/, `inquiry assets are present on ${path}`);
  const dom = new JSDOM(html, {url:'https://datamoney.kr' + path, runScripts:'outside-only'});
  dom.window.eval(theme); dom.window.eval(contact);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  const document = dom.window.document;
  if (path === '/contact/') {
    assert.ok(document.querySelector('[data-inquiry-standalone] form'), 'the direct page has a form');
  } else {
    assert.ok(document.querySelector('header [data-dm-contact-link]'), `header link on ${path}`);
    assert.ok(document.querySelector('footer [data-dm-contact-link]'), `footer link on ${path}`);
  }
  dom.window.close();
}
console.log('Built public pages expose the inquiry form from headers and footers');
