import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

class Element {
  constructor(){this.listeners={};this.children=[];this.style={};this.checked=false;this.hidden=false;this.textContent='';this.complete=true;this.naturalWidth=1448;this.attributes={};}
  addEventListener(name,fn){this.listeners[name]=fn;}
  async click(){return this.listeners.click?.();}
  append(item){this.children.push(item);}
  replaceChildren(){this.children=[];}
  focus(){}
  setAttribute(name,value){this.attributes[name]=value;}
}
const elements=new Map(); const get=id=>{if(!elements.has(id)) elements.set(id,new Element());return elements.get(id);};
const calls=[],anchors=[];
const storage=new Map();const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
class TestFile {constructor(parts,name,options){this.parts=parts;this.name=name;this.type=options.type;}}
const context={document:{getElementById:get,createElement:tag=>{const e=new Element();if(tag==='a')anchors.push(e);return e;}},window:{scrollTo(){}},navigator:{},File:TestFile,localStorage,confirm:()=>true,alert(){},fetch:async (...args)=>{calls.push(args);return {ok:true,blob:async()=>({image:args[0]})};},console};
vm.runInNewContext(await readFile(new URL('../tools/investor-type/app.js',import.meta.url),'utf8'),context);
async function answer(values=[0,0,0,0,0,0,0,0]){await get('start').click();for(let i=0;i<8;i++){assert.equal(get('choices').children.length,i<3?2:4);await get('choices').children[values[i]].click();}await new Promise(resolve=>setTimeout(resolve,0));}
await answer();
assert.equal(calls.length,1);assert.equal(calls[0][0],'/api/article-engagement/_survey-aggregate');assert.equal(calls[0][1].credentials,'omit');
assert.equal(get('result').hidden,false);assert.ok(get('result-title').textContent);assert.ok(get('card-preview').src);
const baselineTitle=get('result-title').textContent;
const baselineCard=get('card-preview').src;
await get('again').click();await answer([0,0,0,3,3,3,3,3]);
assert.equal(calls.length,1,'same browser does not submit again on the same day');
assert.equal(get('result-title').textContent,baselineTitle,'current mood must not change the personality type');
assert.equal(get('anxiety-result').textContent,'일상에 영향');assert.equal(get('sell-result').textContent,'당장 팔고 싶음');
assert.equal(get('card-preview').src,baselineCard,'current mood must not change the shared card');
// Each code must match the animal and type printed on the supplied image.
const expected=[['차근차근 거북이','존버형',[721,0,360,525]],['꼼꼼한 다람쥐','짠테크형',[0,525,380,561]],['감각적인 고양이','촉형',[1090,525,358,561]],['귀 쫑긋 토끼','포모형',[380,525,348,561]],['소신 있는 늑대','알빠롱형',[728,525,377,561]],['살펴보는 부엉이','뇌지컬형',[374,0,347,525]],['눈치 빠른 여우','줍줍형',[1081,0,367,525]],['도전하는 사자','야수형',[0,0,374,525]]];
const types=new Set();
for(let code=0;code<8;code++){
  await get('again').click();await answer([code>>2,(code>>1)&1,code&1,0,0,0,0,0]);
  const title=get('result-title').textContent, label=get('tagline').textContent;
  types.add(title);assert.equal(title,expected[code][0]);assert.ok(label.startsWith(expected[code][1]+' · '));
  assert.equal(get('card-preview').src,`/tools/investor-type/result-cards/20261101/${code}.png`);
  const bounds=get('character-image').attributes.viewBox.split(' ').map(Number);
  assert.deepEqual(bounds,expected[code][2]);
  assert.ok(get('character-clip').attributes.d.startsWith('M')&&get('character-clip').attributes.d.endsWith(' Z'));
  assert.ok(bounds[0]>=0&&bounds[1]>=0&&bounds[2]>0&&bounds[3]>0&&bounds[0]+bounds[2]<=1448&&bounds[1]+bounds[3]<=1086);
}
assert.equal(types.size,8);
storage.clear();await get('again').click();await answer([1,0,1,2,1,0,3,1]);
assert.equal(calls.length,2);assert.deepEqual(JSON.parse(calls[1][1].body).baseline,[1,0,1]);
assert.equal(Object.keys(JSON.parse(calls[1][1].body).answers).length,5);
let shared=null;
context.navigator.canShare=()=>true;context.navigator.share=async data=>{shared=data;};
await get('share').click();
assert.equal(calls.at(-1)[0],get('card-preview').src,'sharing must fetch the displayed result image');
assert.equal(shared.files[0].name,'datamoney-result.png');
assert.equal(shared.files[0].parts[0].image,get('card-preview').src);
await get('save').click();
assert.equal(anchors.at(-1).href,get('card-preview').src,'download must use the same result image');
console.log('Eight types, mood independence, daily submission and share privacy: passed');
