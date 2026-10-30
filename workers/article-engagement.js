const ROUTE = /^\/api\/article-engagement\/([a-z0-9][a-z0-9-]{0,95})(?:\/(reaction|comments)(?:\/([1-9]\d*)(?:\/(vote))?)?)?\/?$/;
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!ROUTE.test(url.pathname)) return json({error: 'Not found'}, 404);
    if (!['GET', 'POST', 'DELETE'].includes(request.method)) return json({error: 'Method not allowed'}, 405);
    if (request.method !== 'GET' && request.headers.get('origin') !== url.origin) {
      return json({error: 'Invalid origin'}, 403);
    }
    if (!env.ARTICLE_ENGAGEMENT) return json({error: 'Service unavailable'}, 503);
    let visitor = visitorFrom(request);
    let newVisitor = false;
    if (!visitor && request.method === 'POST') { visitor = crypto.randomUUID(); newVisitor = true; }
    if (!visitor && request.method === 'DELETE') return json({error: 'Not authorized'}, 403);
    const headers = new Headers(request.headers);
    headers.set('x-article-visitor', visitor);
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
    this.sql = state.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS reactions (article TEXT NOT NULL, visitor TEXT NOT NULL, PRIMARY KEY (article, visitor))');
    this.sql.exec('CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, article TEXT NOT NULL, visitor TEXT NOT NULL, nickname TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL, parent_id INTEGER, deleted_at INTEGER)');
    const columns = new Set(this.sql.exec('PRAGMA table_info(comments)').toArray().map(column => column.name));
    if (!columns.has('parent_id')) this.sql.exec('ALTER TABLE comments ADD COLUMN parent_id INTEGER');
    if (!columns.has('deleted_at')) this.sql.exec('ALTER TABLE comments ADD COLUMN deleted_at INTEGER');
    this.sql.exec('CREATE TABLE IF NOT EXISTS comment_votes (article TEXT NOT NULL, comment_id INTEGER NOT NULL, visitor TEXT NOT NULL, value INTEGER NOT NULL CHECK (value IN (-1, 1)), PRIMARY KEY (article, comment_id, visitor))');
    this.sql.exec('CREATE INDEX IF NOT EXISTS comments_article_id ON comments (article, id DESC)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS comments_parent_id ON comments (article, parent_id, id)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS comments_visitor_time ON comments (visitor, created_at DESC)');
  }

  summary(article, visitor) {
    const reactions = this.sql.exec('SELECT COUNT(*) AS n FROM reactions WHERE article = ?', article).one().n;
    const comments = this.sql.exec('SELECT COUNT(*) AS n FROM comments WHERE article = ? AND deleted_at IS NULL', article).one().n;
    const reacted = !!visitor && this.sql.exec('SELECT 1 AS present FROM reactions WHERE article = ? AND visitor = ?', article, visitor).toArray().length > 0;
    return {reactions, comments, reacted};
  }

  async fetch(request) {
    const url = new URL(request.url);
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
      const rows = this.sql.exec(`SELECT ${fields} FROM comments c WHERE c.article = ? AND c.parent_id IS NULL AND c.id < ? ORDER BY c.id DESC LIMIT 21`, visitor, visitor, article, before).toArray();
      const more = rows.length > 20;
      const items = rows.slice(0, 20).map(row => ({
        ...row,
        replies: this.sql.exec(`SELECT ${fields} FROM comments c WHERE c.article = ? AND c.parent_id = ? ORDER BY c.id ASC`, visitor, visitor, article, row.id).toArray()
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
      if (!nickname || [...nickname].length > 20 || /[\u0000-\u001f\u007f]/.test(nickname) || !body || [...body].length > 600 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body)) {
        return json({error: 'Invalid comment'}, 400);
      }
      if (parentId !== null) {
        if (!Number.isSafeInteger(parentId) || parentId < 1) return json({error: 'Invalid parent'}, 400);
        const parent = this.sql.exec('SELECT id FROM comments WHERE article = ? AND id = ? AND parent_id IS NULL AND deleted_at IS NULL', article, parentId).toArray()[0];
        if (!parent) return json({error: 'Comment not found'}, 404);
      }
      const now = Date.now();
      const recent = this.sql.exec('SELECT created_at FROM comments WHERE visitor = ? ORDER BY created_at DESC LIMIT 1', visitor).toArray()[0];
      if (recent && now - recent.created_at < 5000) return json({error: 'Please wait before commenting again'}, 429);
      this.sql.exec('INSERT INTO comments (article, visitor, nickname, body, created_at, parent_id) VALUES (?, ?, ?, ?, ?, ?)', article, visitor, nickname, body, now, parentId);
      return json(this.summary(article, visitor), 201);
    }

    if (request.method === 'POST' && action === 'comments' && commentId && subaction === 'vote') {
      if (!visitor) return json({error: 'Not authorized'}, 403);
      const id = Number(commentId);
      if (!Number.isSafeInteger(id)) return json({error: 'Invalid comment'}, 400);
      const target = this.sql.exec('SELECT id FROM comments WHERE article = ? AND id = ? AND deleted_at IS NULL', article, id).toArray()[0];
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
}
