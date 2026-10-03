const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const overlay=require('../tools/wh3-importer/hp-policy/overlay.cjs');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const base='tools/wh3-importer/hp-policy/';
const manifest=read(base+'manifest.json'),committed=read(base+'review.json');
const modules=async()=>({...await import('../tools/wh3-importer/hp-policy/policy.mjs'),...await import('../tools/wh3-importer/runtime-evidence/cco-probe/ingest.mjs')});
const raw=()=>readFileSync(base+'inputs/skeleton-chariots-ultra.log','utf8');
const chain=()=>committed.review.find(r=>r.name==='Skeleton Chariots').staticChain;
function mutateLog(text,mutation){return text.split('\n').map(line=>{const index=line.indexOf('WH3_RUNTIME_PROBE|');if(index<0)return line;
  const event=JSON.parse(line.slice(index+'WH3_RUNTIME_PROBE|'.length));mutation(event);return line.slice(0,index)+'WH3_RUNTIME_PROBE|'+JSON.stringify(event);}).join('\n');}

test('ULTRA HP clean checkout source → review → explicit admission → Production replay is deterministic',async()=>{
  const {replayHP}=await modules();assert.deepEqual(replayHP(manifest),committed);assert.deepEqual(replayHP(manifest),replayHP(manifest));
  const units=read('src/data/units.json'),staticUnits=overlay.staticProductionView(units);
  assert.equal(overlay.hash(overlay.serialize(staticUnits)),manifest.baselineUnitsSha256);
  assert.deepEqual(overlay.applyProductionHP(staticUnits),units);
  assert.deepEqual(overlay.applyProductionHP([...staticUnits]),overlay.applyProductionHP(staticUnits));
  assert.deepEqual(units.filter(u=>u.gameVersion==='sample'),staticUnits.filter(u=>u.gameVersion==='sample'));
  assert.equal(units.filter(u=>u.gameVersion!=='sample').length,101);assert.equal(units.filter(u=>u.gameVersion==='sample').length,5);
  const changed=units.filter((u,i)=>JSON.stringify(u)!==JSON.stringify(staticUnits[i]));assert.equal(changed.length,13);
  for(const unit of changed){const index=units.indexOf(unit),copy=structuredClone(unit);delete copy.entities.totalHealth;assert.deepEqual(copy,staticUnits[index]);}
  assert.equal(units.filter(u=>u.gameVersion!=='sample'&&u.entities.totalHealth===undefined).length,88);
  const check=spawnSync(process.execPath,['scripts/promote-ultra-hp.mjs','--check'],{encoding:'utf8'});assert.equal(check.status,0,check.stderr);
});

test('five user-confirmed ULTRA semantic fixtures match exact totals without treating reports as probe records',async()=>{
  const fixture=read(base+'semantic-fixtures.json');assert.equal(fixture.sourceKind,'USER_REPORTED');assert.equal(fixture.productionEligible,false);
  assert.deepEqual(fixture.cases.map(c=>c.HealthMax),[8280,5520,9856,15088,7032]);
  const {parseProbeLogs,reviewRuntimeHP}=await modules();
  for(const c of fixture.cases){
    assert.equal(c.NumEntitiesInitial*c.observedHealthPerCombatEntity,c.HealthMax);
    // Synthetic in-memory test envelope only, never an admission input. Keep
    // chariot component views intentionally different to test the HP basis.
    const text=mutateLog(raw(),e=>{const f=e.data.fields;if(!f)return;
      if(f['UnitRecordContext.Key'])f['UnitRecordContext.Key'].value=c.mainKey;
      if(f['UnitRecordContext.UnitLandRecordContext.Key'])f['UnitRecordContext.UnitLandRecordContext.Key'].value=c.mainKey;
      if(f.HealthMax)f.HealthMax.value=c.HealthMax;
      if(f.NumEntitiesInitial)f.NumEntitiesInitial.value=c.NumEntitiesInitial;});
    const staticChain=committed.review.find(r=>r.staticChain.sourceMainKey===c.mainKey).staticChain;
    assert.equal(reviewRuntimeHP(parseProbeLogs([{name:'synthetic-semantic-fixture.log',text}]),staticChain,'ULTRA').totalHealth,c.HealthMax);
  }
  const chariot=fixture.cases.find(c=>c.name==='Skeleton Chariots');
  assert.equal(chariot.NumEntitiesInitial,12);assert.equal(chariot.componentCounts.ManList,24);assert.equal(chariot.componentCounts.MountList,24);
  assert.notEqual(chariot.componentCounts.ManList*586,chariot.HealthMax);
  assert.notEqual(Object.values(chariot.componentCounts).reduce((a,b)=>a+b,0)*586,chariot.HealthMax);
  const saurian=fixture.cases.find(c=>c.name==='Dread Saurian');assert.equal(saurian.NumEntitiesInitial,1);assert.notEqual(saurian.componentCounts.ManList*15088,saurian.HealthMax);
  const {replayHP}=await modules(),unapproved=structuredClone(manifest);unapproved.inputs=unapproved.inputs.slice(0,2);
  assert.throws(()=>replayHP(unapproved),/approved HP failed replay/);
});

