(() => {
'use strict';
const type=document.body.dataset.calculator, root=document.getElementById('calculator');
const field=(id,label,value,min,max,step='any')=>`<div class="field"><label for="${id}">${label}</label><input id="${id}" type="number" inputmode="decimal" value="${value}" min="${min}" max="${max}" step="${step}" required></div>`;
const select=(id,label,options)=>`<div class="field"><label for="${id}">${label}</label><select id="${id}">${options.map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select></div>`;
const n=id=>Number(document.getElementById(id).value);
const value=id=>document.getElementById(id).value;
const money=(x,currency='원',decimals=currency==='달러'?2:0)=>`${new Intl.NumberFormat('ko-KR',{maximumFractionDigits:decimals}).format(x)}${currency==='달러'?'달러':'원'}`;
const number=(x,places=2)=>new Intl.NumberFormat('ko-KR',{maximumFractionDigits:places}).format(x);
const row=(label,val)=>`<li><span>${label}</span><span>${val}</span></li>`;
const result=()=>`<p id="error" class="error" role="alert"></p></div><section id="resultCard" class="card result" hidden aria-live="polite"><h2>계산 결과</h2><div id="headline" class="metric"></div><ul id="breakdown" class="breakdown"></ul><div id="extra"></div></section>`;
const start=()=>'<div class="card"><h2>계산 조건</h2>';
const button=()=>'<button class="btn-calc" type="button" onclick="calculate()">계산하기</button>';
const saving=['deposit-savings','fixed-deposit','installment-savings'].includes(type);
if(saving){
 const initial=type!=='installment-savings', monthly=type!=='fixed-deposit';
 root.innerHTML=start()+'<div class="fields">'+(initial?field('initial','시작 금액 (원)',10000000,0,1e15):'')+(monthly?field('monthly','월 납입금 (원)',500000,0,1e15):'')+field('rate','연 이자율 (%)',3,0,100)+field('months','예치 기간 (개월)',12,1,600,1)+select('method','이자 방식',[['simple','단리'],['compound','월 복리']])+field('tax','이자소득세율 (%, 지방소득세 포함)',15.4,0,100)+'</div><p class="hint">월 납입금은 매월 초 납입하며 이자는 만기에 과세합니다. 월 복리는 세전 이자가 매월 원금에 더해지는 가정입니다. 실제 상품의 일수, 납입일, 우대 조건에 따라 결과가 달라질 수 있습니다.</p>'+button()+result();
} else if(type==='investment-return'){
 root.innerHTML=start()+'<div class="fields">'+field('initial','초기 투자금 (원)',10000000,0,1e15)+field('monthly','월 추가 투자금 (원)',500000,0,1e15)+field('rate','연 기대 수익률 (%)',7,-99,100)+field('years','투자 기간 (년)',20,1,50,1)+field('inflation','연 물가상승률 (%)',2,0,30)+'</div><p class="hint">매월 초 납입하고 연 수익률을 12로 나누어 매월 일정하게 적용합니다. 수익률 변동, 세금과 거래 비용은 반영하지 않은 가상 계산입니다.</p>'+button()+result();
} else if(type==='average-cost'){
 root.innerHTML=start()+'<div class="fields">'+select('currency','화폐 단위',[['원','원'],['달러','달러']])+field('oldPrice','현재 평균 단가',10000,0,1e15)+field('oldQty','현재 보유 수량',10,0,1e12)+field('newPrice','추가 매수 단가',8000,0,1e15)+field('newQty','추가 매수 수량',10,0,1e12)+'</div><p class="hint">소수점 수량도 입력할 수 있습니다. 환율 변동, 수수료와 세금은 반영하지 않습니다.</p>'+button()+result();
} else if(type==='portfolio-builder'){
 root.innerHTML=start()+'<p class="hint">자산별 현재 금액, 월 투자금, 예상 수익률과 목표 비중을 입력하세요. 내용은 이 브라우저에 저장됩니다.</p><div id="assets"></div><div class="actions"><button type="button" class="secondary" id="add">자산 추가</button><button type="button" class="secondary" id="save">파일로 저장</button><button type="button" class="secondary" id="load">파일 불러오기</button><button type="button" class="secondary" id="reset">초기화</button><input id="file" type="file" accept="application/json,.json" hidden></div><div class="fields">'+field('years','투자 기간 (년)',10,0,50,1)+field('inflation','연 물가상승률 (%)',2,0,30)+'</div><p class="hint">자산별 수익률을 매월 일정하게 적용하고 월 초에 납입합니다. 목표 비중은 현재 자산 대비 참고 금액이며, 미래 계산에 자동 리밸런싱을 적용하지 않습니다. 세금·수수료와 수익률 변동은 제외합니다.</p>'+button()+result();
}
function validate(){
 for(const el of root.querySelectorAll('input[type=number]')){
  if(el.value.trim()===''||!el.checkValidity()||!Number.isFinite(Number(el.value))){document.getElementById('error').textContent='각 항목에 표시된 범위의 숫자를 입력해 주세요.';document.getElementById('resultCard').hidden=true;el.focus();return false;}
 }
 document.getElementById('error').textContent='';return true;
}
function show(head,items,html=''){document.getElementById('headline').textContent=head;document.getElementById('breakdown').innerHTML=items;document.getElementById('extra').innerHTML=html;document.getElementById('resultCard').hidden=false;document.getElementById('resultCard').classList.add('show');}
window.dmCalculate=function(){
 if(!validate())return false;
 if(saving){
  const initial=type==='installment-savings'?0:n('initial'), monthly=type==='fixed-deposit'?0:n('monthly'), months=n('months'), rate=n('rate')/100/12, tax=n('tax')/100;
  const principal=initial+monthly*months;let gross=0;
  if(value('method')==='simple')gross=initial*rate*months+monthly*rate*months*(months+1)/2;
  else {let balance=initial;for(let i=0;i<months;i++)balance=(balance+monthly)*(1+rate);gross=balance-principal;}
  const withheld=gross*tax,net=gross-withheld;
  show(money(principal+net),row('납입 원금',money(principal))+row('세전 이자',money(gross))+row('예상 이자소득세',money(withheld))+row('세후 이자',money(net)));
 } else if(type==='investment-return'){
  const initial=n('initial'),monthly=n('monthly'),years=n('years'),rate=n('rate')/100/12,inflation=n('inflation')/100;let balance=initial,rows='';
  for(let y=1;y<=years;y++){for(let m=0;m<12;m++)balance=(balance+monthly)*(1+rate);rows+=`<tr><td>${y}년</td><td>${money(initial+monthly*y*12)}</td><td>${money(balance)}</td></tr>`;}
  const principal=initial+monthly*years*12;
  show(money(balance),row('총 투자 원금',money(principal))+row('예상 손익',money(balance-principal))+row('물가 반영 현재 가치',money(balance/Math.pow(1+inflation,years))),`<details><summary>연도별 보기</summary><div class="table-wrap"><table><thead><tr><th>기간</th><th>투자 원금</th><th>예상 자산</th></tr></thead><tbody>${rows}</tbody></table></div></details>`);
 } else if(type==='average-cost'){
  const qty=n('oldQty')+n('newQty'),amount=n('oldPrice')*n('oldQty')+n('newPrice')*n('newQty');
  if(!qty){document.getElementById('error').textContent='보유 수량 또는 추가 매수 수량을 입력해 주세요.';document.getElementById('resultCard').hidden=true;return false;}
  const cur=value('currency');show(money(amount/qty,cur,2),row('총 보유 수량',number(qty,8)+'개')+row('총 매수 금액',money(amount,cur)));
 } else if(type==='portfolio-builder'){return calculatePortfolio();}
 return true;
};
if(type!=='portfolio-builder')return;
const storeKey='dm-portfolio-builder-v1', colors=['#60a5fa','#34d399','#fbbf24','#f472b6','#a78bfa','#fb923c','#22d3ee','#a3e635'];
const defaults=[{name:'주식',amount:9000000,monthly:0,rate:7,target:90},{name:'채권',amount:1000000,monthly:0,rate:3,target:10}];
const assets=document.getElementById('assets');
function addAsset(data={name:'',amount:0,monthly:0,rate:0,target:0}){
 const wrapper=document.createElement('div');wrapper.className='asset';
 wrapper.innerHTML='<div class="asset-head"><strong>자산</strong><button type="button" class="secondary remove">삭제</button></div><div class="fields"><div class="field"><label>자산 이름<input class="name" type="text" maxlength="50" required></label></div><div class="field"><label>현재 금액 (원)<input class="amount" type="number" min="0" max="1000000000000000" step="any" required></label></div><div class="field"><label>월 투자금 (원)<input class="monthly" type="number" min="0" max="1000000000000000" step="any" required></label></div><div class="field"><label>연 예상 수익률 (%)<input class="rate" type="number" min="-99" max="100" step="any" required></label></div><div class="field"><label>목표 비중 (%)<input class="target" type="number" min="0" max="100" step="any" required></label></div></div>';
 for(const key of ['name','amount','monthly','rate','target'])wrapper.querySelector('.'+key).value=data[key]??'';
 wrapper.querySelector('.remove').addEventListener('click',()=>{wrapper.remove();persist();});assets.appendChild(wrapper);
}
function read(){return [...assets.querySelectorAll('.asset')].map(el=>Object.fromEntries(['name','amount','monthly','rate','target'].map(k=>[k,k==='name'?el.querySelector('.'+k).value:Number(el.querySelector('.'+k).value)])));}
function data(){return {version:1,assets:read(),years:n('years'),inflation:n('inflation')};}
function persist(){try{localStorage.setItem(storeKey,JSON.stringify(data()));}catch(_){document.getElementById('error').textContent='브라우저에 자동 저장할 수 없습니다. 파일로 저장해 주세요.';}}
function validData(x){return x&&x.version===1&&Array.isArray(x.assets)&&x.assets.length>0&&x.assets.length<=20&&Number.isInteger(x.years)&&x.years>=0&&x.years<=50&&Number.isFinite(x.inflation)&&x.inflation>=0&&x.inflation<=30&&x.assets.every(a=>a&&typeof a.name==='string'&&a.name.length<=50&&['amount','monthly','rate','target'].every(k=>typeof a[k]==='number'&&Number.isFinite(a[k]))&&a.amount>=0&&a.amount<=1e15&&a.monthly>=0&&a.monthly<=1e15&&a.rate>=-99&&a.rate<=100&&a.target>=0&&a.target<=100);}
function restore(x){assets.replaceChildren();x.assets.forEach(addAsset);document.getElementById('years').value=x.years;document.getElementById('inflation').value=x.inflation;}
try{const x=JSON.parse(localStorage.getItem(storeKey));if(validData(x))restore(x);else defaults.forEach(addAsset);}catch(_){defaults.forEach(addAsset);}
root.addEventListener('input',persist);
document.getElementById('add').onclick=()=>{if(assets.children.length>=20){document.getElementById('error').textContent='자산은 최대 20개까지 추가할 수 있습니다.';return;}addAsset();persist();};
document.getElementById('reset').onclick=()=>{restore({assets:defaults,years:10,inflation:2});document.getElementById('resultCard').hidden=true;document.getElementById('error').textContent='';persist();};
document.getElementById('save').onclick=()=>{const blob=new Blob([JSON.stringify(data(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='datamoney-portfolio.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.getElementById('load').onclick=()=>document.getElementById('file').click();
document.getElementById('file').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>100000)throw Error();const d=JSON.parse(await file.text());if(!validData(d))throw Error();restore(d);persist();document.getElementById('resultCard').hidden=true;document.getElementById('error').textContent='';}catch(_){document.getElementById('error').textContent='올바른 데이터머니 포트폴리오 파일을 선택해 주세요.';}finally{e.target.value='';}};
function calculatePortfolio(){
 const list=read(),years=n('years'),inflation=n('inflation');if(!list.length||list.some(a=>!a.name.trim())){document.getElementById('error').textContent='자산을 추가하고 각 자산의 이름을 입력해 주세요.';document.getElementById('resultCard').hidden=true;return false;}
 const total=list.reduce((s,a)=>s+a.amount,0),targets=list.reduce((s,a)=>s+a.target,0);let future=0,principal=0;
 const projected=list.map(a=>{let b=a.amount;for(let m=0;m<years*12;m++)b=(b+a.monthly)*(1+a.rate/1200);future+=b;principal+=a.amount+a.monthly*years*12;return b;});
 show(money(future),row('현재 자산',money(total))+row('총 투자 원금',money(principal))+row('예상 손익',money(future-principal))+row('물가 반영 현재 가치',money(future/Math.pow(1+inflation/100,years))));
 const extra=document.getElementById('extra'),heading=document.createElement('h2');heading.textContent='자산별 비중과 예상 금액';heading.style.marginTop='24px';extra.appendChild(heading);
 const bar=document.createElement('div');bar.className='ratio';extra.appendChild(bar);
 list.forEach((a,i)=>{const share=total?a.amount/total*100:0;const part=document.createElement('span');part.style.width=share+'%';part.style.background=colors[i%colors.length];bar.appendChild(part);const line=document.createElement('div');line.className='portfolio-row';const name=document.createElement('span');name.textContent=a.name;const ratio=document.createElement('span');ratio.textContent='현재 '+number(share)+'%';const futureValue=document.createElement('span');futureValue.textContent=money(projected[i]);line.append(name,ratio,futureValue);extra.appendChild(line);});
 const msg=document.createElement('p');msg.className='hint';msg.style.color='#cbd5e1';msg.textContent=Math.abs(targets-100)>.001?'목표 비중 합계가 '+number(targets)+'%입니다. 100%로 맞추면 자산별 조정 참고 금액을 확인할 수 있습니다.':'목표 비중에 맞추려면 현재 총액 기준으로 아래 금액을 조정합니다. 매매 시 세금과 비용은 별도입니다.';extra.appendChild(msg);
 if(Math.abs(targets-100)<=.001)list.forEach(a=>{const p=document.createElement('p');p.style.fontSize='13px';p.textContent=a.name+': '+(total*a.target/100-a.amount>=0?'+':'')+money(total*a.target/100-a.amount);extra.appendChild(p);});persist();return true;
}
})();
