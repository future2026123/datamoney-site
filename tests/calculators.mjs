import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../workers/package.json',import.meta.url));
const {JSDOM}=require('jsdom');
async function setup(name) {
  const html=await readFile(new URL(`../tools/${name}/index.html`,import.meta.url),'utf8');
  const dom=new JSDOM(html,{url:`https://datamoney.kr/tools/${name}/`,runScripts:'outside-only'});
  const w=dom.window;w.HTMLElement.prototype.scrollIntoView=function(){};
  const source=[...w.document.querySelectorAll('script:not([src])')].map(n=>n.textContent).find(s=>s.includes('function calculate()'));
  assert.ok(source);w.eval(source);
  let rows=[];if(w.buildTable) w.buildTable=data=>{rows=data;};
  const set=(id,value)=>{w.document.getElementById(id).value=String(value);};
  return {dom,w,d:w.document,set,rows:()=>rows,calc:()=>w.calculate()};
}

const etf=await setup('etf_calculator');
for(const [id,value] of Object.entries({initial:'1000000',monthly:'0',rate:'12',years:'1',dividendYield:'6',dividendTax:'0',fee:'0',inflation:'0',drip:'yes'})) etf.set(id,value);
etf.calc();assert.equal(etf.rows()[0].total,Math.round(1000000*(1.01**12)),'reinvestment includes the entered total return');
etf.set('drip','no');etf.calc();
let value=1000000,cash=0;for(let m=0;m<12;m++){cash+=value*.06/12;value*=1+.06/12;}
assert.equal(etf.rows()[0].total,Math.round(value+cash),'unreinvested dividends stay in cash');
assert.ok(etf.rows()[0].total < Math.round(1000000*(1.01**12)));
etf.set('dividendTax','50');etf.calc();assert.ok(etf.rows()[0].total<Math.round(value+cash),'dividend tax reduces wealth');
for(const id of ['initial','monthly','rate','dividendYield','dividendTax','fee']) etf.set(id,0);
etf.calc();assert.equal(etf.rows()[0].roi,'0.0','zero principal has no NaN or Infinity');
etf.set('initial','1000000');etf.set('monthly','100000');etf.set('rate','0');etf.calc();
assert.equal(etf.rows()[0].total,2200000,'monthly contributions are added exactly once');
assert.match(etf.d.getElementById('assumptions').textContent,/2,200,000원/,'precise values remain visible alongside rounded headlines');
etf.set('targetAmount','1500000');etf.calc();assert.match(etf.d.getElementById('targetStatus').textContent,/5개월차/);
etf.set('targetAmount','3000000');etf.calc();assert.match(etf.d.getElementById('targetStatus').textContent,/도달하지 않았습니다/);
etf.set('targetAmount','');
etf.set('monthly','0');etf.set('rate','-12');etf.calc();assert.ok(etf.rows()[0].profit<0);assert.match(etf.d.getElementById('totalProfit').textContent,/^-/);
etf.set('years','51');etf.calc();assert.match(etf.d.getElementById('calcError').textContent,/1~50/);
assert.equal(etf.d.getElementById('resultCard').classList.contains('show'),false,'invalid inputs hide stale results');
etf.dom.window.close();

const div=await setup('dividend_calculator');
for(const [id,value] of Object.entries({principal:'1200000',monthlyContribution:'0',dividendYield:'12',growth:'0',years:'1',drip:'no',targetMonthly:'9000',dividendTax:'25'})) div.set(id,value);
div.calc();assert.equal(div.rows()[0].dividend,144000);assert.equal(div.rows()[0].afterTax,108000);assert.equal(div.rows()[0].monthlyDiv,9000);assert.equal(div.rows()[0].portfolio,1200000);
assert.match(div.d.getElementById('dividendSummary').textContent,/108,000원/);
assert.match(div.d.getElementById('goalBox').textContent,/1년차/);
div.set('drip','yes');div.calc();assert.equal(div.rows()[0].portfolio,Math.round(1200000*(1+.12/12*.75)**12),'only the after-tax dividend is reinvested');
div.set('drip','no');div.set('monthlyContribution','100000');div.set('dividendYield','0');div.calc();assert.equal(div.rows()[0].portfolio,2400000,'additional contributions increase the portfolio');
div.set('drip','no');div.set('dividendYield','0');div.calc();assert.match(div.d.getElementById('goalBox').textContent,/계산할 수 없습니다/);assert.doesNotMatch(div.d.getElementById('goalBox').textContent,/Infinity/);
div.set('principal','1200000');div.set('monthlyContribution','0');div.set('dividendYield','12');div.set('growth','0');div.set('years','2');div.set('dividendTax','0');div.set('drip','no');div.set('yieldMode','growth');div.set('dividendGrowth','12');div.set('divInflation','10');div.calc();
assert.ok(div.rows()[1].dividend > div.rows()[0].dividend, 'growing per-share dividends increase payout when price is unchanged');
assert.match(div.d.getElementById('dividendSummary').textContent,/물가 반영 최종 연도 세후 배당의 현재 가치/);
div.set('years','0');div.calc();assert.match(div.d.getElementById('calcError').textContent,/1~50/);
div.dom.window.close();

const tax=await setup('tax_simulator');
for(const [id,value] of Object.entries({salary:'55000000',pension:'6000000',irp:'3000000',isa:'5000000',incomeType:'employee',isaType:'general',taxAvailable:''})) tax.set(id,value);
tax.calc();assert.equal(tax.d.getElementById('totalSaving').textContent,'1,485,000원');
assert.match(tax.d.getElementById('breakdown').textContent,/297,000원/);
assert.match(tax.d.getElementById('breakdown').textContent,/473,000원/);
tax.set('isaType','eligible');tax.set('taxAvailable','500000');tax.calc();
assert.equal(tax.d.getElementById('totalSaving').textContent,'550,000원');
assert.match(tax.d.getElementById('breakdown').textContent,/99,000원/);
assert.match(tax.d.getElementById('breakdown').textContent,/671,000원/);
tax.set('incomeType','self');tax.set('salary','45000000');tax.set('taxAvailable','');tax.calc();assert.equal(tax.d.getElementById('totalSaving').textContent,'1,485,000원');
tax.set('salary','45000001');tax.calc();assert.equal(tax.d.getElementById('totalSaving').textContent,'1,188,000원');
tax.set('isa','-1000000');tax.calc();assert.match(tax.d.getElementById('breakdown').textContent,/0원/);
tax.set('salary','-1');tax.calc();assert.match(tax.d.getElementById('calcError').textContent,/0 이상/);
tax.dom.window.close();
console.log('ETF, dividend and tax calculations, assumptions and edge cases passed');
