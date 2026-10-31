import {createRemoteJWKSet, jwtVerify, SignJWT} from 'jose';

export const AUTH_CONFIG_PATH = '/api/article-engagement/_auth/config';
export const AUTH_LOGIN_PATH = '/api/article-engagement/_auth/login';
export const AUTH_LOGOUT_PATH = '/api/article-engagement/_auth/logout';

const SITE_ORIGIN = 'https://datamoney.kr';
const NONCE_COOKIE = '__Host-dm_google_nonce';
const SESSION_COOKIE = '__Host-dm_admin_session';
const COOKIE_SETTINGS = 'Path=/; Secure; HttpOnly; SameSite=Strict';
const GOOGLE_KEYS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

function cookie(request, name) {
  const prefix = `${name}=`;
  const item = (request.headers.get('cookie') || '').split(';').map(value => value.trim()).find(value => value.startsWith(prefix));
  return item ? item.slice(prefix.length) : '';
}

function response(body, status = 200, cookies = []) {
  const headers = new Headers({'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'x-content-type-options':'nosniff'});
  for (const value of cookies) headers.append('set-cookie', value);
  return new Response(JSON.stringify(body), {status, headers});
}

function makeCookie(name, value, seconds) {
  return `${name}=${value}; ${COOKIE_SETTINGS}; Max-Age=${seconds}`;
}

export function googleAdminMode(env) {
  const entries = [env.DM_GOOGLE_CLIENT_ID, env.DM_GOOGLE_ADMIN_EMAIL, env.DM_ADMIN_SESSION_SECRET, env.DM_GOOGLE_ENFORCE];
  if (!entries.some(value => value !== undefined && value !== null)) return 'disabled';
  if (!entries.every(value => typeof value === 'string' && value.trim()) ||
      !env.DM_GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com') ||
      !/^[^@\s]+@gmail\.com$/i.test(env.DM_GOOGLE_ADMIN_EMAIL) ||
      env.DM_ADMIN_SESSION_SECRET.length < 32 || !['0','1'].includes(env.DM_GOOGLE_ENFORCE)) return 'unavailable';
  return 'enabled';
}

function sessionKey(env) {
  return new TextEncoder().encode(env.DM_ADMIN_SESSION_SECRET);
}

export function getGoogleAdminConfig(request, env) {
  const mode = googleAdminMode(env);
  if (mode === 'disabled') return response({googleClientId:null});
  if (mode !== 'enabled' || new URL(request.url).origin !== SITE_ORIGIN) return response({error:'Administrator access unavailable'}, 503);
  const random = crypto.getRandomValues(new Uint8Array(32));
  const nonce = [...random].map(value => value.toString(16).padStart(2, '0')).join('');
  return response({googleClientId:env.DM_GOOGLE_CLIENT_ID, nonce, legacyAllowed:env.DM_GOOGLE_ENFORCE === '0'}, 200, [makeCookie(NONCE_COOKIE, nonce, 300)]);
}

export async function googleAdminLogin(request, env) {
  const mode = googleAdminMode(env);
  if (mode === 'disabled') return response({error:'Not found'}, 404);
  if (mode !== 'enabled' || new URL(request.url).origin !== SITE_ORIGIN) return response({error:'Administrator access unavailable'}, 503);
  if ((Number(request.headers.get('content-length')) || 0) > 8192) return response({error:'Invalid input'}, 400);
  const raw = await request.text();
  if (raw.length > 8192) return response({error:'Invalid input'}, 400);
  let input;
  try { input = JSON.parse(raw); } catch (_) { return response({error:'Invalid input'}, 400); }
  const nonce = cookie(request, NONCE_COOKIE);
  if (typeof input?.credential !== 'string' || input.credential.length > 6000 || !/^[a-f0-9]{64}$/.test(nonce)) return response({error:'Not authorized'}, 401);
  try {
    const {payload} = await jwtVerify(input.credential, GOOGLE_KEYS, {
      algorithms:['RS256'], issuer:['https://accounts.google.com', 'accounts.google.com'],
      audience:env.DM_GOOGLE_CLIENT_ID, requiredClaims:['iss','aud','exp','sub','email','email_verified','nonce']
    });
    if (payload.nonce !== nonce || payload.email_verified !== true || typeof payload.email !== 'string' ||
        payload.email.toLowerCase() !== env.DM_GOOGLE_ADMIN_EMAIL.toLowerCase() || typeof payload.sub !== 'string' || !payload.sub) {
      return response({error:'Not authorized'}, 401);
    }
    const session = await new SignJWT({kind:'datamoney-admin', account:env.DM_GOOGLE_ADMIN_EMAIL.toLowerCase(), client:env.DM_GOOGLE_CLIENT_ID}).setProtectedHeader({alg:'HS256'})
      .setIssuer(SITE_ORIGIN).setAudience('datamoney-admin').setSubject(payload.sub).setIssuedAt().setExpirationTime('24h').sign(sessionKey(env));
    return response({ok:true}, 200, [makeCookie(NONCE_COOKIE, '', 0), makeCookie(SESSION_COOKIE, session, 86400)]);
  } catch (_) { return response({error:'Not authorized'}, 401); }
}

export async function hasGoogleAdminSession(request, env) {
  if (googleAdminMode(env) !== 'enabled' || new URL(request.url).origin !== SITE_ORIGIN) return false;
  const value = cookie(request, SESSION_COOKIE);
  if (!value || value.length > 4096) return false;
  try {
    const {payload} = await jwtVerify(value, sessionKey(env), {
      algorithms:['HS256'], issuer:SITE_ORIGIN, audience:'datamoney-admin', requiredClaims:['iss','aud','exp','sub','iat']
    });
    return payload.kind === 'datamoney-admin' && payload.account === env.DM_GOOGLE_ADMIN_EMAIL.toLowerCase() &&
      payload.client === env.DM_GOOGLE_CLIENT_ID && typeof payload.sub === 'string' && !!payload.sub;
  } catch (_) { return false; }
}

export function googleAdminLogout() {
  return response({ok:true}, 200, [makeCookie(SESSION_COOKIE, '', 0), makeCookie(NONCE_COOKIE, '', 0)]);
}
