const ROUTE = /^\/api\/article-engagement\/([a-z0-9][a-z0-9-]{0,95})(?:\/(reaction|comments)(?:\/([1-9]\d*)(?:\/(vote))?)?)?\/?$/;
const ADMIN_ROUTE = /^\/api\/article-engagement\/_admin\/comments(?:\/([1-9]\d*)(?:\/(approve))?)?\/?$/;
const CONFIG_PATH = '/api/article-engagement/_config';
const SURVEY_PATH = '/api/article-engagement/_survey';
const SURVEY_AGGREGATE_PATH = '/api/article-engagement/_survey-aggregate';
const SURVEY_ADMIN_PATH = '/api/article-engagement/_admin/survey';
const EMAIL_PATH = '/api/article-engagement/_email/';
const EMAIL_ADMIN_PATH = '/api/article-engagement/_admin/email-subscribers';
const EMAIL_TYPES = [
  {name:'차근차근 거북이',short:'안정형'}, {name:'꼼꼼한 다람쥐',short:'절약형'},
  {name:'감각적인 고양이',short:'감각형'}, {name:'귀 쫑긋 토끼',short:'추격형'},
  {name:'소신 있는 늑대',short:'독립형'}, {name:'살펴보는 부엉이',short:'분석형'},
  {name:'눈치 빠른 여우',short:'기회형'}, {name:'도전하는 사자',short:'도전형'}
];
const EMAIL_ANXIETY = ['거의 없음','가끔 신경 쓰임','자주 걱정됨','일상에 영향'];
const EMAIL_REACTION = ['거의 없음','가끔 생각남','자주 생각남','당장 팔고 싶음'];
async function emailTokenHash(token) {
  const hash = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
const COOKIE = 'dm_article_visitor';
const SURVEY_COOKIE = 'dm_survey_visitor';
const YEAR = 365 * 86400000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

function visitorFrom(request, cookieName = COOKIE) {
  const cookies = (request.headers.get('cookie') || '').split(';');
  const item = cookies.map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`));
  const value = item ? item.slice(cookieName.length + 1) : '';
  return /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value) ? value : '';
}

async function secureEqual(actual, expected) {
  if (!actual || !expected) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([actual, expected].map(value => crypto.subtle.digest('SHA-256', encoder.encode(value))));
  const a = new Uint8Array(left), b = new Uint8Array(right);
  let diff = 0;
  for (let index = 0; index < a.length; index++) diff |= a[index] ^ b[index];
  return diff === 0;
}

async function rateIdentifier(ip, secret, rotate = true) {
  if (!ip || !secret) return '';
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const date = rotate ? new Date().toISOString().slice(0, 10) : 'survey-v1';
  const hash = await crypto.subtle.sign('HMAC', key, encoder.encode(`${date}:${ip}`));
  return [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('');
}

async function verifyTurnstile(token, secret, host, ip) {
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: {'content-type': 'application/json'},
      body: JSON.stringify({secret, response: token, remoteip: ip || undefined})
    });
    const result = await response.json();
    return response.ok && result.success === true && result.hostname === host && result.action === 'comment';
  } catch (_) { return false; }
}

function needsReview(nickname, body) {
  const text = `${nickname} ${body}`.normalize('NFKC');
  const link = /(?:https?:\s*\/\s*\/|www\s*\.|\b[a-z0-9-]+\s*\.\s*[a-z]{2,24}\b|\b[a-z0-9._%+-]+\s*@\s*[a-z0-9.-]+\s*\.[a-z]{2,}\b)/i;
  const phone = /(?:^|\D)(?:\+?82[-.\s]?)?(?:01[016789]|0(?:2|[3-6][1-5]))[-.\s]?\d{3,4}[-.\s]?\d{4}(?:\D|$)/;
  const pitch = /(?:텔레그램|카카오톡|카톡|오픈채팅|리딩방|단톡방|고수익|원금\s*보장|수익\s*보장|상담\s*문의|무료\s*체험)/i;
  return link.test(text) || phone.test(text) || pitch.test(text);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === CONFIG_PATH && request.method === 'GET') {
      if (!!env.TURNSTILE_SITEKEY !== !!env.TURNSTILE_SECRET) return json({error: 'Verification unavailable'}, 503);
      return json({turnstileSiteKey: env.TURNSTILE_SITEKEY || null, privateComments: true});
    }
    const adminRoute = url.pathname.match(ADMIN_ROUTE);
    const route = url.pathname.match(ROUTE);
    const survey = url.pathname === SURVEY_PATH;
    const surveyAggregate = url.pathname === SURVEY_AGGREGATE_PATH;
    const surveyAdmin = url.pathname === SURVEY_ADMIN_PATH;
    const emailAdmin = url.pathname === EMAIL_ADMIN_PATH;
    const emailRoute = /^\/api\/article-engagement\/_email\/(request|open|preferences|delete)$/.test(url.pathname);
    if (!adminRoute && !route && !survey && !surveyAdmin && !surveyAggregate && !emailRoute && !emailAdmin) return json({error: 'Not found'}, 404);
    if (!['GET', 'POST', 'DELETE'].includes(request.method)) return json({error: 'Method not allowed'}, 405);
    if (request.method !== 'GET' && request.headers.get('origin') !== url.origin) {
      return json({error: 'Invalid origin'}, 403);
    }
    if (!env.ARTICLE_ENGAGEMENT) return json({error: 'Service unavailable'}, 503);
    if (surveyAggregate) {
      if (request.method !== 'POST') return json({error: 'Method not allowed'}, 405);
      if ((Number(request.headers.get('content-length')) || 0) > 1024) return json({error: 'Invalid input'}, 400);
      const id = env.ARTICLE_ENGAGEMENT.idFromName('datamoney');
      const headers = new Headers({'content-type':'application/json'});
      return env.ARTICLE_ENGAGEMENT.get(id).fetch(new Request(request, {headers}));
    }
    if (adminRoute || surveyAdmin || emailAdmin) {
      if (!env.DM_COMMENT_ADMIN_KEY) return json({error: 'Administrator access unavailable'}, 503);
      const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!await secureEqual(token, env.DM_COMMENT_ADMIN_KEY)) return json({error: 'Not authorized'}, 401);
      const headers = new Headers(request.headers);
      headers.delete('authorization');
      headers.set('x-article-admin', 'authorized');
      headers.delete('x-article-visitor');
      headers.delete('x-article-rate');
      const id = env.ARTICLE_ENGAGEMENT.idFromName('datamoney');
      return env.ARTICLE_ENGAGEMENT.get(id).fetch(new Request(request, {headers}));
    }
    if (emailRoute) {
      if (request.method !== 'POST') return json({error: 'Method not allowed'}, 405);
      if (!env.DM_COMMENT_ADMIN_KEY || !env.RESEND_API_KEY) return json({error: 'Email service unavailable'}, 503);
      if ((Number(request.headers.get('content-length')) || 0) > 2048) return json({error: 'Invalid input'}, 400);
      const rate = await rateIdentifier(request.headers.get('cf-connecting-ip'), env.DM_COMMENT_ADMIN_KEY);
      if (!rate) return json({error: 'Service unavailable'}, 503);
      const headers = new Headers({'content-type':'application/json', 'x-email-rate':rate});
      const id = env.ARTICLE_ENGAGEMENT.idFromName('datamoney');
      return env.ARTICLE_ENGAGEMENT.get(id).fetch(new Request(request, {headers}));
    }
    if (survey) {
      if (!['POST', 'DELETE'].includes(request.method)) return json({error: 'Method not allowed'}, 405);
      if (!env.DM_COMMENT_ADMIN_KEY) return json({error: 'Service unavailable'}, 503);
      let visitor = visitorFrom(request, SURVEY_COOKIE);
      if (!visitor && request.method === 'DELETE') return json({ok: true});
      const newVisitor = !visitor;
      if (!visitor) visitor = crypto.randomUUID();
      const headers = new Headers(request.headers);
      headers.delete('x-article-admin');
      headers.set('x-survey-visitor', await rateIdentifier(visitor, env.DM_COMMENT_ADMIN_KEY, false));
      const id = env.ARTICLE_ENGAGEMENT.idFromName('datamoney');
      const response = await env.ARTICLE_ENGAGEMENT.get(id).fetch(new Request(request, {headers}));
      const resultHeaders = new Headers(response.headers);
      if (newVisitor && response.ok) resultHeaders.append('set-cookie', `${SURVEY_COOKIE}=${visitor}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`);
      if (request.method === 'DELETE' && response.ok) resultHeaders.append('set-cookie', `${SURVEY_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
      return new Response(response.body, {status: response.status, headers: resultHeaders});
    }
    const [, , action, commentId] = route;
    if (request.method === 'POST' && action === 'comments' && !commentId) {
      if (!!env.TURNSTILE_SITEKEY !== !!env.TURNSTILE_SECRET) return json({error: 'Verification unavailable'}, 503);
      if (env.TURNSTILE_SECRET) {
        if ((Number(request.headers.get('content-length')) || 0) > 8192) return json({error: 'Comment too long'}, 413);
        let input;
        try { input = await request.clone().json(); } catch (_) { return json({error: 'Invalid input'}, 400); }
        if (!await verifyTurnstile(input?.turnstileToken, env.TURNSTILE_SECRET, url.hostname, request.headers.get('cf-connecting-ip'))) {
          return json({error: 'Verification failed'}, 403);
        }
      }
    }
    let visitor = visitorFrom(request);
    let newVisitor = false;
    if (!visitor && request.method === 'POST') { visitor = crypto.randomUUID(); newVisitor = true; }
    if (!visitor && request.method === 'DELETE') return json({error: 'Not authorized'}, 403);
    const headers = new Headers(request.headers);
    headers.delete('x-article-admin');
    headers.delete('x-article-rate');
    headers.set('x-article-visitor', visitor);
    if (request.method === 'POST' && action === 'comments' && !commentId) {
      const identifier = await rateIdentifier(request.headers.get('cf-connecting-ip'), env.DM_COMMENT_ADMIN_KEY);
      if (identifier) headers.set('x-article-rate', identifier);
    }
    const forwarded = new Request(request, {headers});
    const id = env.ARTICLE_ENGAGEMENT.idFromName('datamoney');
    const response = await env.ARTICLE_ENGAGEMENT.get(id).fetch(forwarded);
    const resultHeaders = new Headers(response.headers);
    if (newVisitor && response.ok) {
      resultHeaders.append('set-cookie', `${COOKIE}=${visitor}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`);
    }
    return new Response(response.body, {status: response.status, headers: resultHeaders});
  }
};

