import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import worker, {ArticleEngagement} from '../workers/article-engagement.js';

const require = createRequire(new URL('../workers/package.json', import.meta.url));
const {generateKeyPair, exportJWK, SignJWT} = await import(pathToFileURL(require.resolve('jose')).href);
const {publicKey, privateKey} = await generateKeyPair('RS256', {extractable:true});
const {privateKey: wrongPrivateKey} = await generateKeyPair('RS256', {extractable:true});
const publicJwk = {...await exportJWK(publicKey), kid:'test-key', alg:'RS256', use:'sig'};
const originalFetch = globalThis.fetch;
globalThis.fetch = async url => {
  assert.equal(String(url), 'https://www.googleapis.com/oauth2/v3/certs');
  return new Response(JSON.stringify({keys:[publicJwk]}), {headers:{'content-type':'application/json'}});
};

const db = new DatabaseSync(':memory:');
const state = {storage: {sql: {exec(sql, ...args) {
  const rows = db.prepare(sql).all(...args);
  return {toArray:() => rows, one:() => rows[0]};
}}, setAlarm:async () => {}}};
const object = new ArticleEngagement(state);
const baseEnv = {DM_COMMENT_ADMIN_KEY:'old-test-key', ARTICLE_ENGAGEMENT:{idFromName:()=>'test', get:()=>object}};
const env = {...baseEnv, DM_GOOGLE_CLIENT_ID:'test.apps.googleusercontent.com', DM_GOOGLE_ADMIN_EMAIL:'admin@gmail.com', DM_ADMIN_SESSION_SECRET:'test-secret-with-at-least-thirty-two-characters', DM_GOOGLE_ENFORCE:'1'};
async function call(path, {method='GET', body, headers={}, config=env, host='https://datamoney.kr'} = {}) {
  const response = await worker.fetch(new Request(host + '/api/article-engagement' + path, {
    method, headers:{origin:host, ...headers}, ...(body === undefined ? {} : {body:JSON.stringify(body)})
  }), config);
  return {status:response.status, body:await response.json(), headers:response.headers};
}
async function signedGoogleToken(nonce, overrides = {}, signer = privateKey) {
  return new SignJWT({email:'admin@gmail.com', email_verified:true, nonce, ...overrides})
    .setProtectedHeader({alg:'RS256', kid:'test-key'}).setIssuer(overrides.iss || 'https://accounts.google.com')
    .setAudience(overrides.aud || env.DM_GOOGLE_CLIENT_ID).setSubject('test-google-subject')
    .setIssuedAt().setExpirationTime(overrides.exp || '5m').sign(signer);
}

const config = await call('/_auth/config');
assert.equal(config.status, 200);
assert.equal(config.body.googleClientId, env.DM_GOOGLE_CLIENT_ID);
assert.match(config.body.nonce, /^[a-f0-9]{64}$/);
const nonceSetCookie = config.headers.getSetCookie()[0];
assert.match(nonceSetCookie, /Secure; HttpOnly; SameSite=Strict/);
const nonceCookie = nonceSetCookie.split(';')[0];
const validToken = await signedGoogleToken(config.body.nonce);
const login = (credential, cookie = nonceCookie, extra = {}) => call('/_auth/login', {method:'POST', body:{credential}, headers:{cookie}, ...extra});
assert.equal((await call('/_admin/comments?status=private')).status, 401);
assert.equal((await call('/_admin/comments?status=private', {headers:{authorization:'Bearer old-test-key'}})).status, 401);
assert.equal((await call('/_admin/comments?status=private', {config:{...env, DM_GOOGLE_ENFORCE:'0'}, headers:{authorization:'Bearer old-test-key'}})).status, 200);
assert.equal((await call('/_admin/comments?status=private', {config:{...env, DM_GOOGLE_ENFORCE:'bad'}, headers:{authorization:'Bearer old-test-key'}})).status, 503);
assert.equal((await login(validToken, '')).status, 401);
assert.equal((await login(await signedGoogleToken('a'.repeat(64)))).status, 401);
assert.equal((await login(await signedGoogleToken(config.body.nonce, {email:'other@gmail.com'}))).status, 401);
assert.equal((await login(await signedGoogleToken(config.body.nonce, {email_verified:false}))).status, 401);
assert.equal((await login(await signedGoogleToken(config.body.nonce, {}, wrongPrivateKey))).status, 401);
assert.equal((await login(await signedGoogleToken(config.body.nonce, {aud:'other.apps.googleusercontent.com'}))).status, 401);
assert.equal((await login(await signedGoogleToken(config.body.nonce, {iss:'https://evil.example'}))).status, 401);
assert.equal((await login(await signedGoogleToken(config.body.nonce, {exp:'1 second ago'}))).status, 401);
assert.equal((await login(validToken, nonceCookie, {headers:{cookie:nonceCookie, origin:'https://evil.example'}})).status, 403);
assert.equal((await call('/_auth/config', {config:{...baseEnv, DM_GOOGLE_CLIENT_ID:'test.apps.googleusercontent.com'}})).status, 503);
assert.equal((await call('/_admin/comments', {config:{...baseEnv, DM_GOOGLE_CLIENT_ID:''}, headers:{authorization:'Bearer old-test-key'}})).status, 503);
assert.equal((await call('/_admin/comments', {host:'https://alternate.example'})).status, 401);

const authenticated = await login(validToken);
assert.equal(authenticated.status, 200);
const sessionSetCookie = authenticated.headers.getSetCookie().find(value => value.startsWith('__Host-dm_admin_session='));
assert.match(sessionSetCookie, /Secure; HttpOnly; SameSite=Strict; Max-Age=86400/);
const session = sessionSetCookie.split(';')[0];
for (const path of ['/_admin/comments?status=private','/_admin/comments?status=pending','/_admin/survey','/_admin/email-subscribers','/_admin/feedback','/_admin/inquiries']) {
  assert.equal((await call(path, {headers:{cookie:session}})).status, 200);
  assert.equal((await call(path, {headers:{'x-article-admin':'authorized'}})).status, 401);
}
assert.equal((await call('/_admin/comments?status=private', {headers:{cookie:session+'tampered'}})).status, 401);
assert.equal((await call('/_admin/comments?status=private', {host:'https://alternate.example', headers:{cookie:session}})).status, 401);
assert.equal((await call('/_admin/comments?status=private', {config:{...env, DM_GOOGLE_ADMIN_EMAIL:'other@gmail.com'}, headers:{cookie:session}})).status, 401);
assert.equal((await call('/_admin/comments?status=private', {config:{...env, DM_GOOGLE_CLIENT_ID:'other.apps.googleusercontent.com'}, headers:{cookie:session}})).status, 401);
const logout = await call('/_auth/logout', {method:'POST'});
assert.equal(logout.status, 200);
assert.ok(logout.headers.getSetCookie().some(value => value.startsWith('__Host-dm_admin_session=') && value.includes('Max-Age=0')));
assert.equal((await call('/test-article/comments')).status, 200);
assert.equal((await call('/_admin/comments', {config:baseEnv, headers:{authorization:'Bearer old-test-key'}})).status, 200);

globalThis.fetch = originalFetch;
console.log('Google administrator authentication: identity, nonce, session, legacy isolation and public routes passed');
