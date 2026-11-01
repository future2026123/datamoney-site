import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {JSDOM}=createRequire(new URL('../workers/package.json',import.meta.url))('jsdom');
const script=await readFile(new URL('../scripts/admin-area-labels.js',import.meta.url),'utf8');
const html='<!doctype html><html><head></head><body><header class="dm-site-header"><a class="dm-brand">로고</a></header><main><div class="dm-article-heading"><h1>글 제목</h1></div><div class="dm-comments">댓글</div></main></body></html>';
const tick=()=>new Promise(resolve=>setTimeout(resolve,30));
function setup(isAdmin, saved) {
 const dom=new JSDOM(html,{url:'https://datamoney.kr/blog/example/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;let allowed=isAdmin;w.fetch=async()=>({ok:true,json:async()=>({authenticated:allowed})});
 if(saved)w.localStorage.setItem('dm-admin-section-labels',saved);
 w.HTMLElement.prototype.getBoundingClientRect=()=>({left:10,top:10,right:310,bottom:110,width:300,height:100});
 w.eval(script);return {dom,w,deny:()=>{allowed=false;}};
}
const visitor=setup(false,'on');await tick();assert.equal(visitor.w.document.getElementById('dm-admin-area-inspector'),null,'visitors cannot enable the panel with local storage');visitor.dom.window.close();
const admin=setup(true);await tick();const host=admin.w.document.getElementById('dm-admin-area-inspector');assert.ok(host,'verified administrator gets a control');
// The shadow root is deliberately closed. Capture it through a test-only wrapper below.
admin.dom.window.close();
const dom=new JSDOM(html,{url:'https://datamoney.kr/blog/example/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;let authenticated=true, captured;
const attach=w.Element.prototype.attachShadow;w.Element.prototype.attachShadow=function(init){captured=attach.call(this,init);return captured;};
w.fetch=async()=>({ok:true,json:async()=>({authenticated})});
w.HTMLElement.prototype.getBoundingClientRect=()=>({left:10,top:10,right:310,bottom:110,width:300,height:100});
w.eval(script);await tick();let button=captured.querySelector('button');assert.equal(button.getAttribute('aria-pressed'),'false');assert.equal(captured.querySelectorAll('.mark').length,0);
button.click();await tick();assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(w.localStorage.getItem('dm-admin-section-labels'),'on');
assert.ok([...captured.querySelectorAll('.badge')].some(el=>el.textContent.includes('제목 영역 · .dm-article-heading')),'labels contain meaningful names and selectors');
button.click();assert.equal(captured.querySelectorAll('.mark').length,0,'switch off clears labels');
button.click();await tick();authenticated=false;w.dispatchEvent(new w.Event('pageshow'));await tick();assert.equal(w.document.getElementById('dm-admin-area-inspector'),null,'an expired or signed-out session removes the inspector');
w.close();
const failed=new JSDOM(html,{url:'https://datamoney.kr/',runScripts:'outside-only'});failed.window.fetch=async()=>{throw new Error('offline');};failed.window.localStorage.setItem('dm-admin-section-labels','on');failed.window.eval(script);await tick();assert.equal(failed.window.document.getElementById('dm-admin-area-inspector'),null,'unavailable auth fails closed');failed.window.close();
console.log('Area labels: admin session gate, on/off, selectors, persistence and expiry passed');
