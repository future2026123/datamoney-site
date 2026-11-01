(() => {
  'use strict';

  const key = 'datamoney-color-mode';
  const valid = value => ['system', 'light', 'dark'].includes(value) ? value : 'system';
  const root = document.documentElement;
  const embedParams = new URLSearchParams(location.search);
  if (embedParams.get('embed') === '1') root.classList.add('dm-embedded');
  if (embedParams.get('embed') === '1' && embedParams.get('context') === 'tools') root.classList.add('dm-tools-embedded');
  const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let preference = 'system';
  try { preference = valid(window.localStorage.getItem(key)); } catch (_) {}

  const path = location.pathname.replace(/\/+$/, '') || '/';
  let page = '';
  if (path === '/' || path === '/index.html') page = 'home';
  else if (path === '/blog' || path === '/blog/index.html') page = 'blog';
  else if (path.startsWith('/blog/')) page = 'article';
  else if (path === '/tools' || path === '/tools/index.html') page = 'tools';
  else if (/^\/tools\/(?:etf[-_]calculator|tax[-_]simulator|dividend[-_]calculator)(?:\/|$)/.test(path)) page = 'calculator';
  else if (path.startsWith('/tools/investor-type')) page = 'investor';
  else if (path.startsWith('/account/result')) page = 'account';
  else if (/^\/(?:about|privacy)(?:\/|$)/.test(path)) page = 'info';
  else if (path.startsWith('/comment-admin')) page = 'admin';
  else if (path.startsWith('/search')) page = 'search';
  if (page) root.dataset.dmPage = page;

  let control, trigger, menu;
  const apply = () => {
    const mode = preference === 'system' ? (media?.matches ? 'dark' : 'light') : preference;
    root.dataset.dmTheme = mode;
    root.dataset.dmThemePreference = preference;
    root.style.colorScheme = mode;
    if (!control) return;
    trigger.setAttribute('aria-label', `화면 모드 설정, 현재 ${mode === 'dark' ? '다크' : '라이트'} 모드`);
    trigger.title = '화면 모드 설정';
    trigger.innerHTML = mode === 'dark'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.6A8.4 8.4 0 0 1 8.4 3.8 8.5 8.5 0 1 0 20.2 15.6Z"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.8"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>';
    menu.querySelectorAll('[data-dm-theme-value]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.dmThemeValue === preference));
    });
  };
  apply(); // Run before the page styles render.

  const systemChanged = () => { if (preference === 'system') apply(); };
  if (media?.addEventListener) media.addEventListener('change', systemChanged);
  else if (media?.addListener) media.addListener(systemChanged);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { preference = valid(event.newValue); apply(); }
  });

  const mount = () => {
    if (new URLSearchParams(location.search).get('embed') === '1') return;
    const header = document.querySelector('.dm-site-header, .topbar, .site-header, .wrap > header, .shell > header, body > header');
    if (!header || header.querySelector('.dm-theme-control')) return;
    const host = header.querySelector('.dm-site-nav, .nav, .link-row, .site-nav') || header;
    control = document.createElement('div');
    control.className = 'dm-theme-control';
    control.innerHTML = '<button class="dm-theme-toggle" type="button" aria-haspopup="true" aria-expanded="false"></button>' +
      '<div class="dm-theme-menu" hidden role="group" aria-label="화면 모드">' +
      '<span class="dm-theme-heading">화면 모드</span>' +
      '<button type="button" data-dm-theme-value="system">기기 설정</button>' +
      '<button type="button" data-dm-theme-value="light">라이트</button>' +
      '<button type="button" data-dm-theme-value="dark">다크</button></div>';
    // Keep an existing last-child link or label last in the DOM: some pages
    // use that selector for its normal appearance. Flex order puts us after it.
    if (host === header && header.lastElementChild) host.insertBefore(control, header.lastElementChild);
    else host.append(control);
    trigger = control.querySelector('.dm-theme-toggle');
    menu = control.querySelector('.dm-theme-menu');
    const close = focus => { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); if (focus) trigger.focus(); };
    trigger.addEventListener('click', () => {
      menu.hidden = !menu.hidden;
      trigger.setAttribute('aria-expanded', String(!menu.hidden));
    });
    menu.querySelectorAll('[data-dm-theme-value]').forEach(button => button.addEventListener('click', () => {
      preference = valid(button.dataset.dmThemeValue);
      try { window.localStorage.setItem(key, preference); } catch (_) {}
      apply();
      close(true);
    }));
    document.addEventListener('pointerdown', event => { if (!menu.hidden && !control.contains(event.target)) close(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) close(true); });
    apply();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();
