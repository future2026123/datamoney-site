import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

class Element {
  constructor(){this.listeners={};this.children=[];this.style={};this.checked=false;this.hidden=false;this.textContent='';}
  addEventListener(name,fn){this.listeners[name]=fn;}
  async click(){return this.listeners.click?.();}
  append(item){this.children.push(item);}
  replaceChildren(){this.children=[];}
  focus(){}
  getContext(){return {fillRect(){},fillText(){},measureText(text){return {width:text.length*15};}};}
  toDataURL(){return 'data:image/png;base64,test';}
}
const elements=new Map(); const get=id=>{if(!elements.has(id)) elements.set(id,new Element());return elements.get(id);};
const calls=[];
const context={document:{getElementById:get,createElement:()=>new Element()},window:{scrollTo(){}},navigator:{},confirm:()=>true,alert(){},fetch:async (...args)=>{calls.push(args);return {ok:true};},console};
vm.runInNewContext(await readFile(new URL('../tools/investor-type/app.js',import.meta.url),'utf8'),context);
async function answer(){await get('start').click();for(let i=0;i<5;i++){assert.equal(get('choices').children.length,4);await get('choices').children[i%4].click();}assert.equal(get('consent').hidden,false);}
await answer(); await get('finish').click();
assert.equal(calls.length,0,'no submission without consent');
assert.equal(get('result').hidden,false);assert.ok(get('result-title').textContent);assert.ok(get('card-preview').src);
await get('again').click();await answer();get('agree').checked=true;await get('finish').click();
assert.equal(calls.length,1);assert.equal(JSON.parse(calls[0][1].body).consent,true);
assert.equal(Object.keys(JSON.parse(calls[0][1].body).answers).length,5);
console.log('Question flow, optional consent and result card: passed');
