import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {JSDOM}=createRequire(new URL('../workers/package.json',import.meta.url))('jsdom');
const code=await readFile(new URL('../tools/calculators.js',import.meta.url),'utf8');
async function setup(type){
 const html=await readFile(new URL(`../tools/${type}/index.html`,import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:`https://datamoney.kr/tools/${type}/`,runScripts:'outside-only'});dom.window.eval(code);
 const d=dom.window.document;return {dom,d,set:(id,v)=>{d.getElementById(id).value=String(v);},calc:()=>dom.window.dmCalculate(),text:()=>d.getElementById('resultCard').textContent};
}
for(const type of ['fixed-deposit','installment-savings','deposit-savings']){
 const x=await setup(type);x.set('rate',12);x.set('months',12);x.set('tax',0);x.set('method','simple');
 if(type!=='installment-savings')x.set('initial',1000000);
 if(type!=='fixed-deposit')x.set('monthly',100000);
 x.calc();
 if(type==='fixed-deposit')assert.match(x.text(),/1,120,000원/);
 if(type==='installment-savings')assert.match(x.text(),/1,278,000원/);
 if(type==='deposit-savings')assert.match(x.text(),/2,398,000원/);
 x.set('tax',15.4);x.calc();assert.match(x.text(),/예상 이자소득세/);
 x.set('months',0);assert.equal(x.calc(),false);assert.equal(x.d.getElementById('resultCard').hidden,true);
 x.dom.window.close();
}
const avg=await setup('average-cost');avg.set('oldPrice',10000);avg.set('oldQty',10);avg.set('newPrice',8000);avg.set('newQty',10);avg.calc();assert.match(avg.text(),/9,000원/);avg.set('oldQty',0);avg.set('newQty',0);assert.equal(avg.calc(),false);avg.dom.window.close();
const inv=await setup('investment-return');inv.set('initial',1000000);inv.set('monthly',100000);inv.set('rate',0);inv.set('years',1);inv.set('inflation',0);inv.calc();assert.match(inv.text(),/2,200,000원/);inv.dom.window.close();
const p=await setup('portfolio-builder');p.set('years',0);p.calc();assert.match(p.text(),/10,000,000원/);assert.match(p.text(),/현재 90%/);assert.match(p.text(),/주식: \+0원/);
const name=p.d.querySelector('.asset .name');name.value='<img src=x onerror=alert(1)>';name.dispatchEvent(new p.dom.window.Event('input',{bubbles:true}));p.calc();assert.match(p.text(),/<img src=x onerror=alert\(1\)>/);assert.equal(p.d.querySelector('#extra img'),null);assert.ok(p.dom.window.localStorage.getItem('dm-portfolio-builder-v1'));p.d.getElementById('reset').click();assert.equal(p.d.querySelector('.asset .name').value,'주식');p.dom.window.close();
console.log('New calculator formulas, validation, portfolio persistence and rendering passed');
