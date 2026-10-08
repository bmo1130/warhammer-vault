const {withoutUnitResistances}=require('../.test-build/src/repositories/unitResistances.js');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const React=require('react');
const {renderToString}=require('react-dom/server');
const {MemoryRouter,Routes,Route}=require('react-router-dom');
const {gameRepository:game}=require('../.test-build/src/repositories/gameRepository.js');
const {applyUnitSpeed,withoutUnitSpeed,unitSpeedAdmission}=require('../.test-build/src/repositories/unitSpeed.js');
const {applyUnitEntities}=require('../.test-build/src/repositories/unitEntities.js');
const {applyUnitAttributes}=require('../.test-build/src/repositories/unitAttributes.js');
const {applyUnitPassives}=require('../.test-build/src/repositories/unitPassives.js');
const {localiseUnit}=require('../.test-build/src/repositories/unitLocalisation.js');
const UnitPage=require('../.test-build/src/pages/UnitPage.js').default;
const read=p=>JSON.parse(fs.readFileSync(p));
const folder='tools/wh3-importer/speed-rules/';
const report=read(folder+'report.json'),truth=read(folder+'ground-truth.json'),projection=read('src/data/unitSpeedRuleAdmissions.json');
const production=game.listUnits().filter(u=>u.gameVersion!=='sample');

test('all 81 original speeds and their static provenance survive without treating them as measurements',()=>{
  assert.equal(truth.legacy.length,81);assert.equal(report.regression.length,81);
  for(const old of truth.legacy){const current=game.getUnit(old.id),trial=report.regression.find(t=>t.id===old.id);
    assert.equal(current.movement.speed,old.value,old.id);assert.equal(trial.delta,0);
    assert.equal(old.kind,'STATIC_DERIVED_SPEED');assert.equal(unitSpeedAdmission(current).kind,'PRESERVED_STATIC_SPEED');
  }
  assert.equal(report.regression.filter(r=>r.directCardReference).length,6);
  assert.equal(truth.cases.filter(t=>t.phase==='TRAINING').length,3);
  assert.equal(truth.cases.filter(t=>t.phase==='INDEPENDENT_MOUNTED_HOLDOUT').length,3);
});

test('three fit cards and three independently held-out mounted cards select man, mount and engine and reproduce the UI',async()=>{
  const {predictSpeed}=await import('../tools/wh3-importer/speed-rules/rules.mjs');
  for(const v of report.validation){const t=report.catalog.find(t=>t.id===v.id),p=predictSpeed(t);
    assert.equal(p.value,v.value);assert.equal(p.role,v.selectedRole);assert.equal(v.result,'MATCH');
    assert.equal(v.candidates.SELECTED_RUN_X10.delta,0);assert.equal(v.observedGameVersion,null);
    assert.equal(v.contextModifiers,'NOT_REPORTED');assert.equal(v.kind,'USER_MANUAL_CARD');
  }
  const cold=report.validation.find(v=>v.name==='Cold One Riders');assert.equal(cold.candidates.MAN_RUN_X10.actual,33);assert.equal(cold.value,66);
  const yeomen=report.validation.find(v=>v.name==='Mounted Yeomen');assert.equal(yeomen.candidates.SELECTED_RUN.actual,9.2);assert.equal(yeomen.value,92);
  const treb=report.validation.find(v=>v.name==='Field Trebuchets');assert.equal(treb.candidates.MAN_RUN_X10.actual,30);assert.equal(treb.value,20);
  assert(report.candidateSummary.find(c=>c.candidate==='SELECTED_WALK_X10').manualMatches<6);
  assert(report.candidateSummary.find(c=>c.candidate==='SELECTED_CHARGE_X10').manualMatches<6);
  for(const c of ['ROUND_RUN_X10','FLOOR_RUN_X10','CEIL_RUN_X10'])assert.equal(report.candidateSummary.find(v=>v.candidate===c).manualMatches,6);
});

test('Production and audit materialize exactly 908 speeds with the three topology rules',async()=>{
  assert.equal(production.length,1110);assert.equal(production.filter(u=>u.movement.speed!==undefined).length,908);
  assert.deepEqual(report.summary,{production:1110,before:81,after:908,unknownBefore:1029,unknownAfter:202,promoted:827,
    COMPLETE:908,PARTIAL:125,UNKNOWN:77,regressionMatches:81,directManualSamples:6,independentMountedHoldouts:3});
  assert.deepEqual(report.rules.map(r=>[r.stored,r.promoted]),[[683,613],[187,178],[38,36]]);
  for(const c of report.catalog){assert.equal(game.getUnit(c.id).movement.speed??null,c.prediction.value,c.id);
    for(const fields of Object.values(c.roleFields))for(const fact of Object.values(fields).filter(Boolean)){
      assert(report.sourceRows[fact.sourceId].rowId);assert(Array.isArray(report.joinPaths[fact.pathId]));assert(fact.field);
    }
  }
  const {auditUnitData}=await import('../scripts/audit-unit-data.mjs');
  assert.deepEqual(auditUnitData().coverage['movement.speed'],{known:908,unknown:202});
  assert.equal(report.categories.reduce((n,c)=>n+c.COMPLETE,0),908);
});