test('original ULTRA log hashes and static named-field provenance are preserved; no static formula is approved',async()=>{
  const {byteHash,replayHP}=await modules();for(const input of manifest.inputs)assert.equal(byteHash(readFileSync(base+input.file)),input.originalSha256);
  const badLogHash=structuredClone(manifest);badLogHash.inputs[0].originalSha256='0'.repeat(64);assert.throws(()=>replayHP(badLogHash),/original runtime log hash changed/);
  const badStaticHash=structuredClone(manifest);badStaticHash.staticSources[0].sha256='0'.repeat(64);assert.throws(()=>replayHP(badStaticHash),/static source hash changed/);
  const duplicate=structuredClone(manifest);duplicate.subjects.push(duplicate.subjects[0]);assert.throws(()=>replayHP(duplicate),/duplicate approval identity/);
  for(const source of manifest.staticSources)assert.equal(byteHash(readFileSync(source.file)),source.sha256);
  const report=replayHP(manifest);
  for(const r of report.review){assert.equal(r.staticChain.derivation.kind,'STATIC_DERIVATION');assert.equal(r.staticChain.derivation.status,'WITHHELD');
    assert.equal(r.staticChain.derivation.formula,null);assert(r.staticChain.identityFacts.land.source.joins.length);
    for(const fact of Object.values(r.staticChain.inputs).filter(Boolean))assert(fact.source.rowId&&fact.source.schemaVersion!==undefined&&fact.source.sourcePack==='db.pack');}
  assert.equal(report.review.find(r=>r.name==='Dread Saurian').totalHealth,15088);
  const chariot=report.review.find(r=>r.name==='Skeleton Chariots');assert.equal(chariot.totalHealth,7032);assert.equal(chariot.candidates[0].NumEntitiesInitial,12);
  assert.deepEqual(chariot.candidates[0].componentCounts,{ManList:24,MountList:24,EngineList:12,EntityList:12});
  assert.deepEqual(report.admitted.map(a=>a.kind),Array(10).fill('DIRECT_ULTRA_RUNTIME'));
});

