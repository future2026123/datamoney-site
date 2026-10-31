import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker, {ArticleEngagement} from '../workers/article-engagement.js';

const db = new DatabaseSync(':memory:');
const state = {storage:{sql:{exec(sql, ...args) {
  const rows = db.prepare(sql).all(...args);
  return {toArray:() => rows, one:() => rows[0]};
}}, setAlarm:async () => {}}};
const object = new ArticleEngagement(state);
const env = {DM_COMMENT_ADMIN_KEY:'test-key', ARTICLE_ENGAGEMENT:{idFromName:() => 'test', get:() => object}};
const base = 'https://datamoney.kr/api/article-engagement';
async function call(path, {method='GET', data, headers={}} = {}) {
  const response = await worker.fetch(new Request(base + path, {method,
    headers:{origin:'https://datamoney.kr', 'cf-connecting-ip':'192.0.2.10', ...headers},
    ...(data === undefined ? {} : {body:JSON.stringify(data)})}), env);
  return {status:response.status, body:await response.json(), headers:response.headers};
}
const post = data => call('/test-post/feedback', {method:'POST', data});
assert.equal((await post({choice:'invalid'})).status, 400);
assert.equal((await post({choice:'helpful', body:'x'.repeat(501)})).status, 400);
assert.equal((await call('/test-post/feedback', {method:'POST', data:{choice:'helpful'}, headers:{origin:'https://evil.example'}})).status, 403);
assert.equal((await call('/test-post/feedback')).status, 405);
const first = await post({choice:'helpful'});
assert.equal(first.status, 200);
const cookie = first.headers.get('set-cookie').split(';')[0];
const second = await call('/test-post/feedback', {method:'POST', headers:{cookie}, data:{choice:'helpful', body:'비공개 의견 <script>alert(1)</script>'}});
assert.equal(second.status, 200);
await call('/test-post/feedback', {method:'POST', headers:{cookie}, data:{choice:'difficult'}});
assert.equal((await call('/_admin/feedback')).status, 401);
assert.equal((await call('/_admin/feedback', {headers:{'x-article-admin':'authorized'}})).status, 401);
const adminHeaders = {authorization:'Bearer test-key'};
const admin = await call('/_admin/feedback', {headers:adminHeaders});
assert.equal(admin.status, 200);
assert.equal(admin.headers.get('cache-control'), 'no-store');
assert.equal(admin.body.items.length, 1, 'one browser has one response per article');
assert.equal(admin.body.items[0].choice, 'difficult');
assert.equal(admin.body.items[0].body, '비공개 의견 <script>alert(1)</script>', 'changing the choice preserves a written note');
assert.equal(admin.body.totals[0].difficult, 1);
assert.ok(!JSON.stringify((await call('/test-post')).body).includes('비공개 의견'));
const id = admin.body.items[0].id;
assert.equal((await call('/_admin/feedback/' + id, {method:'DELETE'})).status, 401);
assert.equal((await call('/_admin/feedback/' + id, {method:'DELETE', headers:adminHeaders})).status, 200);
assert.equal((await call('/_admin/feedback', {headers:adminHeaders})).body.items.length, 0);
await post({choice:'disappointing'});
db.exec('UPDATE article_feedback SET updated_at = 1');
db.exec('UPDATE feedback_rate SET created_at = 1');
await object.alarm();
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM article_feedback').get().n, 0);
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM feedback_rate').get().n, 0);
console.log('Article feedback: private storage, one-click update, authorization, deletion and retention passed');
