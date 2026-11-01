(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('embed') === '1') return;

  const endpoint = '/api/article-engagement/_inquiry';
  const markup = `
    <div class="dm-inquiry-heading">
      <div><p class="dm-inquiry-eyebrow">데이터머니 문의</p><h2 id="dm-inquiry-title">무엇을 도와드릴까요?</h2></div>
      <button class="dm-inquiry-close" type="button" data-inquiry-close aria-label="문의창 닫기">×</button>
    </div>
    <p class="dm-inquiry-intro">궁금한 점이나 전하고 싶은 이야기를 남겨주세요.</p>
    <form class="dm-inquiry-form">
      <fieldset class="dm-inquiry-types"><legend>문의 유형</legend>
        <label><input type="radio" name="category" value="question" checked><span>질문</span></label>
        <label><input type="radio" name="category" value="error"><span>오류 제보</span></label>
        <label><input type="radio" name="category" value="suggestion"><span>제안</span></label>
        <label><input type="radio" name="category" value="other"><span>기타</span></label>
      </fieldset>
      <label class="dm-inquiry-label" for="dm-inquiry-body">문의 내용</label>
      <textarea id="dm-inquiry-body" name="body" rows="5" maxlength="2000" placeholder="문의 내용을 적어주세요." required></textarea>
      <label class="dm-inquiry-label" for="dm-inquiry-email">답변받을 이메일 <span>(선택)</span></label>
      <input id="dm-inquiry-email" name="email" type="email" maxlength="254" autocomplete="email" placeholder="답변이 필요할 때 입력해 주세요">
      <p class="dm-inquiry-privacy">문의 내용은 운영자만 확인합니다. 입력한 정보는 문의 처리에 이용하며 1년 후 삭제합니다. <a href="/privacy/" target="_blank" rel="noopener noreferrer">개인정보처리방침</a></p>
      <p class="dm-inquiry-status" role="status" aria-live="polite"></p>
      <button class="dm-inquiry-submit" type="submit">문의 보내기</button>
    </form>
    <div class="dm-inquiry-success" hidden><p tabindex="-1">문의가 접수됐어요.<br>남겨주셔서 감사합니다.</p><button type="button" data-inquiry-again>다른 문의 남기기</button></div>`;

  const setup = (host, close) => {
    host.innerHTML = markup;
    const form = host.querySelector('form');
    const success = host.querySelector('.dm-inquiry-success');
    const status = host.querySelector('.dm-inquiry-status');
    const submit = host.querySelector('.dm-inquiry-submit');
    const closeButton = host.querySelector('[data-inquiry-close]');
    if (close) closeButton.addEventListener('click', close);
    else {
      closeButton.hidden = true;
      const oldTitle = host.querySelector('#dm-inquiry-title');
      const title = document.createElement('h1'); title.id = oldTitle.id; title.textContent = oldTitle.textContent;
      oldTitle.replaceWith(title);
    }
    let requestId = crypto.randomUUID();
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const body = form.elements.body.value.trim();
      if (!body) { status.textContent = '문의 내용을 적어주세요.'; form.elements.body.focus(); return; }
      submit.disabled = true;
      status.textContent = '문의를 보내고 있어요.';
      try {
        const response = await fetch(endpoint, {method:'POST', credentials:'same-origin', headers:{'content-type':'application/json'},
          body:JSON.stringify({requestId, category:form.elements.category.value, body, email:form.elements.email.value.trim()})});
        if (!response.ok) { const error = new Error('Inquiry failed'); error.status = response.status; throw error; }
        form.hidden = true; success.hidden = false; status.textContent = '';
        success.querySelector('p').focus();
      } catch (error) {
        if (error.status === 409) {
          requestId = crypto.randomUUID();
          status.textContent = '이전 문의는 접수됐어요. 수정한 내용을 새 문의로 보내려면 다시 눌러 주세요.';
        } else status.textContent = error.status === 429 ? '문의가 잠시 많아요. 조금 뒤 다시 보내주세요.' : '문의를 보내지 못했어요. 잠시 후 다시 시도해 주세요.';
      } finally { submit.disabled = false; }
    });
    host.querySelector('[data-inquiry-again]').addEventListener('click', () => {
      form.reset(); form.hidden = false; success.hidden = true; status.textContent = '';
      requestId = crypto.randomUUID(); form.elements.body.focus();
    });
    return {form, success};
  };

  const addLink = (host, className, before) => {
    if (!host || host.querySelector('[data-dm-contact-link]')) return;
    const link = document.createElement('a');
    link.href = '/contact/'; link.dataset.dmContactLink = ''; link.className = className; link.textContent = '문의하기';
    if (before && before.parentNode === host) host.insertBefore(link, before); else host.append(link);
  };
  const mount = () => {
    const standalone = document.querySelector('[data-inquiry-standalone]');
    if (standalone) setup(standalone, null);
    const header = document.querySelector('.dm-site-header, .topbar, .site-header, .wrap > header, .shell > header, body > header');
    const nav = header?.querySelector('.dm-site-nav, .nav, .link-row, .site-nav');
    if (nav) addLink(nav, nav.matches('.link-row') ? 'dm-contact-nav-link link-chip' : 'dm-contact-nav-link', nav.querySelector('.dm-theme-control'));
    else if (header && !standalone) addLink(header, 'dm-contact-header-link', header.querySelector('.dm-theme-control'));
    const footer = document.querySelector('footer.dm-site-footer, footer.site-footer, footer.footer, .wrap > footer, .shell > footer, body > footer');
    const footerHost = footer?.querySelector('.dm-footer-links, [data-site-info-links]') || footer;
    if (!standalone) addLink(footerHost, 'dm-contact-footer-link', footerHost?.querySelector('.dm-footer-top'));
    if (standalone || typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) return;

    let dialog, opener;
    document.addEventListener('click', event => {
      const link = event.target.closest?.('[data-dm-contact-link]');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (!dialog) {
        dialog = document.createElement('dialog'); dialog.className = 'dm-inquiry-dialog dm-inquiry';
        dialog.setAttribute('aria-labelledby', 'dm-inquiry-title');
        setup(dialog, () => dialog.close());
        dialog.addEventListener('close', () => { document.body.classList.remove('dm-inquiry-open'); opener?.focus(); });
        document.body.append(dialog);
      }
      opener = link; document.body.classList.add('dm-inquiry-open'); dialog.showModal();
      dialog.querySelector('[data-inquiry-close]').focus();
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();
