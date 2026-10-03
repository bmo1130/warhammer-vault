const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const overlay=require('../tools/wh3-importer/hp-policy/overlay.cjs');
const read=file=>JSON.parse(readFileSync(file));
const base='tools/wh3-importer/hp-policy/',research='tools/wh3-importer/hp-research/';
const manifest=read(base+'static-manifest.json'),report=read(base+'static-review.json');
const units=read('src/data/units.json'),direct=read(base+'review.json');
const expected=[['wh_main_emp_inf_spearmen_1',8280,'MAN_ONLY'],['wh_dlc07_brt_inf_battle_pilgrims_0',8280,'MAN_ONLY'],
  ['wh_dlc07_brt_art_blessed_field_trebuchet_0',4512,'ARTILLERY']];

test('only the three explicitly approved exact static HP profiles replay and populate Production',async()=>{
  const {replayStaticHP}=await import('../tools/wh3-importer/hp-policy/static-derived.mjs');
  assert.deepEqual(replayStaticHP(),report);assert.deepEqual(replayStaticHP(),replayStaticHP());
  assert.equal(overlay.hash(readFileSync(base+'static-review.json')),overlay.staticReviewSha256);
  assert.deepEqual(report.admitted.map(a=>[a.sourceMainKey,a.value,a.profile]),expected);
  for(const a of report.admitted){
    assert.equal(a.sourceLandKey,a.sourceMainKey);assert.equal(a.kind,'STATIC_DERIVED_HP');
    assert.equal(a.unitSize,'ULTRA');assert.equal(a.unitSizeSource,'RUNTIME_VALIDATED_EXACT_PROFILE');
    assert.equal(a.runtimeValidation.kind,'DIRECT_ULTRA_RUNTIME');assert.equal(a.runtimeValidation.unitSizeSource,'DECLARED_SETUP');
    assert.notEqual(a.id,a.runtimeValidation.id);assert(a.runtimeValidation.references.length>0);
    assert(Object.values(a.checks).every(v=>v===true));assert.equal(a.confidence,'EXACT_RUNTIME_VALIDATED_HP_CHAIN_PROFILE_ONLY');
    assert.equal(units.find(u=>u.id===a.id).entities.totalHealth,a.value);
    assert(a.staticSource.pointer&&a.sourcePin.bytesSha256&&a.snapshot.schemaSha256);
    for(const name of ['main.num_men','land.bonus_hit_points','man.hit_points'])assert(a.sourceFields[name].source.rowId);
  }
  const artillery=report.admitted[2];assert.equal(artillery.componentReferences.engine.value,'wh_dlc07_brt_art_field_blessed_trebuchet');
  assert.equal(artillery.entityKeys.engine.value,'wh_main_brt_art_trebuchet');
  assert.equal(artillery.formula,'(B+M)*N + (B+E)*G');assert.equal(artillery.logicalCount,4);
  assert.equal(report.admitted[0].formula,'(B+M)*N');
});

test('removing only three HP fields restores the exact ten-runtime-HP file including all non-HP values/order/Sample bytes',()=>{
  const previous=structuredClone(units);
  for(const a of report.admitted)delete previous.find(u=>u.id===a.id).entities.totalHealth;
  assert.equal(overlay.hash(overlay.serialize(previous)),manifest.baselineUnitsSha256);
  assert.equal(manifest.baselineUnitsSha256,'3b3b2d84c55db5ff48be01a20fcf269eef0384e6a9eeb83ca571b7ed37b3818a');
  assert.equal(units.filter(u=>u.gameVersion!=='sample'&&u.entities.totalHealth!==undefined).length,13);
  assert.equal(units.filter(u=>u.gameVersion!=='sample'&&u.entities.totalHealth===undefined).length,88);
  assert.equal(units.filter(u=>u.gameVersion==='sample').length,5);
  for(const a of direct.admitted)assert.equal(units.find(u=>u.id===a.id).entities.totalHealth,a.value);
  const sidecar=read('src/data/unitHpAdmissions.json');
  assert.deepEqual(sidecar.admissions.filter(a=>a.kind==='STATIC_DERIVED_HP').map(a=>a.id),report.admitted.map(a=>a.id));
  sidecar.admissions=sidecar.admissions.filter(a=>a.kind==='DIRECT_ULTRA_RUNTIME');
  delete sidecar.staticReviewReference;delete sidecar.staticReviewSha256;
  assert.equal(overlay.hash(overlay.serialize(sidecar)),'0860eb8149ce28d07bb9779790bbf5219e88466fe18fb0ca269c707d7ed88f38');
  assert.deepEqual(overlay.applyProductionHP(overlay.staticProductionView(units)),units);
});

