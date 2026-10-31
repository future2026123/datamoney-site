const ROUTE = /^\/api\/article-engagement\/([a-z0-9][a-z0-9-]{0,95})(?:\/(reaction|comments)(?:\/([1-9]\d*)(?:\/(vote))?)?)?\/?$/;
const ADMIN_ROUTE = /^\/api\/article-engagement\/_admin\/comments(?:\/([1-9]\d*)(?:\/(approve))?)?\/?$/;
const CONFIG_PATH = '/api/article-engagement/_config';
const COOKIE = 'dm_article_visitor';

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

function visitorFrom(request) {
  const cookies = (request.headers.get('cookie') || '').split(';');
  const item = cookies.map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`));
  const value = item ? item.slice(COOKIE.length + 1) : '';
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

async function rateIdentifier(ip, secret) {
  if (!ip || !secret) return '';
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const date = new Date().toISOString().slice(0, 10);
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
    if (!adminRoute && !route) return json({error: 'Not found'}, 404);
    if (!['GET', 'POST', 'DELETE'].includes(request.method)) return json({error: 'Method not allowed'}, 405);
    if (request.method !== 'GET' && request.headers.get('origin') !== url.origin) {
      return json({error: 'Invalid origin'}, 403);
    }
    if (!env.ARTICLE_ENGAGEMENT) return json({error: 'Service unavailable'}, 503);
    if (adminRoute) {
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
  constructor(state) {
    this.state = state;
    this.sql = state.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS reactions (article TEXT NOT NULL, visitor TEXT NOT NULL, PRIMARY KEY (article, visitor))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, article TEXT NOT NULL, visitor TEXT NOT NULL, nickname TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL, parent_id INTEGER, deleted_at INTEGER)');
    const columns = new Set(this.sql.exec('PRAGMA table_info(comments)').toArray().map(column => column.name));
    if (!columns.has('parent_id')) this.sql.exec('ALTER TABLE comments ADD COLUMN parent_id INTEGER');
    if (!columns.has('deleted_at')) this.sql.exec('ALTER TABLE comments ADD COLUMN deleted_at INTEGER');
    if (!columns.has('status')) this.sql.exec("ALTER TABLE comments ADD COLUMN status TEXT NOT NULL DEFAULT 'published'");
    this.sql.exec('CREATE TABLE IF NOT EXISTS comment_votes (article TEXT NOT NULL, comment_id INTEGER NOT NULL, visitor TEXT NOT NULL, value INTEGER NOT NULL CHECK (value IN (-1, 1)), PRIMARY KEY (article, comment_id, visitor))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS comment_rate (identity TEXT NOT NULL, created_at INTEGER NOT NULL)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS comments_article_id ON comments (article, id DESC)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS comments_parent_id ON comments (article, parent_id, id)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS comments_visitor_time ON comments (visitor, created_at DESC)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS comments_status_id ON comments (status, id DESC)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS comment_rate_identity_time ON comment_rate (identity, created_at DESC)');
  }

  summary(article, visitor) {
    const reactions = this.sql.exec('SELECT COUNT(*) AS n FROM reactions WHERE article = ?', article).one().n;
    const comments = this.sql.exec("SELECT COUNT(*) AS n FROM comments WHERE article = ? AND deleted_at IS NULL AND status = 'published'", article).one().n;
    const reacted = !!visitor && this.sql.exec('SELECT 1 AS present FROM reactions WHERE article = ? AND visitor = ?', article, visitor).toArray().length > 0;
    return {reactions, comments, reacted};
  }

  async fetch(request) {
    const url = new URL(request.url);
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
    const next = this.sql.exec('SELECT MIN(created_at) AS time FROM comment_rate').one().time;
    if (next !== null) await this.state.storage.setAlarm(Math.max(now + 1000, next + 61000));
  }
}
