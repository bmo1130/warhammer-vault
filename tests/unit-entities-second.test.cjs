const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {gameRepository:game}=require('../.test-build/src/repositories/gameRepository.js');
const {applyUnitEntities,withoutUnitEntities,unitEntityAdmission}=require('../.test-build/src/repositories/unitEntities.js');
const read=p=>JSON.parse(fs.readFileSync(p)),folder='tools/wh3-importer/entities-second/';
const report=read(folder+'report.json'),projection=read('src/data/unitHpEntitySecondAdmissions.json'),old=read('src/data/unitHpEntityRuleAdmissions.json');

test('second slice preserves all 986 HP and 1071 counts while promoting count and HP independently',()=>{
  assert.deepEqual(report.summary,{production:1110,countBefore:1071,countAfter:1097,hpBefore:986,hpAfter:1026,newCount:26,newHP:40,newIdentities:62,
    COMPLETE:1026,PARTIAL:71,UNKNOWN:13,originalHPRegression:986,originalCountRegression:1071,groundTruthRegression:13,
    exactHPChainsRecovered:40,healthPerEntityKnown:0,newDirectGameMeasurements:0});
  for(const a of old.admissions){const u=game.getUnit(a.id);if(a.count!==null)assert.equal(u.entities.count,a.count,a.id);if(a.totalHealth!==null)assert.equal(u.entities.totalHealth,a.totalHealth,a.id);}
  for(const a of projection.admissions){const u=game.getUnit(a.id);assert.equal(u.entities.count,a.count,a.id);assert.equal(u.entities.totalHealth??null,a.totalHealth,a.id);assert.equal(unitEntityAdmission(u).sourceHash,projection.sourceHash);}
  assert.equal(projection.admissions.filter(a=>a.totalHealth===null).length,22);
  assert.deepEqual(report.groups.map(g=>[g.originalStatus,g.newCount,g.newHP,g.COMPLETE,g.PARTIAL,g.UNKNOWN]),[['PARTIAL',0,36,36,49,0],['UNKNOWN',26,4,4,22,13]]);
});

test('artillery bonus applies to both crew and guns; vehicle bonus follows engines rather than every rider',()=>{
  const cannon=report.catalog.find(c=>c.mainKey==='wh_main_emp_art_great_cannon');assert.equal(cannon.rawValues['main.num_men'],44);
  assert.equal(cannon.prediction.count,4);assert.equal(cannon.prediction.totalHealth,(48+8)*44+(48+425)*4);assert.equal(cannon.prediction.hpRule,'ARTILLERY');
  const pump=report.catalog.find(c=>c.mainKey==='wh2_dlc15_grn_veh_snotling_pump_wagon_0');
  assert.equal(pump.prediction.count,12);assert.equal(pump.prediction.totalHealth,400*12+8*24+8*12);assert.equal(pump.prediction.totalHealth,5088);
  assert.equal(pump.candidates.VEHICLE,9888);assert.notEqual(pump.candidates.VEHICLE,pump.publisherCard.totalHealth);
  const chariot=report.catalog.find(c=>c.mainKey==='wh2_dlc09_tmb_veh_skeleton_archer_chariot_0');
  assert.equal(chariot.prediction.count,12);assert.equal(chariot.prediction.totalHealth,7032);assert.equal(chariot.rawValues['articulation.hit_points'],8);
  assert.deepEqual(report.structures.map(s=>[s.rule,s.newCount,s.newHP]),[['ARTILLERY',0,34],['NATIVE_ENGINE_CARD_G',22,0],['ENGINE_CREW',4,5],['ARTICULATED_N',0,1]]);
  assert(report.catalog.filter(c=>c.prediction.totalHealth!==null).every(c=>!c.missing.length));
});

test('mounted reference conflicts are held rather than fitted by identity overrides or value copying',()=>{
  const held=report.catalog.filter(c=>c.status==='UNKNOWN');assert.equal(held.length,13);
  for(const c of held){assert.equal(c.shape,'MOUNTED');assert(c.prediction.reasons.includes('INDEPENDENT_MOUNT_CARD_CONFLICT:N_VS_U_AND_HP_MULTIPLICITY'));
    assert.equal(game.getUnit(c.id).entities.count,undefined);assert.equal(game.getUnit(c.id).entities.totalHealth,undefined);
    assert.notEqual(c.independentCandidate.count,c.publisherCard.count);assert.notEqual(c.independentCandidate.totalHealth,c.publisherCard.totalHealth);}
  const wild=held.find(c=>c.mainKey==='wh_dlc05_wef_cav_wild_riders_0');
  assert.deepEqual(wild.independentCandidate,{count:60,totalHealth:6900});assert.equal(wild.publisherCard.count,40);assert.equal(wild.publisherCard.totalHealth,4760);
});

test('only supported complete chains yield HP; absent HP is distinct from zero and known count survives',async()=>{
  const {predictSecond}=await import('../tools/wh3-importer/entities-second/rules.mjs');
  const known=report.catalog.find(c=>c.prediction.hpRule==='ARTILLERY'),nameFree=structuredClone(known);
  nameFree.id='unseen';nameFree.name='Unseen';nameFree.mainKey='unseen';nameFree.landKey='unseen';assert.deepEqual(predictSecond(nameFree),known.prediction);
  for(const mutate of [c=>c.missing.push('engine.EXACT_HP_MISSING'),c=>c.rawValues['engine.hit_points']=null,
    c=>c.rawValues['engine.hit_points']=0,c=>c.rawValues['engine.hit_points']=-1,c=>c.rawValues['land.bonus_hit_points']=-1,
    c=>c.rawValues['land.bonus_hit_points']=Number.MAX_SAFE_INTEGER,c=>c.structuralFlags.engine_type='Unknown']){
    const c=structuredClone(known);mutate(c);assert.equal(predictSecond(c).totalHealth,null);}
  const missing=structuredClone(known);missing.missing.push('engine.EXACT_HP_MISSING');assert.equal(predictSecond(missing).count,4);
  for(const n of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){const c=structuredClone(known);c.rawValues['land.num_engines']=n;assert.equal(predictSecond(c).count,null);assert.equal(predictSecond(c).totalHealth,null);}
});

