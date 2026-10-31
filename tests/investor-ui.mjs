import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

class Element {
  constructor(){this.listeners={};this.children=[];this.style={};this.checked=false;this.hidden=false;this.textContent='';this.complete=true;this.naturalWidth=1536;this.attributes={};}
  addEventListener(name,fn){this.listeners[name]=fn;}
  async click(){return this.listeners.click?.();}
  append(item){this.children.push(item);}
  replaceChildren(){this.children=[];}
  focus(){}
  setAttribute(name,value){this.attributes[name]=value;}
  getContext(){return {fillRect(){},fillText(text){drawn.push(text);},drawImage(){},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},closePath(){},measureText(text){return {width:text.length*15};}};}
  toDataURL(){return 'data:image/png;base64,test';}
}
const elements=new Map(); const get=id=>{if(!elements.has(id)) elements.set(id,new Element());return elements.get(id);};
const calls=[],drawn=[];
const storage=new Map();const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
const context={document:{getElementById:get,createElement:()=>new Element()},window:{scrollTo(){}},navigator:{},localStorage,confirm:()=>true,alert(){},fetch:async (...args)=>{calls.push(args);return {ok:true};},console};
vm.runInNewContext(await readFile(new URL('../tools/investor-type/app.js',import.meta.url),'utf8'),context);
async function answer(values=[0,0,0,0,0,0,0,0]){await get('start').click();for(let i=0;i<8;i++){assert.equal(get('choices').children.length,i<3?2:4);await get('choices').children[values[i]].click();}await new Promise(resolve=>setTimeout(resolve,0));}
await answer();
assert.equal(calls.length,1);assert.equal(calls[0][0],'/api/article-engagement/_survey-aggregate');assert.equal(calls[0][1].credentials,'omit');
assert.equal(get('result').hidden,false);assert.ok(get('result-title').textContent);assert.ok(get('card-preview').src);
const baselineTitle=get('result-title').textContent;
await get('again').click();await answer([0,0,0,3,3,3,3,3]);
assert.equal(calls.length,1,'same browser does not submit again on the same day');
assert.equal(get('result-title').textContent,baselineTitle,'current mood must not change the personality type');
assert.equal(get('anxiety-result').textContent,'일상에 영향');assert.equal(get('sell-result').textContent,'당장 팔고 싶음');
assert.ok(!drawn.includes('일상에 영향')&&!drawn.includes('당장 팔고 싶음'),'private mood must not appear on share card');
// Each code must match the animal and type printed on the supplied image.
const expected=[['차근차근 거북이','안정형'],['꼼꼼한 다람쥐','절약형'],['감각적인 고양이','감각형'],['귀 쫑긋 토끼','추격형'],['소신 있는 늑대','독립형'],['살펴보는 부엉이','분석형'],['눈치 빠른 여우','기회형'],['도전하는 사자','도전형']];
const types=new Set();
for(let code=0;code<8;code++){
  await get('again').click();await answer([code>>2,(code>>1)&1,code&1,0,0,0,0,0]);
  const title=get('result-title').textContent, label=get('tagline').textContent;
  types.add(title);assert.equal(title,expected[code][0]);assert.ok(label.startsWith(expected[code][1]+' · '));
  const bounds=get('character-image').attributes.viewBox.split(' ').map(Number);
  assert.equal(bounds.length,4);assert.ok(bounds.every(Number.isFinite));
  assert.ok(bounds[0]>=0&&bounds[1]>=0&&bounds[2]>0&&bounds[3]>0&&bounds[0]+bounds[2]<=1536&&bounds[1]+bounds[3]<=1024);
}
assert.equal(types.size,8);
storage.clear();await get('again').click();await answer([1,0,1,2,1,0,3,1]);
assert.equal(calls.length,2);assert.deepEqual(JSON.parse(calls[1][1].body).baseline,[1,0,1]);
assert.equal(Object.keys(JSON.parse(calls[1][1].body).answers).length,5);
console.log('Eight types, mood independence, daily submission and share privacy: passed');
