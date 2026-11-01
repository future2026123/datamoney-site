import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker, {ArticleEngagement} from '../workers/article-engagement.js';

const db = new DatabaseSync(':memory:');
const scheduled = [];
const state = {storage:{sql:{exec(sql, ...args) {
  const rows = db.prepare(sql).all(...args);
  return {toArray:() => rows, one:() => rows[0]};
}}, setAlarm:async time => scheduled.push(time)}};
const env = {DM_COMMENT_ADMIN_KEY:'test-key'};
const object = new ArticleEngagement(state, {RESEND_API_KEY:'test-resend', DM_GOOGLE_ADMIN_EMAIL:'owner@example.com'});
env.ARTICLE_ENGAGEMENT = {idFromName:() => 'test', get:() => object};
const base = 'https://datamoney.kr/api/article-engagement';
async function call(path, {method='GET', data, headers={}} = {}) {
  const response = await worker.fetch(new Request(base + path, {method,
    headers:{origin:'https://datamoney.kr', 'cf-connecting-ip':'192.0.2.55', ...headers},
    ...(data === undefined ? {} : {body:JSON.stringify(data)})}), env);
  return {status:response.status, body:await response.json(), headers:response.headers};
}
const id = '09c387f5-364e-42fa-9b3e-083bc9c6a253';
const input = {requestId:id, category:'question', body:'비공개 문의 <script>alert(1)</script>', email:'reader@example.com'};
const post = data => call('/_inquiry', {method:'POST', data});
assert.equal((await post({...input, body:' '})).status, 400);
assert.equal((await post({...input, body:'x'.repeat(2001)})).status, 400);
assert.equal((await post({...input, email:'person@example.com\nBcc:other@example.com'})).status, 400);
assert.equal((await call('/_inquiry', {method:'POST', data:input, headers:{origin:'https://evil.example'}})).status, 403);
assert.equal((await call('/_inquiry')).status, 405);
assert.equal((await post(input)).status, 201);
assert.equal((await post(input)).status, 200, 'a retry with the same request ID does not create a second inquiry');
assert.equal((await post({...input, body:'수정된 문의'})).status, 409, 'a changed inquiry cannot be silently mistaken for an earlier submission');
assert.ok(scheduled.length, 'the notification is queued');
assert.equal((await call('/_admin/inquiries')).status, 401);
assert.equal((await call('/_admin/inquiries', {headers:{'x-article-admin':'authorized'}})).status, 401);
const auth = {authorization:'Bearer test-key'};
let admin = await call('/_admin/inquiries', {headers:auth});
assert.equal(admin.headers.get('cache-control'), 'no-store');
assert.equal(admin.body.items.length, 1);
assert.equal(admin.body.items[0].body, input.body);
assert.equal(admin.body.items[0].email, input.email);
assert.equal(admin.body.items[0].notify_status, 'pending');
const sent = [];
const originalFetch = globalThis.fetch;
let fail = true;
globalThis.fetch = async (url, options) => {
  assert.equal(String(url), 'https://api.resend.com/emails');
  sent.push(options);
  return new Response('{}', {status:fail ? 503 : 200});
};
try {
  await object.alarm();
  assert.equal(db.prepare('SELECT notify_status FROM inquiries').get().notify_status, 'pending', 'a failed alert is retried');
  const alert = JSON.parse(sent[0].body);
  assert.deepEqual(alert.to, ['owner@example.com']);
  assert.ok(!JSON.stringify(alert).includes(input.body));
  assert.ok(!JSON.stringify(alert).includes(input.email), 'the alert excludes the visitor email');
  assert.equal(sent[0].headers['Idempotency-Key'], 'datamoney-inquiry-' + id);
  assert.match(alert.text, /comment-admin\/\?tab=inquiries/);
  db.prepare('UPDATE inquiries SET notify_next = ?').run(Date.now() - 1);
  fail = false; await object.alarm();
  admin = await call('/_admin/inquiries', {headers:auth});
  assert.equal(admin.body.items[0].notify_status, 'sent');
  assert.equal(sent[0].body, sent[1].body, 'retries keep the same idempotent payload');
} finally { globalThis.fetch = originalFetch; }
const recordId = admin.body.items[0].id;
assert.equal((await call('/_admin/inquiries/' + recordId, {method:'DELETE'})).status, 401);
assert.equal((await call('/_admin/inquiries/' + recordId, {method:'DELETE', headers:auth})).status, 200);
assert.equal((await call('/_admin/inquiries', {headers:auth})).body.items.length, 0);
for (let i=0; i<4; i++) {
  const nextId = `09c387f5-364e-42fa-9b3e-083bc9c6a25${i}`;
  assert.equal((await post({...input, requestId:nextId, email:''})).status, 201);
}
assert.equal((await post({...input, requestId:'09c387f5-364e-42fa-9b3e-083bc9c6a259'})).status, 429);
db.exec('UPDATE inquiries SET created_at = 1'); db.exec('UPDATE inquiry_rate SET created_at = 1');
await object.alarm();
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n, 0);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM inquiry_rate').get().n, 0);
console.log('Site inquiries: privacy, idempotence, admin authorization, notification retry, rate limits and retention passed');