test('non-ULTRA, missing declaration, identity/snapshot drift, missing HP/count and malformed capture fail closed',async()=>{
  const {parseProbeLogs,reviewRuntimeHP}=await modules();
  for(const mutation of [
    e=>{e.metadata.unitSize='MEDIUM';},e=>{e.metadata.unitSizeSource='INFERRED';},
    e=>{if(e.kind==='SNAPSHOT_END')e.metadata.unitSize='MEDIUM';},
    e=>{e.metadata.staticSnapshotId='0'.repeat(64);},e=>{e.metadata.gameVersion='9.0.1.0';},
    e=>{if(e.data.fields?.HealthMax)e.data.fields.HealthMax={status:'NULL'};},
    e=>{if(e.data.fields?.NumEntitiesInitial)e.data.fields.NumEntitiesInitial={status:'UNSUPPORTED'};},
    e=>{if(e.data.fields?.NumEntitiesInitial)e.data.fields.NumEntitiesInitial={status:'VALUE',value:0};},
    e=>{if(e.data.fields?.['UnitRecordContext.UnitLandRecordContext.Key'])e.data.fields['UnitRecordContext.UnitLandRecordContext.Key'].value='wrong';},
    e=>{if(e.kind==='SNAPSHOT_UNIT')e.data.fields['UnitRecordContext.Key'].value='wrong';},
    e=>{if(e.kind==='SNAPSHOT_END')e.kind='ERROR';},
  ]){const result=reviewRuntimeHP(parseProbeLogs([{name:'mutated.log',text:mutateLog(raw(),mutation)}]),chain(),'ULTRA');assert.notEqual(result.status,'REVIEWED_DIRECT_ULTRA_RUNTIME');assert.equal(result.totalHealth,undefined);}
  const parsed=parseProbeLogs([{name:'good.log',text:raw()}]);assert.equal(reviewRuntimeHP(parsed,chain(),'MEDIUM').status,'QUARANTINED_UNIT_SIZE');
  assert.equal(reviewRuntimeHP(parseProbeLogs([{name:'medium.log',text:mutateLog(raw(),e=>{e.metadata.unitSize='MEDIUM';})}]),chain(),'ULTRA').status,'QUARANTINED_UNIT_SIZE');
  assert.equal(reviewRuntimeHP(parsed,chain(),undefined).totalHealth,undefined);
  assert.equal(reviewRuntimeHP(parseProbeLogs([{name:'bad.log',text:raw()+'\nWH3_RUNTIME_PROBE|{"broken":true}'}]),chain(),'ULTRA').totalHealth,undefined);
});

test('conflicting HP/count captures and event payloads cannot auto-select a winner; HealthValue is not HP',async()=>{
  const {parseProbeLogs,reviewRuntimeHP}=await modules();
  const changed=mutateLog(raw(),e=>{e.sessionId+='-other';if(e.data.fields?.HealthMax)e.data.fields.HealthMax.value=9999;});
  const result=reviewRuntimeHP(parseProbeLogs([{name:'a.log',text:raw()},{name:'b.log',text:changed}]),chain(),'ULTRA');
  assert.equal(result.status,'CONFLICTING_HP_EVIDENCE');assert.equal(result.totalHealth,undefined);
  const sameEvent=mutateLog(raw(),e=>{if(e.data.fields?.HealthMax)e.data.fields.HealthMax.value=9999;});
  assert.equal(reviewRuntimeHP(parseProbeLogs([{name:'a.log',text:raw()},{name:'b.log',text:sameEvent}]),chain(),'ULTRA').totalHealth,undefined);
  const countChanged=mutateLog(raw(),e=>{e.sessionId+='-count';if(e.data.fields?.NumEntitiesInitial)e.data.fields.NumEntitiesInitial.value=24;});
  assert.equal(reviewRuntimeHP(parseProbeLogs([{name:'a.log',text:raw()},{name:'b.log',text:countChanged}]),chain(),'ULTRA').status,'CONFLICTING_HP_EVIDENCE');
  const damaged=mutateLog(raw(),e=>{if(e.data.fields?.HealthValue)e.data.fields.HealthValue.value=500;});
  assert.equal(reviewRuntimeHP(parseProbeLogs([{name:'damaged.log',text:damaged}]),chain(),'ULTRA').totalHealth,7032);
});

test('HP overlay refuses changed HP or unrelated static fields and does not mutate caller inputs',()=>{
  const units=read('src/data/units.json'),before=structuredClone(units);overlay.staticProductionView(units);overlay.applyProductionHP(units);assert.deepEqual(units,before);
  for(const mutate of [u=>{u.entities.totalHealth=1;},u=>{u.movement.speed=99;},u=>{u.name='wrong';}]){
    const changed=structuredClone(units);mutate(changed.find(u=>u.name==='Skeleton Chariots'));assert.throws(()=>overlay.staticProductionView(changed));}
});

