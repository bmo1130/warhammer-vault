const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const base='tools/wh3-importer/hp-research/';
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const selection=read(base+'selection.json');
const moduleUnderTest=()=>import('../tools/wh3-importer/hp-research/selection.mjs');
const candidate=key=>selection.catalog.find(c=>c.mainKey===key);
const predictions=key=>Object.values(candidate(key).predictions).map(p=>p.HealthMax);

test('sample selection deterministically replays all 101 exact static traces and keeps Production/HP policy/runtime protected',async()=>{
  const {buildSelection}=await moduleUnderTest(),{serialize,checkProtectedInputs}=await import('../tools/wh3-importer/hp-research/research.mjs');
  assert.equal(serialize(buildSelection()),readFileSync(base+'selection.json','utf8'));
  assert.deepEqual(buildSelection(),buildSelection());
  const cli=spawnSync(process.execPath,['tools/wh3-importer/hp-research/selection.mjs','--check'],{encoding:'utf8'});
  assert.equal(cli.status,0,cli.stderr);checkProtectedInputs();
  assert.deepEqual(selection.catalog.map(c=>c.id),read('src/data/units.json').filter(u=>u.gameVersion!=='sample').map(u=>u.id));
});

test('four proposed engine extensions fit five existing answers through explicitly shared branches; none is validated by an engine-only measurement',()=>{
  assert.equal(selection.compatibility.length,5);
  for(const c of selection.compatibility){
    assert.notEqual(selection.catalog.find(entry=>entry.id===c.id).shape,'ENGINE');
    for(const prediction of Object.values(c.predictions)){
      assert.equal(prediction.HealthMax,c.observed.HealthMax);
      assert.equal(prediction.NumEntitiesInitial,c.observed.NumEntitiesInitial);
    }
  }
  assert.equal(selection.hypotheses.engineOnlyExtensions.length,4);
});

test('static census identifies six unequal-engine candidates, seven informative units, duplicate profiles and unidentifiable mounted/articulation alternatives',()=>{
  assert.deepEqual(selection.counts,{production:101,highDiscriminationUnits:6,distinctHighHPInputProfiles:4,
    unitsWithAnyHypothesisSplit:7,unavailable:0,unequalManMount:0,unequalEngineArticulation:0,engineHPDistribution:{8:3,425:2,500:4}});
  for(const c of selection.catalog){
    assert.equal(c.entities.man.hitPoints,8);
    if(c.entities.mount)assert.equal(c.entities.mount.hitPoints,8);
    if(c.entities.articulation)assert.equal(c.entities.articulation.hitPoints,c.entities.engine.hitPoints);
    assert.equal(c.additionalExactJoinedHP.length,0);
  }
  assert.deepEqual(predictions('wh_main_brt_art_field_trebuchet'),predictions('wh_dlc07_brt_art_blessed_field_trebuchet_0'));
  assert.deepEqual(predictions('wh2_dlc09_tmb_art_screaming_skull_catapult_0'),predictions('wh2_dlc11_cst_art_carronade'));
});

test('recommended exact inputs produce independently calculated HP predictions and conditional logical counts',()=>{
  assert.deepEqual(predictions('wh_main_brt_art_field_trebuchet'),[4332,2532,2332,2180]);
  assert.deepEqual(predictions('wh2_dlc09_tmb_art_screaming_skull_catapult_0'),[4164,2244,2464,1892]);
  assert.deepEqual(predictions('wh2_main_skv_art_plagueclaw_catapult'),[4856,2620,2856,2172]);
  assert.deepEqual(predictions('wh2_dlc12_skv_veh_doom_flayer_0'),[6128,6128,6064,6064]);
  assert.deepEqual(Object.values(candidate('wh_main_brt_art_field_trebuchet').predictions).map(p=>p.NumEntitiesInitial),[44,4,44,4]);
  for(const c of selection.selected)for(const fact of Object.values(c.exactFacts).filter(Boolean)){
    assert.equal(fact.source.sourcePack,'db.pack');assert(fact.source.schemaVersion!==undefined);
    if(fact.source.table!=='main_units_tables')assert(fact.source.joins.length);
  }
});

test('four selected identities cover six competing model pairs with a two-unit Tier 1 cross-check; Doom-Flayers cannot split all models',async()=>{
  const {discriminatingPairs}=await moduleUnderTest();
  assert.deepEqual(selection.selected.map(c=>c.tier),[1,1,2,2]);
  assert.equal(selection.selected.length,4);
  const coverage=new Set(selection.selected.filter(s=>s.tier===1).flatMap(s=>candidate(s.mainKey).discriminatingPairs.map(p=>p.join('|'))));
  assert.equal(coverage.size,6);assert.equal(selection.minimum.toSeparateListedEngineExtensions,1);
  assert.equal(discriminatingPairs(candidate('wh_main_brt_art_field_trebuchet').predictions).length,6);
  assert.equal(discriminatingPairs(candidate('wh2_dlc12_skv_veh_doom_flayer_0').predictions).length,4);
  assert.equal(selection.minimum.oneUnitSeparators.length,6);
});

test('prediction matrix never converts missing/invalid exact fields to zero or an admitted value',async()=>{
  const {predictSelection}=await moduleUnderTest(),c=candidate('wh_main_brt_art_field_trebuchet');
  for(const invalid of [null,undefined,'500',NaN,Infinity,-1]){
    const changed=structuredClone(c);changed.staticValues['engine.hit_points']=invalid;
    assert.deepEqual(predictSelection(changed,'H1_CREW_COUNT_WITH_ENGINE'),{status:'UNAVAILABLE',HealthMax:null,NumEntitiesInitial:null});
  }
  const missing=structuredClone(c);missing.missing=['engine.exact_entity_hp'];
  assert.equal(predictSelection(missing,'H3_CREW_POOL_ONLY').status,'UNAVAILABLE');
  assert.throws(()=>predictSelection(c,'AUTO_FITTED'),/unknown hypothesis/);
  assert.equal(selection.productionEligible,false);assert(!Object.hasOwn(selection,'admitted'));
  const {replayHP}=await import('../tools/wh3-importer/hp-policy/policy.mjs');
  assert.throws(()=>replayHP(selection),/explicit ULTRA manifest required/);
});

test('conditional result guide retains ambiguity and eliminates only mismatched joint HP/count predictions',()=>{
  for(const s of selection.selected){
    const c=candidate(s.mainKey);
    for(const outcome of s.outcomes){
      for(const id of outcome.survives){assert.equal(c.predictions[id].HealthMax,outcome.HealthMax);assert.equal(c.predictions[id].NumEntitiesInitial,outcome.NumEntitiesInitial);}
      for(const id of outcome.eliminated)assert(c.predictions[id].HealthMax!==outcome.HealthMax||c.predictions[id].NumEntitiesInitial!==outcome.NumEntitiesInitial);
      assert.equal(outcome.survives.length+outcome.eliminated.length,4);
    }
    assert.match(s.unlistedOutcome,/REJECT_ALL/);
  }
  const doom=selection.selected.find(s=>s.mainKey==='wh2_dlc12_skv_veh_doom_flayer_0');
  assert.deepEqual(doom.outcomes.map(o=>o.survives.length),[2,2]);
});
