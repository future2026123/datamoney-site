(() => {
  'use strict';

  const heading = document.querySelector('.dm-article-heading');
  const fallbackTitle = heading ? null : document.querySelector('article.dm-post h1');
  if ((!heading && !fallbackTitle) || document.querySelector('.dm-article-actions')) return;

  const content = document.querySelector('.content-grid > main') ||
    document.querySelector('article.article') ||
    document.querySelector('main.article') ||
    document.querySelector('main.dm-article-page') ||
    document.querySelector('article') ||
    document.querySelector('main.paper');

  // Mark both the title and body: on some older pages they are in separate columns.
  // This also lets the print stylesheet exclude overlays inserted outside the article.
  if (content) {
    const candidates = [heading || fallbackTitle, content].filter(Boolean);
    const roots = candidates.filter((root, index) =>
      !candidates.some((other, otherIndex) => index !== otherIndex && other.contains(root))
    );
    roots.forEach(root => {
      root.setAttribute('data-dm-print-content', '');
      for (let parent = root.parentElement; parent; parent = parent.parentElement) {
        parent.setAttribute('data-dm-print-path', '');
      }
    });

    // An injected element may have an inline !important display rule, which a
    // print stylesheet cannot override. Hide those siblings only while printing.
    let hiddenForPrint = [];
    window.addEventListener('beforeprint', () => {
      if (hiddenForPrint.length) return;
      document.querySelectorAll('[data-dm-print-path]').forEach(parent => {
        Array.from(parent.children).forEach(child => {
          if (child.hasAttribute('data-dm-print-path') || child.hasAttribute('data-dm-print-content')) return;
          hiddenForPrint.push({
            element: child,
            value: child.style.getPropertyValue('display'),
            priority: child.style.getPropertyPriority('display')
          });
          child.style.setProperty('display', 'none', 'important');
        });
      });
    });
    window.addEventListener('afterprint', () => {
      hiddenForPrint.forEach(({element, value, priority}) => {
        if (value) element.style.setProperty('display', value, priority);
        else element.style.removeProperty('display');
      });
      hiddenForPrint = [];
    });
  }

  const toolbar = document.createElement('div');
  toolbar.className = 'dm-article-actions';
  toolbar.setAttribute('role', 'group');
  toolbar.setAttribute('aria-label', '글 도구');
  toolbar.innerHTML = `
    <div class="dm-actions-group">
      <button class="dm-action" type="button" data-action="reaction" aria-label="유익해요" aria-pressed="false" title="유익해요">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="10.5" r="9.1" fill="#ffdd67"/><path d="M9 18.4h6v1.1a3 3 0 0 1-6 0z" fill="#4178d4"/><path d="M10 11.6c.5.6.7 1.3.7 2h2.6c0-.7.3-1.4.8-2a3 3 0 1 0-4.1 0Z" fill="#fff6c9"/><path d="M10.7 15.1h2.6" stroke="#4178d4" stroke-width="1.3" stroke-linecap="round"/></svg>
        <span class="dm-action-count" data-count="reactions"></span>
      </button>
      <button class="dm-action" type="button" data-action="comments" aria-label="댓글 보기" title="댓글 보기">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 11.4c0 4.7-4 8.5-9 8.5-1.2 0-2.4-.2-3.4-.6L4 21l1.2-4A8.1 8.1 0 0 1 3 11.4c0-4.7 4-8.4 9-8.4s9 3.7 9 8.4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8" cy="11.4" r=".9" fill="currentColor"/><circle cx="12" cy="11.4" r=".9" fill="currentColor"/><circle cx="16" cy="11.4" r=".9" fill="currentColor"/></svg>
        <span class="dm-action-count" data-count="comments"></span>
      </button>
    </div>
    <div class="dm-actions-group">
      <div class="dm-speech-wrap">
        <button class="dm-action" type="button" data-action="speech" aria-label="글 음성으로 듣기" aria-haspopup="dialog" aria-expanded="false" aria-pressed="false" title="음성으로 듣기">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 9h3l4-3.5v13L7 15H4zM14.2 9.3a4 4 0 0 1 0 5.4M16.7 6.8a7.4 7.4 0 0 1 0 10.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="dm-speech-menu" role="dialog" aria-label="음성 재생 설정" hidden>
          <div class="dm-speech-heading"><strong>음성 재생 설정</strong><button type="button" data-speech-close aria-label="음성 설정 닫기">×</button></div>
          <fieldset class="dm-speech-speeds"><legend>재생 속도</legend>
            <label><input type="radio" name="dm-speech-speed" value="0.85"> 느림</label>
            <label><input type="radio" name="dm-speech-speed" value="1" checked> 보통</label>
            <label><input type="radio" name="dm-speech-speed" value="1.2"> 빠름</label>
          </fieldset>
          <label class="dm-speech-follow"><input type="checkbox" data-speech-follow checked> 읽는 위치 따라가기</label>
          <button type="button" class="dm-speech-play" data-speech-play disabled>음성 재생</button>
          <p class="dm-speech-feedback" role="status" aria-live="polite"></p>
        </div>
      </div>
      <div class="dm-action-wrap">
        <button class="dm-action" type="button" data-action="font" aria-label="글자 크기" aria-haspopup="true" aria-expanded="false" title="글자 크기"><span class="dm-font-icon" aria-hidden="true">가<strong>가</strong></span></button>
        <div class="dm-font-menu" hidden>
          <p>글자 크기</p>
          <div class="dm-font-options" role="group" aria-label="글자 크기 선택">
            <button type="button" data-scale="1">기본</button><button type="button" data-scale="1.15">크게</button><button type="button" data-scale="1.3">더 크게</button>
          </div>
        </div>
      </div>
      <button class="dm-action" type="button" data-action="share" aria-label="글 공유하기" title="공유하기">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13 5.5V3l7 5.5-7 5.4v-2.8C8.5 11.1 6 13 5 16c0-6.4 2.5-10.5 8-10.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 13.5V19H4V9h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="dm-action" type="button" data-action="print" aria-label="글 인쇄하기" title="인쇄하기">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7zM17 11.5h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
    <span class="dm-actions-status" role="status" aria-live="polite"></span>`;
  if (heading) heading.append(toolbar);
  else fallbackTitle.after(toolbar);

  const button = name => toolbar.querySelector(`[data-action="${name}"]`);
  const status = toolbar.querySelector('.dm-actions-status');
  let statusTimer;
  const announce = message => {
    status.textContent = message;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { status.textContent = ''; }, 3500);
  };

  const fontButton = button('font');
  const fontMenu = toolbar.querySelector('.dm-font-menu');
  const scaleButtons = Array.from(fontMenu.querySelectorAll('[data-scale]'));
  const readable = content ? Array.from(content.querySelectorAll('p, li, h2, h3, h4, blockquote, th, td, figcaption'))
    .filter(element => !element.closest('.dm-article-heading, .dm-comments, nav, aside, [hidden]')) : [];
  const sizes = readable.map(element => ({
    element,
    original: element.style.fontSize,
    pixels: parseFloat(window.getComputedStyle(element).fontSize)
  }));
  const setScale = (scale, save) => {
    sizes.forEach(({element, original, pixels}) => {
      element.style.fontSize = scale === 1 || !Number.isFinite(pixels) ? original : `${Math.round(pixels * scale * 100) / 100}px`;
    });
    scaleButtons.forEach(item => item.setAttribute('aria-pressed', String(Number(item.dataset.scale) === scale)));
    if (save) try { localStorage.setItem('dm-article-font-scale', String(scale)); } catch (_) {}
  };
  let savedScale = 1;
  try { savedScale = Number(localStorage.getItem('dm-article-font-scale')) || 1; } catch (_) {}
  setScale([1, 1.15, 1.3].includes(savedScale) ? savedScale : 1, false);
  fontButton.addEventListener('click', () => {
    fontMenu.hidden = !fontMenu.hidden;
    fontButton.setAttribute('aria-expanded', String(!fontMenu.hidden));
  });
  scaleButtons.forEach(item => item.addEventListener('click', () => setScale(Number(item.dataset.scale), true)));
  document.addEventListener('click', event => {
    if (!fontMenu.hidden && !event.target.closest('.dm-action-wrap')) {
      fontMenu.hidden = true;
      fontButton.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !fontMenu.hidden) {
      fontMenu.hidden = true;
      fontButton.setAttribute('aria-expanded', 'false');
      fontButton.focus();
    }
  });

  const speechButton = button('speech');
  const speechTitle = heading?.querySelector('h1') || fallbackTitle;
  const highlighter = typeof window.createDataMoneySpeechHighlighter === 'function' && content
    ? window.createDataMoneySpeechHighlighter({title:speechTitle, content, followInput:toolbar.querySelector('[data-speech-follow]')})
    : null;
  const attachDeviceSpeech = () => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window) || !content) {
      speechButton.disabled = true;
      speechButton.title = '이 글의 AI 음성은 아직 준비 중입니다';
      return;
    }
    speechButton.title = 'AI 음성 준비 중 · 기기 음성으로 듣기';
    let speaking = false;
    let session = 0;
    speechButton.addEventListener('click', () => {
      if (speaking) {
        session++;
        window.speechSynthesis.cancel();
        speaking = false;
        highlighter?.clear();
        speechButton.setAttribute('aria-pressed', 'false');
        speechButton.setAttribute('aria-label', '글 음성으로 듣기');
        return;
      }
      const title = (heading || fallbackTitle).querySelector?.('h1')?.innerText?.trim() || fallbackTitle?.innerText?.trim();
      const parts = readable.filter(element => !element.closest('figcaption, .dm-references') &&
        !element.parentElement.closest('li, blockquote, td, th'))
        .map(element => element.innerText.replace(/\s+/gu, ' ').trim()).filter(Boolean);
      if (title) parts.unshift(title);
      const sentences = parts.flatMap(part => (part.match(/.*?[.!?。！？](?=\s|$)|.+$/gu) || [])
        .map(value => value.trim()).filter(Boolean));
      if (!sentences.length) { announce('읽을 본문을 찾지 못했어요.'); return; }
      const chunks = sentences.flatMap((text, index) => {
        const pieces = text.match(/.{1,220}(?:\s+|$)|.{1,220}/gu) || [text];
        return pieces.map(value => ({text:value.trim(), index})).filter(value => value.text);
      });
      highlighter?.prepare(sentences.map(text => ({text})));
      let index = 0;
      const currentSession = ++session;
      const finish = () => {
        if (currentSession !== session) return;
        speaking = false;
        highlighter?.clear();
        speechButton.setAttribute('aria-pressed', 'false');
        speechButton.setAttribute('aria-label', '글 음성으로 듣기');
      };
      const speakNext = () => {
        if (currentSession !== session) return;
        if (!speaking || index >= chunks.length) { finish(); return; }
        const chunk = chunks[index++];
        const utterance = new SpeechSynthesisUtterance(chunk.text);
        utterance.lang = 'ko-KR';
        utterance.onstart = () => { if (speaking && currentSession === session) highlighter?.show(chunk.index); };
        utterance.onend = speakNext;
        utterance.onerror = () => { if (currentSession === session) { finish(); announce('음성을 재생하지 못했어요.'); } };
        window.speechSynthesis.speak(utterance);
      };
      speaking = true;
      speechButton.setAttribute('aria-pressed', 'true');
      speechButton.setAttribute('aria-label', '음성 듣기 중지');
      announce('AI 음성을 준비 중이라 현재는 기기 음성으로 재생해요.');
      speakNext();
    });
    window.addEventListener('pagehide', () => { if (speaking) { session++; window.speechSynthesis.cancel(); highlighter?.clear(); } });
  };
  if (typeof window.initDataMoneyArticleSpeech === 'function') {
    window.initDataMoneyArticleSpeech({toolbar, speechButton, onUnavailable: attachDeviceSpeech, highlighter});
  } else {
    attachDeviceSpeech();
  }

  button('share').addEventListener('click', async () => {
    const data = {title: document.title, url: document.querySelector('link[rel="canonical"]')?.href || location.href};
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (error) { if (error.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(data.url);
      announce('링크를 복사했어요.');
    } catch (_) {
      window.prompt('이 글의 주소를 복사해 주세요.', data.url);
    }
  });
  button('print').addEventListener('click', () => window.print());

  const reactionButton = button('reaction');
  const commentsButton = button('comments');
  const reactionCount = toolbar.querySelector('[data-count="reactions"]');
  const commentCount = toolbar.querySelector('[data-count="comments"]');
  const slug = location.pathname.match(/^\/blog\/([a-z0-9][a-z0-9-]{0,95})\/?$/)?.[1];
  reactionButton.disabled = true;
  commentsButton.disabled = true;
  if (!slug || !content) return;
  const endpoint = `/api/article-engagement/${slug}`;
  const request = async (path, options) => {
    const response = await fetch(endpoint + path, {credentials: 'same-origin', ...options});
    if (!response.ok) {
      const error = new Error('Request failed');
      error.status = response.status;
      throw error;
    }
    return response.json();
  };
  const updateCounts = data => {
    reactionCount.textContent = Number(data.reactions).toLocaleString('ko-KR');
    commentCount.textContent = Number(data.comments).toLocaleString('ko-KR');
    reactionButton.setAttribute('aria-pressed', String(!!data.reacted));
    reactionButton.setAttribute('aria-label', `유익해요 ${reactionCount.textContent}개`);
    commentsButton.setAttribute('aria-label', `댓글 ${commentCount.textContent}개 보기`);
  };
  const loadSummary = async () => {
    try {
      updateCounts(await request(''));
      reactionButton.disabled = false;
      commentsButton.disabled = false;
    } catch (_) {
      reactionButton.title = '반응을 불러오지 못했어요';
      commentsButton.title = '댓글을 불러오지 못했어요';
      setTimeout(async () => {
        try {
          updateCounts(await request(''));
          reactionButton.title = '유익해요';
          commentsButton.title = '댓글 보기';
          reactionButton.disabled = false;
          commentsButton.disabled = false;
        } catch (_) {}
      }, 5000);
    }
  };
  loadSummary();
  reactionButton.addEventListener('click', async () => {
    reactionButton.disabled = true;
    try { updateCounts(await request('/reaction', {method: 'POST'})); }
    catch (_) { announce('반응을 저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { reactionButton.disabled = false; }
  });

  let commentsSection;
  let nextBefore = null;
  const makeComments = () => {
    const section = document.createElement('section');
    section.className = 'dm-comments';
    section.id = 'dm-comments';
    section.setAttribute('aria-labelledby', 'dm-comments-title');
    section.innerHTML = `
      <h2 id="dm-comments-title">댓글 <span class="dm-comments-count"></span></h2>
      <p class="dm-comment-empty" hidden>첫 댓글을 남겨 주세요.</p>
      <ul class="dm-comment-list"></ul>
      <button class="dm-comment-more" type="button" hidden>댓글 더 보기</button>
      <button class="dm-comment-retry" type="button" hidden>댓글 다시 불러오기</button>
      <div class="dm-comment-form-slot">
        <form class="dm-comment-form">
          <div class="dm-comment-reply-context" hidden><span></span><button class="dm-comment-cancel" type="button">답글 취소</button></div>
          <label for="dm-comment-body">댓글 남기기</label>
          <textarea id="dm-comment-body" name="body" maxlength="600" placeholder="의견을 남겨 주세요." aria-describedby="dm-comment-moderation" required></textarea>
          <div class="dm-comment-input-row">
            <div class="dm-comment-name-field"><label for="dm-comment-name">닉네임</label><input id="dm-comment-name" name="nickname" maxlength="20" autocomplete="nickname" placeholder="닉네임 입력" required></div>
            <label class="dm-comment-private"><input id="dm-comment-private" type="checkbox" aria-describedby="dm-comment-private-help" disabled> 운영자만 보기 (비밀댓글)</label>
            <button class="dm-comment-submit" type="submit">댓글 등록</button>
          </div>
          <div class="dm-comment-guidance">
            <p class="dm-comment-policy" id="dm-comment-moderation">링크나 연락처가 포함된 댓글은 검토 후 공개될 수 있습니다.</p>
            <p class="dm-comment-policy" id="dm-comment-private-help">비밀댓글은 운영자만 볼 수 있으며 등록 후 댓글 목록에 표시되지 않습니다.</p>
          </div>
          <div class="dm-comment-verification" hidden></div>
          <p class="dm-comment-verification-notice" role="status" aria-live="polite"></p>
          <p class="dm-comment-notice" role="status" aria-live="polite"></p>
        </form>
      </div>`;
    const author = document.createElement('aside');
    author.className = 'dm-author-note';
    author.setAttribute('aria-labelledby', 'dm-author-note-title');
    author.innerHTML = `
      <h3 id="dm-author-note-title">운영자 소개</h3>
      <p>돈에 관한 정보는 넘쳐나지만, 무엇을 믿어야 할지 판단하기는 쉽지 않습니다.</p>
      <p>데이터머니는 투자와 경제에 관한 익숙한 주장들을 다시 질문하고, 자료와 연구를 통해 근거를 확인합니다. ETF, 자산배분, 투자심리, 위험 관리 등 개인투자자가 실제로 마주하는 문제를 다룹니다.</p>
      <p>정답을 제시하기보다 <strong>스스로 더 나은 금융 의사결정을 내릴 수 있는 판단 근거</strong>를 제공하고자 합니다.</p>`;
    content.append(author, section);
    const list = section.querySelector('.dm-comment-list');
    const empty = section.querySelector('.dm-comment-empty');
    const more = section.querySelector('.dm-comment-more');
    const retry = section.querySelector('.dm-comment-retry');
    const form = section.querySelector('.dm-comment-form');
    const formSlot = section.querySelector('.dm-comment-form-slot');
    const name = section.querySelector('#dm-comment-name');
    const body = section.querySelector('#dm-comment-body');
    const privateComment = section.querySelector('#dm-comment-private');
    const notice = section.querySelector('.dm-comment-notice');
    const submit = section.querySelector('.dm-comment-submit');
    const replyContext = section.querySelector('.dm-comment-reply-context');
    const verification = section.querySelector('.dm-comment-verification');
    const verificationNotice = section.querySelector('.dm-comment-verification-notice');
    let parentId = null;
    let verificationRequired = false;
    let verificationToken = '';
    let widgetId = null;
    submit.disabled = true;

    const verificationError = () => {
      verificationToken = '';
      submit.disabled = true;
      verificationNotice.textContent = '로봇 확인을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';
    };
    fetch('/api/article-engagement/_config', {cache: 'no-store', credentials: 'same-origin'})
      .then(response => { if (!response.ok) throw new Error('Verification unavailable'); return response.json(); })
      .then(config => {
        privateComment.disabled = config.privateComments !== true;
        if (!config.turnstileSiteKey) { submit.disabled = false; return; }
        verificationRequired = true;
        verification.hidden = false;
        window.dmCommentTurnstileReady = () => {
          try {
            widgetId = window.turnstile.render(verification, {
              sitekey: config.turnstileSiteKey,
              action: 'comment',
              size: verification.clientWidth < 300 ? 'compact' : 'flexible',
              callback: token => { verificationToken = token; verificationNotice.textContent = ''; submit.disabled = false; },
              'expired-callback': () => { verificationToken = ''; submit.disabled = true; verificationNotice.textContent = '인증 시간이 만료됐습니다. 다시 확인해 주세요.'; },
              'error-callback': verificationError
            });
          } catch (_) { verificationError(); }
        };
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=dmCommentTurnstileReady';
        script.async = true;
        script.onerror = verificationError;
        document.head.append(script);
      })
      .catch(verificationError);

    const resetReply = () => {
      parentId = null;
      replyContext.hidden = true;
      submit.textContent = '댓글 등록';
    };
    section.querySelector('.dm-comment-cancel').addEventListener('click', resetReply);

    const renderComment = (comment, destination, isReply = false) => {
      const item = document.createElement('li');
      item.className = 'dm-comment-item';
      const avatar = document.createElement('span');
      avatar.className = 'dm-comment-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = comment.deleted_at ? '·' : Array.from(comment.nickname.trim())[0] || '·';
      const box = document.createElement('div');
      box.className = 'dm-comment-content';
      const meta = document.createElement('div');
      meta.className = 'dm-comment-meta';
      const author = document.createElement('strong');
      author.textContent = comment.deleted_at ? '삭제된 댓글' : comment.nickname;
      const time = document.createElement('time');
      time.dateTime = new Date(comment.created_at).toISOString();
      time.textContent = new Intl.DateTimeFormat('ko-KR', {year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul'}).format(new Date(comment.created_at));
      meta.append(author, time);
      if (comment.mine && !comment.deleted_at) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'dm-comment-delete';
        remove.textContent = '삭제';
        remove.setAttribute('aria-label', '내 댓글 삭제');
        remove.addEventListener('click', async () => {
          if (!window.confirm('이 댓글을 삭제할까요?')) return;
          remove.disabled = true;
          try {
            updateCounts(await request(`/comments/${comment.id}`, {method: 'DELETE'}));
            await loadComments(false);
            notice.textContent = '댓글을 삭제했어요.';
          } catch (_) { notice.textContent = '댓글을 삭제하지 못했어요. 다시 시도해 주세요.'; remove.disabled = false; }
        });
        meta.append(remove);
      }
      const text = document.createElement('p');
      text.className = 'dm-comment-text';
      text.textContent = comment.deleted_at ? '삭제된 댓글입니다.' : comment.body;
      box.append(meta, text);
      if (!comment.deleted_at) {
        const controls = document.createElement('div');
        controls.className = 'dm-comment-controls';
        const up = document.createElement('button');
        const down = document.createElement('button');
        const score = document.createElement('span');
        score.className = 'dm-comment-score';
        score.setAttribute('aria-label', '추천 점수');
        const setVote = (value, total) => {
          score.textContent = String(total);
          up.setAttribute('aria-pressed', String(value === 1));
          down.setAttribute('aria-pressed', String(value === -1));
        };
        [[up, 1, '+', '댓글 추천'], [down, -1, '−', '댓글 비추천']].forEach(([buttonElement, value, symbol, label]) => {
          buttonElement.type = 'button';
          buttonElement.className = 'dm-comment-vote';
          buttonElement.textContent = symbol;
          buttonElement.setAttribute('aria-label', label);
          buttonElement.addEventListener('click', async () => {
            up.disabled = true;
            down.disabled = true;
            try {
              const result = await request(`/comments/${comment.id}/vote`, {
                method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({value})
              });
              setVote(result.my_vote, result.score);
            } catch (_) { notice.textContent = '추천을 저장하지 못했어요. 다시 시도해 주세요.'; }
            finally { up.disabled = false; down.disabled = false; }
          });
        });
        setVote(comment.my_vote, comment.score);
        controls.append(up, score, down);
        if (!isReply) {
          const reply = document.createElement('button');
          reply.type = 'button';
          reply.textContent = '답글';
          reply.addEventListener('click', () => {
            parentId = comment.id;
            replyContext.querySelector('span').textContent = `${comment.nickname}님께 답글 작성 중`;
            replyContext.hidden = false;
            submit.textContent = '답글 등록';
            formSlot.scrollIntoView({block: 'center', behavior: 'auto'});
            body.focus();
          });
          controls.append(reply);
        }
        box.append(controls);
      }
      if (Array.isArray(comment.replies) && comment.replies.length) {
        const replies = document.createElement('ul');
        replies.className = 'dm-comment-replies';
        comment.replies.forEach(reply => renderComment(reply, replies, true));
        box.append(replies);
      }
      item.append(avatar, box);
      destination.append(item);
    };
    const loadComments = async append => {
      more.disabled = true;
      retry.hidden = true;
      notice.textContent = '';
      try {
        const data = await request(`/comments${append && nextBefore ? `?before=${nextBefore}` : ''}`);
        if (!append) { resetReply(); list.replaceChildren(); }
        data.items.forEach(comment => renderComment(comment, list));
        empty.hidden = !!list.children.length;
        nextBefore = data.nextBefore;
        more.hidden = !nextBefore;
        section.querySelector('.dm-comments-count').textContent = Number(data.comments).toLocaleString('ko-KR');
        updateCounts(data);
      } catch (_) { notice.textContent = '댓글을 불러오지 못했어요.'; retry.hidden = false; }
      finally { more.disabled = false; }
    };
    more.addEventListener('click', () => loadComments(true));
    retry.addEventListener('click', () => loadComments(false));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      submit.disabled = true;
      notice.textContent = '';
      try {
        const result = await request('/comments', {
          method: 'POST', headers: {'content-type': 'application/json'},
          body: JSON.stringify({nickname: name.value, body: body.value, parentId, isPrivate: privateComment.checked, turnstileToken: verificationToken})
        });
        updateCounts(result);
        body.value = '';
        resetReply();
        await loadComments(false);
        notice.textContent = result.status === 'private' ? '비밀댓글이 접수됐어요. 운영자만 확인할 수 있습니다.' : result.status === 'pending' ? '댓글이 접수됐어요. 검토 후 공개됩니다.' : '댓글을 등록했어요.';
      } catch (error) {
        notice.textContent = error.status === 429 ? '잠시 후 다시 댓글을 등록해 주세요.' : error.status === 403 && verificationRequired ? '로봇 확인을 다시 진행해 주세요.' : '댓글을 등록하지 못했어요. 다시 시도해 주세요.';
      } finally {
        if (verificationRequired && widgetId !== null) {
          verificationToken = '';
          try { window.turnstile.reset(widgetId); } catch (_) { verificationError(); }
        } else submit.disabled = false;
      }
    });
    section.loadComments = loadComments;
    return section;
  };
  commentsSection = makeComments();
  commentsSection.loadComments(false);
  commentsButton.addEventListener('click', () => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    commentsSection.scrollIntoView({behavior: reducedMotion ? 'auto' : 'smooth', block: 'start'});
  });
})();