test('ground structures generalize by topology; flight, synchronization, other engines, missing sources and fractional displays remain held',async()=>{
  const {predictSpeed}=await import('../tools/wh3-importer/speed-rules/rules.mjs');
  const get=name=>structuredClone(report.catalog.find(t=>t.name===name));
  const unseen=get('Swordsmen');unseen.id='unseen';unseen.name='Unseen';unseen.mainKey='unseen';unseen.landKey='unseen';unseen.roles.man.run_speed=4.7;
  assert.equal(predictSpeed(unseen).value,47);
  for(const mutate of [t=>t.roles.man.fly_speed=10,t=>t.roles.man.flying_charge_speed=12,t=>t.flags.sync_locomotion=true,
    t=>t.flags.mounted_draughts=true,t=>t.missing.push('man.EXACT_JOIN_MISSING'),t=>t.extraSources.push('unknown'),
    t=>t.roles.man.run_speed=3.125,t=>t.roles.man.run_speed=NaN,t=>t.roles.man.run_speed=-1]){
    const t=get('Swordsmen');mutate(t);assert.equal(predictSpeed(t).value,null);
  }
  const arty=get('Field Trebuchets');arty.flags.engine_type='Generic_2_Crew';assert.equal(predictSpeed(arty).value,null);
  for(const name of ['Black Coach','Skeleton Chariots','Pegasus Knights','Doom-Flayers','Steam Tank'])assert.equal(predictSpeed(get(name)).value,null,name);
  assert.equal(predictSpeed(get('Flame Cannons')).value,25);
  assert.equal(report.catalog.filter(t=>t.prediction.value!==null&&t.roles[t.prediction.role].run_speed===0).length,0);
  assert(report.catalog.some(t=>t.terrainModifiers.some(m=>m.multiplier!==1)));
});

test('fresh artillery source restores 34 missing chains with unchanged snapshot and overlapping speed fields',()=>{
  assert.equal(report.supplements.length,40);assert.equal(report.supplements.filter(v=>v.previousMissing).length,34);
  assert(report.supplements.every(v=>v.result==='EXACT_SNAPSHOT_AND_OVERLAPPING_FIELDS_MATCH'));
  const source=read(folder+'artillery.source.json');assert.equal(source.rows.length,158);
  assert.equal(new Set(source.rows.filter(r=>r.table==='main_units_tables').map(r=>r.row.unit)).size,40);
  assert.equal(source.provenance.gameVersion,'9.0.2.0');
  assert.equal(report.characters.length,2);assert(report.characters.every(c=>c.status==='OUTSIDE_UNIT_SPEED_SLICE'));
});

test('speed-only overlay preserves every other Unit field, HP/count, names, rosters and immutable data',()=>{
  for(const raw of read('src/data/units.json')){
    const before=applyUnitEntities(applyUnitPassives(applyUnitAttributes(localiseUnit(raw)))),after=game.getUnit(raw.id);
    assert.deepEqual(withoutUnitSpeed(withoutUnitResistances(after)),before,raw.id);
    assert.deepEqual(withoutUnitSpeed(applyUnitSpeed(raw)),raw);
    if(raw.gameVersion==='sample')assert.equal(unitSpeedAdmission(after),undefined);
  }
  assert.equal(production.filter(u=>u.entities.count!==undefined).length,1071);
  assert.equal(production.filter(u=>u.entities.totalHealth!==undefined).length,986);
  assert.equal(production.filter(u=>/[가-힣]/.test(u.name)).length,1110);
  assert.equal(game.listFactions().filter(f=>game.getRosterCoverage(f.id)?.status==='ROSTER COMPLETE').length,23);
  const paths=spawnSync('git',['ls-tree','-r','--name-only','4d41fa6','--','src/data'],{encoding:'utf8'});assert.equal(paths.status,0);
  for(const path of paths.stdout.trim().split('\n')){
    const old=spawnSync('git',['show',`4d41fa6:${path}`],{maxBuffer:128*1024*1024});assert.equal(old.status,0);
    assert.equal(fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n'),old.stdout.toString().replace(/\r\n/g,'\n'),path);
  }
});

test('exact overlay guards reject version/value drift and cannot hide modified speed',()=>{
  const original=read('src/data/units.json').find(u=>u.id==='ca_unit_wh_main_emp_art_great_cannon');
  assert.throws(()=>applyUnitSpeed({...original,gameVersion:'changed'}),/identity drift/);
  assert.throws(()=>applyUnitSpeed({...original,movement:{...original.movement,speed:99}}),/identity drift/);
  const current=game.getUnit(original.id),changed={...current,movement:{...current.movement,speed:99}};
  assert.deepEqual(withoutUnitSpeed(changed),changed);assert.equal(unitSpeedAdmission(changed),undefined);
});

test('Production UnitPage shows newly promoted Speed with derived provenance and leaves flight unresolved',()=>{
  const page=id=>renderToString(React.createElement(MemoryRouter,{initialEntries:['/units/'+id]},React.createElement(Routes,null,
    React.createElement(Route,{path:'/units/:id',element:React.createElement(UnitPage)})))).replace(/<!--.*?-->/g,'');
  const known=page('ca_unit_wh_main_emp_art_great_cannon');assert(known.includes('<span>속도</span><strong>20</strong>'));
  assert(known.includes('검증된 구조 규칙으로 추론'));assert(known.includes('포병 엔진'));assert(known.includes(projection.sourceHash));
  const old=page('ca_unit_wh_main_emp_inf_swordsmen');assert(old.includes('기존 검증값 보존'));assert(old.includes('게임 카드 확인 표본'));
  const flight=page('ca_unit_wh_main_brt_cav_pegasus_knights');assert(flight.includes('<span>속도</span><strong>미입력</strong>'));
});

test('full catalog, source pins, candidate comparisons and projection replay deterministically',async()=>{
  const {buildSpeedRules,verifyInputs}=await import('../tools/wh3-importer/speed-rules/rules.mjs');
  assert.deepEqual(buildSpeedRules(),{report,projection});const manifest=read(folder+'manifest.json');verifyInputs(manifest);
  const changed=structuredClone(manifest);changed.inputs[0].hash='changed';assert.throws(()=>verifyInputs(changed),/Speed source drift/);
});
