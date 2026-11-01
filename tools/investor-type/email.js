(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const types=['존버형','짠테크형','촉형','포모형','알빠롱형','뇌지컬형','줍줍형','야수형'];
  const anxieties=['거의 없음','가끔 신경 쓰임','자주 걱정됨','일상에 영향'];
  const reactions=['거의 없음','가끔 생각남','자주 생각남','당장 팔고 싶음'];
  let current=null;
  window.dmOnInvestorResult=result=>{
    current=result;
    $('result-email-status').textContent='';
    let previous=null;
    try { previous=JSON.parse(sessionStorage.getItem('dm-investor-comparison')||'null'); } catch (_) {}
    const box=$('comparison-content');
    box.replaceChildren();
    if (!previous || !Number.isInteger(previous.typeCode) || !types[previous.typeCode] || !anxieties[previous.anxiety] || !reactions[previous.reaction]) {
      $('comparison').hidden=true;
      return;
    }
    const day=new Date(previous.createdAt).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'});
    for (const [label,before,after] of [
      ['투자 유형',types[previous.typeCode],types[result.typeCode]],
      ['최근 불안감',anxieties[previous.anxiety],anxieties[result.anxiety]],
      ['최근 매도 충동',reactions[previous.reaction],reactions[result.reaction]]
    ]) {
      const row=document.createElement('p');
      const strong=document.createElement('strong');strong.textContent=label;
      const text=document.createElement('span');text.textContent=before+' → '+after;
      row.append(strong,text);box.append(row);
    }
    const note=document.createElement('p');note.className='comparison-date';note.textContent='이전 검사일: '+day;box.prepend(note);
    $('comparison').hidden=false;
  };
  $('result-email-form').addEventListener('submit',async event=>{
    event.preventDefault();
    if (!current) return;
    const form=event.currentTarget,button=form.querySelector('button[type=submit]'),status=$('result-email-status');
    if (!$('result-email-consent').checked) {status.textContent='결과 발송과 저장에 필요한 동의를 확인해 주세요.';return;}
    button.disabled=true;status.textContent='이메일을 보내고 있어요.';
    try {
      const response=await fetch('/api/article-engagement/_email/request',{
        method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',
        body:JSON.stringify({...current,email:$('result-email').value.trim(),consent:true,testNews:$('result-test-news').checked,monthlyReport:$('result-monthly-report').checked})
      });
      if (!response.ok) {
        status.textContent=response.status===429?'요청이 많습니다. 잠시 후 다시 시도해 주세요.':'이메일을 보내지 못했습니다. 주소를 확인하고 잠시 후 다시 시도해 주세요.';
        return;
      }
      status.textContent='상세 리포트 링크와 결과 이미지를 이메일로 보냈어요. 받은 편지함에서 확인해 주세요. 메일이 없다면 스팸함도 확인해 주세요.';
      form.reset();
    } catch (_) {status.textContent='이메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.';}
    finally {button.disabled=false;}
  });
})();
