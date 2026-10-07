const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createCompositionInput}=require('../.test-build/src/domain/compositionInput.js');

function input(initial=''){
  const model=createCompositionInput(initial),queries=[];
  const publish=value=>{if(value!==undefined)queries.push(value);};
  return{model,queries,change:(value,composing)=>publish(model.update(value,composing)),end:value=>publish(model.end(value))};
}

test('Korean IME whole-value intermediates never publish or accumulate; compositionend publishes 성배기사 once',()=>{
  const {model,queries,change,end}=input();model.start();
  for(const value of ['ㅅ','서','성','성ㅂ','성배','성백','성배기','성배깃','성배기사']){
    change(value,true);assert.equal(model.draft,value);assert.deepEqual(queries,[]);
  }
  end('성배기사');change('성배기사');end('성배기사');
  assert.equal(model.draft,'성배기사');assert.deepEqual(queries,['성배기사']);
});

test('each Korean syllable and a second word survive delayed route acknowledgements',()=>{
  const {model,queries,change,end}=input();
  for(const value of ['성','성배','성배기','성배기사']){model.start();change(value,true);end(value);}
  model.sync('성');assert.equal(model.draft,'성배기사');
  model.start();change('성배기사 ㅂ',true);model.sync('성배');assert.equal(model.draft,'성배기사 ㅂ');
  change('성배기사 보병',true);end('성배기사 보병');model.sync('성배기사');
  assert.equal(model.draft,'성배기사 보병');model.sync('성배기사 보병');
  assert.deepEqual(queries,['성','성배','성배기','성배기사','성배기사 보병']);
});

test('native isComposing without compositionstart and both final change event orders are safe',()=>{
  for(const finalChangeBeforeEnd of [true,false]){
    const {model,queries,change,end}=input();change('성ㅂ',true);
    if(finalChangeBeforeEnd)change('성배기사',false);
    assert.deepEqual(queries,[]);end('성배기사');
    if(!finalChangeBeforeEnd)change('성배기사',false);
    assert.equal(model.draft,'성배기사');assert.deepEqual(queries,['성배기사']);
    change('성배기');assert.deepEqual(queries,['성배기사','성배기']);
  }
});

test('English/numbers/deletion publish immediately without normalizing the editable value',()=>{
  const {model,queries,change}=input();
  for(const value of ['G','Gr','Grail Knights 123',' Grail Knights 123 ',' Grail Knights 12','']){change(value);assert.equal(model.draft,value);model.sync(value);}
  assert.deepEqual(queries,['G','Gr','Grail Knights 123',' Grail Knights 123 ',' Grail Knights 12','']);
});

test('Chinese/Japanese composition and cancelled composition keep full values, never fragments',()=>{
  for(const final of ['骑士','騎士','きし']){
    const {model,queries,change,end}=input();model.start();change('k',true);change('ki',true);change(final,true);end(final);change(final);
    assert.equal(model.draft,final);assert.deepEqual(queries,[final]);
    model.sync(final);model.start();change(final+'x',true);end(final);assert.deepEqual(queries,[final]);
  }
});

test('settled URL navigation/back/reset updates draft while a query acknowledgement cannot destroy composition',()=>{
  const {model,queries,change,end}=input('old');change('English');model.sync('English');
  model.sync('url query');assert.equal(model.draft,'url query');model.sync('');assert.equal(model.draft,'');
  model.start();change('ㅅ',true);model.sync('external');assert.equal(model.draft,'ㅅ');
  end('성배기사');model.sync('성배기사');model.sync('old');assert.equal(model.draft,'old');
  assert.deepEqual(queries,['English','성배기사']);
});
