(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const questions = [
    {key:'risk',phase:'평소 투자 성향',title:'평소 투자 기회를 고를 때 나는?',hint:'요즘의 시장 상황보다 평소에 가까운 쪽을 골라 주세요.',choices:['큰 변동을 피하고 안정감을 먼저 살펴요','변동이 있더라도 새로운 기회를 살펴봐요']},
    {key:'approach',phase:'평소 투자 성향',title:'평소 결정을 내리는 나만의 방식은?',hint:'어느 쪽이 더 편한가요?',choices:['자료를 모으고 비교하며 기준을 정해요','큰 흐름을 보고 내 감각을 믿는 편이에요']},
    {key:'social',phase:'평소 투자 성향',title:'투자 아이디어를 확인할 때 나는?',hint:'자주 하는 행동에 가까운 답을 골라 주세요.',choices:['혼자 생각을 정리하고 결정하는 편이에요','다른 사람의 생각도 함께 듣는 편이에요']},
    {key:'loss',phase:'지금의 투자 심리',title:'최근 내 계좌의 상태는?',hint:'투자금이 아닌 대략적인 손익률만 선택해 주세요.',choices:['수익 중이거나 본전이에요','1~10% 손실이에요','10~30% 손실이에요','30%보다 큰 손실이에요']},
    {key:'anxiety',phase:'지금의 투자 심리',title:'요즘 투자 때문에 얼마나 불안한가요?',hint:'최근의 마음과 가까운 답을 골라 주세요.',choices:['거의 불안하지 않아요','가끔 신경 쓰여요','자주 걱정하고 확인해요','일상에 영향을 줄 만큼 불안해요']},
    {key:'horizon',phase:'지금의 투자 심리',title:'투자한 돈이 필요한 때는?',hint:'현재 투자금의 쓰임을 생각해 보세요.',choices:['5년 이상은 쓸 일이 없어요','1~5년 안에는 필요할 수 있어요','1년 안에 필요해요','이미 생활비와 연결돼 있어요']},
    {key:'reaction',phase:'지금의 투자 심리',title:'최근 투자를 팔고 싶다는 생각은?',hint:'지금 느끼는 매도 충동을 골라 주세요.',choices:['거의 들지 않아요','가끔 들어요','자주 들어요','당장 팔고 싶다는 생각이 강해요']},
    {key:'buffer',phase:'지금의 투자 심리',title:'갑작스러운 지출이 생긴다면?',hint:'투자금과 별개인 비상생활비를 생각해 보세요.',choices:['6개월 이상 버틸 여유가 있어요','3~6개월 정도 버틸 수 있어요','1~3개월 정도 버틸 수 있어요','한 달도 버티기 어려울 것 같아요']}
  ];
  // The three baseline choices encode risk, approach and social preference, in that order.
  // Bounds include each animal and its matching label on the supplied, unmodified 1448×1086 sheet.
  const types = [
    {name:'존버형',art:[721,0,360,525],tag:'내 속도대로 오래 살펴보는 편',description:'흔들리는 순간에도 속도를 조절하며 스스로 세운 기준을 살펴보려 해요.',strength:'변동이 있어도 차분하게 자료와 계획을 확인할 수 있어요.',caution:'기다리는 동안에도 처음 세운 조건이 여전히 맞는지 확인해 보세요.'},
    {name:'짠테크형',art:[0,525,380,561],tag:'여유를 챙기고 의견도 들어보는 편',description:'한 번에 큰 위험을 지기보다 준비하고 비교하며 마음의 여유를 확보하려 해요.',strength:'현금 여유와 위험을 살피고 다른 사람의 시각도 참고해요.',caution:'다른 사람의 안정 기준이 내 상황과 같은지 생각해 보세요.'},
    {name:'촉형',art:[1090,525,358,561],clip:[[1105,525],[1448,525],[1448,1086],[1090,1086],[1090,900],[1105,900]],tag:'내 감각과 편안함을 중요하게 생각하는 편',description:'스스로 느끼는 흐름과 마음의 안정감을 바탕으로 선택하려 해요.',strength:'주변의 소음에 휩쓸리기보다 내 느낌을 살펴볼 수 있어요.',caution:'직감으로 떠오른 생각도 거래 전 자료와 함께 확인해 보세요.'},
    {name:'포모형',art:[380,525,348,561],tag:'사람들의 이야기에 귀가 먼저 가는 편',description:'시장 소식과 주변 반응을 빠르게 알아차리고, 그 속에서 내 선택을 고민해요.',strength:'새로운 이야기와 시장 분위기를 빠르게 접할 수 있어요.',caution:'많이 들리는 이야기와 내게 필요한 결정이 같은지는 따로 살펴보세요.'},
    {name:'알빠롱형',art:[728,525,377,561],clip:[[728,525],[1105,525],[1105,900],[1090,900],[1090,1086],[728,1086]],tag:'내가 납득한 기회를 직접 고르는 편',description:'새로운 기회도 살펴보되, 스스로 분석하고 판단하려는 모습이 보여요.',strength:'남의 결론을 그대로 따르기보다 내 기준을 세우려 해요.',caution:'확신이 생긴 뒤에도 반대 근거를 한 번 더 찾아보세요.'},
    {name:'뇌지컬형',art:[374,0,347,525],tag:'기회를 찾아 자료와 의견을 모으는 편',description:'가능성을 살피면서 숫자와 다양한 의견을 함께 비교하려 해요.',strength:'결정을 내리기 전에 여러 자료와 관점을 살펴볼 수 있어요.',caution:'정보가 많아도 내 목적에 필요한 기준은 따로 정해 두세요.'},
    {name:'줍줍형',art:[1081,0,367,525],tag:'흐름 속에서 가능성을 먼저 보는 편',description:'변화가 생기면 나만의 감각으로 기회를 찾아보려는 모습이 보여요.',strength:'새로운 상황에서 선택지를 빠르게 발견할 수 있어요.',caution:'기회가 매력적으로 보여도 손실 가능성과 자금 계획을 확인해요.'},
    {name:'야수형',art:[0,0,374,525],tag:'새로운 기회를 보면 마음이 움직이는 편',description:'시장 변화와 사람들의 이야기에 관심을 가지며 기회를 적극적으로 살펴봐요.',strength:'새로운 가능성을 열린 마음으로 탐색할 수 있어요.',caution:'주변 분위기가 뜨거울수록 감당 가능한 위험을 먼저 정해 보세요.'}
  ];
  const answers={}; let step=0,result=null,resultCode=null,finishing=false;
  const cardPath=code=>`/tools/investor-type/result-cards/20261101-types/${code}.png`;
  const artOutline = type => {
    if (type.clip) return type.clip;
    const [x,y,w,h]=type.art;
    return [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  };
  const screens=['intro','quiz','result'];
  const show=id=>{screens.forEach(name=>{$(name).hidden=name!==id;});window.scrollTo(0,0);};
  function renderQuestion(){
    const q=questions[step]; $('step').textContent=`${step+1} / ${questions.length}`; $('phase').textContent=q.phase;
    $('progress-bar').style.width=`${(step+1)/questions.length*100}%`;
    $('back').hidden=step===0; $('question-title').textContent=q.title; $('question-hint').textContent=q.hint;
    const box=$('choices');box.replaceChildren();
    q.choices.forEach((label,value)=>{const b=document.createElement('button');b.className='choice';b.type='button';b.textContent=label;b.addEventListener('click',()=>{if(finishing)return;answers[q.key]=value;if(++step<questions.length)renderQuestion();else finish();});box.append(b);});
    $('question-title').focus();
  }
  $('start').addEventListener('click',()=>{step=0;show('quiz');renderQuestion();});
  $('back').addEventListener('click',()=>{if(!finishing&&step>0){step--;renderQuestion();}});
  function tip(){
    if(answers.horizon>=2)return '가까운 시기에 써야 할 돈이 시장 변동에 얼마나 노출돼 있는지 확인해 보세요.';
    if(answers.buffer>=2)return '예상치 못한 지출에 대비할 생활비 여유가 충분한지 먼저 점검해 보세요.';
    if(answers.anxiety>=2)return '계좌를 확인하는 시간을 정하고, 거래 판단은 그다음에 해 보세요.';
    if(answers.reaction>=2)return '매도 여부를 결정하기 전에 처음 정한 투자 목적과 조건을 다시 확인해 보세요.';
    if(answers.loss>=2)return '손실을 만회할 방법보다 돈의 목적과 감당 가능한 위험부터 다시 살펴보세요.';
    return '투자 목적과 생활비 여유를 정기적으로 확인할 날짜를 정해 보세요.';
  }
  function finish(){
    finishing=true;$('quiz-status').textContent='결과를 준비하고 있어요.';let message='';
    const baseline=[answers.risk,answers.approach,answers.social];
    const day=new Date(Date.now()+9*3600000).toISOString().slice(0,10), key='dm_survey_aggregate_day';
    let alreadySent=false;try{alreadySent=localStorage.getItem(key)===day;}catch(_){}
    if(!alreadySent){
      const current=Object.fromEntries(['loss','anxiety','horizon','reaction','buffer'].map(key=>[key,answers[key]]));
      fetch('/api/article-engagement/_survey-aggregate',{method:'POST',credentials:'omit',headers:{'content-type':'application/json'},body:JSON.stringify({baseline,answers:current})}).then(response=>{if(response.ok)try{localStorage.setItem(key,day);}catch(_){}}).catch(()=>{});
    }
    resultCode=4*baseline[0]+2*baseline[1]+baseline[2];result=types[resultCode];
    $('character-image').setAttribute('viewBox',result.art.join(' '));$('character-image').setAttribute('aria-label',result.name);
    $('character-clip').setAttribute('d',artOutline(result).map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join(' ')+' Z');
    $('result-title').textContent=result.name;$('tagline').textContent=result.tag;$('description').textContent=result.description;$('strength').textContent=result.strength;$('caution').textContent=result.caution;$('tip').textContent=tip();
    $('anxiety-result').textContent=['거의 없음','가끔 신경 쓰임','자주 걱정됨','일상에 영향'][answers.anxiety];
    $('sell-result').textContent=['거의 없음','가끔 생각남','자주 생각남','당장 팔고 싶음'][answers.reaction];
    $('notice').textContent=message;show('result');$('card-preview').src=cardPath(resultCode);$('result-title').focus();finishing=false;$('quiz-status').textContent='';
    const tipCode=answers.horizon>=2?0:answers.buffer>=2?1:answers.anxiety>=2?2:answers.reaction>=2?3:answers.loss>=2?4:5;
    if(typeof window.dmOnInvestorResult==='function') window.dmOnInvestorResult({typeCode:resultCode,anxiety:answers.anxiety,reaction:answers.reaction,tipCode});
  }
  $('save').addEventListener('click',()=>{const a=document.createElement('a');a.href=cardPath(resultCode);a.download='datamoney-investor-type.png';a.click();});
  $('share').addEventListener('click',async()=>{
    const data={title:'나의 투자 유형 테스트',text:`나는 ${result.name}! 당신은 어떤 투자자일까요?`,url:'https://datamoney.kr/tools/investor-type/'};
    try{if(navigator.share){
      if(navigator.canShare){try{const response=await fetch(cardPath(resultCode),{cache:'force-cache'});if(response.ok){const file=new File([await response.blob()],'datamoney-result.png',{type:'image/png'});if(navigator.canShare({files:[file]}))data.files=[file];}}catch(_) {}}
      await navigator.share(data);
    }else{await navigator.clipboard.writeText(`${data.text} ${data.url}`);$('notice').textContent='테스트 링크를 복사했어요. 친구에게 보내 보세요.';}}
    catch(error){if(error.name!=='AbortError')$('notice').textContent=`주소를 복사해 공유해 주세요: ${data.url}`;}
  });
  $('again').addEventListener('click',()=>{step=0;show('intro');$('start').focus();});
  $('delete-data').addEventListener('click',async()=>{if(!confirm('이 브라우저에서 이전에 동의해 저장한 개별 응답을 삭제할까요? 합산된 통계는 개별 삭제할 수 없습니다.'))return;try{const r=await fetch('/api/article-engagement/_survey',{method:'DELETE',credentials:'same-origin'});if(!r.ok)throw new Error();alert('이전에 동의해 저장한 응답 삭제 요청을 처리했습니다.');}catch(_){alert('삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');}});
})();
