const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const React=require('react');
const {renderToString}=require('react-dom/server');
const {gameRepository:game}=require('../.test-build/src/repositories/gameRepository.js');
const {applyUnitEntities,withoutUnitEntities,unitEntityAdmission}=require('../.test-build/src/repositories/unitEntities.js');
const Details=require('../.test-build/src/components/UnitProductionDetails.js').default;
const read=p=>JSON.parse(fs.readFileSync(p));
const folder='tools/wh3-importer/unit-entities/';
const report=read(folder+'rules-report.json'),fixture=read(folder+'ground-truth.json');
const projection=read('src/data/unitHpEntityRuleAdmissions.json');
const production=game.listUnits().filter(u=>u.gameVersion!=='sample');

test('frozen thirteen-case training set reproduces displayed Ultra count and total HP in every branch',async()=>{
  const {predictRule}=await import('../tools/wh3-importer/unit-entities/rules.mjs');
  assert.equal(fixture.cases.length,13);
  for(const truth of fixture.cases){
    const c=report.catalog.find(c=>c.id===truth.id),p=predictRule(c),u=game.getUnit(truth.id);
    assert.equal(p.count,truth.count,truth.name);assert.equal(p.totalHealth,truth.totalHealth,truth.name);
    assert.equal(u.entities.count,truth.count);assert.equal(u.entities.totalHealth,truth.totalHealth);
    assert.equal(u.entities.healthPerEntity,undefined);
  }
  assert.equal(report.training.filter(t=>t.measurementKind==='DIRECT_ULTRA_RUNTIME').length,10);
  assert.equal(report.training.filter(t=>t.measurementKind==='RUNTIME_VALIDATED_EXACT_PROFILE').length,3);
  assert(report.rules.every(r=>r.directRuntimeAnchors>0&&r.countMatches===r.anchors.length&&r.hpMatches===r.anchors.length));
});

test('global candidates are rejected by measured deltas; Black Coach distinguishes articulated crew multiplicity',()=>{
  const t=name=>report.training.find(t=>t.name===name);
  assert.deepEqual(t('Swordsmen').hpCandidates.MAN,{expected:8280,actual:8280,delta:0,matches:true});
  assert.equal(t('Mounted Yeomen').hpCandidates.MAN.actual,5040);
  assert.equal(t('Dread Saurian').countCandidates.N.actual,12);
  assert.equal(t('Field Trebuchets').hpCandidates.CREW.actual,2332);
  assert.equal(t('Field Trebuchets').hpCandidates.ENGINE.actual,2180);
  assert.equal(t('Field Trebuchets').hpCandidates.ARTILLERY.actual,4512);
  assert.equal(t('Skeleton Chariots').hpCandidates.ARTICULATED_N.actual,7032);
  assert.equal(t('Skeleton Chariots').hpCandidates.ARTICULATED_UG.actual,7032);
  assert.equal(t('Black Coach').hpCandidates.ARTICULATED_N.actual,5980);
  assert.equal(t('Black Coach').hpCandidates.ARTICULATED_UG.actual,5988);
  for(const trial of report.training){
    assert.equal(Object.keys(trial.hpCandidates).length,11);
    for(const c of Object.values(trial.hpCandidates))assert.equal(c.matches,c.actual===c.expected);
  }
});

test('mass promotion reaches current repository and agrees with field and category coverage',()=>{
  assert.equal(production.length,1110);
  assert.equal(production.filter(u=>u.entities.count!==undefined).length,1071);
  assert.equal(production.filter(u=>u.entities.totalHealth!==undefined).length,986);
  assert.equal(production.filter(u=>u.entities.healthPerEntity!==undefined).length,0);
  assert.deepEqual(report.summary.combined,{complete:986,partial:85,unknown:39});
  assert.equal(report.summary.newIdentities,1058);assert.equal(report.summary.newHP,973);
  assert.equal(report.rules.find(r=>r.id==='MAN_ONLY_N').hpKnown,773);
  for(const c of report.catalog){
    const u=game.getUnit(c.id);assert.equal(u.entities.count??null,c.prediction.count,c.id);
    assert.equal(u.entities.totalHealth??null,c.prediction.totalHealth,c.id);
    const man=c.sourceFields['land.man_entity'].source;
    assert(c.sourceFields['main.num_men'].source.rowId&&report.joinPaths[man.pathId].length);
    assert.equal(report.sourceRows[man.sourceId].table,'land_units_tables');
  }
  assert.equal(report.categories.reduce((n,c)=>n+c.COMPLETE,0),986);
  assert.equal(report.categories.reduce((n,c)=>n+c.PARTIAL,0),85);
  assert.equal(report.categories.reduce((n,c)=>n+c.UNKNOWN,0),39);
});