test('shared identity accepts only the exact HP projections and keeps diagnostic/source identity intact',()=>{
  const {assertSharedUnitIdentity}=require('../.test-build/src/repositories/unitSharedIdentity.js');
  const {unitDiagnosticRepository:diagnostics}=require('../.test-build/src/repositories/unitDiagnosticRepository.js');
  const units=read('src/data/units.json');
  for(const admission of committed.admitted){const unit=units.find(u=>u.id===admission.id),diagnostic=diagnostics.get(unit.id);if(!diagnostic)continue;
    assert.doesNotThrow(()=>assertSharedUnitIdentity(unit,diagnostic));
    for(const mutate of [u=>{u.entities.totalHealth++;},u=>{u.movement.speed=99;},u=>{u.entities.count=12;}]){
      const changed=structuredClone(unit);mutate(changed);assert.throws(()=>assertSharedUnitIdentity(changed,diagnostic),/collision/);}
  }
});

test('three original ULTRA captures admit exact totals; only their HP fields change from the two-HP baseline',async()=>{
  const {replayHP,byteHash}=await modules(),report=replayHP(manifest),units=read('src/data/units.json');
  const expected=[['wh_main_emp_inf_swordsmen',8280,120],['wh_main_brt_cav_mounted_yeomen_0',5520,60],['wh_dlc01_chs_mon_dragon_ogre',9856,16]];
  const previous=structuredClone(units);
  for(const a of read(base+'static-review.json').admitted)delete previous.find(u=>u.id===a.id).entities.totalHealth;
  for(const admission of committed.admitted.slice(5))delete previous.find(u=>u.id===admission.id).entities.totalHealth;
  for(const [main,hp,count] of expected){
    const r=report.review.find(r=>r.staticChain.sourceMainKey===main);
    assert.equal(r.status,'REVIEWED_DIRECT_ULTRA_RUNTIME');assert.equal(r.approved,true);assert.equal(r.totalHealth,hp);assert.deepEqual(r.held,[]);
    assert(r.candidates.length>0);
    for(const c of r.candidates){assert.equal(c.kind,'DIRECT_ULTRA_RUNTIME');assert.equal(c.HealthMax,hp);assert.equal(c.NumEntitiesInitial,count);
      assert.equal(c.metadata.unitSize,'ULTRA');assert.equal(c.metadata.unitSizeSource,'DECLARED_SETUP');assert.equal(c.metadata.staticSnapshotId,r.staticChain.staticSnapshotId);}
    const unit=units.find(u=>u.id==='ca_unit_'+main);assert.equal(unit.entities.totalHealth,hp);assert.equal(unit.entities.healthPerEntity,undefined);
    delete previous.find(u=>u.id===unit.id).entities.totalHealth;
  }
  assert.equal(report.review.find(r=>r.name==='Dragon Ogres').candidates.length,2);
  assert.equal(units.find(u=>u.name==='Dread Saurian').entities.totalHealth,15088);
  assert.equal(units.find(u=>u.name==='Skeleton Chariots').entities.totalHealth,7032);
  assert.equal(byteHash(Buffer.from(overlay.serialize(previous))),'077fc0ca25e6926817ed57d5e7e9e0c37ea1abbef31ec5b38c8445b2e1eb5bfa');
  // Removing the new raw sources must still fail the same unchanged policy.
  const missing=structuredClone(manifest);missing.inputs=missing.inputs.slice(0,2);
  for(const subject of missing.subjects)if(subject.id!==manifest.subjects[3].id&&subject.id!==manifest.subjects[4].id)subject.approved=false;
  const held=replayHP(missing);
  for(const [main] of expected){const r=held.review.find(r=>r.staticChain.sourceMainKey===main);
    assert.equal(r.status,'WITHHELD');assert.deepEqual(r.held,[{reason:'NO_MATCHING_ULTRA_RECORD'}]);assert.equal(r.totalHealth,undefined);
    const forced=structuredClone(missing);forced.subjects.find(s=>s.mainKey===main).approved=true;assert.throws(()=>replayHP(forced),/approved HP failed replay/);}
});
