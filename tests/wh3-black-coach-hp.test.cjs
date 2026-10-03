const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const speedOverlay=require('../tools/wh3-importer/speed-policy/overlay.cjs');
const rawRead=file=>JSON.parse(readFileSync(file));
const read=file=>file==='src/data/units.json'?speedOverlay.withoutSpeed(rawRead(file)):rawRead(file);
const base='tools/wh3-importer/hp-policy/',folder='tools/wh3-importer/hp-research/';
const manifest=read(base+'manifest.json'),review=read(base+'review.json'),key='wh_main_vmp_veh_black_coach';
const subject=review.review.find(r=>r.staticChain.sourceMainKey===key);
const modules=async()=>({...await import('../tools/wh3-importer/hp-policy/policy.mjs'),...await import('../tools/wh3-importer/runtime-evidence/cco-probe/ingest.mjs')});
const raw=()=>readFileSync(base+'inputs/script_log_031026_1359.txt','utf8');
const parsed=async()=>{const {parseProbeLogs}=await modules();return parseProbeLogs([{name:'inputs/script_log_031026_1359.txt',text:raw()}]);};
const mutate=fn=>raw().split('\n').map(line=>{const i=line.indexOf('WH3_RUNTIME_PROBE|');if(i<0)return line;
  const e=JSON.parse(line.slice(i+18));fn(e);return line.slice(0,i)+'WH3_RUNTIME_PROBE|'+JSON.stringify(e);}).join('\n');

test('original Black Coach raw admits two complete stable snapshots as one session, with exact component keys',async()=>{
  const {byteHash,reconstructRuns,value}=await modules(),input=manifest.inputs.at(-1),bytes=readFileSync(base+input.file);
  assert.equal(bytes.length,32685);assert.equal(byteHash(bytes),'e30d36fca619cb18fdd894a718181cda61c945a6b809b583441a712238f9acba');
  assert.equal(byteHash(bytes),input.originalSha256);if(existsSync(input.originalPath))assert.deepEqual(bytes,readFileSync(input.originalPath));
  const data=await parsed();assert.equal(data.events.length,28);assert.deepEqual(data.problems,[]);
  const runs=reconstructRuns(data);assert.equal(runs.length,2);assert.equal(new Set(runs.map(r=>JSON.parse(r.id)[0])).size,1);
  for(const r of runs){assert.equal(r.completed,true);assert.deepEqual(r.problems,[]);assert.equal(r.metadata.unitSize,'ULTRA');
    assert.equal(r.metadata.unitSizeSource,'DECLARED_SETUP');assert.equal(r.metadata.gameVersion,'9.0.2.0');
    assert.equal(r.metadata.staticSnapshotId,subject.staticChain.staticSnapshotId);
    for(const f of r.frames){assert.equal(value(f.fields['UnitRecordContext.Key']),key);assert.equal(value(f.fields['UnitRecordContext.UnitLandRecordContext.Key']),key);
      for(const n of ['HealthMax','HealthValue'])assert.equal(value(f.fields[n]),5980);
      for(const n of ['NumEntitiesInitial','NumEntities'])assert.equal(value(f.fields[n]),1);
      assert.deepEqual(Object.fromEntries(Object.entries(f.lists).map(([n,l])=>[n,value(l.size)])),{ManList:1,MountList:2,EngineList:1,EntityList:1});
      for(const [list,entity] of [['EngineList','wh_main_vehicle_vmp_black_coach_chariot'],['EntityList','wh_main_vehicle_vmp_black_coach_chariot_articulation'],
        ['MountList','wh_main_vehicle_vmp_black_coach_chariot_nightmare_draught']])for(const e of Object.values(f.lists[list].entries))assert.equal(value(e.fields['EntityRecordContext.Key']),entity);
    }
  }
  assert.equal(subject.status,'REVIEWED_DIRECT_ULTRA_RUNTIME');assert.deepEqual(subject.held,[]);assert.equal(subject.totalHealth,5980);
});

