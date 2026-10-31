(() => {
  'use strict';
  const sidebar = document.querySelector('.dm-shared-sidebar');
  const banner = sidebar?.querySelector('.investor-test-banner');
  if (!sidebar || !banner) return;

  banner.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const layout = sidebar.parentElement;
    const existing = layout.querySelector(':scope > .dm-investor-embed');
    if (existing) {
      event.preventDefault();
      window.scrollTo({top: Math.max(0, existing.getBoundingClientRect().top + window.scrollY - 90), behavior: 'auto'});
      return;
    }
    const original = [...layout.children].find(element => element !== sidebar && element.matches('article, main, .article, .paper, .dm-article-page, .latest-column'));
    if (!original) return;
    event.preventDefault();

    const previousScroll = window.scrollY;
    const panel = document.createElement('section');
    panel.className = 'dm-investor-embed';
    panel.setAttribute('aria-label', '투자 성향 테스트');
    const top = document.createElement('div');
    top.className = 'dm-investor-embed-top';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '← 돌아가기';
    top.append(close);
    const frame = document.createElement('iframe');
    frame.title = '데이터머니 투자 성향 테스트';
    frame.scrolling = 'no';
    frame.src = '/tools/investor-type/?embed=1';
    panel.append(top, frame);
    original.setAttribute('data-investor-original-hidden', '');
    layout.insertBefore(panel, original);
    let observer;
    frame.addEventListener('load', () => {
      try {
        const doc = frame.contentDocument;
        const content = doc.querySelector('.shell');
        const resize = () => { frame.style.height = Math.max(400, Math.ceil(content.getBoundingClientRect().height) + 4) + 'px'; };
        doc.querySelectorAll('a[href="/privacy/"]').forEach(link => { link.target = '_top'; });
        if (window.ResizeObserver) {
          observer = new ResizeObserver(resize);
          observer.observe(content);
        }
        doc.querySelectorAll('img').forEach(img => img.addEventListener('load', resize));
        frame.contentWindow.addEventListener('resize', resize);
        resize();
      } catch (_) { frame.style.height = '900px'; }
    });
    close.addEventListener('click', () => {
      observer?.disconnect();
      panel.remove();
      original.removeAttribute('data-investor-original-hidden');
      window.scrollTo({top: previousScroll, behavior: 'instant'});
      banner.focus({preventScroll: true});
    });
    window.scrollTo({top: Math.max(0, panel.getBoundingClientRect().top + window.scrollY - 90), behavior: 'auto'});
    close.focus({preventScroll: true});
  });
})();
