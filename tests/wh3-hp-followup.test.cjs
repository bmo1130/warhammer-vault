const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const speedOverlay=require('../tools/wh3-importer/speed-policy/overlay.cjs');
const rawRead=file=>JSON.parse(readFileSync(file));
const read=file=>file==='src/data/units.json'?speedOverlay.withoutSpeed(rawRead(file)):rawRead(file);
const base='tools/wh3-importer/hp-policy/',research='tools/wh3-importer/hp-research/';
const review=read(base+'review.json'),manifest=read(base+'manifest.json');
const expected=[
  ['wh_main_brt_art_field_trebuchet',4512,4,44,'script_log_031026_1244.txt','5008fd675f527b34ee84360bce39a626d54628bf151ec4866d998abe782e821d'],
  ['wh2_dlc09_tmb_art_screaming_skull_catapult_0',4356,4,44,'script_log_031026_1246.txt','290354820216f6cfd25c5618f01924c5e3b5e87b43885a0bd601be683bb233f4'],
  ['wh2_main_skv_art_plagueclaw_catapult',5028,4,56,'script_log_031026_1248.txt','2fa921c196822092101ea982ec3868190d9089f1460278f9ef07efa81d78df42'],
  ['wh2_dlc12_skv_veh_doom_flayer_0',6128,8,8,'script_log_031026_1251.txt','8ef0750d5fe07954ca9e604f5d3e98bc1ad4614b02867d242f9a11677e2c3b8e'],
];

test('four original files pass unchanged direct ULTRA admission; missing captures fail closed',async()=>{
  const {replayHP,byteHash}=await import('../tools/wh3-importer/hp-policy/policy.mjs');
  assert.equal(byteHash(readFileSync(base+'policy.mjs')),'ce13f0ec90cc3e13003515ed7446d2f6927f3cd7341493a179562d46e22ef37a');
  assert.deepEqual(replayHP(manifest),review);
  for(const [key,hp,count,men,file,hash] of expected){
    const input=manifest.inputs.find(i=>i.file==='inputs/'+file);assert.equal(input.originalSha256,hash);
    const bytes=readFileSync(base+input.file);assert.equal(byteHash(bytes),hash);
    if(existsSync(input.originalPath))assert.deepEqual(bytes,readFileSync(input.originalPath));
    const r=review.review.find(r=>r.staticChain.sourceMainKey===key);
    assert.equal(r.staticChain.sourceLandKey,key);assert.equal(r.totalHealth,hp);assert.equal(r.approved,true);assert.deepEqual(r.held,[]);
    assert.equal(r.status,'REVIEWED_DIRECT_ULTRA_RUNTIME');assert.equal(r.candidates.length,1);
    const c=r.candidates[0];assert.equal(c.NumEntitiesInitial,count);assert.equal(c.HealthMax,hp);
    assert.equal(c.unitSize,'ULTRA');assert.equal(c.unitSizeSource,'DECLARED_SETUP');assert.equal(c.metadata.gameVersion,'9.0.2.0');
    assert.equal(c.metadata.staticSnapshotId,r.staticChain.staticSnapshotId);
    assert.deepEqual(c.componentCounts,{ManList:men,MountList:0,EngineList:count,EntityList:count});
    const missing=structuredClone(manifest);missing.inputs=missing.inputs.filter(i=>i.file!==input.file);
    assert.throws(()=>replayHP(missing),/approved HP failed replay/);
    missing.subjects.find(s=>s.mainKey===key).approved=false;
    const held=replayHP(missing).review.find(r=>r.staticChain.sourceMainKey===key);
    assert.equal(held.status,'WITHHELD');assert.equal(held.totalHealth,undefined);
  }
});

test('only four new HP fields change; existing five, Sample and every non-HP byte projection are stable',async()=>{
  const {byteHash,replayHP}=await import('../tools/wh3-importer/hp-policy/policy.mjs');
  const historical=replayHP(read(research+'five-unit-manifest.json'));
  assert.deepEqual(review.review.slice(0,5),historical.review);assert.deepEqual(review.admitted.slice(0,5),historical.admitted);
  const units=read('src/data/units.json'),previous=structuredClone(units);
  for(const a of read(base+'static-review.json').admitted)delete previous.find(u=>u.id===a.id).entities.totalHealth;
  delete previous.find(u=>u.id==='ca_unit_wh_main_vmp_veh_black_coach').entities.totalHealth;
  for(const [key,hp] of expected){const unit=previous.find(u=>u.id==='ca_unit_'+key);assert.equal(unit.entities.totalHealth,hp);delete unit.entities.totalHealth;}
  assert.equal(byteHash(Buffer.from(JSON.stringify(previous,null,2)+'\n')),'68661de31d19c1660949fa0196422a4b59cdff26d7fba2f7ec70b84a324a45e9');
  assert.deepEqual(units.filter(u=>u.gameVersion==='sample'),previous.filter(u=>u.gameVersion==='sample'));
  assert.equal(units.filter(u=>u.entities.totalHealth!==undefined&&u.gameVersion!=='sample').length,13);
  const {checkProtectedInputs}=await import('../tools/wh3-importer/hp-research/research.mjs');checkProtectedInputs();
});

