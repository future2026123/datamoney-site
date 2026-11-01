import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const require = createRequire(new URL('../workers/package.json', import.meta.url));
const {JSDOM} = require('jsdom');
const source = await readFile(new URL('../scripts/contact.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function setup(url, body) {
  const dom = new JSDOM(`<!doctype html><html><body>${body}</body></html>`, {url, runScripts:'outside-only'});
  const {window} = dom;
  window.HTMLDialogElement.prototype.showModal = function() { this.open = true; };
  window.HTMLDialogElement.prototype.close = function() { this.open = false; this.dispatchEvent(new window.Event('close')); };
  const calls = [];
  let fail = false;
  window.fetch = async (path, options) => { calls.push({path, options}); return {ok:!fail, status:fail ? 503 : 201}; };
  window.eval(source);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return {window, document:window.document, calls, setFail:value => {fail=value;}};
}
const page = setup('https://datamoney.kr/blog/test/', '<header class="dm-site-header"><nav class="dm-site-nav"><a href="/contact/" data-dm-contact-link>문의하기</a></nav></header><main>본문</main><footer class="dm-site-footer"><nav class="dm-footer-links"><a href="/contact/" data-dm-contact-link>문의하기</a></nav></footer>');
assert.equal(page.document.querySelectorAll('[data-dm-contact-link]').length, 2, 'existing links are not duplicated');
const open = page.document.querySelector('.dm-site-nav a');
open.click();
const dialog = page.document.querySelector('dialog');
assert.ok(dialog.open);
assert.equal(dialog.getAttribute('aria-labelledby'), 'dm-inquiry-title');
const form = dialog.querySelector('form');
form.elements.body.value = '화면이 작게 보여요.';
form.querySelector('input[value=error]').checked = true;
page.setFail(true);
form.dispatchEvent(new page.window.Event('submit', {bubbles:true, cancelable:true}));
await tick();
assert.match(dialog.querySelector('[role=status]').textContent, /보내지 못했어요/);
assert.equal(form.elements.body.value, '화면이 작게 보여요.', 'input is preserved after failure');
page.setFail(false);
form.dispatchEvent(new page.window.Event('submit', {bubbles:true, cancelable:true}));
await tick();
const first = JSON.parse(page.calls[0].options.body), retry = JSON.parse(page.calls[1].options.body);
assert.equal(first.category, 'error');
assert.equal(first.email, '', 'the email is optional');
assert.equal(first.requestId, retry.requestId, 'retries cannot duplicate an accepted inquiry');
assert.equal(page.calls[0].path, '/api/article-engagement/_inquiry');
assert.equal(form.hidden, true);
assert.equal(dialog.querySelector('.dm-inquiry-success').hidden, false);
dialog.querySelector('[data-inquiry-close]').click();
assert.equal(dialog.open, false);
assert.equal(page.document.activeElement, open, 'focus returns to the opener');

for (const [url, body] of [
  ['https://datamoney.kr/', '<header class="topbar"><nav class="nav"></nav></header><footer class="footer"></footer>'],
  ['https://datamoney.kr/tools/', '<div class="wrap"><header><div class="link-row"></div></header><footer></footer></div>'],
  ['https://datamoney.kr/tools/etf_calculator/', '<header><a class="logo"></a><span>계산기</span></header><footer></footer>'],
  ['https://datamoney.kr/tools/investor-type/', '<div class="shell"><header><a href="/">로고</a></header><footer><span data-site-info-links="true"></span></footer></div>']
]) {
  const item = setup(url, body);
  assert.equal(item.document.querySelectorAll('[data-dm-contact-link]').length, 2, `header and footer links on ${url}`);
  item.window.close();
}
const embedded = setup('https://datamoney.kr/tools/investor-type/?embed=1', '<header></header><footer></footer>');
assert.equal(embedded.document.querySelector('[data-dm-contact-link]'), null, 'embedded tools use the parent site inquiry control');
const direct = setup('https://datamoney.kr/contact/', '<main data-inquiry-standalone>이메일로 문의하기</main>');
assert.ok(direct.document.querySelector('[data-inquiry-standalone] form'), 'the direct contact page provides the same form');
page.window.close(); embedded.window.close(); direct.window.close();
console.log('Inquiry UI: site links, optional email, retries, confirmation and embedded pages passed');
