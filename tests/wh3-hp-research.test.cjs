const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const base='tools/wh3-importer/hp-research/';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const moduleUnderTest=()=>import('../tools/wh3-importer/hp-research/research.mjs');
const report=read(base+'report.json');
const byName=name=>report.cases.find(c=>c.name===name);
const result=(name,id)=>byName(name).candidates.find(c=>c.id===id);
async function chariotDump(){
  const {restoreTrace}=await import('../tools/wh3-importer/promotion/partial-review.mjs');
  const bundle=read('tools/wh3-importer/promotion/partial-sources.json');
  return restoreTrace(bundle,bundle.candidates.find(c=>c.slug==='sample-15').dump);
}

test('HP research replays deterministically from committed sources without changing protected Production/policy/runtime inputs',async()=>{
  const {buildResearch,serialize,checkProtectedInputs}=await moduleUnderTest();
  assert.equal(serialize(buildResearch()),readFileSync(base+'report.json','utf8'));
  assert.deepEqual(buildResearch(),buildResearch());
  assert.equal(checkProtectedInputs().baselineCommit,report.baselineCommit);
  const cli=spawnSync(process.execPath,['scripts/research-wh3-hp.mjs','--check'],{encoding:'utf8'});
  assert.equal(cli.status,0,cli.stderr);
  checkProtectedInputs();
});

test('five actual ULTRA comparisons preserve exact static joins and measured totals; no research admission',()=>{
  assert.deepEqual(report.cases.map(c=>c.runtime.HealthMax),[8280,5520,9856,15088,7032]);
  assert.deepEqual(report.cases.map(c=>c.runtime.NumEntitiesInitial),[120,60,16,1,12]);
  for(const c of report.cases){
    assert.equal(c.productionEligible,false);assert.equal(c.runtime.unitSize,'ULTRA');
    assert.equal(c.runtime.unitSizeSource,'DECLARED_SETUP');assert.equal(c.runtime.staticSnapshotId,report.staticSnapshotId);
    assert(c.runtime.references.length);assert(c.candidates.some(candidate=>candidate.matchesRuntime));
    for(const fact of Object.values(c.staticFacts).filter(Boolean)){
      assert(fact.source.rowId);assert.equal(fact.source.sourcePack,'db.pack');
      if(fact.source.table!=='main_units_tables')assert(fact.source.joins.length);
    }
    for(const candidate of c.candidates.filter(c=>c.matchesRuntime))assert.equal(candidate.confidence,'NUMERICALLY_COMPATIBLE_ONLY');
  }
  assert.equal(result('Swordsmen','man_only').result,8280);
  assert.equal(result('Dragon Ogres','man_only').result,9856);
  assert.equal(report.productionEligible,false);assert(!Object.hasOwn(report,'admitted'));
});

test('Mounted Yeomen excludes rider-only and mount-only candidates but equal HP prevents source identification',()=>{
  assert.equal(result('Mounted Yeomen','man_only').result,5040);
  assert.equal(result('Mounted Yeomen','mount_only').result,5040);
  assert.equal(result('Mounted Yeomen','one_rider_one_mount').result,5520);
  assert.equal(result('Mounted Yeomen','two_man_no_mount').result,5520);
  assert.equal(byName('Mounted Yeomen').staticFacts['man.hit_points'].value,byName('Mounted Yeomen').staticFacts['mount.hit_points'].value);
});

test('Dread Saurian needs additional 96 HP beyond bonus+body in the compared additive hypothesis; crew count is not combat count',()=>{
  const c=byName('Dread Saurian');
  assert.equal(c.staticFacts['main.num_men'].value,12);assert.equal(c.runtime.NumEntitiesInitial,1);
  assert.equal(result(c.name,'mount_only').result,14992);
  assert.equal(c.runtime.HealthMax-result(c.name,'mount_only').result,12*8);
  assert.equal(result(c.name,'crew_and_mount').result,15088);
  assert.equal(result(c.name,'all_mount_counterexample').result,15088);
  assert.equal(result(c.name,'man_only').matchesRuntime,false);
});

test('Skeleton Chariots compares engine/articulation and rejects component count as the logical HP multiplier',()=>{
  const c=byName('Skeleton Chariots');
  assert.equal(result(c.name,'engine_only').result,6552);
  assert.equal(result(c.name,'one_of_each').result,6744);
  assert.equal(result(c.name,'crew_draught_engine').result,6936);
  assert.equal(result(c.name,'with_articulation').result,7032);
  assert.equal(result(c.name,'double_engine_without_articulation').result,7032);
  assert.equal(c.runtime.HealthMax-result(c.name,'crew_draught_engine').result,96);
  assert.equal(c.runtime.NumEntitiesInitial,12);assert.equal(c.runtime.componentCounts.ManList,24);
  assert.equal(c.runtime.componentCounts.MountList,24);assert.equal(c.runtime.componentCounts.EngineList,12);
  assert.notEqual(586*c.runtime.componentCounts.ManList,c.runtime.HealthMax);
  assert.notEqual(586*Object.values(c.runtime.componentCounts).reduce((a,b)=>a+b,0),c.runtime.HealthMax);
});

