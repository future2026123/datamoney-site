import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';

const require = createRequire(new URL('../workers/package.json', import.meta.url));
const {JSDOM} = require('jsdom');
const html = await readFile(new URL('../comment-admin/index.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../comment-admin/admin.js', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const response = (status, data = {}) => ({ok:status === 200, status, json:async () => data});
const emptyList = {items:[], nextBefore:null};

function setup({existingSession=false, google=true, legacyAllowed=false, feedback=false} = {}) {
  const dom = new JSDOM(html, {url:'https://datamoney.kr/comment-admin/', runScripts:'outside-only'});
  let authorized = existingSession;
  let googleConfig;
  const calls = [];
  dom.window.fetch = async (url, options={}) => {
    calls.push({url, options});
    if (url.endsWith('/_auth/config')) return response(200, google ? {googleClientId:'test.apps.googleusercontent.com', nonce:'a'.repeat(64), legacyAllowed} : {googleClientId:null});
    if (url.endsWith('/_auth/login')) {
      assert.equal(JSON.parse(options.body).credential, 'test-google-token');
      authorized = true;
      return response(200, {ok:true});
    }
    if (authorized || options.headers?.authorization === 'Bearer test-key') {
      if (url.includes('/_admin/feedback?') && feedback) return response(200, {items:[{id:1,article:'test-article',choice:'helpful',body:'<img src=x onerror=alert(1)>',updated_at:Date.now()}], totals:[{article:'test-article',helpful:1,difficult:0,disappointing:0}],nextBefore:null});
      return response(200, emptyList);
    }
    return response(401);
  };
  dom.window.google = {accounts:{id:{initialize:config => {googleConfig = config;}, renderButton:element => {element.textContent = 'Google button';}}}};
  const append = dom.window.document.head.append.bind(dom.window.document.head);
  dom.window.document.head.append = node => {
    append(node);
    if (node.src === 'https://accounts.google.com/gsi/client') setTimeout(() => node.onload(), 0);
  };
  dom.window.eval(script);
  return {dom, calls, getGoogleConfig:() => googleConfig, expire:() => {authorized = false;}};
}

const existing = setup({existingSession:true});
await tick();
assert.equal(existing.dom.window.document.querySelector('#admin-panel').hidden, false);
assert.equal(existing.dom.window.document.querySelector('#admin-login').hidden, true);
assert.equal(existing.dom.window.document.querySelector('#admin-signout').hidden, false);
assert.equal(existing.calls.some(call => call.url.endsWith('/_auth/config')), false);
existing.expire();
existing.dom.window.document.querySelector('[data-status=private]').click();
await tick();
assert.match(existing.dom.window.document.querySelector('#admin-status').textContent, /로그인이 만료/);

const feedbackPage = setup({existingSession:true, feedback:true});
await tick();
feedbackPage.dom.window.document.querySelector('[data-status=feedback]').click();
await tick();
const feedbackDocument = feedbackPage.dom.window.document;
assert.match(feedbackDocument.querySelector('#feedback-summary').textContent, /도움됐어요 1/);
assert.match(feedbackDocument.querySelector('#admin-comments').textContent, /<img src=x/);
assert.equal(feedbackDocument.querySelector('#admin-comments img'), null, 'reader input remains text in the admin panel');

for (const legacyAllowed of [true, false]) {
  const page = setup({legacyAllowed});
  await tick(); await tick();
  const document = page.dom.window.document;
  assert.equal(document.querySelector('#google-login').hidden, false);
  assert.equal(document.querySelector('#admin-login').hidden, !legacyAllowed);
  assert.equal(page.getGoogleConfig().nonce, 'a'.repeat(64));
  await page.getGoogleConfig().callback({credential:'test-google-token'});
  assert.equal(document.querySelector('#admin-panel').hidden, false);
  assert.equal(document.querySelector('#google-login').hidden, true);
  assert.equal(document.querySelector('#admin-login').hidden, true);
  assert.equal(document.querySelector('#admin-status').textContent, '');
}

for (const google of [false, true]) {
  const page = setup({google, legacyAllowed:true});
  await tick(); await tick();
  const document = page.dom.window.document;
  document.querySelector('#admin-key').value = 'test-key';
  document.querySelector('#admin-login').dispatchEvent(new page.dom.window.Event('submit', {bubbles:true, cancelable:true}));
  await tick();
  assert.equal(document.querySelector('#admin-panel').hidden, false);
  assert.equal(document.querySelector('#admin-login').hidden, true);
  assert.equal(document.querySelector('#google-login').hidden, true);
  assert.equal(document.querySelector('#admin-status').textContent, '');
}
console.log('Administrator UI: Google sessions, expiry, transition and legacy fallback passed');