test('one conflicting, wrong-size, wrong-land or incomplete Black Coach snapshot prevents automatic selection',async()=>{
  const {parseProbeLogs,reviewRuntimeHP,replayHP}=await modules();
  for(const fn of [e=>{if(e.runId==='snapshot-2'&&e.data.fields?.HealthMax)e.data.fields.HealthMax.value=5988;},
    e=>{if(e.runId==='snapshot-2')e.metadata.unitSize='MEDIUM';},
    e=>{if(e.runId==='snapshot-2'&&e.data.fields?.['UnitRecordContext.UnitLandRecordContext.Key'])e.data.fields['UnitRecordContext.UnitLandRecordContext.Key'].value='wrong';},
    e=>{if(e.runId==='snapshot-2'&&e.kind==='SNAPSHOT_END')e.kind='ERROR';}]){
    const r=reviewRuntimeHP(parseProbeLogs([{name:'mutated-in-memory.log',text:mutate(fn)}]),subject.staticChain,'ULTRA');
    assert.notEqual(r.status,'REVIEWED_DIRECT_ULTRA_RUNTIME');assert.equal(r.totalHealth,undefined);
  }
  const missing=structuredClone(manifest);missing.inputs.pop();assert.throws(()=>replayHP(missing),/approved HP failed replay/);
  missing.subjects.at(-1).approved=false;assert.equal(replayHP(missing).review.at(-1).totalHealth,undefined);
});

test('only Black Coach HP changes from the nine-HP baseline; original nine and all protected evidence stay stable',async()=>{
  const {byteHash,replayHP}=await modules(),prior=replayHP(read(folder+'nine-unit-manifest.json'));
  assert.deepEqual(review.review.slice(0,9),prior.review);assert.deepEqual(review.admitted.slice(0,9),prior.admitted);
  const units=read('src/data/units.json'),before=structuredClone(units),black=before.find(u=>u.id==='ca_unit_'+key);
  for(const a of read(base+'static-review.json').admitted)delete before.find(u=>u.id===a.id).entities.totalHealth;
  assert.equal(black.entities.totalHealth,5980);assert.equal(black.entities.healthPerEntity,undefined);delete black.entities.totalHealth;
  assert.equal(byteHash(Buffer.from(JSON.stringify(before,null,2)+'\n')),'a61b96fbfbf204b43f3d8583c3c771adfbf0b2b948919998fd95c115b65c0057');
  assert.deepEqual(units.filter(u=>u.gameVersion==='sample'),before.filter(u=>u.gameVersion==='sample'));
  assert.equal(units.filter(u=>u.gameVersion!=='sample'&&u.entities.totalHealth===undefined).length,88);
  assert.equal(byteHash(readFileSync(base+'policy.mjs')),'ce13f0ec90cc3e13003515ed7446d2f6927f3cd7341493a179562d46e22ef37a');
  const {checkProtectedInputs}=await import('../tools/wh3-importer/hp-research/research.mjs');checkProtectedInputs();
});

test('ten-case research deterministically rejects the original 5988 forecast and preserves source/count aliases',async()=>{
  const {buildBlackCoachResearch}=await import('../tools/wh3-importer/hp-research/black-coach.mjs'),result=buildBlackCoachResearch();
  assert.equal(JSON.stringify(result,null,2)+'\n',readFileSync(folder+'black-coach.json','utf8'));assert.deepEqual(buildBlackCoachResearch(),result);
  assert.equal(result.cases.length,10);assert.deepEqual(result.cases.map(c=>c.runtime.HealthMax),[8280,5520,9856,15088,7032,4512,4356,5028,6128,5980]);
  assert.deepEqual(result.cases.map(c=>c.runtime.NumEntitiesInitial),[120,60,16,1,12,4,4,4,8,1]);
  for(const c of result.cases){assert.equal(c.productionEligible,false);assert(c.comparisons.V_N.matchesHealth&&c.comparisons.V_N.matchesCount);assert.equal(c.runtime.unitProfileSampleWeight,1);}
  assert.deepEqual(result.survivingReviewedFormulations,['V_N']);assert.deepEqual(result.blackCoachDecision.differingTerm,{V_N:8,V_UG:16,delta:8});
  assert.deepEqual(result.blackCoachDecision.observed,{HealthMax:5980,NumEntitiesInitial:1});assert.equal(result.blackCoachDecision.independentSessionCount,1);
  const black=result.cases.at(-1);assert.equal(black.comparisons.V_N.formula,'B*G + M*N + H*U*G + E*G + A*G');
  assert.equal(black.comparisons.V_UG.formula,'B*G + M*(U*G) + H*U*G + E*G + A*G');assert.equal(black.comparisons.V_UG.matchesHealth,false);
  assert.deepEqual(black.roleMismatches,['man']);assert.deepEqual(black.runtime.listEntityKeys.ManList,['wh_main_infantry_rider']);
});

