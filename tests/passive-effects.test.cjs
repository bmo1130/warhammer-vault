const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{spawnSync}=require('node:child_process');
const React=require('react'),{renderToString}=require('react-dom/server');
const {abilityDictionary:dictionary}=require('../.test-build/src/repositories/abilityDictionary.js');
const Details=require('../.test-build/src/components/AbilityDetails.js').default;
const read=p=>JSON.parse(fs.readFileSync(p));
const admission=read('tools/wh3-importer/passive-effects/admission.json');
const source=read('tools/wh3-importer/unit-passives/source.json');
const attrs=read('tools/wh3-importer/unit-attributes/source.json');
const ownership=read('tools/wh3-importer/unit-passives/admission.json');
const args=()=>({attributes:structuredClone(attrs),passives:structuredClone(source),actives:read('tools/wh3-importer/unit-actives/source.json'),attributeAdmission:read('tools/wh3-importer/unit-attributes/admission.json'),passiveAdmission:structuredClone(ownership),activeProjection:read('src/data/unitActiveAdmissions.json'),supplement:read('tools/wh3-importer/ability-dictionary/source.json')});

test('37 readable phase effects on 33 exact passives reach 246 proved owners without transferring attribute ownership',()=>{
 assert.deepEqual(admission.summary,{abilities:33,units:246,effectRows:37,attributeKeys:12,heldRows:2});
 for(const e of admission.entries){
  assert.equal(dictionary.get(e.id).category,'PASSIVE');
  for(const owner of e.owners){
   const original=ownership.admissions.find(a=>a.id===owner.id);
   assert.equal(owner.mainKey,original.mainKey);assert.equal(owner.landKey,original.landKey);
   assert.deepEqual(owner.facts,original.facts.filter(f=>f.canonicalId===e.id));
  }
  for(const effect of e.effects){
   const row=source.rows.find(r=>r.table==='special_ability_phase_attribute_effects_tables'&&r.row.phase===effect.phase&&r.row.attribute===effect.field);
   assert(row&&effect.sourceRowIds.includes(row.id));assert.equal(effect.rawValue,row.row.attribute_type);
   assert.equal(effect.attributeOperation,row.row.attribute_type==='positive'?'GRANT':'REMOVE');
   if(effect.description){
    assert.equal(effect.description.language,'ko');assert.match(effect.label,/[가-힣]/);
    const definition=attrs.rows.find(r=>r.table==='unit_attributes_tables'&&r.row.key===effect.field);
    assert(definition&&effect.sourceRowIds.includes(definition.id));
    for(const id of effect.description.rowIds)assert(dictionary.get(e.id).sourceRowIds.includes(id));
    assert(!/\{\{|\[\[|%[+\-]?[nsdf]/.test(effect.description.text));
   }
  }
 }
});

test('all unit data and non-passive dictionary entries preserve the starting commit exactly',()=>{
 const prior=spawnSync('git',['show','4186895:src/data/abilityDictionary.json'],{maxBuffer:32*1024*1024});assert.equal(prior.status,0);
 const old=JSON.parse(prior.stdout);
 assert.deepEqual(dictionary.list().filter(e=>e.category!=='PASSIVE'),old.entries.filter(e=>e.category!=='PASSIVE'));
 assert.deepEqual(dictionary.summary,old.summary);
 for(const before of old.entries.filter(e=>e.category==='PASSIVE')){
  const current=dictionary.get(before.id),restored=structuredClone(current),addedRows=[];
  for(const phase of restored.phases)for(const effect of phase.effects)if(effect.attributeOperation){
   const original=before.phases.find(p=>p.id===phase.id&&p.relationship===phase.relationship).effects.find(e=>e.field===effect.field);
   assert(original);addedRows.push(...effect.sourceRowIds);
   // Raw values, units, timing, targeting and numeric modifiers stay exact.
   effect.label=original.label;effect.sourceRowIds=original.sourceRowIds;
   delete effect.attributeOperation;delete effect.description;
  }
  assert.deepEqual(current.sourceRowIds,[...new Set([...before.sourceRowIds,...addedRows])].sort());
  restored.sourceRowIds=before.sourceRowIds;
  const newHolds=current.phases.flatMap(p=>p.effects.filter(e=>e.attributeOperation&&!e.description).map(e=>`Phase attribute ${e.field}: exact definition or official effect description unresolved; raw effect preserved.`));
  restored.held=restored.held.filter(h=>!newHolds.includes(h.reason));
  assert.deepEqual(restored,before,before.id);
 }
 for(const file of fs.readdirSync('src/data').filter(f=>f.endsWith('.json')&&f!=='abilityDictionary.json')){
  const before=spawnSync('git',['show',`4186895:src/data/${file}`],{maxBuffer:128*1024*1024});assert.equal(before.status,0,file);
  assert.equal(fs.readFileSync(`src/data/${file}`,'utf8').replace(/\r\n/g,'\n'),before.stdout.toString().replace(/\r\n/g,'\n'),file);
 }
});

test('Korean grant and removal effects render with descriptions and retain raw evidence; unknown descriptions stay explicit',()=>{
 const render=id=>renderToString(React.createElement(Details,{ability:dictionary.get(id)})).replace(/<!--.*?-->/g,'');
 assert.match(render('frenzy'),/특성 심리 면역/);assert.match(render('frenzy'),/부여/);assert.match(render('frenzy'),/심리 공격/);
 const binding=render('wh3_dlc26_unit_passive_runes_of_binding');assert.match(binding,/특성 난동/);assert.match(binding,/제거/);assert.match(binding,/기본 보유 특성 목록과 구분/);
 for(const id of ['wh3_dlc23_unit_passive_sorcerous_miasma','wh3_dlc23_unit_passive_undying_will']){
  const effects=dictionary.get(id).phases.flatMap(p=>p.effects).filter(e=>e.attributeOperation);
  assert(effects.some(e=>!e.description));assert.match(render(id),/특성 문구 미확인/);
 }
});

test('effect FK and grant/removal semantics drift cannot silently change displayed effects',async()=>{
 const {buildDictionary}=await import('../tools/wh3-importer/ability-dictionary/rules.mjs');
 for(const change of [a=>a.passives.schemas.find(s=>s.table==='special_ability_phase_attribute_effects_tables').fields.find(f=>f.name==='attribute').is_reference=['other','key'],a=>a.passives.schemas.find(s=>s.table==='special_ability_phase_attribute_effects_tables').fields.find(f=>f.name==='attribute_type').description='',a=>a.passives.rows.find(r=>r.table==='special_ability_phase_attribute_effects_tables'&&r.row.phase==='wh_main_unit_passive_frenzy').row.attribute_type='unknown']){
  const a=args();change(a);assert.throws(()=>buildDictionary(a),/Unverified reference|Unverified attribute grant|Unreviewed attribute effect/);
 }
 const missing=args();missing.attributes.rows=missing.attributes.rows.filter(r=>!(r.table==='unit_attributes_tables'&&r.row.key==='immune_to_psychology'));
 // Fresh sample validation is unaffected; the effect itself must remain raw.
 const result=buildDictionary(missing).entries.find(e=>e.id==='frenzy').phases.flatMap(p=>p.effects).find(e=>e.field==='immune_to_psychology');
 assert.equal(result.description,undefined);assert.match(result.label,/미확인/);assert.equal(result.rawValue,'positive');
});
