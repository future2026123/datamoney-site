(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const questions = [
    {key:'loss', title:'요즘 내 계좌의 날씨는?', hint:'최근 투자 손익을 떠올려 주세요.', choices:['맑음! 수익 중이거나 본전이에요','구름 조금, 1~10% 손실이에요','흐림, 10~30% 손실이에요','비바람, 30% 넘게 손실이에요']},
    {key:'anxiety', title:'투자 생각은 하루에 얼마나 날까요?', hint:'가장 가까운 모습을 골라 주세요.', choices:['거의 신경 쓰지 않아요','가끔 계좌가 생각나요','자주 확인하고 걱정해요','일상에 영향을 줄 만큼 불안해요']},
    {key:'horizon', title:'투자한 돈이 필요한 때는?', hint:'투자금의 쓰임을 생각해 보세요.', choices:['5년 이상은 쓸 일이 없어요','1~5년 안에는 필요할 수 있어요','1년 안에 필요해요','이미 생활비와 연결돼 있어요']},
    {key:'reaction', title:'시장이 크게 떨어진 날, 나는?', hint:'지금의 내 모습과 가까운 답을 골라 주세요.', choices:['미리 세운 계획부터 확인해요','일단 지켜보며 기다려요','팔까, 더 살까 계속 고민해요','만회하려고 더 큰 위험을 감수하고 싶어요']},
    {key:'buffer', title:'갑작스러운 지출이 생긴다면?', hint:'투자금과 별개인 비상생활비를 생각해 보세요.', choices:['6개월 이상 버틸 여유가 있어요','3~6개월 정도 버틸 수 있어요','1~3개월 정도 버틸 수 있어요','한 달도 버티기 어려울 것 같아요']}
  ];
  const types = [
    {symbol:'🧭', title:'기준을 지키는 나침반', tagline:'흔들려도 먼저 지도를 펼치는 편', description:'시장 소음보다 내가 정한 방향을 살펴보는 당신. 지금의 여유를 지키면서 계획을 주기적으로 점검해 보세요.', strength:'순간의 움직임보다 투자 목적과 원칙을 떠올릴 수 있어요.', caution:'계획이 있다는 이유로 생활 상황이 바뀐 신호를 지나치지 않는지 살펴보세요.'},
    {symbol:'⚖️', title:'균형을 찾는 조율가', tagline:'기회도 안정도 놓치고 싶지 않은 편', description:'투자와 일상 사이의 균형을 고민하는 당신. 내게 편안한 위험의 크기를 정해두면 선택이 더 쉬워질 수 있어요.', strength:'수익 가능성과 생활의 안정을 함께 고려하려고 해요.', caution:'모든 선택지를 오래 비교하다 내 기준을 정하는 순간을 놓칠 수 있어요.'},
    {symbol:'🔭', title:'변화를 읽는 관찰자', tagline:'남들보다 시장의 움직임이 먼저 눈에 띄는 편', description:'작은 변화도 놓치지 않는 당신. 빠른 반응이 꼭 빠른 결정일 필요는 없어요. 확인하는 때와 결정하는 때를 나눠 보세요.', strength:'시장이나 계좌에서 달라진 점을 빠르게 알아차려요.', caution:'잦은 확인이 불안을 키우거나 계획 밖의 거래로 이어지지 않는지 살펴보세요.'},
    {symbol:'🌱', title:'회복을 준비하는 정원사', tagline:'지금 필요한 건 서두르기보다 숨 고르기', description:'여러 걱정이 한꺼번에 찾아온 시기일 수 있어요. 당장의 수익보다 생활과 선택의 여유를 차근차근 살펴보세요.', strength:'지금의 상황을 직면하고 다시 기준을 세울 기회를 만들고 있어요.', caution:'손실을 빨리 만회해야 한다는 마음이 더 큰 위험으로 이어지지 않도록 주의해요.'}
  ];
  const answers = {}; let step = 0, result = null, consented = false, finishing = false;
  const screens = ['intro','quiz','result'];
  const show = id => { screens.forEach(name => { $(name).hidden = name !== id; }); window.scrollTo(0,0); };
  function renderQuestion() {
    const q = questions[step]; $('step').textContent = `${step+1} / ${questions.length}`;
    $('progress-bar').style.width = `${(step+1)/questions.length*100}%`;
    $('back').hidden = step === 0; $('question-title').textContent = q.title; $('question-hint').textContent = q.hint;
    const box = $('choices'); box.replaceChildren();
    q.choices.forEach((text, value) => { const b = document.createElement('button'); b.className='choice'; b.type='button'; b.textContent=text; b.addEventListener('click', () => { if (finishing) return; answers[q.key]=value; if (++step < questions.length) renderQuestion(); else finish(); }); box.append(b); });
    $('question-title').focus();
  }
  $('start').addEventListener('click', () => { consented=$('agree').checked; step=0; show('quiz'); renderQuestion(); });
  $('back').addEventListener('click', () => { if (step>0) {step--; renderQuestion();} });
  function tip() {
    if (answers.horizon >= 2) return '가까운 시기에 써야 할 돈이 시장 변동에 얼마나 노출돼 있는지 확인해 보세요.';
    if (answers.buffer >= 2) return '예상치 못한 지출에 대비할 생활비 여유가 충분한지 먼저 점검해 보세요.';
    if (answers.anxiety >= 2) return '계좌를 확인하는 시간을 정하고, 거래 판단은 그다음에 해 보세요.';
    if (answers.reaction >= 2) return '매수와 매도를 고민하기 전에 내가 정한 조건을 글로 적어 보세요.';
    if (answers.loss >= 2) return '손실을 만회할 방법보다 돈의 목적과 감당 가능한 위험부터 다시 살펴보세요.';
    return '투자 목적과 생활비 여유를 정기적으로 확인할 날짜를 정해 보세요.';
  }
  function drawCard() {
    const c=$('canvas'), x=c.getContext('2d'); x.fillStyle='#f4f7fc'; x.fillRect(0,0,c.width,c.height);
    x.fillStyle='#305cdb'; x.fillRect(0,0,1080,24); x.font='bold 42px sans-serif'; x.fillText('데이터머니',80,120);
    x.fillStyle='#dfeeff'; x.beginPath(); x.arc(855,325,150,0,Math.PI*2); x.fill();
    x.fillStyle='#305cdb'; x.beginPath(); x.moveTo(855,208); x.lineTo(895,322); x.lineTo(855,442); x.lineTo(815,330); x.closePath(); x.fill();
    x.fillStyle='#586b83'; x.font='34px sans-serif'; x.fillText('나의 투자 유형은',80,280);
    x.fillStyle='#14233c'; x.font='bold 64px sans-serif'; x.fillText(result.title,80,405,740);
    x.fillStyle='#305cdb'; x.font='bold 38px sans-serif'; x.fillText(result.tagline,80,505,900);
    x.fillStyle='#425f80'; x.font='34px sans-serif'; let line='', y=690;
    for (const word of result.description.split(' ')) { const next=line+word+' '; if (x.measureText(next).width>900 && line) {x.fillText(line,80,y); y+=58; line='';} line+=word+' '; } if(line) x.fillText(line,80,y);
    x.fillStyle='#ccd9e9'; x.fillRect(80,1080,920,3); x.fillStyle='#526782'; x.font='32px sans-serif'; x.fillText('나의 투자 유형 알아보기',80,1160); x.fillText('datamoney.kr/tools/investor-type/',80,1230);
    $('card-preview').src=c.toDataURL('image/png');
  }
  async function finish() {
    finishing=true; $('quiz-status').textContent='결과를 준비하고 있어요.'; let message='';
    if (consented) {
      try { const response=await fetch('/api/article-engagement/_survey',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({consent:true,answers})}); if(!response.ok) throw new Error(); message='응답을 지표 연구에 전달했어요. 같은 브라우저의 같은 날 첫 응답만 반영됩니다.'; }
      catch (_) { message='응답을 저장하지 못했어요. 결과는 아래에서 확인할 수 있습니다.'; }
    }
    const score=Object.values(answers).reduce((sum,value)=>sum+value,0); result=types[score<=2?0:score<=5?1:score<=9?2:3];
    $('symbol').textContent=result.symbol; $('result-title').textContent=result.title; $('tagline').textContent=result.tagline; $('description').textContent=result.description; $('strength').textContent=result.strength; $('caution').textContent=result.caution; $('tip').textContent=tip(); $('notice').textContent=message;
    show('result'); drawCard(); $('result-title').focus(); finishing=false; $('quiz-status').textContent='';
  }
  $('save').addEventListener('click', () => {const a=document.createElement('a'); a.href=$('canvas').toDataURL('image/png'); a.download='datamoney-investor-type.png'; a.click();});
  $('share').addEventListener('click', async () => {
    const data={title:'나의 투자 유형 테스트',text:`나는 ${result.title}! 당신은 어떤 투자자일까요?`,url:'https://datamoney.kr/tools/investor-type/'};
    try { if(navigator.share) { const blob=await new Promise(resolve=>$('canvas').toBlob(resolve,'image/png')); const file=blob && new File([blob],'datamoney-result.png',{type:'image/png'}); if(file && navigator.canShare?.({files:[file]})) data.files=[file]; await navigator.share(data); } else {await navigator.clipboard.writeText(`${data.text} ${data.url}`); $('notice').textContent='테스트 링크를 복사했어요. 친구에게 보내 보세요.';} }
    catch (error) { if(error.name!=='AbortError') $('notice').textContent=`주소를 복사해 공유해 주세요: ${data.url}`; }
  });
  $('again').addEventListener('click', () => {step=0; $('agree').checked=false; show('intro'); $('start').focus();});
  $('delete-data').addEventListener('click', async () => {if(!confirm('이 브라우저로 보낸 투자 유형 응답을 모두 삭제할까요?')) return; try {const r=await fetch('/api/article-engagement/_survey',{method:'DELETE',credentials:'same-origin'}); if(!r.ok) throw new Error(); alert('이 브라우저의 응답을 삭제했습니다.');} catch (_) {alert('삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');}});
})();