export class ArticleEngagement {
  constructor(state, env = {}) {
    this.state = state;
    this.env = env;
    this.sql = state.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS reactions (article TEXT NOT NULL, visitor TEXT NOT NULL, PRIMARY KEY (article, visitor))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, article TEXT NOT NULL, visitor TEXT NOT NULL, nickname TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL, parent_id INTEGER, deleted_at INTEGER)');
    const columns = new Set(this.sql.exec('PRAGMA table_info(comments)').toArray().map(column => column.name));
    if (!columns.has('parent_id')) this.sql.exec('ALTER TABLE comments ADD COLUMN parent_id INTEGER');
    if (!columns.has('deleted_at')) this.sql.exec('ALTER TABLE comments ADD COLUMN deleted_at INTEGER');
    if (!columns.has('status')) this.sql.exec("ALTER TABLE comments ADD COLUMN status TEXT NOT NULL DEFAULT 'published'");
    this.sql.exec('CREATE TABLE IF NOT EXISTS comment_votes (article TEXT NOT NULL, comment_id INTEGER NOT NULL, visitor TEXT NOT NULL, value INTEGER NOT NULL CHECK (value IN (-1, 1)), PRIMARY KEY (article, comment_id, visitor))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS comment_rate (identity TEXT NOT NULL, created_at INTEGER NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS survey_answers (visitor TEXT NOT NULL, day TEXT NOT NULL, created_at INTEGER NOT NULL, loss INTEGER NOT NULL, anxiety INTEGER NOT NULL, horizon INTEGER NOT NULL, reaction INTEGER NOT NULL, buffer INTEGER NOT NULL, PRIMARY KEY(visitor, day))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS survey_aggregates (day TEXT NOT NULL, type_code INTEGER NOT NULL, participants INTEGER NOT NULL, loss INTEGER NOT NULL, anxiety INTEGER NOT NULL, horizon INTEGER NOT NULL, reaction INTEGER NOT NULL, buffer INTEGER NOT NULL, PRIMARY KEY(day, type_code))');
    const surveyColumns = new Set(this.sql.exec('PRAGMA table_info(survey_answers)').toArray().map(column => column.name));
    if (!surveyColumns.has('version')) this.sql.exec('ALTER TABLE survey_answers ADD COLUMN version INTEGER NOT NULL DEFAULT 1');
    if (!surveyColumns.has('type_code')) this.sql.exec('ALTER TABLE survey_answers ADD COLUMN type_code INTEGER');
    this.sql.exec('CREATE INDEX IF NOT EXISTS comments_article_id ON comments (article, id DESC)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS comments_parent_id ON comments (article, parent_id, id)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS comments_visitor_time ON comments (visitor, created_at DESC)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS comments_status_id ON comments (status, id DESC)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS comment_rate_identity_time ON comment_rate (identity, created_at DESC)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS email_results (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, type_code INTEGER NOT NULL, anxiety INTEGER NOT NULL, reaction INTEGER NOT NULL, tip_code INTEGER NOT NULL, test_news INTEGER NOT NULL, monthly_report INTEGER NOT NULL, created_at INTEGER NOT NULL, confirmed_at INTEGER)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS email_results_email ON email_results (email, created_at)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS email_rate (identity TEXT NOT NULL, created_at INTEGER NOT NULL)');
  }

  summary(article, visitor) {
    const reactions = this.sql.exec('SELECT COUNT(*) AS n FROM reactions WHERE article = ?', article).one().n;
    const comments = this.sql.exec("SELECT COUNT(*) AS n FROM comments WHERE article = ? AND deleted_at IS NULL AND status = 'published'", article).one().n;
    const reacted = !!visitor && this.sql.exec('SELECT 1 AS present FROM reactions WHERE article = ? AND visitor = ?', article, visitor).toArray().length > 0;
    return {reactions, comments, reacted};
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === EMAIL_ADMIN_PATH && request.headers.get('x-article-admin') === 'authorized' && request.method === 'GET') {
      const items = this.sql.exec('SELECT email, MAX(test_news) AS test_news, MAX(monthly_report) AS monthly_report, MAX(confirmed_at) AS confirmed_at FROM email_results WHERE confirmed_at IS NOT NULL AND created_at > ? GROUP BY email HAVING MAX(test_news) = 1 OR MAX(monthly_report) = 1 ORDER BY confirmed_at DESC LIMIT 5000', Date.now() - YEAR).toArray();
      return json({items});
    }
    if (url.pathname.startsWith(EMAIL_PATH)) return this.email(request, url);
    if (url.pathname === SURVEY_ADMIN_PATH && request.headers.get('x-article-admin') === 'authorized' && request.method === 'GET') {
      const rows = this.sql.exec('SELECT day, version, type_code, COUNT(*) AS participants, AVG(loss) AS loss, AVG(anxiety) AS anxiety, AVG(horizon) AS horizon, AVG(reaction) AS reaction, AVG(buffer) AS buffer FROM survey_answers GROUP BY day, version, type_code ORDER BY day DESC, version DESC, type_code LIMIT 3300').toArray();
      const totals = this.sql.exec('SELECT day, 3 AS version, type_code, participants, 1.0*loss/participants AS loss, 1.0*anxiety/participants AS anxiety, 1.0*horizon/participants AS horizon, 1.0*reaction/participants AS reaction, 1.0*buffer/participants AS buffer FROM survey_aggregates ORDER BY day DESC LIMIT 3300').toArray();
      const items = [...rows, ...totals].sort((a,b) => b.day.localeCompare(a.day) || b.version-a.version || (a.type_code ?? -1)-(b.type_code ?? -1));
      return json({version: 3, items});
    }
    if (url.pathname === SURVEY_AGGREGATE_PATH && request.method === 'POST') {
      const raw = await request.text();
      if (raw.length > 1024) return json({error: 'Invalid input'}, 400);
      let input;
      try { input = JSON.parse(raw); } catch (_) { return json({error: 'Invalid input'}, 400); }
      const fields = ['loss','anxiety','horizon','reaction','buffer'];
      if (!Array.isArray(input?.baseline) || input.baseline.length !== 3 || !input.baseline.every(value => value === 0 || value === 1) || !fields.every(key => Number.isInteger(input.answers?.[key]) && input.answers[key] >= 0 && input.answers[key] <= 3)) return json({error: 'Invalid input'}, 400);
      const typeCode = 4*input.baseline[0] + 2*input.baseline[1] + input.baseline[2];
      const day = new Date(Date.now() + 9*3600000).toISOString().slice(0,10);
      this.sql.exec('INSERT INTO survey_aggregates (day,type_code,participants,loss,anxiety,horizon,reaction,buffer) VALUES (?,?,1,?,?,?,?,?) ON CONFLICT(day,type_code) DO UPDATE SET participants=participants+1,loss=loss+excluded.loss,anxiety=anxiety+excluded.anxiety,horizon=horizon+excluded.horizon,reaction=reaction+excluded.reaction,buffer=buffer+excluded.buffer', day,typeCode,...fields.map(key => input.answers[key]));
      return json({ok:true});
    }
    if (url.pathname === SURVEY_PATH) {
      const visitor = request.headers.get('x-survey-visitor');
      if (!visitor) return json({error: 'Not authorized'}, 403);
      if (request.method === 'DELETE') {
        this.sql.exec('DELETE FROM survey_answers WHERE visitor = ?', visitor);
        return json({ok: true});
      }
      if (request.method !== 'POST') return json({error: 'Method not allowed'}, 405);
      const raw = await request.text();
      if (raw.length > 1024) return json({error: 'Invalid input'}, 400);
      let input;
      try { input = JSON.parse(raw); } catch (_) { return json({error: 'Invalid input'}, 400); }
      const fields = ['loss', 'anxiety', 'horizon', 'reaction', 'buffer'];
      if (input?.consent !== true || !fields.every(key => Number.isInteger(input.answers?.[key]) && input.answers[key] >= 0 && input.answers[key] <= 3)) return json({error: 'Invalid input'}, 400);
      const version = input.version === undefined ? 1 : input.version;
      if (version !== 1 && version !== 2) return json({error: 'Invalid input'}, 400);
      if (version === 2 && (!Array.isArray(input.baseline) || input.baseline.length !== 3 || !input.baseline.every(value => value === 0 || value === 1))) return json({error: 'Invalid input'}, 400);
      const typeCode = version === 2 ? 4 * input.baseline[0] + 2 * input.baseline[1] + input.baseline[2] : null;
      const now = Date.now();
      const day = new Date(now + 9 * 3600000).toISOString().slice(0, 10);
      this.sql.exec('INSERT INTO survey_answers (visitor, day, created_at, loss, anxiety, horizon, reaction, buffer, version, type_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(visitor, day) DO NOTHING', visitor, day, now, ...fields.map(key => input.answers[key]), version, typeCode);
      await this.state.storage.setAlarm(now + 61000);
      return json({ok: true});
    }
    const admin = url.pathname.match(ADMIN_ROUTE);
    if (admin && request.headers.get('x-article-admin') === 'authorized') {
      return this.moderate(request, url, admin);
    }
    const match = url.pathname.match(ROUTE);
    if (!match) return json({error: 'Not found'}, 404);
    const [, article, action, commentId, subaction] = match;
    const visitor = request.headers.get('x-article-visitor') || '';
    if (request.method === 'GET' && !action) return json(this.summary(article, visitor));

    if (request.method === 'POST' && action === 'reaction' && !commentId) {
      if (!visitor) return json({error: 'Not authorized'}, 403);
      const existing = this.sql.exec('SELECT 1 AS present FROM reactions WHERE article = ? AND visitor = ?', article, visitor).toArray().length > 0;
      if (existing) this.sql.exec('DELETE FROM reactions WHERE article = ? AND visitor = ?', article, visitor);
      else this.sql.exec('INSERT INTO reactions (article, visitor) VALUES (?, ?)', article, visitor);
      return json(this.summary(article, visitor));
    }

    if (request.method === 'GET' && action === 'comments' && !commentId) {
      const raw = url.searchParams.get('before');
      if (raw && !/^[1-9]\d*$/.test(raw)) return json({error: 'Invalid cursor'}, 400);
      const before = raw ? Number(raw) : Number.MAX_SAFE_INTEGER;
      if (!Number.isSafeInteger(before)) return json({error: 'Invalid cursor'}, 400);
      const fields = `c.id, c.nickname, c.body, c.created_at, c.deleted_at,
        CASE WHEN c.visitor = ? AND c.deleted_at IS NULL THEN 1 ELSE 0 END AS mine,
        COALESCE((SELECT SUM(v.value) FROM comment_votes v WHERE v.article = c.article AND v.comment_id = c.id), 0) AS score,
        COALESCE((SELECT value FROM comment_votes v WHERE v.article = c.article AND v.comment_id = c.id AND v.visitor = ?), 0) AS my_vote`;
      const rows = this.sql.exec(`SELECT ${fields} FROM comments c WHERE c.article = ? AND c.parent_id IS NULL AND c.status = 'published' AND c.id < ? ORDER BY c.id DESC LIMIT 21`, visitor, visitor, article, before).toArray();
      const more = rows.length > 20;
      const items = rows.slice(0, 20).map(row => ({
        ...row,
        replies: this.sql.exec(`SELECT ${fields} FROM comments c WHERE c.article = ? AND c.parent_id = ? AND c.status = 'published' ORDER BY c.id ASC`, visitor, visitor, article, row.id).toArray()
      }));
      return json({items, nextBefore: more ? items[items.length - 1].id : null, ...this.summary(article, visitor)});
    }

    if (request.method === 'POST' && action === 'comments' && !commentId) {
      if (!visitor) return json({error: 'Not authorized'}, 403);
      if ((Number(request.headers.get('content-length')) || 0) > 8192) return json({error: 'Comment too long'}, 413);
      const raw = await request.text();
      if (raw.length > 8192) return json({error: 'Comment too long'}, 413);
      let input;
      try { input = JSON.parse(raw); } catch (_) { return json({error: 'Invalid input'}, 400); }
      const nickname = typeof input?.nickname === 'string' ? input.nickname.trim() : '';
      const body = typeof input?.body === 'string' ? input.body.trim() : '';
      const parentId = input?.parentId == null ? null : input.parentId;
      if (input?.isPrivate !== undefined && typeof input.isPrivate !== 'boolean') return json({error: 'Invalid privacy setting'}, 400);
      if (!nickname || [...nickname].length > 20 || /[\u0000-\u001f\u007f]/.test(nickname) || !body || [...body].length > 600 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body)) {
        return json({error: 'Invalid comment'}, 400);
      }
      if (parentId !== null) {
        if (!Number.isSafeInteger(parentId) || parentId < 1) return json({error: 'Invalid parent'}, 400);
        const parent = this.sql.exec("SELECT id FROM comments WHERE article = ? AND id = ? AND parent_id IS NULL AND deleted_at IS NULL AND status = 'published'", article, parentId).toArray()[0];
        if (!parent) return json({error: 'Comment not found'}, 404);
      }
      const now = Date.now();
      const recent = this.sql.exec('SELECT created_at FROM comments WHERE visitor = ? ORDER BY created_at DESC LIMIT 1', visitor).toArray()[0];
      if (recent && now - recent.created_at < 5000) return json({error: 'Please wait before commenting again'}, 429);
      const identity = request.headers.get('x-article-rate') || visitor;
      this.sql.exec('DELETE FROM comment_rate WHERE created_at <= ?', now - 60000);
      const requests = this.sql.exec('SELECT COUNT(*) AS n FROM comment_rate WHERE identity = ?', identity).one().n;
      if (requests >= 6) return json({error: 'Please wait before commenting again'}, 429);
      const duplicate = body.length >= 30 && this.sql.exec("SELECT 1 FROM comments WHERE body = ? AND status != 'private' AND created_at > ? AND deleted_at IS NULL LIMIT 1", body, now - 86400000).toArray().length > 0;
      const status = input.isPrivate === true ? 'private' : needsReview(nickname, body) || duplicate ? 'pending' : 'published';
      this.sql.exec('INSERT INTO comment_rate (identity, created_at) VALUES (?, ?)', identity, now);
      this.sql.exec('INSERT INTO comments (article, visitor, nickname, body, created_at, parent_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)', article, visitor, nickname, body, now, parentId, status);
      await this.state.storage.setAlarm(now + 61000);
      return json({...this.summary(article, visitor), status}, 201);
    }

    if (request.method === 'POST' && action === 'comments' && commentId && subaction === 'vote') {
      if (!visitor) return json({error: 'Not authorized'}, 403);
      const id = Number(commentId);
      if (!Number.isSafeInteger(id)) return json({error: 'Invalid comment'}, 400);
      const target = this.sql.exec("SELECT id FROM comments WHERE article = ? AND id = ? AND deleted_at IS NULL AND status = 'published'", article, id).toArray()[0];
      if (!target) return json({error: 'Not found'}, 404);
      if ((Number(request.headers.get('content-length')) || 0) > 128) return json({error: 'Invalid vote'}, 413);
      let input;
      try {
        const raw = await request.text();
        if (raw.length > 128) return json({error: 'Invalid vote'}, 413);
        input = JSON.parse(raw);
      } catch (_) { return json({error: 'Invalid input'}, 400); }
      const value = input?.value;
      if (value !== 1 && value !== -1) return json({error: 'Invalid vote'}, 400);
      const existing = this.sql.exec('SELECT value FROM comment_votes WHERE article = ? AND comment_id = ? AND visitor = ?', article, id, visitor).toArray()[0];
      const myVote = existing?.value === value ? 0 : value;
      if (!myVote) this.sql.exec('DELETE FROM comment_votes WHERE article = ? AND comment_id = ? AND visitor = ?', article, id, visitor);
      else this.sql.exec('INSERT INTO comment_votes (article, comment_id, visitor, value) VALUES (?, ?, ?, ?) ON CONFLICT(article, comment_id, visitor) DO UPDATE SET value = excluded.value', article, id, visitor, myVote);
      const score = this.sql.exec('SELECT COALESCE(SUM(value), 0) AS score FROM comment_votes WHERE article = ? AND comment_id = ?', article, id).one().score;
      return json({score, my_vote: myVote});
    }

    if (request.method === 'DELETE' && action === 'comments' && commentId && !subaction) {
      if (!visitor) return json({error: 'Not authorized'}, 403);
      const id = Number(commentId);
      if (!Number.isSafeInteger(id)) return json({error: 'Invalid comment'}, 400);
      const existing = this.sql.exec('SELECT visitor, parent_id, deleted_at FROM comments WHERE article = ? AND id = ?', article, id).toArray()[0];
      if (!existing) return json({error: 'Not found'}, 404);
      if (existing.visitor !== visitor || existing.deleted_at !== null) return json({error: 'Not authorized'}, 403);
      const hasReplies = this.sql.exec('SELECT 1 FROM comments WHERE article = ? AND parent_id = ? LIMIT 1', article, id).toArray().length > 0;
      this.sql.exec('DELETE FROM comment_votes WHERE article = ? AND comment_id = ?', article, id);
      if (hasReplies) this.sql.exec('UPDATE comments SET nickname = ?, body = ?, deleted_at = ? WHERE article = ? AND id = ?', '', '', Date.now(), article, id);
      else this.sql.exec('DELETE FROM comments WHERE article = ? AND id = ?', article, id);
      if (existing.parent_id) {
        const orphan = this.sql.exec('SELECT id FROM comments WHERE article = ? AND id = ? AND deleted_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM comments WHERE article = ? AND parent_id = ?)', article, existing.parent_id, article, existing.parent_id).toArray()[0];
        if (orphan) this.sql.exec('DELETE FROM comments WHERE article = ? AND id = ?', article, orphan.id);
      }
      return json(this.summary(article, visitor));
    }
    return json({error: 'Not found'}, 404);
  }

  async email(request, url) {
    if (request.method !== 'POST') return json({error:'Method not allowed'},405);
    const raw = await request.text();
    if (raw.length > 2048) return json({error:'Invalid input'},400);
    let input;
    try { input = JSON.parse(raw); } catch (_) { return json({error:'Invalid input'},400); }
    const now=Date.now(), action=url.pathname.slice(EMAIL_PATH.length);
    this.sql.exec('DELETE FROM email_rate WHERE created_at <= ?', now - 86400000);
    this.sql.exec('DELETE FROM email_results WHERE (confirmed_at IS NULL AND created_at <= ?) OR created_at <= ?', now - 2*86400000, now - YEAR);
    if (action === 'request') {
      const email=typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
      const validEmail=email.length <= 254 && /^[a-z0-9.!#$%&'*+\/=?^_{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/i.test(email) && !email.includes('..');
      const isInt=(value,max)=>Number.isInteger(value)&&value>=0&&value<=max;
      if (!validEmail || input.consent !== true || !isInt(input.typeCode,7) || !isInt(input.anxiety,3) || !isInt(input.reaction,3) || !isInt(input.tipCode,5) || typeof input.testNews !== 'boolean' || typeof input.monthlyReport !== 'boolean') return json({error:'Invalid input'},400);
      const identity=request.headers.get('x-email-rate');
      if (!identity || !this.env.RESEND_API_KEY) return json({error:'Service unavailable'},503);
      const recent=this.sql.exec('SELECT COUNT(*) AS n FROM email_rate WHERE identity = ? AND created_at > ?',identity,now-15*60000).one().n;
      const emailRecent=this.sql.exec('SELECT COUNT(*) AS n FROM email_results WHERE email = ? AND created_at > ?',email,now-86400000).one().n;
      const total=this.sql.exec('SELECT COUNT(*) AS n FROM email_rate WHERE created_at > ?',now-86400000).one().n;
      if (recent>=3 || emailRecent>=3 || total>=90) return json({error:'Too many requests'},429);
      const bytes=crypto.getRandomValues(new Uint8Array(32));
      const token=[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');
      const hash=await emailTokenHash(token);
      this.sql.exec('INSERT INTO email_rate (identity,created_at) VALUES (?,?)',identity,now);
      this.sql.exec('INSERT INTO email_results (token_hash,email,type_code,anxiety,reaction,tip_code,test_news,monthly_report,created_at) VALUES (?,?,?,?,?,?,?,?,?)',hash,email,input.typeCode,input.anxiety,input.reaction,input.tipCode,+input.testNews,+input.monthlyReport,now);
      await this.state.storage.setAlarm(now+61000);
      const link='https://datamoney.kr/account/result/#'+token;
      const type=EMAIL_TYPES[input.typeCode], anxiety=EMAIL_ANXIETY[input.anxiety], reaction=EMAIL_REACTION[input.reaction];
      const body='안녕하세요. 데이터머니입니다.\n\n나의 투자 성향 결과: '+type.name+' ('+type.short+')\n최근 불안감: '+anxiety+'\n최근 매도 충동: '+reaction+'\n\n아래 링크에서 이메일을 확인하고 전체 결과를 저장해 보세요. 다음 검사 결과와도 비교할 수 있습니다.\n'+link+'\n\n이 링크는 본인만 보관해 주세요. 확인 전에는 선택한 소식 수신이 시작되지 않습니다. 요청하지 않으셨다면 이 메일을 무시해 주세요.\n\n문의: sys247365@gmail.com\n데이터머니 https://datamoney.kr';
      let sent=false;
      try {
        const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+this.env.RESEND_API_KEY,'content-type':'application/json'},body:JSON.stringify({from:'데이터머니 <hello@send.datamoney.kr>',to:[email],subject:'[데이터머니] 나의 투자 성향 결과를 확인해 주세요',text:body})});
        sent=response.ok;
      } catch (_) {}
      if (!sent) { this.sql.exec('DELETE FROM email_results WHERE token_hash = ?',hash); return json({error:'Email delivery unavailable'},502); }
      return json({ok:true});
    }
    const token=typeof input.token === 'string' ? input.token : '';
    if (!/^[a-f0-9]{64}$/.test(token)) return json({error:'Invalid link'},400);
    const hash=await emailTokenHash(token);
    const row=this.sql.exec('SELECT * FROM email_results WHERE token_hash = ?',hash).toArray()[0];
    if (!row || now-row.created_at >= YEAR || (!row.confirmed_at && now-row.created_at >= 2*86400000)) return json({error:'Link expired'},404);
    if (action === 'open') {
      if (!row.confirmed_at) this.sql.exec('UPDATE email_results SET confirmed_at = ? WHERE token_hash = ?',now,hash);
      const subscriptions=this.sql.exec('SELECT MAX(test_news) AS test_news, MAX(monthly_report) AS monthly_report FROM email_results WHERE email = ? AND confirmed_at IS NOT NULL AND created_at > ?',row.email,now-YEAR).one();
      return json({result:{typeCode:row.type_code,anxiety:row.anxiety,reaction:row.reaction,tipCode:row.tip_code,createdAt:row.created_at},subscriptions:{testNews:!!subscriptions.test_news,monthlyReport:!!subscriptions.monthly_report}});
    }
    if (!row.confirmed_at) return json({error:'Not confirmed'},403);
    if (action === 'preferences') {
      if (typeof input.testNews !== 'boolean' || typeof input.monthlyReport !== 'boolean') return json({error:'Invalid input'},400);
      if (!input.testNews) this.sql.exec('UPDATE email_results SET test_news = 0 WHERE email = ?',row.email);
      if (!input.monthlyReport) this.sql.exec('UPDATE email_results SET monthly_report = 0 WHERE email = ?',row.email);
      return json({ok:true});
    }
    if (action === 'delete') { this.sql.exec('DELETE FROM email_results WHERE email = ?',row.email); return json({ok:true}); }
    return json({error:'Not found'},404);
  }

  async moderate(request, url, match) {
    const [, rawId, action] = match;
    if (request.method === 'GET' && !rawId) {
      const status = url.searchParams.get('status') || 'pending';
      if (!['pending', 'published', 'private'].includes(status)) return json({error: 'Invalid status'}, 400);
      const rawBefore = url.searchParams.get('before');
      if (rawBefore && !/^[1-9]\d*$/.test(rawBefore)) return json({error: 'Invalid cursor'}, 400);
      const before = rawBefore ? Number(rawBefore) : Number.MAX_SAFE_INTEGER;
      if (!Number.isSafeInteger(before)) return json({error: 'Invalid cursor'}, 400);
      const rows = this.sql.exec('SELECT id, article, nickname, body, created_at, parent_id, status FROM comments WHERE status = ? AND deleted_at IS NULL AND id < ? ORDER BY id DESC LIMIT 51', status, before).toArray();
      const items = rows.slice(0, 50);
      return json({items, nextBefore: rows.length > 50 ? items[items.length - 1].id : null});
    }
    const id = Number(rawId);
    if (!rawId || !Number.isSafeInteger(id)) return json({error: 'Invalid comment'}, 400);
    const comment = this.sql.exec('SELECT article, parent_id, deleted_at, status FROM comments WHERE id = ?', id).toArray()[0];
    if (!comment || comment.deleted_at !== null) return json({error: 'Not found'}, 404);
    if (request.method === 'POST' && action === 'approve') {
      if (comment.status === 'private') return json({error: 'Private comments cannot be published'}, 403);
      this.sql.exec("UPDATE comments SET status = 'published' WHERE id = ?", id);
      return json({ok: true});
    }
    if (request.method === 'DELETE' && !action) {
      const hasReplies = this.sql.exec('SELECT 1 FROM comments WHERE article = ? AND parent_id = ? LIMIT 1', comment.article, id).toArray().length > 0;
      this.sql.exec('DELETE FROM comment_votes WHERE article = ? AND comment_id = ?', comment.article, id);
      if (hasReplies) this.sql.exec("UPDATE comments SET nickname = '', body = '', deleted_at = ?, status = 'published' WHERE id = ?", Date.now(), id);
      else this.sql.exec('DELETE FROM comments WHERE id = ?', id);
      if (comment.parent_id) {
        const orphan = this.sql.exec('SELECT id FROM comments WHERE article = ? AND id = ? AND deleted_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM comments WHERE article = ? AND parent_id = ?)', comment.article, comment.parent_id, comment.article, comment.parent_id).toArray()[0];
        if (orphan) this.sql.exec('DELETE FROM comments WHERE id = ?', orphan.id);
      }
      return json({ok: true});
    }
    return json({error: 'Not found'}, 404);
  }

  async alarm() {
    const now = Date.now();
    this.sql.exec('DELETE FROM comment_rate WHERE created_at <= ?', now - 60000);
    this.sql.exec('DELETE FROM survey_answers WHERE created_at <= ?', now - YEAR);
    this.sql.exec('DELETE FROM email_rate WHERE created_at <= ?', now - 86400000);
    this.sql.exec('DELETE FROM email_results WHERE (confirmed_at IS NULL AND created_at <= ?) OR created_at <= ?', now - 2*86400000, now - YEAR);
    const next = this.sql.exec('SELECT MIN(created_at) AS time FROM comment_rate').one().time;
    const surveyNext = this.sql.exec('SELECT MIN(created_at) AS time FROM survey_answers').one().time;
    const emailNext = this.sql.exec('SELECT MIN(CASE WHEN confirmed_at IS NULL THEN created_at + ? ELSE created_at + ? END) AS time FROM email_results', 2*86400000, YEAR).one().time;
    const emailRateNext = this.sql.exec('SELECT MIN(created_at) AS time FROM email_rate').one().time;
    const deadlines = [next === null ? null : next + 61000, surveyNext === null ? null : surveyNext + YEAR, emailNext, emailRateNext === null ? null : emailRateNext + 86400000].filter(value => value !== null);
    if (deadlines.length) await this.state.storage.setAlarm(Math.max(now + 1000, Math.min(...deadlines)));
  }
}
