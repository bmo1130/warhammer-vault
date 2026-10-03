const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const {createHash}=require('node:crypto');
const read=f=>JSON.parse(readFileSync(f)),hash=b=>createHash('sha256').update(b).digest('hex');
const folder='tools/wh3-importer/speed-research/',report=read(folder+'report.json');
const modules=()=>import('../tools/wh3-importer/speed-research/research.mjs');
const dragon=()=>read('tools/wh3-importer/promotion/dragon-ogres.source.json').dump;
const identity=report.catalog.find(c=>c.identity.name==='Dragon Ogres').identity;

test('Speed inspection deterministically replays 101 exact static traces without display admission',async()=>{
  const {buildSpeedResearch,serialize}=await modules();
  assert.equal(serialize(buildSpeedResearch()),readFileSync(folder+'report.json','utf8'));
  assert.deepEqual(buildSpeedResearch(),buildSpeedResearch());
  assert.deepEqual(report.counts,{production:101,sample:5,populatedProductionSpeed:0,SPEED_DIRECT_STATIC:0,SPEED_AMBIGUOUS:101,
    SPEED_UNAVAILABLE:0,singleGroundSource:70,flyingProfiles:3,profiles:{MAN_ONLY:71,MOUNTED:21,ENGINE:7,ARTICULATED:2}});
  for(const c of report.catalog){assert.equal(c.status,'SPEED_AMBIGUOUS');assert.equal(c.displayValue,null);assert.equal(c.productionEligible,false);
    assert(c.reasons.includes('DISPLAY_CONVERSION_UNCONFIRMED'));assert.equal(c.snapshotId,report.staticSnapshotId);}
  assert.equal(report.transformation.manualWikiReferencesUsedAsGroundTruth,false);
  assert.equal(report.transformation.independentCardReadings,0);
  assert.equal(report.currentInterpretation.safeToNormalize,'NO');
});

test('ten existing sample identities expose exact man/mount/engine/articulation speed joins and raw values',()=>{
  assert.deepEqual(report.cases.map(c=>c.identity.name),['Swordsmen','Mounted Yeomen','Dragon Ogres','Dread Saurian','Skeleton Chariots',
    'Field Trebuchets','Screaming Skull Catapults','Plagueclaw Catapults','Doom-Flayers','Black Coach']);
  const values=[[3],[3.3,9.2],[6.4],[3.3,6],[2.8,7.4,7.4,7.4],[3,2],[2.8,2],[4.2,2],[4.2,7.2],[3,7.8,7.8,7.8]];
  const joins={man:['land_unit','man_entity'],mount:['land_unit','mount','entity'],engine:['land_unit','engine','battle_entity'],
    articulation:['land_unit','articulated_record','articulated_entity']};
  for(const [i,c] of report.cases.entries()){
    assert.deepEqual(Object.values(c.roles).map(r=>r.values.run_speed),values[i]);assert.equal(c.hypothesisStatus,'UNRESOLVED');
    for(const [role,chain] of Object.entries(c.sourceChains)){assert.equal(chain.table,'battle_entities_tables');assert.equal(chain.field,'run_speed');
      assert.equal(chain.schemaVersion,39);assert.equal(chain.rowKey.key,c.roles[role].key);assert.equal(chain.sourcePack,'db.pack');
      assert.deepEqual(chain.joins.map(j=>j.field),joins[role]);assert(chain.joins.every(j=>j.evidence.includes('is_reference')));}
  }
  const keys=report.discoveredSchemaFields.map(f=>f.table+'.'+f.name);
  assert(keys.includes('battle_entities_tables.run_speed'));assert(keys.includes('battle_entities_tables.fly_speed'));
  assert(!keys.some(k=>k==='land_units_tables.run_speed'||k==='main_units_tables.speed'));
});

test('x10 arithmetic, equal composite values, walk/run equality and flight never prove displayed speed/precedence',async()=>{
  const {inspectSpeedTrace}=await modules(),d=dragon(),before=JSON.stringify(d),c=inspectSpeedTrace(d,identity);
  assert.equal(c.hypotheses.man.run_speed.value,64);assert.equal(c.hypotheses.man.run_speed.status,'UNRESOLVED');
  assert.equal(JSON.stringify(d),before);assert.equal(c.displayValue,null);assert.equal(c.sourcePrecedence,'UNCONFIRMED');
  for(const name of ['Skeleton Chariots','Black Coach']){
    const c=report.catalog.find(c=>c.identity.name===name);assert(c.reasons.includes('COMPONENT_SOURCE_PRECEDENCE_UNCONFIRMED'));
    assert.equal(c.roles.mount.values.run_speed,c.roles.engine.values.run_speed);assert.equal(c.roles.engine.values.run_speed,c.roles.articulation.values.run_speed);
  }
  const field=report.catalog.find(c=>c.identity.name==='Field Trebuchets');assert.equal(field.roles.engine.values.walk_speed,field.roles.engine.values.run_speed);
  assert.equal(field.displayValue,null);
  const flying=report.catalog.filter(c=>c.flyingRoles.length);
  assert.deepEqual(flying.map(c=>c.identity.name),['Pegasus Knights','Vargheists','Royal Pegasus Knights']);
  assert.equal(flying[0].roles.mount.values.fly_speed,10.5);assert.equal(flying[0].roles.mount.unconfirmedFlightTimesTen,105);
  for(const c of flying){assert(!c.singleGroundSource);assert(c.reasons.includes('GROUND_VS_FLIGHT_DISPLAY_UNCONFIRMED'));}
});

