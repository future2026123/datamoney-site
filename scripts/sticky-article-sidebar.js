(() => {
  if (!document.querySelector('.dm-article-heading, article.dm-post')) return;
  const sidebar = document.querySelector('.dm-shared-sidebar');
  if (!sidebar) return;

  let lastHeight = 0;
  const measure = () => {
    const height = Math.ceil(sidebar.getBoundingClientRect().height);
    if (!height || height === lastHeight) return;
    lastHeight = height;
    sidebar.style.setProperty('--dm-sidebar-height', `${height}px`);
    sidebar.setAttribute('data-dm-sticky-ready', '');
  };

  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(sidebar);
  window.addEventListener('resize', measure, {passive: true});
  window.addEventListener('load', measure, {once: true});
  measure();
})();
