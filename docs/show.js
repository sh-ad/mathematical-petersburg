(() => {
  'use strict';
  const M=TourModel;
  const screens=[...document.querySelectorAll('[data-screen]')];
  const menu=document.querySelector('#screen-menu');
  let current=0;
  function show(index,focus=false) {
    current=Math.max(0,Math.min(screens.length-1,index));
    screens.forEach((screen,i)=>{screen.hidden=i!==current;});
    document.querySelector('#counter').textContent=String(current+1).padStart(2,'0')+' / '+screens.length;
    document.querySelector('#prev').disabled=current===0;
    document.querySelector('#next').disabled=current===screens.length-1;
    history.replaceState(null,'','#'+screens[current].id);
    document.title=screens[current].querySelector('h1').textContent+' · Математический Петербург';
    if(focus) {const title=screens[current].querySelector('h1');title.tabIndex=-1;title.focus({preventScroll:true});}
    window.scrollTo({top:0,behavior:'instant'});
    if(screens[current].id!=='mechanism') setMechanism(false);
  }
  document.querySelector('#prev').addEventListener('click',()=>show(current-1,true));
  document.querySelector('#next').addEventListener('click',()=>show(current+1,true));
  document.querySelector('#open-menu').addEventListener('click',()=>menu.showModal());
  document.querySelector('#close-menu').addEventListener('click',()=>menu.close());
  document.querySelectorAll('[data-jump]').forEach(a=>a.addEventListener('click',event=>{event.preventDefault();show(Number(a.dataset.jump),true);menu.close();}));
  document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();show(0,true);});
  window.addEventListener('hashchange',()=>{const index=screens.findIndex(s=>s.id===location.hash.slice(1));if(index>=0)show(index);});
  document.addEventListener('keydown',event=>{
    if(menu.open||event.altKey||event.metaKey||event.ctrlKey||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(event.target.tagName)||event.target.closest('[role="button"]'))return;
    if(['ArrowRight','PageDown'].includes(event.key)){event.preventDefault();show(current+1,true);}
    if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();show(current-1,true);}
    if(event.key==='Home'){event.preventDefault();show(0,true);}
    if(event.key==='End'){event.preventDefault();show(screens.length-1,true);}
  });
  const fullscreen=document.querySelector('#fullscreen');
  fullscreen.addEventListener('click',async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
    catch {fullscreen.textContent='Полный экран недоступен';}
  });
  document.addEventListener('fullscreenchange',()=>{fullscreen.textContent=document.fullscreenElement?'Свернуть экран':'На весь экран';});
  document.querySelectorAll('[data-reveal]').forEach(button=>button.addEventListener('click',()=>{
    const panel=document.getElementById(button.dataset.reveal);
    panel.hidden=!panel.hidden;
    button.setAttribute('aria-expanded',String(!panel.hidden));
  }));

  let walk=M.newWalk('В');
  const historyWalk=[];
  function renderWalk(message='') {
    document.querySelectorAll('[data-node]').forEach(n=>n.classList.toggle('current',n.dataset.node===walk.current));
    document.querySelectorAll('[data-edge]').forEach(n=>{
      n.classList.toggle('used',walk.used.includes(n.dataset.edge));
      n.setAttribute('aria-disabled',String(walk.used.includes(n.dataset.edge)));
    });
    document.querySelectorAll('[data-cross]').forEach(button=>{button.disabled=walk.used.includes(button.dataset.cross);});
    document.querySelector('#walk-undo').disabled=!historyWalk.length;
    const available=M.bridges.filter(b=>!walk.used.includes(b.id)&&(b.a===walk.current||b.b===walk.current));
    document.querySelector('#walk-status').textContent=message||`Сейчас: ${walk.current}. Пройдено: ${walk.used.length} из 5.`+(walk.used.length===5?' Все мосты пройдены по одному разу.':!available.length?' Продолжить без повторов невозможно. Попробуйте другой старт.':' Выберите следующий мост.');
  }
  function cross(id) {
    const result=M.crossBridge(walk,id);
    if(result.ok){historyWalk.push(walk);walk=result.state;renderWalk();}
    else renderWalk(result.reason+'. Сейчас: '+walk.current+'.');
  }
  document.querySelectorAll('[data-cross]').forEach(button=>button.addEventListener('click',()=>cross(button.dataset.cross)));
  document.querySelectorAll('[data-edge]').forEach(edge=>{
    edge.addEventListener('click',()=>cross(edge.dataset.edge));
    edge.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();cross(edge.dataset.edge);}});
  });
  function resetWalk(){walk=M.newWalk(document.querySelector('#walk-start').value);historyWalk.length=0;renderWalk();}
  document.querySelector('#walk-start').addEventListener('change',resetWalk);
  document.querySelector('#walk-reset').addEventListener('click',resetWalk);
  document.querySelector('#walk-undo').addEventListener('click',()=>{if(historyWalk.length){walk=historyWalk.pop();renderWalk();}});
  renderWalk();

  function setMechanism(playing) {
    document.querySelector('#mechanism-image').src=playing?'../assets/chebyshev-linkage.gif':'../assets/chebyshev-still.png';
    const button=document.querySelector('#mechanism-toggle');
    button.setAttribute('aria-pressed',String(playing));
    button.textContent=playing?'Остановить движение':'Включить движение';
  }
  document.querySelector('#mechanism-toggle').addEventListener('click',event=>setMechanism(event.currentTarget.getAttribute('aria-pressed')!=='true'));
  const percent=value=>Math.round(value*1000)/10+'%';
  const number=value=>value.toLocaleString('ru',{maximumFractionDigits:2});
  function updateForecast() {
    const p=Number(document.querySelector('#p').value)/100,q=Number(document.querySelector('#q').value)/100;
    const result=M.forecast(p,q);
    document.querySelector('#p-value').textContent=percent(p);
    document.querySelector('#q-value').textContent=percent(q);
    document.querySelector('#branch-free').textContent=percent(result.fromFree);
    document.querySelector('#branch-delay').textContent=percent(result.fromDelay);
    document.querySelector('#free-result').textContent=percent(result.free);
    document.querySelector('#free-bar').style.width=result.free*100+'%';
    document.querySelector('#mean-a').textContent=number(result.meanA)+' мин';
    document.querySelector('#late-a').textContent=percent(result.lateA);
  }
  ['p','q'].forEach(id=>document.getElementById(id).addEventListener('input',updateForecast));
  document.querySelector('#forecast-reset').addEventListener('click',()=>{document.querySelector('#p').value=80;document.querySelector('#q').value=30;updateForecast();});
  updateForecast();

  const poem=document.querySelector('#onegin-text');
  const poemLines=['Мой дядя самых честных правил,','Когда не в шутку занемог,','Он уважать себя заставил','И лучше выдумать не мог.'];
  poem.replaceChildren();
  poemLines.forEach((line,index)=>{
    if(index)poem.append(document.createElement('br'));
    for(const char of line){const span=document.createElement('span');span.textContent=char;span.className=/[аеёиоуыэюя]/iu.test(char)?'vowel':'other-letter';poem.append(span);}
  });
  document.querySelector('#text-toggle').addEventListener('click',event=>{
    const pressed=event.currentTarget.getAttribute('aria-pressed')!=='true';
    event.currentTarget.setAttribute('aria-pressed',String(pressed));
    event.currentTarget.textContent=pressed?'Убрать выделение':'Выделить гласные и согласные';
    poem.classList.toggle('text-classified',pressed);
    document.querySelector('#text-results').hidden=!pressed;
    const result=M.letterTransitions(poemLines.join(' '));
    document.querySelector('#after-vowel').textContent=percent(result.afterVowel);
    document.querySelector('#after-consonant').textContent=percent(result.afterConsonant);
    document.querySelector('#text-count').textContent=`В отрывке ${result.letters} букв после исключения ь/ъ. После гласной: ${result.counts.vv} гласных из ${result.counts.vv+result.counts.vc} переходов. После согласной: ${result.counts.cv} из ${result.counts.cv+result.counts.cc}.`;
  });

  document.querySelector('#stability-toggle').addEventListener('click',event=>{
    const shifted=event.currentTarget.getAttribute('aria-pressed')!=='true';
    event.currentTarget.setAttribute('aria-pressed',String(shifted));
    event.currentTarget.textContent=shifted?'Вернуть исходное положение':'Немного сместить шарики';
    document.querySelectorAll('.stability-ball').forEach(ball=>{ball.setAttribute('cx',shifted?'156':'120');ball.setAttribute('cy',shifted?ball.dataset.afterY:ball.dataset.baseY);});
    document.querySelectorAll('.reaction').forEach(g=>{g.hidden=!shifted;if(shifted)g.removeAttribute('hidden');else g.setAttribute('hidden','');});
  });

  function updateDerivative() {
    const t=Number(document.querySelector('#time').value),x=55+t*65,y=270-t*t*6;
    const curve=Array.from({length:61},(_,i)=>{const v=i/10;return `${55+v*65},${270-v*v*6}`;}).join(' ');
    const tangent=(v)=>270-(t*t+2*t*(v-t))*6;
    document.querySelector('#derivative-plot').innerHTML=`<svg class="diagram" viewBox="0 0 500 310" role="img" aria-label="График s=t² и касательная в выбранный момент времени"><line class="plot-axis" x1="55" y1="270" x2="465" y2="270"/><line class="plot-axis" x1="55" y1="270" x2="55" y2="30"/><polyline class="plot-curve" points="${curve}"/><line class="plot-tangent" x1="${55+(t-1)*65}" y1="${tangent(t-1)}" x2="${55+(t+1)*65}" y2="${tangent(t+1)}"/><circle class="plot-dot" cx="${x}" cy="${y}" r="6"/><text class="plot-tick" x="430" y="299">t, с</text><text class="plot-tick" x="20" y="20">s, усл. ед.</text><text class="plot-tick" x="42" y="288">0</text><text class="plot-tick" x="438" y="288">6</text><text class="plot-tick" x="20" y="58">36</text><text class="plot-tick" x="290" y="40">s = t²</text></svg>`;
    document.querySelector('#time-value').textContent=number(t);
    document.querySelector('#speed-value').textContent=number(2*t);
  }
  document.querySelector('#time').addEventListener('input',updateDerivative);
  updateDerivative();
  const initial=screens.findIndex(screen=>screen.id===location.hash.slice(1));
  show(initial>=0?initial:0);
})();