test('six-condition assessment yields a bounded confident subset, including three unmeasured identical HP profiles with separate explicit static admissions',()=>{
  const result=read(folder+'black-coach.json');assert.deepEqual(result.counts,{production:101,directRuntimeHP:10,missingHP:91,
    STATIC_DERIVATION_CONFIDENT:10,STATIC_DERIVATION_AMBIGUOUS:91,STATIC_DERIVATION_UNAVAILABLE:0});
  const confident=result.catalog.filter(c=>c.assessment.status==='STATIC_DERIVATION_CONFIDENT');
  for(const c of confident){assert(Object.values(c.assessment.checks).every(Boolean));assert.equal(c.assessment.productionEligible,false);assert.equal(c.assessment.reviewedHPOutputs.length,1);}
  const unmeasured=confident.filter(c=>!result.cases.some(s=>s.id===c.id));
  assert.deepEqual(unmeasured.map(c=>c.name),['Spearmen (Shields)','Battle Pilgrims','Blessed Field Trebuchets']);
  for(const c of unmeasured){assert(!review.admitted.some(a=>a.id===c.id));assert.equal(read('src/data/units.json').find(u=>u.id===c.id).entities.totalHealth,c.assessment.reviewedHPOutputs[0]);
    assert.equal(read('src/data/unitHpAdmissions.json').admissions.find(a=>a.id===c.id).kind,'STATIC_DERIVED_HP');}
  const blessed=result.catalog.find(c=>c.name==='Blessed Field Trebuchets'),field=result.catalog.find(c=>c.name==='Field Trebuchets');
  assert.equal(blessed.hpProfileSha256,field.hpProfileSha256);assert.notEqual(blessed.componentRecords.engineRecord,field.componentRecords.engineRecord);
  assert.equal(blessed.componentRecords.engine,field.componentRecords.engine);
  assert.equal(result.classes.find(c=>c.id==='ARTILLERY').catalogCount,6);assert.equal(result.classes.find(c=>c.id==='ARTILLERY').confidentIds.length,4);
  for(const name of ['Doom-Flayers','Dread Saurian','Black Coach']){
    const c=result.catalog.find(c=>c.name===name);assert.equal(c.assessment.status,'STATIC_DERIVATION_AMBIGUOUS');
    assert.equal(c.assessment.checks.REQUIRED_STATIC_MULTIPLICITIES_VERIFIED,false);
  }
  assert.equal(result.additionalMeasurements.needed,false);assert.deepEqual(result.additionalMeasurements.candidates,[]);
});

test('new HP profile, unknown joins/counts, extra roles and differing source aliases cannot inherit confidence',async()=>{
  const {assessProfile}=await import('../tools/wh3-importer/hp-research/black-coach.mjs'),result=read(folder+'black-coach.json'),c=result.cases[0];
  assert.equal(assessProfile(c,result.cases,['V_N']).status,'STATIC_DERIVATION_CONFIDENT');
  for(const fn of [x=>{x.staticValues['land.bonus_hit_points']++;},x=>{x.componentRecords.man='unknown';},
    x=>{x.staticValues['main.num_men']++;},x=>{x.joinShape['man.hit_points'].joins[0].field='wrong';},
    x=>{x.extraEntities.push({key:'unknown-extra'});},x=>{x.staticSnapshotId='0'.repeat(64);}]){
    const changed=structuredClone(c);fn(changed);assert.equal(assessProfile(changed,result.cases,['V_N']).status,'STATIC_DERIVATION_AMBIGUOUS');
  }
  const missing=structuredClone(c);missing.missing.push('man.exact_entity_hp');assert.equal(assessProfile(missing,result.cases,['V_N']).status,'STATIC_DERIVATION_UNAVAILABLE');
  const mounted=structuredClone(result.cases.find(c=>c.name==='Mounted Yeomen'));mounted.staticValues['mount.hit_points']++;
  assert.equal(assessProfile(mounted,result.cases,['V_N']).checks.NO_DIFFERING_SURVIVING_HP_PREDICTION,false);
});
