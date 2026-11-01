(() => {
  'use strict';
  const login = document.getElementById('admin-login');
  const keyInput = document.getElementById('admin-key');
  const status = document.getElementById('admin-status');
  const panel = document.getElementById('admin-panel');
  const list = document.getElementById('admin-comments');
  const empty = document.getElementById('admin-empty');
  const more = document.getElementById('admin-more');
  const feedbackSummary = document.getElementById('feedback-summary');
  const googleLogin = document.getElementById('google-login');
  const googleSignin = document.getElementById('google-signin');
  const signout = document.getElementById('admin-signout');
  const inspectorHelp = document.getElementById('admin-inspector-help');
  const tabs = [...panel.querySelectorAll('[data-status]')];
  const endpoint = '/api/article-engagement/_admin/comments';
  let key = '';
  let googleSession = false;
  let currentStatus = new URLSearchParams(location.search).get('tab') === 'inquiries' ? 'inquiries' : 'pending';
  let nextBefore = null;
  tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.status === currentStatus)));
  let articleTitles;

  const loadArticleTitles = async () => {
    if (articleTitles) return articleTitles;
    try {
      const response = await fetch('/blog/tags-index.json', {cache:'no-cache'});
      const data = await response.json();
      articleTitles = new Map((data.articles || []).map(article => [article.path, article.title]));
    } catch (_) { articleTitles = new Map(); }
    return articleTitles;
  };

  const authHeaders = () => key ? {authorization: `Bearer ${key}`} : {};
  const request = async (path = '', options = {}) => {
    const response = await fetch(endpoint + path, {
      ...options,
      cache: 'no-store',
      headers: {...options.headers, ...authHeaders()}
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
  const load = async (append, silent = false) => {
    more.disabled = true;
    status.textContent = '';
    feedbackSummary.hidden = currentStatus !== 'feedback';
    try {
      if (currentStatus === 'inquiries') {
        const params = new URLSearchParams();
        if (append && nextBefore) params.set('before', String(nextBefore));
        const response = await fetch('/api/article-engagement/_admin/inquiries?' + params, {cache:'no-store', headers:authHeaders()});
        if (!response.ok) { const error = new Error('Request failed'); error.status = response.status; throw error; }
        const data = await response.json();
        if (!append) list.replaceChildren();
        const labels = {question:'질문', error:'오류 제보', suggestion:'제안', other:'기타'};
        data.items.forEach(row => {
          const item = document.createElement('li'); item.className = 'comment';
          const header = document.createElement('div'); header.className = 'comment-header';
          const type = document.createElement('strong'); type.textContent = labels[row.category] || '기타';
          const date = document.createElement('time'); date.dateTime = new Date(row.created_at).toISOString();
          date.textContent = new Intl.DateTimeFormat('ko-KR', {dateStyle:'medium', timeStyle:'short', timeZone:'Asia/Seoul'}).format(new Date(row.created_at));
          const delivery = document.createElement('span');
          delivery.textContent = row.notify_status === 'sent' ? '알림 요청됨' : row.notify_status === 'failed' ? '메일 알림 실패' : '메일 알림 대기 중';
          header.append(type, date, delivery); item.append(header);
          const body = document.createElement('p'); body.className = 'comment-body'; body.textContent = row.body; item.append(body);
          const actions = document.createElement('div'); actions.className = 'comment-actions';
          if (row.email) {
            const reply = document.createElement('a'); reply.textContent = '답장하기 · ' + row.email;
            const at = row.email.lastIndexOf('@');
            reply.href = 'mailto:' + encodeURIComponent(row.email.slice(0, at)) + '@' + row.email.slice(at + 1) + '?subject=' + encodeURIComponent('[데이터머니] 문의 답변');
            actions.append(reply);
          }
          const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'delete'; remove.textContent = '삭제';
          remove.addEventListener('click', async () => {
            if (!window.confirm('이 문의를 삭제할까요?')) return;
            remove.disabled = true;
            try {
              const result = await fetch('/api/article-engagement/_admin/inquiries/' + row.id, {method:'DELETE', cache:'no-store', headers:authHeaders()});
              if (!result.ok) throw new Error('Delete failed');
              item.remove(); empty.hidden = list.children.length > 0; status.textContent = '문의를 삭제했습니다.';
            } catch (_) { status.textContent = '삭제하지 못했습니다. 다시 시도해 주세요.'; remove.disabled = false; }
          });
          actions.append(remove); item.append(actions); list.append(item);
        });
        nextBefore = data.nextBefore; more.hidden = !nextBefore;
        empty.hidden = !!list.children.length; empty.textContent = '아직 접수된 문의가 없습니다.';
        if (!key) { googleSession = true; signout.hidden = false; if (inspectorHelp) inspectorHelp.hidden = false; }
        panel.hidden = false; login.hidden = true; googleLogin.hidden = true; keyInput.value = ''; return;
      }
      if (currentStatus === 'feedback') {
        const params = new URLSearchParams();
        if (append && nextBefore) params.set('before', String(nextBefore));
        const response = await fetch('/api/article-engagement/_admin/feedback?' + params, {cache:'no-store', headers:authHeaders()});
        if (!response.ok) { const error = new Error('Request failed'); error.status=response.status; throw error; }
        const data = await response.json();
        const titles = await loadArticleTitles();
        if (!append) {
          list.replaceChildren(); feedbackSummary.replaceChildren();
          const dislikeHeading = document.createElement('strong'); dislikeHeading.textContent = '글별 싫어요'; feedbackSummary.append(dislikeHeading);
          (data.dislikes || []).forEach(row => {
            const line = document.createElement('p'); line.className = 'comment-header';
            const link = document.createElement('a'); link.href = `/blog/${encodeURIComponent(row.article)}/`; link.textContent = titles.get(`/blog/${row.article}/`) || row.article;
            const count = document.createElement('span'); count.textContent = `싫어요 ${row.count}`;
            line.append(link, count); feedbackSummary.append(line);
          });
          const heading = document.createElement('strong'); heading.textContent = '기존 글 평가'; feedbackSummary.append(heading);
          data.totals.forEach(row => {
            const line = document.createElement('p'); line.className = 'comment-header';
            const link = document.createElement('a'); link.href = `/blog/${encodeURIComponent(row.article)}/`; link.textContent = titles.get(`/blog/${row.article}/`) || row.article;
            const counts = document.createElement('span'); counts.textContent = `도움됐어요 ${row.helpful} · 어려웠어요 ${row.difficult} · 아쉬워요 ${row.disappointing}`;
            line.append(link, counts); feedbackSummary.append(line);
          });
        }
        const labels = {helpful:'도움됐어요', difficult:'어려웠어요', disappointing:'아쉬워요'};
        data.items.forEach(row => {
          const item = document.createElement('li'); item.className = 'comment';
          const header = document.createElement('div'); header.className = 'comment-header';
          const choice = document.createElement('strong'); choice.textContent = labels[row.choice] || row.choice;
          const date = document.createElement('time'); date.dateTime = new Date(row.updated_at).toISOString();
          date.textContent = new Intl.DateTimeFormat('ko-KR', {dateStyle:'medium', timeStyle:'short', timeZone:'Asia/Seoul'}).format(new Date(row.updated_at));
          const link = document.createElement('a'); link.href = `/blog/${encodeURIComponent(row.article)}/`; link.textContent = titles.get(`/blog/${row.article}/`) || row.article;
          header.append(choice, date, link); item.append(header);
          if (row.body) { const text = document.createElement('p'); text.className = 'comment-body'; text.textContent = row.body; item.append(text); }
          const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '삭제';
          remove.addEventListener('click', async () => {
            if (!window.confirm('이 피드백을 삭제할까요?')) return;
            remove.disabled = true;
            try {
              const result = await fetch('/api/article-engagement/_admin/feedback/' + row.id, {method:'DELETE', cache:'no-store', headers:authHeaders()});
              if (!result.ok) throw new Error('Delete failed');
              await load(false); status.textContent = '피드백을 삭제했습니다.';
            } catch (_) { status.textContent = '삭제하지 못했습니다. 다시 시도해 주세요.'; remove.disabled = false; }
          });
          item.append(remove);
          list.append(item);
        });
        nextBefore = data.nextBefore; more.hidden = !nextBefore;
        empty.hidden = !!list.children.length || (data.dislikes || []).length > 0; empty.textContent = '아직 글 반응이나 기존 평가가 없습니다.';
        panel.hidden = false; login.hidden = true; keyInput.value = ''; return;
      }
      if (currentStatus === 'subscribers') {
        const response = await fetch('/api/article-engagement/_admin/email-subscribers', {cache:'no-store', headers:authHeaders()});
        if (!response.ok) { const error = new Error('Request failed'); error.status=response.status; throw error; }
        const data = await response.json();
        list.replaceChildren();
        (data.requests || data.items).forEach(row => {
          const item=document.createElement('li');item.className='comment';
          const address=document.createElement('strong');address.textContent=row.email;
          const detail=document.createElement('p');detail.className='comment-body';
          const consent=[row.test_news?'새로운 무료 검사 소식':'',row.monthly_report?'월간 금융 리포트':''].filter(Boolean);
          detail.textContent=(consent.length?'수신 동의: '+consent.join(' · '):'소식 수신 동의 없음')+' / 이메일 확인 '+new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeZone:'Asia/Seoul'}).format(new Date(row.confirmed_at));
          item.append(address,detail);list.append(item);
        });
        empty.hidden=!!(data.requests || data.items).length;empty.textContent='이메일을 확인한 결과 신청이 없습니다.';
        more.hidden=true;panel.hidden=false;login.hidden=true;keyInput.value='';return;
      }
      if (currentStatus === 'survey') {
        const response = await fetch('/api/article-engagement/_admin/survey', {cache:'no-store', headers:authHeaders()});
        if (!response.ok) { const error = new Error('Request failed'); error.status=response.status; throw error; }
        const data = await response.json();
        list.replaceChildren();
        const typeNames = ['거북이','다람쥐','고양이','토끼','늑대','부엉이','여우','사자'];
        data.items.forEach(row => {
          const item=document.createElement('li'); item.className='comment';
          const title=document.createElement('strong'); title.textContent=`${row.day} · ${row.version >= 2 ? typeNames[row.type_code] + ' 유형' : '이전 설문'} · ${row.participants}${row.version === 3 ? '건 (집계)' : '명'}`;
          const detail=document.createElement('p'); detail.className='comment-body';
          detail.textContent=`답변 평균 (0~3): 손익 ${row.loss.toFixed(2)} / 불안 ${row.anxiety.toFixed(2)} / 필요 시기 ${row.horizon.toFixed(2)} / ${row.version >= 2 ? '매도 충동' : '하락 대응'} ${row.reaction.toFixed(2)} / 비상금 ${row.buffer.toFixed(2)}`;
          item.append(title,detail); list.append(item);
        });
        empty.hidden=!!data.items.length; empty.textContent='집계된 응답이 아직 없습니다.';
        more.hidden=true; panel.hidden=false; login.hidden=true; keyInput.value=''; return;
      }
      const params = new URLSearchParams({status:currentStatus});
      if (append && nextBefore) params.set('before', String(nextBefore));
      const data = await request(`?${params}`);
      if (!key) { googleSession = true; signout.hidden = false; if (inspectorHelp) inspectorHelp.hidden = false; }
      if (!append) list.replaceChildren();
      data.items.forEach(render);
      nextBefore = data.nextBefore;
      more.hidden = !nextBefore;
      showEmpty();
      panel.hidden = false;
      login.hidden = true;
      googleLogin.hidden = true;
      keyInput.value = '';
    } catch (error) {
      if (!(silent && error.status === 401)) {
        status.textContent = error.status === 401
          ? (googleSession ? '로그인이 만료되었습니다. 페이지를 새로고침해 다시 로그인해 주세요.' : '접속키가 맞지 않습니다.')
          : '목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
      }
      if (!append && panel.hidden && !silent) key = '';
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
  signout.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/article-engagement/_auth/logout', {method:'POST', cache:'no-store'});
      if (!response.ok) throw new Error('Logout failed');
      window.dispatchEvent(new Event('dm-admin-session-change'));
      location.reload();
    } catch (_) { status.textContent = '로그아웃하지 못했습니다. 다시 시도해 주세요.'; }
  });
  const initialize = async () => {
    // An existing session opens automatically. Otherwise keep legacy key access
    // until Google sign-in has been fully configured on the server.
    await load(false, true);
    if (!panel.hidden) return;
    try {
      const response = await fetch('/api/article-engagement/_auth/config', {cache:'no-store'});
      if (!response.ok) return;
      const config = await response.json();
      if (!config.googleClientId || !config.nonce) return;
      login.hidden = !config.legacyAllowed;
      googleLogin.hidden = false;
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onerror = () => { status.textContent = 'Google 로그인을 불러오지 못했습니다. 페이지를 새로고침해 주세요.'; };
      script.onload = () => {
        window.google.accounts.id.initialize({client_id:config.googleClientId, nonce:config.nonce, callback:async result => {
          try {
            const loginResponse = await fetch('/api/article-engagement/_auth/login', {
              method:'POST', cache:'no-store', headers:{'content-type':'application/json'}, body:JSON.stringify({credential:result.credential})
            });
            if (!loginResponse.ok) throw new Error('Login failed');
            googleLogin.hidden = true;
            window.dispatchEvent(new Event('dm-admin-session-change'));
            await load(false);
          } catch (_) { status.textContent = '로그인하지 못했습니다. 운영자 계정과 인터넷 연결을 확인하고 새로고침해 주세요.'; }
        }});
        window.google.accounts.id.renderButton(googleSignin, {theme:'outline', size:'large', text:'signin_with'});
      };
      document.head.append(script);
    } catch (_) { status.textContent = '로그인을 준비하지 못했습니다. 페이지를 새로고침해 주세요.'; }
  };
  initialize();
})();
