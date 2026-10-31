(() => {
  'use strict';

  document.addEventListener('keydown', event => {
    if (event.key !== 'Backspace' || event.defaultPrevented || event.isComposing || event.repeat ||
        event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

    const path = typeof event.composedPath === 'function' ? event.composedPath() : [event.target];
    if (path.some(node => node && node.nodeType === 1 &&
      (node.isContentEditable || node.matches('input, textarea, select, [role="textbox"], [role="searchbox"]')))) return;

    let navigationWindow = window;
    try {
      if (window.frameElement?.closest('.dm-investor-embed')) navigationWindow = window.parent;
    } catch (_) { /* Other sites' frames keep their own browser history. */ }

    const closeTest = navigationWindow.document.querySelector('.dm-investor-embed-top button');
    if (closeTest) {
      event.preventDefault();
      closeTest.click();
    } else if (navigationWindow.history.length > 1) {
      event.preventDefault();
      navigationWindow.history.back();
    }
  });
})();
