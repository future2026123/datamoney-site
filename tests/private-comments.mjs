import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';

const source = await readFile(new URL('../workers/article-engagement.js', import.meta.url));
const {default: worker, ArticleEngagement} = await import(`data:text/javascript;base64,${source.toString('base64')}`);
const db = new DatabaseSync(':memory:');
const state = {storage: {sql: {exec(sql, ...args) {
  const rows = db.prepare(sql).all(...args);
  return {toArray: () => rows, one: () => rows[0]};
}}, setAlarm: async () => {}}};
const object = new ArticleEngagement(state);
const env = {DM_COMMENT_ADMIN_KEY: 'test-admin-key', ARTICLE_ENGAGEMENT: {
  idFromName: () => 'test', get: () => object
}};
const base = 'https://datamoney.kr/api/article-engagement';
async function request(path, {method = 'GET', data, headers = {}} = {}) {
  const response = await worker.fetch(new Request(base + path, {
    method, headers: {origin: 'https://datamoney.kr', ...headers},
    ...(data === undefined ? {} : {body: JSON.stringify(data)})
  }), env);
  return {status: response.status, body: await response.json(), headers: response.headers};
}
const secret = '비밀 본문 secret-only-for-admin';
const privatePost = await request('/test-article/comments', {method:'POST', data:{nickname:'비밀 작성자', body:secret, isPrivate:true}});
assert.equal(privatePost.status, 201);
assert.equal(privatePost.body.status, 'private');
assert.equal(privatePost.body.comments, 0);
assert.ok(!JSON.stringify(privatePost.body).includes(secret));
const publicPost = await request('/test-article/comments', {method:'POST', data:{nickname:'공개 작성자', body:'공개 댓글'}});
assert.equal(publicPost.body.status, 'published');
const listing = await request('/test-article/comments');
assert.equal(listing.body.comments, 1);
assert.equal(listing.body.items.length, 1);
assert.equal(listing.body.items[0].body, '공개 댓글');
assert.ok(!JSON.stringify(listing.body).includes(secret));
assert.ok(!JSON.stringify(listing.body).includes('비밀 작성자'));
const privateReply = await request('/test-article/comments', {method:'POST', data:{nickname:'답글 작성자', body:'비밀 답글', parentId:listing.body.items[0].id, isPrivate:true}});
assert.equal(privateReply.body.status, 'private');
const again = await request('/test-article/comments');
assert.equal(again.body.items[0].replies.length, 0);
assert.equal(again.body.comments, 1);
const denied = await request('/_admin/comments?status=private', {headers:{'x-article-admin':'authorized'}});
assert.equal(denied.status, 401);
const adminHeaders = {authorization:'Bearer test-admin-key'};
const admin = await request('/_admin/comments?status=private', {headers:adminHeaders});
assert.equal(admin.status, 200);
assert.equal(admin.headers.get('cache-control'), 'no-store');
assert.equal(admin.body.items.length, 2);
assert.ok(admin.body.items.some(item => item.body === secret));
const privateId = admin.body.items.find(item => item.body === secret).id;
assert.equal((await request(`/_admin/comments/${privateId}/approve`, {method:'POST', headers:adminHeaders})).status, 403);
assert.equal((await request(`/test-article/comments/${privateId}/vote`, {method:'POST', data:{value:1}})).status, 404);
assert.ok(!JSON.stringify((await request('/test-article/comments')).body).includes(secret));
assert.equal((await request('/test-article/comments', {method:'POST', data:{nickname:'x', body:'x', isPrivate:'true'}})).status, 400);
assert.equal((await request(`/_admin/comments/${privateId}`, {method:'DELETE', headers:adminHeaders})).status, 200);
assert.equal((await request('/_admin/comments?status=private', {headers:adminHeaders})).body.items.length, 1);
console.log('Private comment authorization, confidentiality, replies and deletion: passed');