test('missing/broken/competing joins, unknown field semantics and snapshot drift fail closed without fallback',async()=>{
  const {inspectSpeedTrace}=await modules();
  for(const change of [d=>{delete d.rows.find(r=>r.table==='battle_entities_tables').row.run_speed;},
    d=>{d.relationships=d.relationships.filter(e=>e.field!=='man_entity');},
    d=>{d.relationships.push(structuredClone(d.relationships.find(e=>e.field==='man_entity')));},
    d=>{d.schemas.find(s=>s.table==='battle_entities_tables').fields=d.schemas.find(s=>s.table==='battle_entities_tables').fields.filter(f=>f.name!=='run_speed');},
    d=>{d.rows.find(r=>r.table==='battle_entities_tables').row.run_speed=NaN;},
    d=>{d.rows.find(r=>r.table==='land_units_tables').row.mount='missing_mount';}]){
    const d=dragon();change(d);const c=inspectSpeedTrace(d,identity);assert.equal(c.status,'SPEED_UNAVAILABLE');assert.equal(c.displayValue,null);
  }
  assert.equal(inspectSpeedTrace(dragon(),{...identity,mainKey:'wrong'}).status,'SPEED_UNAVAILABLE');
  const wrong=dragon();wrong.provenance.schemaSha256='0'.repeat(64);assert.throws(()=>inspectSpeedTrace(wrong,identity),/unreviewed static snapshot/);
  const unknown=dragon();delete unknown.rows.find(r=>r.table==='battle_entities_tables').row.fly_speed;
  const c=inspectSpeedTrace(unknown,identity);assert.equal(c.status,'SPEED_AMBIGUOUS');assert(!c.singleGroundSource);assert(c.reasons.includes('FLIGHT_CAPABILITY_UNKNOWN'));
});

test('terrain speed effects are conditional source evidence, never silently folded into base speed',()=>{
  const affected=report.catalog.filter(c=>c.modifierEvidence.length);assert.equal(affected.length,91);
  assert(affected.some(c=>c.modifierEvidence.some(m=>m.multiplier===0.8)));
  for(const c of affected){assert.equal(c.displayValue,null);assert.equal(c.productionEligible,false);
    for(const m of c.modifierEvidence)assert(m.rowId.startsWith('ground_type_to_stat_effects_tables:'));}
});

test('HP, Production/Sample bytes and every existing speed/normalization policy input stay unchanged',()=>{
  assert.equal(hash(readFileSync('src/data/units.json')),'308f7dab9ae339d2629de18d350c07febe7af78bb7fdbc20f598f9a58b7a9511');
  assert.equal(hash(readFileSync('tools/wh3-importer/hp-policy/review.json')),'4b094f4fb9ee1898674c68b686eafec22c15545808aa128283d5c62942b8f833');
  assert.equal(hash(readFileSync('tools/wh3-importer/hp-policy/static-review.json')),'2a717a9d31c2c1fc2e62fa75bc8d5574a7289cb708efa8dcd415a8d14e361a55');
  for(const pin of report.inputs)assert.equal(hash(readFileSync(pin.file)),pin.sha256);
  assert.equal(read('src/data/units.json').filter(u=>u.gameVersion!=='sample'&&u.entities.totalHealth!==undefined).length,13);
});

test('optional saved pilot/materialized traces retain separate snapshots and only exact record comparisons',async t=>{
  if(!existsSync('generated/wh3/catalog-identity/policy-2026-10-01/pilot/manifest.json'))return t.skip('No ignored saved traces in this checkout');
  const {auditStoredTraces}=await modules(),result=auditStoredTraces(report);
  assert.equal(result.inspected,40);assert.equal(result.exactUnitMatches,17);assert.equal(result.sharedEntityOnly,7);
  assert.equal(result.productionEligible,false);assert(result.checks.some(c=>c.currentSnapshot)&&result.checks.some(c=>!c.currentSnapshot));
  assert(result.checks.some(c=>c.file.includes('context-materialization')));
});