test('bounded HP source projection replays pinned compact rows/schema/joins without adding field semantics',async()=>{
  const {projectArtillerySources}=await import('../tools/wh3-importer/hp-policy/project-artillery.mjs');
  const projected=projectArtillerySources();assert.deepEqual(projected,read(base+'artillery-sources.json'));
  assert.deepEqual(projectArtillerySources(),projected);assert.equal(projected.candidates.length,3);
  for(const c of projected.candidates)assert.equal(c.dump.rows.length,5);
  assert.equal(projected.sourceProjection.length,2);
});

test('all nine HP/count observations replay against scoped research branches; H1–H4 rejected as shared ENGINE rules',async()=>{
  const {buildFollowup}=await import('../tools/wh3-importer/hp-research/followup.mjs');
  const result=buildFollowup();assert.equal(JSON.stringify(result,null,2)+'\n',readFileSync(research+'followup.json','utf8'));
  assert.deepEqual(buildFollowup(),result);assert.equal(result.cases.length,9);
  for(const c of result.cases){assert.equal(c.productionEligible,false);for(const p of Object.values(c.scopedComparisons)){assert.equal(p.matchesHealth,true);assert.equal(p.matchesCount,true);}}
  for(const c of result.cases.filter(c=>c.structuralClues.category?.value==='artillery')){
    assert(c.unconditionalArtilleryFormula.matchesHealth);assert.equal(c.structuralClues.engine_type.value,'Generic_3_Crew');
    for(const p of Object.values(c.historicalHypotheses))assert.equal(p.matchesHealth,false);
    const f=c.staticValues,nonbonus=f['man.hit_points']*f['main.num_men']+f['engine.hit_points']*f['land.num_engines'];
    assert.equal((c.runtime.HealthMax-nonbonus)/f['land.bonus_hit_points'],f['main.num_men']+f['land.num_engines']);
  }
  const doom=result.cases.find(c=>c.name==='Doom-Flayers');assert.equal(doom.unconditionalArtilleryFormula.HealthMax,12128);
  assert.equal(doom.unconditionalArtilleryFormula.matchesHealth,false);assert.equal(doom.structuralClues.engine_type.value,'Generic_No_Crew_Rotate');
  const predictions=Object.values(doom.historicalHypotheses);assert.deepEqual(predictions.map(p=>p.matchesHealth),[true,true,false,false]);
  assert.equal(doom.staticValues['main.num_men'],doom.staticValues['land.num_engines']);
  assert.equal(doom.staticValues['man.hit_points'],doom.staticValues['engine.hit_points']);
  assert.equal(result.counts.staticDerivationConfident,0);assert.equal(result.counts.staticDerivationAmbiguous,101);
});

test('101-source search selects only Black Coach for historical articulated cardinality split; forecast does not admit HP',async()=>{
  const {buildFollowup,scopedPrediction}=await import('../tools/wh3-importer/hp-research/followup.mjs');
  const result=buildFollowup();assert.equal(result.nextCandidates.length,1);const c=result.nextCandidates[0];
  assert.equal(c.mainKey,'wh_main_vmp_veh_black_coach');assert.equal(c.landKey,c.mainKey);
  assert.equal(c.predictions.V_N.HealthMax,5980);assert.equal(c.predictions.V_UG.HealthMax,5988);
  for(const p of Object.values(c.predictions))assert.equal(p.NumEntitiesInitial,1);
  assert.equal(c.productionEligible,false);assert.equal(review.admitted.find(a=>a.id===c.id).kind,'DIRECT_ULTRA_RUNTIME');
  const selection=read(research+'selection.json'),skeleton=selection.catalog.find(c=>c.name==='Skeleton Chariots');
  assert.equal(scopedPrediction(skeleton,'N').HealthMax,7032);assert.equal(scopedPrediction(skeleton,'(U*G)').HealthMax,7032);
  assert.equal(scopedPrediction({...skeleton,missing:['articulation.exact_entity_hp']}),null);
});
