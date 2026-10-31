(() => {
  if (document.querySelector('.dm-back-to-top')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dm-back-to-top';
  button.setAttribute('aria-label', '맨 위로 이동');
  button.setAttribute('aria-hidden', 'true');
  button.tabIndex = -1;
  button.innerHTML = '<span class="dm-back-to-top-arrow" aria-hidden="true">↑</span><span class="dm-back-to-top-label">맨 위로</span>';
  document.body.appendChild(button);

  const footerLink = document.querySelector('.dm-footer-top');
  const important = 'a, button, input, textarea, select, summary, img, video, iframe, canvas, svg, p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, label, figcaption, span, strong, em, [contenteditable]';
  let scheduled = false;
  let shown = false;

  const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const textOverlaps = (element, box) => {
    for (const node of element.childNodes) {
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      if ([...range.getClientRects()].some(rect => intersects(rect, box))) return true;
    }
    return false;
  };
  const coversContent = () => {
    const box = button.getBoundingClientRect();
    const xs = [box.left + 1, (box.left + box.right) / 2, box.right - 1];
    const ys = Array.from({length: 7}, (_, index) => box.top + 1 + (box.height - 2) * index / 6);
    for (const x of xs) for (const y of ys) {
      if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) continue;
      for (const element of document.elementsFromPoint(x, y)) {
        if (element === button || button.contains(element)) continue;
        // The card is one large link; its actual text and thumbnail are checked separately.
        if (element.matches('a.post-card')) continue;
        if (element.matches(important) || textOverlaps(element, box)) return true;
      }
    }
    return false;
  };
  const footerLinkIsVisible = () => {
    if (!footerLink) return false;
    const rect = footerLink.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= innerHeight;
  };
  const update = () => {
    scheduled = false;
    const active = document.activeElement;
    const editing = active && (active.matches('input, textarea, select') || active.isContentEditable);
    const visible = scrollY > 480 && !editing && !footerLinkIsVisible() && !coversContent();
    if (visible === shown) return;
    shown = visible;
    if (!visible && active === button) {
      document.querySelector('.dm-site-header .dm-brand')?.focus({preventScroll: true});
    }
    button.classList.toggle('is-visible', visible);
    button.setAttribute('aria-hidden', String(!visible));
    button.tabIndex = visible ? 0 : -1;
  };
  const schedule = () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(update);
    }
  };
  const goTop = event => {
    event.preventDefault();
    if (document.activeElement === button || event.detail === 0) {
      document.querySelector('.dm-site-header .dm-brand')?.focus({preventScroll: true});
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const previous = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo({top: 0, behavior: 'instant'});
      requestAnimationFrame(() => { document.documentElement.style.scrollBehavior = previous; });
    } else {
      window.scrollTo({top: 0, behavior: 'smooth'});
    }
  };

  button.addEventListener('click', goTop);
  footerLink?.addEventListener('click', goTop);
  window.addEventListener('scroll', schedule, {passive: true, capture: true});
  window.addEventListener('resize', schedule, {passive: true});
  window.visualViewport?.addEventListener('resize', schedule, {passive: true});
  document.addEventListener('focusin', schedule);
  document.addEventListener('focusout', schedule);
  document.addEventListener('load', schedule, true);
  new MutationObserver(schedule).observe(document.body, {childList: true, subtree: true});
  schedule();
})();
