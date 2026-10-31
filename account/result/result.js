(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const types=[
    ['차근차근 거북이','존버형 · 내 속도대로 오래 살펴보는 편','흔들리는 순간에도 속도를 조절하며 스스로 세운 기준을 살펴보려 해요.','변동이 있어도 차분하게 자료와 계획을 확인할 수 있어요.','기다리는 동안에도 처음 세운 조건이 여전히 맞는지 확인해 보세요.'],
    ['꼼꼼한 다람쥐','짠테크형 · 여유를 챙기고 의견도 들어보는 편','한 번에 큰 위험을 지기보다 준비하고 비교하며 마음의 여유를 확보하려 해요.','현금 여유와 위험을 살피고 다른 사람의 시각도 참고해요.','다른 사람의 안정 기준이 내 상황과 같은지 생각해 보세요.'],
    ['감각적인 고양이','촉형 · 내 감각과 편안함을 중요하게 생각하는 편','스스로 느끼는 흐름과 마음의 안정감을 바탕으로 선택하려 해요.','주변의 소음에 휩쓸리기보다 내 느낌을 살펴볼 수 있어요.','직감으로 떠오른 생각도 거래 전 자료와 함께 확인해 보세요.'],
    ['귀 쫑긋 토끼','포모형 · 사람들의 이야기에 귀가 먼저 가는 편','시장 소식과 주변 반응을 빠르게 알아차리고, 그 속에서 내 선택을 고민해요.','새로운 이야기와 시장 분위기를 빠르게 접할 수 있어요.','많이 들리는 이야기와 내게 필요한 결정이 같은지는 따로 살펴보세요.'],
    ['소신 있는 늑대','알빠롱형 · 내가 납득한 기회를 직접 고르는 편','새로운 기회도 살펴보되, 스스로 분석하고 판단하려는 모습이 보여요.','남의 결론을 그대로 따르기보다 내 기준을 세우려 해요.','확신이 생긴 뒤에도 반대 근거를 한 번 더 찾아보세요.'],
    ['살펴보는 부엉이','뇌지컬형 · 기회를 찾아 자료와 의견을 모으는 편','가능성을 살피면서 숫자와 다양한 의견을 함께 비교하려 해요.','결정을 내리기 전에 여러 자료와 관점을 살펴볼 수 있어요.','정보가 많아도 내 목적에 필요한 기준은 따로 정해 두세요.'],
    ['눈치 빠른 여우','줍줍형 · 흐름 속에서 가능성을 먼저 보는 편','변화가 생기면 나만의 감각으로 기회를 찾아보려는 모습이 보여요.','새로운 상황에서 선택지를 빠르게 발견할 수 있어요.','기회가 매력적으로 보여도 손실 가능성과 자금 계획을 확인해요.'],
    ['도전하는 사자','야수형 · 새로운 기회를 보면 마음이 움직이는 편','시장 변화와 사람들의 이야기에 관심을 가지며 기회를 적극적으로 살펴봐요.','새로운 가능성을 열린 마음으로 탐색할 수 있어요.','주변 분위기가 뜨거울수록 감당 가능한 위험을 먼저 정해 보세요.']
  ];
  const anxieties=['거의 없음','가끔 신경 쓰임','자주 걱정됨','일상에 영향'];
  const reactions=['거의 없음','가끔 생각남','자주 생각남','당장 팔고 싶음'];
  const tips=['가까운 시기에 써야 할 돈이 시장 변동에 얼마나 노출돼 있는지 확인해 보세요.','예상치 못한 지출에 대비할 생활비 여유가 충분한지 먼저 점검해 보세요.','계좌를 확인하는 시간을 정하고, 거래 판단은 그다음에 해 보세요.','매도 여부를 결정하기 전에 처음 정한 투자 목적과 조건을 다시 확인해 보세요.','손실을 만회할 방법보다 돈의 목적과 감당 가능한 위험부터 다시 살펴보세요.','투자 목적과 생활비 여유를 정기적으로 확인할 날짜를 정해 보세요.'];
  let token='';try{token=sessionStorage.getItem('dm-investor-result-token')||'';}catch(_){}
  let saved=null;
  async function call(action,data={}) {
    const response=await fetch('/api/article-engagement/_email/'+action,{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({token,...data})});
    if(!response.ok)throw new Error('request failed');
    return response.json();
  }
  $('open').addEventListener('click',async()=>{
    const button=$('open'),status=$('confirm-status');
    if(!/^[a-f0-9]{64}$/.test(token)){status.textContent='확인 링크를 찾을 수 없습니다. 이메일에 있는 링크를 다시 열어 주세요.';return;}
    button.disabled=true;status.textContent='결과를 불러오고 있어요.';
    try {
      const data=await call('open');saved=data.result;
      const type=types[saved.typeCode];
      if(!type||!anxieties[saved.anxiety]||!reactions[saved.reaction]||!tips[saved.tipCode])throw new Error();
      $('saved-name').textContent=type[0];$('saved-tag').textContent=type[1];$('saved-description').textContent=type[2];
      $('saved-strength').textContent=type[3];$('saved-caution').textContent=type[4];$('saved-tip').textContent=tips[saved.tipCode];
      $('saved-anxiety').textContent=anxieties[saved.anxiety];$('saved-reaction').textContent=reactions[saved.reaction];
      $('saved-date').textContent='검사일: '+new Date(saved.createdAt).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});
      $('news').checked=data.subscriptions.testNews;$('news').disabled=!data.subscriptions.testNews;
      $('report').checked=data.subscriptions.monthlyReport;$('report').disabled=!data.subscriptions.monthlyReport;
      $('confirm').hidden=true;$('saved').hidden=false;
    } catch(_){status.textContent='결과를 열지 못했습니다. 링크가 만료되었거나 삭제되었을 수 있습니다. 이메일의 링크를 다시 확인해 주세요.';}
    finally{button.disabled=false;}
  });
  $('compare').addEventListener('click',()=>{
    try{sessionStorage.setItem('dm-investor-comparison',JSON.stringify(saved));location.href='/tools/investor-type/';}
    catch(_){$('preferences-status').textContent='브라우저의 저장 기능을 허용한 후 다시 시도해 주세요.';}
  });
  $('preferences').addEventListener('submit',async event=>{
    event.preventDefault();
    try{
      await call('preferences',{testNews:$('news').checked,monthlyReport:$('report').checked});
      if(!$('news').checked)$('news').disabled=true;if(!$('report').checked)$('report').disabled=true;
      $('preferences-status').textContent='수신 설정을 저장했습니다.';
    }catch(_){$('preferences-status').textContent='저장하지 못했습니다. 다시 시도해 주세요.';}
  });
  $('delete').addEventListener('click',async()=>{
    if(!confirm('이 이메일로 저장된 모든 결과와 수신 동의를 삭제할까요?'))return;
    try{
      await call('delete');sessionStorage.removeItem('dm-investor-result-token');sessionStorage.removeItem('dm-investor-comparison');
      $('saved').hidden=true;$('confirm').hidden=false;$('open').hidden=true;
      $('confirm-status').textContent='이메일과 저장된 결과를 삭제했습니다.';
    }catch(_){$('delete-status').textContent='삭제하지 못했습니다. 다시 시도해 주세요.';}
  });
})();