test('missing fields/joins, identity/snapshot/profile drift, competing derivations and Production conflicts fail closed',async()=>{
  const {staticHPCase,admitStaticHP}=await import('../tools/wh3-importer/hp-policy/static-derived.mjs');
  const {assessProfile}=await import('../tools/wh3-importer/hp-research/black-coach.mjs');
  const latest=read(research+'black-coach.json'),selection=read(research+'selection.json'),historical=read(research+'report.json');
  for(const subject of manifest.subjects){
    const c=staticHPCase(latest.catalog.find(c=>c.id===subject.id),selection,historical),anchor=latest.cases.find(c=>c.id===subject.anchor),
      assessment=assessProfile(c,latest.cases,latest.survivingReviewedFormulations),basis=direct.admitted.find(a=>a.id===subject.anchor),unit=units.find(u=>u.id===subject.id);
    const args=[subject,c,anchor,assessment,basis,unit,manifest.staticSnapshotId];
    assert.equal(admitStaticHP(...args).value,subject.expectedHP);
    for(const change of [
      a=>{a[0].approved=false;},a=>{a[0].mainKey='wh_main_emp_inf_spearmen_0';},a=>{a[0].landKey='wrong';},
      a=>{a[1].mainKey='wrong';},a=>{a[1].staticSnapshotId='0'.repeat(64);},a=>{a[1].snapshot.gameVersion='wrong';},
      a=>{a[1].missing.push('man.hit_points');},a=>{delete a[1].exactFacts['man.hit_points'];},
      a=>{a[1].references.man_entity=null;},a=>{a[1].entityKeys.man.value='wrong';},
      a=>{a[1].exactFacts['man.hit_points'].source.joins=[];},a=>{a[1].joinShape['man.hit_points'].joins=[];},
      a=>{a[1].staticValues['land.bonus_hit_points']++;},a=>{a[1].staticValues['main.num_men']=NaN;},
      a=>{a[1].extraEntities.push({key:'extra'});},a=>{a[1].structuralFlags.engine_type='another';},
      a=>{a[3].status='STATIC_DERIVATION_AMBIGUOUS';},a=>{a[3].reviewedHPOutputs.push(subject.expectedHP+1);},
      a=>{a[2].runtimeRolesMatch=false;},a=>{a[2].runtime.unitSize='MEDIUM';},a=>{a[2].runtime.unitSizeSource='INFERRED';},
      a=>{a[4].value++;},a=>{a[4].kind='STATIC_DERIVED_HP';},
      a=>{a[5].entities.totalHealth++;},a=>{a[5].name='changed';},a=>{a[0].expectedHP=0;},
    ]){const corrupted=structuredClone(args);change(corrupted);assert.throws(()=>admitStaticHP(...corrupted),/Static HP admission refused/);}
  }
});

test('explicit manifest cannot admit a fourth identity, duplicates, missing pins or a non-ULTRA batch',async()=>{
  const {replayStaticHP}=await import('../tools/wh3-importer/hp-policy/static-derived.mjs');
  for(const change of [m=>{m.subjects.push({...m.subjects[0],mainKey:'wh_main_emp_inf_spearmen_0'});},
    m=>{m.subjects[1]=m.subjects[0];},m=>{m.subjects.pop();},m=>{m.inputs.pop();},
    m=>{m.inputs[0].sha256='0'.repeat(64);},m=>{m.unitSize='MEDIUM';}]){
    const corrupted=structuredClone(manifest);change(corrupted);assert.throws(()=>replayStaticHP(corrupted),/Static HP admission refused/);
  }
  for(const a of report.admitted){const bad=structuredClone(units);bad.find(u=>u.id===a.id).entities.totalHealth++;
    assert.throws(()=>overlay.applyProductionHP(bad),/differs from explicit admission/);}
});

test('all ten original direct admissions, raw captures, MEDIUM evidence and probe/policy bytes remain pinned',()=>{
  assert.equal(overlay.hash(readFileSync(base+'review.json')),'4b094f4fb9ee1898674c68b686eafec22c15545808aa128283d5c62942b8f833');
  assert.equal(overlay.hash(readFileSync(base+'policy.mjs')),'ce13f0ec90cc3e13003515ed7446d2f6927f3cd7341493a179562d46e22ef37a');
  const runtimeManifest=read(base+'manifest.json');assert.equal(direct.admitted.length,10);
  for(const input of runtimeManifest.inputs)assert.equal(overlay.hash(readFileSync(base+input.file)),input.originalSha256);
  for(const input of read(research+'baseline.json').protectedFiles.filter(p=>p.file.includes('/runtime-evidence/'))){
    const bytes=readFileSync(input.file),content=input.hashMode==='LF_TEXT'?Buffer.from(bytes.toString().replace(/\r\n/g,'\n')):bytes;
    assert.equal(overlay.hash(content),input.sha256);
  }
});