test('untrained ratios, component HP changes, missing joins and unsafe values cannot produce complete HP',async()=>{
  const {predictRule,verifyRuleInputs}=await import('../tools/wh3-importer/unit-entities/rules.mjs');
  const get=name=>structuredClone(report.catalog.find(c=>c.name===name));
  const renamed=get('Swordsmen');renamed.id='unseen';renamed.name='Unseen';assert.equal(predictRule(renamed).totalHealth,8280);
  for(const mutate of [c=>c.rawValues['man.hit_points']=10,c=>c.rawValues['man.hit_points']=null,c=>c.missing.push('man.exact_entity_hp'),
    c=>c.rawValues['land.bonus_hit_points']=-1,c=>c.rawValues['land.bonus_hit_points']=Number.MAX_SAFE_INTEGER]){
    const c=get('Swordsmen');mutate(c);assert.equal(predictRule(c).totalHealth,null);
  }
  for(const n of [0,-1,0.5,Infinity,Number.MAX_SAFE_INTEGER+1]){const c=get('Swordsmen');c.rawValues['main.num_men']=n;assert.equal(predictRule(c).count,null);}
  const mounted=get('Mounted Yeomen');mounted.rawValues['land.num_mounts']=48;assert.equal(predictRule(mounted).count,null);
  mounted.rawValues['land.num_mounts']=60;mounted.rawValues['mount.hit_points']=10;assert.equal(predictRule(mounted).totalHealth,null);
  const vehicle=get('Doom-Flayers');vehicle.rawValues['main.num_men']=16;assert.equal(predictRule(vehicle).count,null);
  const coach=get('Black Coach');coach.rawValues['articulation.hit_points']=null;coach.missing.push('articulation.exact_entity_hp');
  assert.equal(predictRule(coach).count,1);assert.equal(predictRule(coach).totalHealth,null);
  const arty=get('Field Trebuchets');arty.structuralFlags.engine_type='untrained';assert.equal(predictRule(arty).totalHealth,null);
  const manifest=read(folder+'rules-manifest.json');verifyRuleInputs(manifest);
  const changed=structuredClone(manifest);changed.inputs[0].hash='changed';assert.throws(()=>verifyRuleInputs(changed),/source drift/);
  assert.throws(()=>verifyRuleInputs({...manifest,unitSize:'LARGE'}));
});

test('additional structural samples are explicit forecasts and include infantry, single body, flying and swarm',()=>{
  for(const category of ['INFANTRY','MONSTROUS_INFANTRY','SINGLE_ENTITY_BODY','CAVALRY','MOUNT_WITH_CREW','ARTILLERY','FLYING_MOUNTED','SWARM'])assert(report.samples.some(s=>s.category===category));
  for(const s of report.samples){assert.equal(s.independentReference,null);assert(s.result.includes('NOT AN INDEPENDENT_MEASUREMENT'));}
  assert.equal(report.samples.find(s=>s.name==='Pegasus Knights').prediction.totalHealth,6264);
  assert.equal(report.samples.find(s=>s.name==='Nurglings').prediction.totalHealth,9300);
  assert.equal(report.samples.find(s=>s.name==='Aspiring Champions').prediction.totalHealth,9856);
  assert.equal(report.characters.length,2);
  for(const c of report.characters)assert(!projection.admissions.some(a=>a.id===c.id));
  for(const u of game.listUnits().filter(u=>u.gameVersion==='sample'))assert.equal(unitEntityAdmission(u),undefined);
});

test('independent historical MEDIUM captures corroborate HP recipes without creating Ultra training or scaling',()=>{
  const necro=report.independentValidation.filter(c=>c.name==='Necrofex Colossus');
  const militia=report.independentValidation.filter(c=>c.name==='Free Company Militia');
  assert(necro.length>0&&militia.length>0);
  for(const c of necro){assert.equal(c.observedCount,1);assert.equal(c.observedTotalHealth,9507);assert.equal(c.expected,9507);}
  for(const c of militia){assert.equal(c.observedCount,60);assert.equal(c.observedTotalHealth,3660);assert.equal(c.expected,3660);assert.equal(c.ultraPrediction.count,120);}
  for(const c of report.independentValidation){assert.equal(c.unitSize,'MEDIUM');assert.equal(c.delta,0);assert.equal(c.ultraDirectlyValidated,false);assert(c.limitation.includes('corroboration only'));}
  assert.equal(report.training.length,13);
});

test('exact overlays restore original HP/count and partial UI never invents chassis HP',()=>{
  const raw=read('src/data/units.json');
  for(const original of raw){assert.deepEqual(withoutUnitEntities(applyUnitEntities(original)),original);}
  const current=game.getUnit('ca_unit_wh_main_emp_veh_steam_tank');assert.equal(current.entities.count,1);assert.equal(current.entities.totalHealth,undefined);
  const html=renderToString(React.createElement(Details,{unit:current}));assert(html.includes('개체 수 확인 · 총 HP 미확인'));
  const known=production.find(u=>unitEntityAdmission(u)?.kind==='EMPIRICAL_CATEGORY_RULE'&&u.entities.totalHealth!==undefined);
  const drift={...known,entities:{...known.entities,totalHealth:known.entities.totalHealth+1}};
  assert.deepEqual(withoutUnitEntities(drift),drift);
  const original=raw.find(u=>u.id===known.id);assert.throws(()=>applyUnitEntities({...original,entities:{...original.entities,totalHealth:1}}),/identity drift/);
});

test('empirical review, pinned sources and projection replay deterministically',async()=>{
  const {buildRules}=await import('../tools/wh3-importer/unit-entities/rules.mjs');
  assert.deepEqual(buildRules(),{report,projection});
});
