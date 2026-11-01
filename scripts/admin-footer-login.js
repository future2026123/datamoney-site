(() => {
  'use strict';
  const footer = document.querySelector('.dm-footer-copyright, footer.footer > span');
  if (!footer) return;
  const text = [...footer.childNodes].find(node => node.nodeType === Node.TEXT_NODE && /©\s*\d{4}\s*데이터머니/.test(node.data));
  if (!text) return;
  const match = text.data.match(/©\s*\d{4}\s*데이터머니/);
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = match[0];
  button.setAttribute('aria-label', '관리자 로그인: 두 번 누르기');
  button.style.cssText = 'appearance:none;border:0;background:transparent;color:inherit;font:inherit;letter-spacing:inherit;line-height:inherit;padding:0;margin:0;cursor:inherit;touch-action:manipulation;';
  const before = document.createTextNode(text.data.slice(0, match.index));
  const after = document.createTextNode(text.data.slice(match.index + match[0].length));
  text.replaceWith(before, button, after);
  let lastClick = null;
  button.addEventListener('click', event => {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const now = performance.now();
    if (lastClick !== null && now - lastClick <= 1500) {
      lastClick = null;
      location.assign('/comment-admin/?return=home');
    } else lastClick = now;
  });
})();