test('baseline thirteen tuples and MEDIUM corroboration remain separate from new website card evidence',()=>{
  assert.equal(report.training.length,13);assert.equal(report.training.filter(c=>c.directMeasurement).length,10);
  for(const g of report.training){assert.equal(g.actual.count,g.count);assert.equal(g.actual.totalHealth,g.totalHealth);}
  assert(report.independentMediumValidation.length>0);for(const g of report.independentMediumValidation){assert.equal(g.unitSize,'MEDIUM');assert.equal(g.delta,0);assert.equal(g.ultraDirectlyValidated,false);}
  assert.equal(report.browserValidation.filter(c=>c.result==='MATCH').length,5);assert.equal(report.browserValidation.filter(c=>c.result==='CONFIRMS_REFERENCE_CONFLICT').length,1);
  assert.equal(report.confidence.newDirectGameMeasurements,0);assert.equal(report.confidence.publisherUpstreamResolved,false);
});

test('exact 9.0.2 provenance, schemas and independent raw fields recover HP; fresh 9.0.3 never supplies admitted values',async()=>{
  const {decodeSource}=await import('../tools/wh3-importer/missile-rules/source.mjs');
  const stored=decodeSource(read(folder+'stored.source.json')),fresh=decodeSource(read(folder+'fresh.source.json'));
  assert.equal(stored.rows.length,510);assert.equal(report.rowChecks.length,510);assert(report.rowChecks.every(c=>c.result==='MATCH'));
  assert.equal(stored.chains.filter(c=>!c.missing.length).length,53);assert.equal(report.catalog.filter(c=>!c.missing.length&&c.originalMissing.length).length,40);
  assert(stored.rows.every(r=>r.provenance.gameVersion==='9.0.2.0'));assert.equal(fresh.provenance.gameVersion,'9.0.3.0');assert.equal(fresh.rows.length,627);assert.notEqual(fresh.snapshotId,stored.snapshotId);
  assert.equal(fresh.gameExecuted,false);assert.equal(report.confidence.freshAdmitted,false);assert(stored.archives.every(a=>a.added===0));
  for(const c of report.catalog.filter(c=>c.status==='PARTIAL')){assert(c.missing.length);assert.equal(c.prediction.totalHealth,null);assert(c.prediction.count>0);}
});

test('second entity overlay changes only count/totalHealth and preserves Speed, missiles, resistances, ability catalog and roster',()=>{
  const raw=read('src/data/units.json');for(const a of projection.admissions){const unit=raw.find(u=>u.id===a.id),current=applyUnitEntities(unit);
    assert.deepEqual({...current,entities:unit.entities},unit);assert.deepEqual(withoutUnitEntities(current),unit);assert.equal(current.entities.healthPerEntity,undefined);
    assert.throws(()=>applyUnitEntities({...unit,gameVersion:'9.0.3.0'}),/identity drift/);
    const drift={...current,entities:{...current.entities,count:current.entities.count+1}};assert.deepEqual(withoutUnitEntities(drift),drift);assert.equal(unitEntityAdmission(drift),undefined);
    if(current.entities.totalHealth!==undefined){const changed={...current,entities:{...current.entities,totalHealth:current.entities.totalHealth+1}};assert.deepEqual(withoutUnitEntities(changed),changed);}
  }
  const units=game.listUnits().filter(u=>u.gameVersion!=='sample');assert.equal(units.filter(u=>u.entities.healthPerEntity!==undefined).length,0);
  const speeds=[...read('src/data/unitSpeedRuleAdmissions.json').admissions,...read('src/data/unitSpeedSecondAdmissions.json').admissions];assert.equal(speeds.length,1099);for(const a of speeds)assert.equal(game.getUnit(a.id).movement.speed,a.value);
  for(const [n,field]of [[328,u=>u.missile?.projectile.baseDamage],[327,u=>u.missile?.projectile.armorPiercingDamage],[333,u=>u.missile?.range],[336,u=>u.missile?.reload?.baseTime]])assert.equal(units.filter(u=>field(u)!==undefined).length,n);
  for(const field of ['physical','missile','spell','fire','ward'])assert.equal(units.filter(u=>u.defense.resistances?.[field]!==undefined).length,1110);
  assert.equal(game.listFactions().filter(f=>game.getRosterCoverage(f.id)?.status==='ROSTER COMPLETE').length,23);
});

test('manifest pins, original regressions, recipe conflicts and projection replay deterministically',async()=>{
  const {buildSecond}=await import('../tools/wh3-importer/entities-second/rules.mjs');assert.deepEqual(buildSecond(),{report,projection});
  const m=read(folder+'manifest.json');m.inputs[0].hash='changed';assert.throws(()=>buildSecond(m),/source drift/);
  assert.throws(()=>buildSecond({...m,unitSize:'MEDIUM'}));
});
