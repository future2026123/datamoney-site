import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {investorReports} from '../workers/investor-reports.js';

const require = createRequire(new URL('../workers/package.json', import.meta.url));
const {JSDOM} = require('jsdom');
const html = await readFile(new URL('../account/result/index.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../account/result/result.js', import.meta.url), 'utf8');
const expected = ['존버형','짠테크형','촉형','포모형','알빠롱형','뇌지컬형','줍줍형','야수형'];
const titles = new Set();
for (let code=0; code<8; code++) {
  const dom = new JSDOM(html, {url:'https://datamoney.kr/account/result/', runScripts:'outside-only'});
  const w=dom.window;
  w.sessionStorage.setItem('dm-investor-result-token', 'a'.repeat(64));
  w.fetch=async (url, options)=>{
    assert.equal(url,'/api/article-engagement/_email/open');
    assert.equal(JSON.parse(options.body).token,'a'.repeat(64));
    return {ok:true,json:async()=>({result:{typeCode:code,anxiety:2,reaction:1,tipCode:2,createdAt:Date.now()},report:investorReports[code],subscriptions:{testNews:false,monthlyReport:false}})};
  };
  let printed=false;w.print=()=>{printed=true;};
  w.eval(script);w.document.getElementById('open').click();
  await new Promise(resolve=>setTimeout(resolve,0));
  const doc=w.document;
  assert.equal(doc.getElementById('saved').hidden,false);
  assert.equal(doc.getElementById('saved-name').textContent,expected[code]);
  assert.equal(doc.getElementById('report-title').textContent,expected[code]);
  assert.ok(!doc.getElementById('saved-tag').textContent.includes(expected[code]),'the type should not be repeated in the tagline');
  titles.add(doc.getElementById('report-title').textContent);
  for(const id of ['pattern','strength','blind','scenario','mood']) assert.ok(doc.getElementById('report-'+id).textContent.length>30,id);
  assert.equal(doc.querySelectorAll('#report-questions li').length,3);
  assert.equal(doc.querySelectorAll('#report-steps li').length,3);
  assert.match(doc.getElementById('report-mood').textContent,/자주 걱정됨/);
  doc.getElementById('print-report').click();assert.equal(printed,true);
  w.close();
}
assert.equal(titles.size,8);
console.log('All eight personalized reports, email access and print action passed');
