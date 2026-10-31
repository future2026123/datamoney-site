(() => {
  'use strict';
  const login = document.getElementById('admin-login');
  const keyInput = document.getElementById('admin-key');
  const status = document.getElementById('admin-status');
  const panel = document.getElementById('admin-panel');
  const list = document.getElementById('admin-comments');
  const empty = document.getElementById('admin-empty');
  const more = document.getElementById('admin-more');
  const tabs = [...panel.querySelectorAll('[data-status]')];
  const endpoint = '/api/article-engagement/_admin/comments';
  let key = '';
  let currentStatus = 'pending';
  let nextBefore = null;

  const request = async (path = '', options = {}) => {
    const response = await fetch(endpoint + path, {
      ...options,
      cache: 'no-store',
      headers: {...options.headers, authorization: `Bearer ${key}`}
    });
    if (!response.ok) {
      const error = new Error('Request failed');
      error.status = response.status;
      throw error;
    }
    return response.json();
  };
  const render = comment => {
    const item = document.createElement('li');
    item.className = 'comment';
    const header = document.createElement('div');
    header.className = 'comment-header';
    const name = document.createElement('strong');
    name.textContent = comment.nickname;
    const date = document.createElement('time');
    date.dateTime = new Date(comment.created_at).toISOString();
    date.textContent = new Intl.DateTimeFormat('ko-KR', {dateStyle:'medium', timeStyle:'short', timeZone:'Asia/Seoul'}).format(new Date(comment.created_at));
    const article = document.createElement('a');
    article.href = `/blog/${encodeURIComponent(comment.article)}/#dm-comments`;
    article.textContent = '해당 글 보기';
    header.append(name, date, article);
    if (comment.status === 'private') {
      const badge = document.createElement('span');
      badge.textContent = '비밀댓글';
      header.append(badge);
    }
    if (comment.parent_id) {
      const reply = document.createElement('span');
      reply.textContent = '답글';
      header.append(reply);
    }
    const body = document.createElement('p');
    body.className = 'comment-body';
    body.textContent = comment.body;
    const actions = document.createElement('div');
    actions.className = 'comment-actions';
    if (comment.status === 'pending') {
      const approve = document.createElement('button');
      approve.type = 'button';
      approve.className = 'primary';
      approve.textContent = '승인하고 공개';
      approve.addEventListener('click', async () => {
        approve.disabled = true;
        try { await request(`/${comment.id}/approve`, {method:'POST'}); item.remove(); showEmpty(); status.textContent = '댓글을 공개했습니다.'; }
        catch (_) { status.textContent = '승인하지 못했습니다. 다시 시도해 주세요.'; approve.disabled = false; }
      });
      actions.append(approve);
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete';
    remove.textContent = '삭제';
    remove.addEventListener('click', async () => {
      if (!window.confirm('이 댓글을 삭제할까요?')) return;
      remove.disabled = true;
      try { await request(`/${comment.id}`, {method:'DELETE'}); item.remove(); showEmpty(); status.textContent = '댓글을 삭제했습니다.'; }
      catch (_) { status.textContent = '삭제하지 못했습니다. 다시 시도해 주세요.'; remove.disabled = false; }
    });
    actions.append(remove);
    item.append(header, body, actions);
    list.append(item);
  };
  const showEmpty = () => {
    empty.hidden = list.children.length > 0;
    empty.textContent = currentStatus === 'pending' ? '검토할 댓글이 없습니다.' : currentStatus === 'private' ? '비밀댓글이 없습니다.' : '공개된 댓글이 없습니다.';
  };
  const load = async append => {
    more.disabled = true;
    status.textContent = '';
    try {
      if (currentStatus === 'survey') {
        const response = await fetch('/api/article-engagement/_admin/survey', {cache:'no-store', headers:{authorization:`Bearer ${key}`}});
        if (!response.ok) { const error = new Error('Request failed'); error.status=response.status; throw error; }
        const data = await response.json();
        list.replaceChildren();
        const typeNames = ['거북이','다람쥐','고양이','토끼','늑대','부엉이','여우','사자'];
        data.items.forEach(row => {
          const item=document.createElement('li'); item.className='comment';
          const title=document.createElement('strong'); title.textContent=`${row.day} · ${row.version === 2 ? typeNames[row.type_code] + ' 유형' : '이전 설문'} · ${row.participants}명`;
          const detail=document.createElement('p'); detail.className='comment-body';
          detail.textContent=`답변 평균 (0~3): 손익 ${row.loss.toFixed(2)} / 불안 ${row.anxiety.toFixed(2)} / 필요 시기 ${row.horizon.toFixed(2)} / ${row.version === 2 ? '매도 충동' : '하락 대응'} ${row.reaction.toFixed(2)} / 비상금 ${row.buffer.toFixed(2)}`;
          item.append(title,detail); list.append(item);
        });
        empty.hidden=!!data.items.length; empty.textContent='동의한 응답이 아직 없습니다.';
        more.hidden=true; panel.hidden=false; login.hidden=true; keyInput.value=''; return;
      }
      const params = new URLSearchParams({status:currentStatus});
      if (append && nextBefore) params.set('before', String(nextBefore));
      const data = await request(`?${params}`);
      if (!append) list.replaceChildren();
      data.items.forEach(render);
      nextBefore = data.nextBefore;
      more.hidden = !nextBefore;
      showEmpty();
      panel.hidden = false;
      login.hidden = true;
      keyInput.value = '';
    } catch (error) {
      status.textContent = error.status === 401 ? '접속키가 맞지 않습니다.' : '댓글 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
      if (!append && panel.hidden) key = '';
    } finally { more.disabled = false; }
  };
  login.addEventListener('submit', event => {
    event.preventDefault();
    key = keyInput.value.trim();
    if (key) load(false);
  });
  tabs.forEach(tab => tab.addEventListener('click', () => {
    currentStatus = tab.dataset.status;
    tabs.forEach(option => option.setAttribute('aria-pressed', String(option === tab)));
    nextBefore = null;
    load(false);
  }));
  more.addEventListener('click', () => load(true));
})();
