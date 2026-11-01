import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../workers/package.json',import.meta.url));
const {JSDOM}=require('jsdom');
const html=await readFile(new URL('../tools/index.html',import.meta.url),'utf8');
const script=await readFile(new URL('../scripts/tools-embed.js',import.meta.url),'utf8');
assert.ok(!html.includes('먼저 글로 이해하고, 계산기로 확인하세요'),'the removed sample article promotion stays absent');
const tick=()=>new Promise(resolve=>setTimeout(resolve,40));
for (const [path,id] of [['/tools/investor-type/','investor-type'],['/tools/etf_calculator/','etf'],['/tools/tax_simulator/','tax'],['/tools/dividend_calculator/','dividend']]) {
  const dom=new JSDOM(html,{url:'https://datamoney.kr/tools/',runScripts:'outside-only'});
  const w=dom.window;w.scrollTo=()=>{};w.eval(script);
  const d=w.document, card=d.querySelector(`.grid a[href="${path}"]`);
  card.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true,button:0}));
  assert.equal(new URL(w.location.href).searchParams.get('tool'),id);
  assert.equal(d.querySelector('.dm-tool-embed').hidden,false);
  assert.ok([...d.querySelectorAll('[data-tool-list]')].every(e=>e.hidden));
  assert.equal(d.querySelector('iframe').getAttribute('src'),path+'embed.html?embed=1&context=tools');
  assert.ok(d.querySelector('header.dm-site-header .dm-brand'),'the shared blog header stays visible');
  assert.ok(d.querySelector('.dm-sidebar-shell > .dm-shared-sidebar'),'the shared sidebar stays visible');
  assert.ok(d.querySelector('.tools-content > .dm-tool-embed'),'the tool opens in the content column');
  d.querySelector('[data-tool-close]').click(); await tick();
  assert.equal(d.querySelector('.dm-tool-embed').hidden,true);
  assert.equal(new URL(w.location.href).searchParams.has('tool'),false);
  dom.window.close();
}
for (const [path,id] of [['/tools/etf-calculator','etf'],['/tools/tax-simulator','tax'],['/tools/dividend-calculator','dividend']]) {
  const page=new JSDOM(html,{url:'https://datamoney.kr'+path,runScripts:'outside-only'});
  page.window.scrollTo=()=>{};page.window.eval(script);
  assert.equal(page.window.document.querySelector('.dm-tool-embed').hidden,false,`${path} opens the ${id} tool`);
  assert.match(page.window.document.querySelector('.dm-tool-embed iframe').getAttribute('src'),/embed\.html\?embed=1/);
  page.window.close();
}
const direct=new JSDOM(html,{url:'https://datamoney.kr/tools/?tool=etf',runScripts:'outside-only'});
direct.window.scrollTo=()=>{};direct.window.eval(script);
assert.equal(direct.window.document.querySelector('.dm-tool-embed').hidden,false,'reload restores the selected tool');
direct.window.document.querySelector('[data-tool-close]').click();
assert.equal(direct.window.location.search,'');
direct.window.document.querySelector('.dm-shared-sidebar a[href="/tools/tax_simulator/"]').click();
assert.equal(direct.window.location.search,'?tool=tax','sidebar calculator opens within the same page');
direct.window.document.querySelector('.dm-shared-sidebar a[href="/tools/etf_calculator/"]').click();
assert.equal(direct.window.location.search,'?tool=etf');
direct.window.document.querySelector('[data-tool-close]').click();await tick();
assert.equal(direct.window.location.search,'','close returns to the list after switching tools');
direct.window.document.querySelector('.investor-test-banner').click();
assert.equal(direct.window.location.search,'?tool=investor-type','the shared banner also opens the test in the content column');
direct.window.close();
for (const [path,id] of [['/tools/investor-type/','investor-type'],['/tools/etf_calculator/','etf'],['/tools/tax_simulator/','tax'],['/tools/dividend_calculator/','dividend']]) {
  const page=new JSDOM(html,{url:'https://datamoney.kr'+path,runScripts:'outside-only'});
  page.window.scrollTo=()=>{};page.window.eval(script);
  assert.equal(page.window.document.querySelector('.dm-tool-embed').hidden,false,`${path} opens in the blog layout`);
  assert.equal(page.window.document.querySelector('.dm-tool-embed iframe').getAttribute('src'),path+'embed.html?embed=1&context=tools');
  assert.equal(page.window.document.documentElement.dataset.dmToolShell,undefined);
  page.window.document.querySelector('[data-tool-close]').click();
  assert.equal(page.window.location.pathname,'/tools/','close goes to the list without redirecting the initial direct URL');
  page.window.close();
}
console.log('All tools open within the existing shell; back and reload work');
