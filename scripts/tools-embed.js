(() => {
  'use strict';
  const tools = {
    'investor-type': {path:'/tools/investor-type/', title:'나의 투자 유형 테스트'},
    etf: {path:'/tools/etf_calculator/', title:'ETF 적립식 수익률 계산기'},
    tax: {path:'/tools/tax_simulator/', title:'절세 시뮬레이터'},
    dividend: {path:'/tools/dividend_calculator/', title:'배당 포트폴리오 계산기'}
  };
  const panel=document.querySelector('.dm-tool-embed');
  const list=[...document.querySelectorAll('[data-tool-list]')];
  const slot=panel.querySelector('[data-tool-frame]');
  const title=panel.querySelector('#dm-tool-title');
  const close=panel.querySelector('[data-tool-close]');
  let active='', observer, screenObserver, previousScroll=0, opener=null;

  function closePanel(restoreFocus=false) {
    observer?.disconnect(); screenObserver?.disconnect();
    observer=screenObserver=null;
    slot.replaceChildren();panel.hidden=true;list.forEach(item=>{item.hidden=false;});
    active='';
    if (restoreFocus) {
      window.scrollTo({top:previousScroll,behavior:'auto'});
      opener?.focus({preventScroll:true});
    }
  }

  function openPanel(id, focus=false) {
    const item=tools[id];
    if (!item) { closePanel(false); return; }
    if (active===id) return;
    observer?.disconnect(); screenObserver?.disconnect();
    active=id;title.textContent=item.title;list.forEach(element=>{element.hidden=true;});panel.hidden=false;
    const frame=document.createElement('iframe');
    frame.title=item.title;
    frame.src=item.path+'?embed=1&context=tools';
    frame.scrolling='no';
    frame.addEventListener('load',()=>{
      if (active!==id || !frame.isConnected) return;
      try {
        const doc=frame.contentDocument;
        const content=doc.querySelector('.shell, .container');
        if (!content) return;
        const resize=()=>{frame.style.height=Math.max(400,Math.ceil(content.getBoundingClientRect().height)+4)+'px';};
        if (window.ResizeObserver) {observer=new ResizeObserver(resize);observer.observe(content);}
        doc.querySelectorAll('img').forEach(img=>img.addEventListener('load',resize));
        frame.contentWindow.addEventListener('resize',resize);
        doc.addEventListener('click',event=>{
          const link=event.target.closest?.('a[href]');
          if (link && !link.hasAttribute('download') && !link.hasAttribute('target') && !link.getAttribute('href').startsWith('#')) link.target='_top';
        },true);
        if (id!=='investor-type') doc.addEventListener('click',event=>{
          if (!event.target.closest?.('.btn-calc')) return;
          setTimeout(()=>{
            const result=doc.querySelector('#resultCard.show');
            if (!result || !frame.isConnected) return;
            frame.contentWindow.scrollTo(0,0);
            resize();
            const top=frame.getBoundingClientRect().top+window.scrollY+result.getBoundingClientRect().top;
            window.scrollTo({top:Math.max(0,top-16),behavior:'auto'});
          },80);
        });
        doc.addEventListener('keydown',event=>{
          if (event.key!=='Backspace' || event.isComposing || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
          const path=typeof event.composedPath==='function'?event.composedPath():[event.target];
          if (path.some(node=>node?.nodeType===1 && (node.isContentEditable || node.matches('input,textarea,select,[role="textbox"],[role="searchbox"]')))) return;
          event.preventDefault();event.stopImmediatePropagation();close.click();
        },true);
        if (id==='investor-type' && window.MutationObserver) {
          screenObserver=new MutationObserver(records=>{
            if (records.some(record=>record.target.classList.contains('screen') && !record.target.hidden)) {
              window.scrollTo({top:Math.max(0,panel.getBoundingClientRect().top+window.scrollY-16),behavior:'auto'});
            }
          });
          const main=doc.querySelector('main');
          if (main) screenObserver.observe(main,{subtree:true,attributes:true,attributeFilter:['hidden']});
        }
        resize();
      } catch (_) { frame.style.height='900px'; }
    });
    slot.replaceChildren(frame);
    if (focus) {window.scrollTo({top:0,behavior:'auto'});close.focus({preventScroll:true});}
  }

  function selectedFromUrl() {return new URL(location.href).searchParams.get('tool')||'';}
  function setUrl(id, method) {
    const url=new URL(location.href);
    if (id) url.searchParams.set('tool',id);else url.searchParams.delete('tool');
    history[method](id?{...history.state,dmToolsPanel:id}:null,'',url);
  }
  document.querySelectorAll('.grid a.card').forEach(link=>{
    const id=Object.keys(tools).find(key=>tools[key].path===link.getAttribute('href'));
    if (!id) return;
    link.addEventListener('click',event=>{
      if (event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();previousScroll=window.scrollY;opener=link;setUrl(id,'pushState');openPanel(id,true);
    });
  });
  close.addEventListener('click',()=>{
    if (history.state?.dmToolsPanel===active) history.back();
    else {setUrl('','replaceState');closePanel(true);}
  });
  window.addEventListener('popstate',()=>{
    const id=selectedFromUrl();
    if (tools[id]) openPanel(id,false); else closePanel(true);
  });
  const id=selectedFromUrl();if(tools[id]) openPanel(id,false);
})();
