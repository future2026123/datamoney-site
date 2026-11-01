import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../scripts/admin-footer-login.js',import.meta.url),'utf8');
function setup(value='© 2026 데이터머니 · datamoney.kr') {
  let now=0,handler,updated,navigations=[];
  const original={nodeType:3,data:value,replaceWith(...nodes){updated=nodes;}};
  const button={style:{},setAttribute(name,value){this[name]=value;},addEventListener(name,fn){assert.equal(name,'click');handler=fn;}};
  const footer={childNodes:[original]};
  const document={querySelector(){return footer;},createElement(){return button;},createTextNode(data){return {data};}};
  vm.runInNewContext(source,{document,Node:{TEXT_NODE:3},performance:{now:()=>now},location:{assign:path=>navigations.push(path)}});
  const click=(t,extra={})=>{now=t;handler({button:0,...extra});};
  return {button,updated,navigations,click};
}
let x=setup();assert.equal(x.updated.map(n=>n.textContent??n.data).join(''),'© 2026 데이터머니 · datamoney.kr');
assert.equal(x.button['aria-label'],'관리자 로그인: 두 번 누르기');
x.click(100);assert.deepEqual(x.navigations,[],'one click does not navigate');x.click(700);assert.deepEqual(x.navigations,['/comment-admin/'],'two clicks open the admin page');
x=setup();x.click(100);x.click(1700);assert.deepEqual(x.navigations,[],'a slow second click starts a new sequence');x.click(1800);assert.deepEqual(x.navigations,['/comment-admin/']);
x=setup();x.click(100,{ctrlKey:true});x.click(200);assert.deepEqual(x.navigations,[],'modified clicks are ignored');
for(const file of ['../index.html','../blog/index.html']) assert.match(await readFile(new URL(file,import.meta.url),'utf8'),/admin-footer-login\.js/);
console.log('Admin footer entry: two clicks, slow clicks, modified clicks and visible copyright passed');
