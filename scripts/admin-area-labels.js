(() => {
  'use strict';
  if (window.top !== window || new URLSearchParams(location.search).get('embed') === '1') return;
  const preference = 'dm-admin-section-labels';
  const endpoint = '/api/article-engagement/_auth/session';
  let host, shadow, toggle, marks, observer, active = false, authorized = false, scheduled = false, checking = false;
  const frames = new WeakSet();
  const rules = [
    ['.dm-site-header, .topbar', '상단 헤더'],
    ['.dm-site-header .dm-brand, .topbar .brand', '로고'],
    ['.dm-header-search', '검색'],
    ['.dm-site-nav, .topbar .nav', '상단 메뉴'],
    ['.dm-mobile-investor-banner', '모바일 투자 유형 배너'],
    ['.shell > .hero', '홈 소개'],
    ['.shell > .section:not(#tools)', '추천 글'],
    ['.shell > #tools', '홈 계산기 목록'],
    ['.latest-column', '블로그 글 목록'],
    ['.latest-heading', '블로그 목록 제목'],
    ['.category-bar', '글 카테고리'],
    ['.latest-posts', '최신 글 목록'],
    ['.latest-posts .post-card', '글 카드'],
    ['.dm-article-heading', '제목 영역'],
    ['.dm-article-byline', '작성 정보'],
    ['.dm-article-thumbnail', '글 썸네일'],
    ['article.dm-post, .dm-article-page', '글 본문'],
    ['.dm-post h2, .dm-article-page h2:not(.dm-comments h2):not(.dm-author-note h2)', '본문 소제목'],
    ['.dm-article-actions', '글 기능 버튼'],
    ['.dm-end-actions', '글 반응과 공유'],
    ['.dm-author-note', '운영자 소개'],
    ['.dm-references', '참고자료'],
    ['.dm-comments', '댓글'],
    ['.tools-content', '도구 콘텐츠'],
    ['.grid[data-tool-list]', '도구 목록'],
    ['.grid[data-tool-list] .tool-group', '도구 분류'],
    ['.grid[data-tool-list] .card', '도구 카드'],
    ['.dm-tool-embed', '도구 표시 영역'],
    ['.dm-tool-back', '도구 목록 버튼'],
    ['.dm-shared-sidebar', '사이드바'],
    ['.dm-shared-sidebar .investor-test-banner', '투자 유형 배너'],
    ['.dm-shared-sidebar .tools-card', '사이드바 계산기'],
    ['.dm-shared-sidebar .ai-traffic-card', 'AI 유입'],
    ['.dm-shared-sidebar .popular-card', '인기 글'],
    ['.dm-shared-sidebar .tags-card', '태그'],
    ['.dm-shared-sidebar .quote-panel', '투자 명언'],
    ['.dm-shared-sidebar .channels-card', '채널 링크'],
    ['.dm-site-footer, .shell > .footer', '하단 정보']
  ];
  const embeddedRules = [
    ['.container, .shell', '도구 본문'],
    ['.container > .card, .container > #calculator > .card', '도구 입력 영역'],
    ['.container .field', '입력 항목'],
    ['.container .btn-calc', '계산 버튼'],
    ['.container #resultCard', '계산 결과'],
    ['.container #detailsSection', '계산 상세'],
    ['.shell main', '투자 유형 테스트']
  ];
  function selector(el) {
    if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) return '#' + el.id;
    const names = [...el.classList].filter(name => /^[a-zA-Z_][\w-]*$/.test(name) && !['show','active','hidden'].includes(name));
    if (names.includes('home-card') && names.length > 1) return '.' + names[names.length - 1];
    return names.length ? '.' + names[0] : el.tagName.toLowerCase();
  }
  function shortName(el, label) {
    if (label === '도구 카드') return (el.querySelector('h3,h2')?.textContent || label).trim().slice(0, 18);
    if (label === '도구 분류') return '분류: ' + (el.textContent || '').trim().slice(0, 16);
    if (label === '본문 소제목') return '소제목: ' + (el.textContent || '').trim().slice(0, 16);
    if (label === '입력 항목') return (el.querySelector('label')?.textContent || label).trim().slice(0, 18);
    return label;
  }
  function addMark(el, label, offset, clip) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 12 || rect.height < 12 || el.ownerDocument.defaultView.getComputedStyle(el).visibility === 'hidden') return;
    const left = Math.max(rect.left + offset.x, clip.left, 0), top = Math.max(rect.top + offset.y, clip.top, 0);
    const right = Math.min(rect.right + offset.x, clip.right, innerWidth), bottom = Math.min(rect.bottom + offset.y, clip.bottom, innerHeight);
    if (right - left < 12 || bottom - top < 12) return;
    const mark = document.createElement('div');mark.className = 'mark';
    Object.assign(mark.style, {left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'});
    if (rect.top + offset.y >= clip.top - 1 && rect.top + offset.y >= 0) {
      const badge = document.createElement('span');badge.className = 'badge';
      badge.textContent = shortName(el, label) + ' · ' + selector(el);
      if (label === '도구 표시 영역' || label === '사이드바') {badge.style.left='auto';badge.style.right='0';}
      mark.append(badge);
    }
    marks.append(mark);
  }
  function collect(doc, list, offset, clip) {
    for (const [query, label] of list) {
      let elements;try { elements = doc.querySelectorAll(query); } catch (_) { continue; }
      for (const el of elements) addMark(el, label, offset, clip);
    }
  }
  function render() {
    scheduled = false;
    if (!authorized || !active || !marks) return;
    marks.replaceChildren();
    const viewport = {left:0,top:0,right:innerWidth,bottom:innerHeight};
    collect(document, rules, {x:0,y:0}, viewport);
    for (const frame of document.querySelectorAll('.dm-tool-embed iframe')) {
      try {
        const doc=frame.contentDocument, rect=frame.getBoundingClientRect();
        if (!doc || rect.bottom < 0 || rect.top > innerHeight) continue;
        if (!frames.has(frame)) { frames.add(frame);frame.addEventListener('load',schedule);frame.contentWindow.addEventListener('scroll',schedule,{passive:true}); }
        collect(doc, embeddedRules, {x:rect.left+frame.clientLeft,y:rect.top+frame.clientTop}, {left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom});
      } catch (_) { /* External or unloaded frames are left untouched. */ }
    }
  }
  function schedule() { if (authorized && active && !scheduled) { scheduled = true;requestAnimationFrame(render); } }
  function setActive(value) {
    active = !!value;toggle.setAttribute('aria-pressed', String(active));toggle.textContent = active ? '영역 이름 끄기' : '영역 이름 켜기';
    try { localStorage.setItem(preference, active ? 'on' : 'off'); } catch (_) {}
    if (active) schedule();else marks.replaceChildren();
  }
  function mount() {
    if (host) return;
    host=document.createElement('div');host.id='dm-admin-area-inspector';
    shadow=host.attachShadow({mode:'closed'});
    const style=document.createElement('style');style.textContent=`
      :host{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:Pretendard,'Apple SD Gothic Neo',sans-serif}
      .controls{position:fixed;left:14px;bottom:14px;pointer-events:auto;display:flex;gap:6px;align-items:center}
      button{appearance:none;border:1px solid #315dba;border-radius:9px;background:#183c83;color:#fff;box-shadow:0 4px 14px #0003;padding:10px 13px;font:700 13px/1.3 Pretendard,'Apple SD Gothic Neo',sans-serif;cursor:pointer}
      button[aria-pressed=true]{background:#0f5f4c;border-color:#127e64}button:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}
      .mark{position:fixed;box-sizing:border-box;border:1px dashed #ec4899;pointer-events:none}
      .badge{position:absolute;top:0;left:0;max-width:min(300px,calc(100vw - 32px));overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:2px 5px;border-radius:0 0 4px 0;color:#fff;background:#a21caf;font:700 11px/1.25 Pretendard,'Apple SD Gothic Neo',sans-serif}
      @media print{:host{display:none!important}}
    `;
    const control=document.createElement('div');control.className='controls';toggle=document.createElement('button');toggle.type='button';toggle.addEventListener('click',()=>setActive(!active));control.append(toggle);
    marks=document.createElement('div');marks.setAttribute('aria-hidden','true');shadow.append(style,marks,control);document.body.append(host);
    let saved=false;try {saved=localStorage.getItem(preference)==='on';} catch (_) {}
    setActive(saved);
    observer = new MutationObserver(schedule);
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','style']});
  }
  function revoke() { authorized=false;active=false;observer?.disconnect();observer=null;host?.remove();host=shadow=toggle=marks=null; }
  async function verify() {
    if (checking) return;checking=true;
    try {
      const response=await fetch(endpoint,{cache:'no-store',credentials:'same-origin'});
      const result=response.ok ? await response.json() : null;
      if (result?.authenticated !== true) { revoke();return; }
      authorized=true;mount();
    } catch (_) { revoke(); } finally {checking=false;}
  }
  window.addEventListener('resize',schedule,{passive:true});window.addEventListener('scroll',schedule,{passive:true});
  document.addEventListener('load',schedule,true);
  document.addEventListener('visibilitychange',()=>{if (!document.hidden) verify();});
  window.addEventListener('pageshow',verify);
  setInterval(()=>{if (!document.hidden) verify();},30000);
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',verify,{once:true});else verify();
})();
