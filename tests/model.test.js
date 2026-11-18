const {test} = require('node:test');
const assert = require('node:assert/strict');
const {newWalk, crossBridge, forecast, letterTransitions, average} = require('../docs/model.js');

test('Пять мостов обходятся из П в Ц без повторов', () => {
  let walk = newWalk('П');
  for (const id of ['birzhevoy','palace','blagoveshchensky','tuchkov','troitsky']) {
    const result=crossBridge(walk,id);
    assert.equal(result.ok,true);
    walk=result.state;
  }
  assert.equal(walk.current,'Ц');
  assert.equal(walk.used.length,5);
});
test('Нельзя перейти по несмежному или уже использованному мосту', () => {
  const initial=newWalk('В');
  assert.equal(crossBridge(initial,'troitsky').ok,false);
  const first=crossBridge(initial,'palace').state;
  assert.equal(crossBridge(first,'palace').ok,false);
  assert.deepEqual(initial.used,[]);
});
test('Из В ни один порядок пяти мостов не даёт полного обхода', () => {
  function possible(walk) {
    if(walk.used.length===5) return true;
    return ['palace','blagoveshchensky','birzhevoy','tuchkov','troitsky'].some(id=>{
      const result=crossBridge(walk,id);
      return result.ok && possible(result.state);
    });
  }
  assert.equal(possible(newWalk('В')),false);
});
test('Учебный навигатор: 70%, 9.5 минуты, риск 30%', () => {
  const result=forecast(.8,.3);
  assert.ok(Math.abs(result.free-.7)<1e-12);
  assert.ok(Math.abs(result.meanA-9.5)<1e-12);
  assert.ok(Math.abs(result.lateA-.3)<1e-12);
  assert.equal(result.lateB,0);
});
test('Крайние вероятности сохраняют корректный прогноз', () => {
  assert.equal(forecast(0,0).free,0);
  assert.equal(forecast(1,1).free,1);
  assert.throws(()=>forecast(-.1,.3),RangeError);
  assert.throws(()=>forecast(.8,NaN),RangeError);
});
test('Анализ букв убирает пробелы и знаки, различает гласные и согласные', () => {
  const result=letterTransitions('А б! я Ьъ Ё');
  assert.equal(result.letters,4);
  assert.deepEqual(result.counts,{vv:1,vc:1,cv:1,cc:0});
  assert.equal(result.afterVowel,.5);
  assert.equal(result.afterConsonant,1);
  assert.equal(letterTransitions('!?').afterVowel,null);
});
test('Учебные серии волчка: 9 и 21 секунда', () => {
  assert.equal(average([8,10,9]),9);
  assert.equal(average([20,22,21]),21);
});