test('missing or corrupt articulation reference never becomes a zero contribution; conflicting snapshots/fields are rejected',async()=>{
  const {articulationTrace,inspectStaticHP,classifyStaticHP,compareCandidates}=await moduleUnderTest();
  const original=read(base+'articulation.source.json'),dump=await chariotDump(),main=dump.unit.caKey;
  const good=articulationTrace(original,main,dump);assert.equal(good.hitPoints.value,8);
  for(const corrupt of [
    f=>{f.evidence.relationships=f.evidence.relationships.filter(e=>e.field!=='articulated_entity');},
    f=>{f.evidence.rows=f.evidence.rows.filter(r=>r.row.key!==good.key.value);},
    f=>{f.evidence.schemas.find(s=>s.table==='land_unit_articulated_vehicles_tables').fields.find(f=>f.name==='articulated_entity').is_reference=['wrong','key'];},
  ]){
    const changed=structuredClone(original);corrupt(changed);
    const bad=articulationTrace(changed,main,dump);assert.equal(bad.hitPoints,null);
    const inspected=inspectStaticHP(dump);assert.equal(classifyStaticHP(inspected).status,'DERIVATION_UNAVAILABLE');
    assert.equal(compareCandidates(main,inspected.facts,byName('Skeleton Chariots').runtime).find(c=>c.id==='with_articulation').result,null);
  }
  const conflict=structuredClone(original);conflict.evidence.rows.find(r=>r.table==='land_units_tables'&&r.row.key===main).row.bonus_hit_points++;
  assert.throws(()=>articulationTrace(conflict,main,dump),/conflicting supplemental field/);
  const snapshot=structuredClone(original);snapshot.evidence.provenance.schemaSha256='0'.repeat(64);
  assert.throws(()=>articulationTrace(snapshot,main,dump),/Game\/schema\/pack evidence changed/);
  const missingHP=structuredClone(dump);missingHP.schemas.find(s=>s.table==='battle_entities_tables').fields=missingHP.schemas.find(s=>s.table==='battle_entities_tables').fields.filter(f=>f.name!=='hit_points');
  assert.equal(classifyStaticHP(inspectStaticHP(missingHP)).status,'DERIVATION_UNAVAILABLE');
});

test('101 exact Production chains have research classifications, no unmeasured extrapolated HP and no confident formula',()=>{
  assert.deepEqual(report.counts,{production:101,DERIVATION_CONFIDENT:0,DERIVATION_AMBIGUOUS:101,DERIVATION_UNAVAILABLE:0,
    shapes:{MAN_ONLY:71,MOUNTED:21,ENGINE:7,ARTICULATED:2}});
  const units=read('src/data/units.json').filter(u=>u.gameVersion!=='sample');
  assert.deepEqual(report.catalog.map(c=>c.id),units.map(u=>u.id));
  assert.equal(units.filter(u=>u.entities.totalHealth!==undefined).length,9);
  for(const c of report.catalog){assert.equal(c.productionEligible,false);assert(!Object.hasOwn(c,'predictedHealth'));assert(c.source.pointer&&c.mainKey&&c.landKey);}
});

test('bounded articulation fixture preserves original row IDs/payloads/schema/edges and extraction hash when stored capture is available',async()=>{
  const fixture=read(base+'articulation.source.json'),{byteHash}=await import('../tools/wh3-importer/hp-policy/policy.mjs');
  assert.equal(fixture.originalSha256,'6bc6b193cdbe652f7b4f93728522e5ca1c54be64923ccc32c3afcd6c494dd05a');
  assert.equal(fixture.evidence.rows.length,8);assert.equal(fixture.productionEligible,false);
  if(existsSync(fixture.originalFile)){
    const bytes=readFileSync(fixture.originalFile);assert.equal(byteHash(bytes),fixture.originalSha256);const source=JSON.parse(bytes);
    for(const [kind,pointers]of Object.entries(fixture.projectionPointers))pointers.forEach((pointer,i)=>{
      const original=pointer.slice(1).split('/').reduce((o,k)=>o[k],source);
      assert.deepEqual(fixture.evidence[kind][i],original);
    });
  }
});
