(function (global) {
  'use strict';
  const bridges = [
    {id:'palace',name:'Дворцовый',a:'В',b:'Ц'},
    {id:'blagoveshchensky',name:'Благовещенский',a:'В',b:'Ц'},
    {id:'birzhevoy',name:'Биржевой',a:'В',b:'П'},
    {id:'tuchkov',name:'Тучков',a:'В',b:'П'},
    {id:'troitsky',name:'Троицкий',a:'П',b:'Ц'}
  ];
  function newWalk(start) {
    if (!['В','П','Ц'].includes(start)) throw new RangeError('Неизвестная зона');
    return {start,current:start,used:[]};
  }
  function crossBridge(state,id) {
    const bridge=bridges.find(item=>item.id===id);
    if (!bridge || state.used.includes(id)) return {ok:false,reason:'Этот мост уже пройден',state};
    if (state.current!==bridge.a && state.current!==bridge.b) return {ok:false,reason:'Сначала нужно дойти до этого моста',state};
    return {ok:true,state:{...state,current:state.current===bridge.a?bridge.b:bridge.a,used:[...state.used,id]}};
  }
  function forecast(p,q) {
    if (![p,q].every(value=>Number.isFinite(value)&&value>=0&&value<=1)) throw new RangeError('Вероятность должна быть от 0 до 1');
    const free=p*p+(1-p)*q;
    return {free,fromFree:p*p,fromDelay:(1-p)*q,meanA:8*free+13*(1-free),lateA:1-free,lateB:0};
  }
  function letterTransitions(text) {
    const symbols=[...text.toLowerCase()].filter(c=>/[а-яё]/u.test(c)&&!/[ьъ]/u.test(c));
    const vowel=c=>/[аеёиоуыэюя]/u.test(c);
    const counts={vv:0,vc:0,cv:0,cc:0};
    for(let i=1;i<symbols.length;i++) counts[(vowel(symbols[i-1])?'v':'c')+(vowel(symbols[i])?'v':'c')]++;
    return {letters:symbols.length,counts,afterVowel:counts.vv+counts.vc?counts.vv/(counts.vv+counts.vc):null,afterConsonant:counts.cv+counts.cc?counts.cv/(counts.cv+counts.cc):null};
  }
  function average(values) {
    if (!values.length) throw new RangeError('Нужны наблюдения');
    return values.reduce((sum,value)=>sum+value,0)/values.length;
  }
  const api={bridges,newWalk,crossBridge,forecast,letterTransitions,average};
  global.TourModel=api;
  if(typeof module!=='undefined') module.exports=api;
})(globalThis);
