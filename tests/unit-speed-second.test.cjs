const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {gameRepository:game}=require('../.test-build/src/repositories/gameRepository.js');
const {applyUnitSpeed,withoutUnitSpeed,unitSpeedAdmission}=require('../.test-build/src/repositories/unitSpeed.js');
const read=p=>JSON.parse(fs.readFileSync(p)),folder='tools/wh3-importer/speed-second/';
const report=read(folder+'report.json'),projection=read('src/data/unitSpeedSecondAdmissions.json'),old=read('src/data/unitSpeedRuleAdmissions.json');
test('191 new selected structures increase coverage and preserve all 908 existing speeds',()=>{
  assert.deepEqual(report.summary,{production:1110,before:908,after:1099,promoted:191,COMPLETE:1099,PARTIAL:0,UNKNOWN:11,
    regressionMatches:908,flightPromoted:117,missingRecovered:6,missingPromoted:66,specialPromoted:8,newDirectGameMeasurements:0,referenceComparisons:1110,referenceMatches:1099});
  assert.equal(projection.admissions.length,191);assert.equal(new Set([...old.admissions,...projection.admissions].map(a=>a.id)).size,1099);
  for(const a of old.admissions)assert.equal(game.getUnit(a.id).movement.speed,a.value,a.id);
  for(const a of projection.admissions){assert.equal(game.getUnit(a.id).movement.speed,a.value,a.id);assert.equal(unitSpeedAdmission(game.getUnit(a.id)).sourceHash,projection.sourceHash);}
  for(const c of report.catalog.filter(c=>c.status==='UNKNOWN')){assert(c.missing.length);assert.equal(game.getUnit(c.id).movement.speed,undefined);assert.equal(c.prediction.value,null);}
});
test('flight man and mount rules separate card, ground and charge fields without unit-name selection',async()=>{
  const {predictSecond}=await import('../tools/wh3-importer/speed-second/rules.mjs');
  const flyers=report.catalog.filter(c=>c.prediction.field==='fly_speed');
  assert.equal(flyers.filter(c=>c.prediction.role==='man').length,87);assert.equal(flyers.filter(c=>c.prediction.role==='mount').length,30);
  for(const c of flyers){const r=c.roles[c.prediction.role];assert.equal(c.prediction.value,r.fly_speed*10);assert.equal(c.prediction.value,c.reference.speed);assert.equal(c.independentRaw[c.prediction.role].result,'MATCH_MOVEMENT_FIELDS');
    const t=structuredClone(c);t.id='unseen';t.name='unseen';t.mainKey='unseen';t.landKey='unseen';assert.deepEqual(predictSecond(t),c.prediction);
  }
  const pegasus=flyers.find(c=>c.mainKey==='wh_main_brt_cav_pegasus_knights');assert.equal(pegasus.roles.man.run_speed*10,33);
  assert.equal(pegasus.roles.mount.run_speed*10,82);assert.equal(pegasus.roles.mount.charge_speed*10,108);assert.equal(pegasus.roles.mount.flying_charge_speed*10,130);assert.equal(pegasus.prediction.value,105);
});
test('unsupported displays and missing selected sources stay held; articulation selects the verified mount rather than a minimum/maximum',async()=>{
  const {predictSecond}=await import('../tools/wh3-importer/speed-second/rules.mjs');
  const known=report.catalog.find(c=>c.prediction.role==='mount'&&c.prediction.field==='fly_speed');
  for(const change of [t=>t.missing.push('mount.EXACT_ENTITY_MISSING'),t=>t.extraSources.push('extra'),t=>t.flags.mounted_draughts=true,
    t=>t.roles.mount.fly_speed=1,t=>t.roles.mount.fly_speed=10.125,t=>t.roles.mount.fly_speed=-1,t=>t.roles.mount.fly_speed=NaN,
    t=>t.flags.sync_locomotion=true]){const c=structuredClone(known);change(c);assert.equal(predictSecond(c).value,null);}
  const art=structuredClone(report.catalog.find(c=>c.prediction.rule==='ARTICULATED_MOUNT_CARD'&&c.roles.engine));art.roles.engine.run_speed+=1;assert.equal(predictSecond(art).value,art.prediction.value);
  art.missing.push('mount.EXACT_ENTITY_MISSING');assert.equal(predictSecond(art).value,null);
});
test('special ground rules recover exact references and distinguish synchronized animation from scalar modifiers',()=>{
  assert.deepEqual(report.groups.map(g=>[g.type,g.before,g.promoted,g.held]),[['FLIGHT',117,117,0],['MISSING',77,66,11],['SYNC',3,3,0],['ENGINE',3,3,0],['ARTICULATED',2,2,0]]);
  for(const c of report.catalog.filter(c=>c.status==='COMPLETE'&&c.prediction.field==='run_speed'))assert.equal(c.prediction.value,c.roles[c.prediction.role].run_speed*10);
  for(const c of report.catalog.filter(c=>c.originalStatus==='UNKNOWN'&&c.status==='COMPLETE')){assert(c.flags.engine_type);assert(c.independentLandRefsMatch);if(c.missing.length){assert.equal(c.prediction.role,'mount');assert(c.missing.every(m=>/^(engine|articulation)\./.test(m)));}}
});
test('fresh 9.0.3 and independent 9.0 exports stay distinct from exact Production 9.0.2 provenance',async()=>{
  const {decodeSource}=await import('../tools/wh3-importer/missile-rules/source.mjs');
  const stored=decodeSource(read(folder+'stored.source.json')),fresh=decodeSource(read(folder+'movement.source.json')),ref=decodeSource(read(folder+'reference.source.json'));
  assert.equal(fresh.provenance.gameVersion,'9.0.3.0');assert.notEqual(fresh.snapshotId,stored.snapshotId);assert.equal(fresh.rows.length,819);assert.equal(fresh.gameExecuted,false);
  assert(stored.rows.every(r=>r.provenance.gameVersion==='9.0.2.0'));assert.equal(ref.upstreamCommitHttpStatus,422);
  assert.equal(report.confidence.directGameMeasurements,0);assert.equal(report.confidence.freshSourceAdmitted,false);
  assert(report.catalog.filter(c=>c.status==='COMPLETE').flatMap(c=>Object.values(c.independentRaw)).every(c=>c.result==='MATCH_MOVEMENT_FIELDS'));
  assert.equal(report.browserValidation.length,6);assert(report.browserValidation.every(c=>c.expected===c.actual&&c.version==='9.0.0'));
});
test('second overlay changes only Speed and rejects both value and version drift',()=>{
  for(const a of projection.admissions){const raw=read('src/data/units.json').find(u=>u.id===a.id),current=applyUnitSpeed(raw);
    assert.deepEqual(withoutUnitSpeed(current),raw);assert.deepEqual({...current,movement:raw.movement},raw);
    assert.throws(()=>applyUnitSpeed({...raw,gameVersion:'9.0.3.0'}),/identity drift/);
    const changed={...current,movement:{...current.movement,speed:current.movement.speed+1}};assert.deepEqual(withoutUnitSpeed(changed),changed);assert.equal(unitSpeedAdmission(changed),undefined);
  }
  const units=game.listUnits().filter(u=>u.gameVersion!=='sample');
  for(const [n,field]of [[986,u=>u.entities.totalHealth],[1071,u=>u.entities.count],[328,u=>u.missile?.projectile.baseDamage],[327,u=>u.missile?.projectile.armorPiercingDamage],[333,u=>u.missile?.range],[336,u=>u.missile?.reload?.baseTime]])assert.equal(units.filter(u=>field(u)!==undefined).length,n);
});
test('the full second report, source pins and admission overlay replay deterministically',async()=>{
  const {buildSecond}=await import('../tools/wh3-importer/speed-second/rules.mjs');assert.deepEqual(buildSecond(),{report,projection});
  const m=read(folder+'manifest.json');m.inputs[0].hash='changed';assert.throws(()=>buildSecond(m),/source drift/);
});
