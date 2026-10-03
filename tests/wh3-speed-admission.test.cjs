const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const speed=require('../tools/wh3-importer/speed-policy/overlay.cjs');
const read=f=>JSON.parse(readFileSync(f)),folder='tools/wh3-importer/speed-policy/';
const manifest=read(folder+'manifest.json'),report=read('tools/wh3-importer/speed-research/card-validation.json');
const sidecar=read('src/data/unitSpeedAdmissions.json'),units=read('src/data/units.json');
const initialDirect=report.catalog.filter(c=>c.status==='SPEED_DIRECT_STATIC'),mounted=read('tools/wh3-importer/speed-research/mounted-validation.json');
const added=mounted.catalog.filter(c=>c.status==='SPEED_DIRECT_STATIC'),direct=[...initialDirect,...added];
const modules=()=>import('../tools/wh3-importer/speed-policy/admission.mjs');

test('only the previous 74 plus exact seven mounted DIRECT identities admit static Speed, with deterministic replay/order/bytes',async()=>{
  const {replaySpeed}=await modules();
  assert.deepEqual(replaySpeed(),sidecar);assert.deepEqual(replaySpeed(),replaySpeed());
  assert.equal(speed.hash(readFileSync('src/data/unitSpeedAdmissions.json')),speed.reviewSha256);
  assert.deepEqual(sidecar.admissions.map(a=>a.id),direct.map(c=>c.identity.id));
  assert.equal(units.filter(u=>u.gameVersion!=='sample'&&Object.hasOwn(u.movement,'speed')).length,81);
  assert.equal(units.filter(u=>u.gameVersion!=='sample'&&!Object.hasOwn(u.movement,'speed')).length,20);
  assert.deepEqual(speed.applyProductionSpeed(speed.withoutSpeed(units)),units);
  assert.deepEqual(speed.applyProductionSpeed([...units].reverse()).map(u=>u.id),[...units].reverse().map(u=>u.id));
  const check=spawnSync(process.execPath,['scripts/promote-static-speed.mjs','--check'],{encoding:'utf8'});
  assert.equal(check.status,0,check.stderr);
});

test('70 man / nine mount / two engine values use the reviewed source selection, not category precedence',()=>{
  const counts={};
  for(const a of sidecar.admissions){
    const c=direct.find(c=>c.identity.id===a.id).candidate;
    assert.equal(a.value,c.calculatedSpeed);assert.equal(a.value,a.rawRunSpeed*10);
    assert.equal(a.selectedComponent,c.selectedComponent);assert.equal(a.selectedEntityKey,c.selectedEntityKey);
    assert.equal(a.profile,c.profile);assert.equal(a.profileSha256,c.profileSha256);
    assert.equal(a.staticSnapshotId,manifest.staticSnapshotId);assert.equal(a.rounding,'NONE');
    assert.equal(a.kind,'STATIC_DERIVED_SPEED');assert.equal(a.validationAnchor.kind,'MANUAL_CARD_VALIDATION');
    assert.equal(a.validationAnchor.id,c.validationAnchor);assert(a.sourceFieldReference.endsWith(initialDirect.some(c=>c.identity.id===a.id)?'/candidate/sourceTrace':'/sourceTraces/mount'));
    assert.equal(units.find(u=>u.id===a.id).movement.speed,a.value);counts[a.selectedComponent]=(counts[a.selectedComponent]??0)+1;
  }
  assert.deepEqual(counts,{man:70,mount:9,engine:2});
  for(const [name,value,role] of [['Mounted Yeomen',92,'mount'],['Mounted Yeomen Archers',92,'mount'],['Field Trebuchets',20,'engine'],['Blessed Field Trebuchets',20,'engine']]){
    const u=units.find(u=>u.name===name),a=sidecar.admissions.find(a=>a.id===u.id);
    assert.equal(u.movement.speed,value);assert.equal(a.selectedComponent,role);
  }
});

test('all 20 held units, every HP/non-Speed field, order and Sample bytes reconstruct the exact prior catalog',()=>{
  const previous=speed.withoutSpeed(units);
  assert.equal(speed.hash(speed.serialize(previous)),manifest.baselineUnitsSha256);
  assert.equal(manifest.baselineUnitsSha256,'308f7dab9ae339d2629de18d350c07febe7af78bb7fdbc20f598f9a58b7a9511');
  assert.deepEqual(units.map(u=>u.id),previous.map(u=>u.id));
  assert.deepEqual(units.filter(u=>u.gameVersion==='sample'),previous.filter(u=>u.gameVersion==='sample'));
  for(const c of report.catalog.filter(c=>!direct.some(d=>d.identity.id===c.identity.id))){
    const u=units.find(u=>u.id===c.identity.id);assert(!Object.hasOwn(u.movement,'speed'));
    assert.deepEqual(u,previous.find(p=>p.id===u.id));assert(!sidecar.admissions.some(a=>a.id===u.id));
  }
  assert.equal(units.filter(u=>u.gameVersion!=='sample'&&u.entities.totalHealth!==undefined).length,13);
  for(const f of ['tools/wh3-importer/hp-policy/review.json','tools/wh3-importer/hp-policy/static-review.json','src/data/unitHpAdmissions.json']){
    const pin=read('tools/wh3-importer/hp-research/baseline.json').protectedFiles.find(p=>p.file===f);
    if(pin)assert.equal(speed.hash(readFileSync(f)),pin.sha256);
  }
  assert.equal(speed.hash(readFileSync('tools/wh3-importer/hp-policy/static-review.json')),'2a717a9d31c2c1fc2e62fa75bc8d5574a7289cb708efa8dcd415a8d14e361a55');
  for(const p of read('tools/wh3-importer/hp-research/baseline.json').protectedFiles.filter(p=>p.file.includes('/runtime-evidence/'))){
    const b=readFileSync(p.file);assert.equal(speed.hash(p.hashMode==='LF_TEXT'?b.toString().replace(/\r\n/g,'\n'):b),p.sha256);
  }
});

test('identity, selected entity/joins, missing raw, profile/snapshot drift, unreviewed/competing sources and conflicts fail closed',async()=>{
  const {admitSpeed}=await modules(),{loadCardTraces}=await import('../tools/wh3-importer/speed-research/card-validation.mjs');
  const traces=loadCardTraces();
  for(const name of ['Swordsmen','Mounted Yeomen','Field Trebuchets']){
    const entry=direct.find(c=>c.identity.name===name),subject=manifest.subjects.find(s=>s.id===entry.identity.id),trace=traces.find(t=>t.identity.id===subject.id),
      anchor=report.anchors.find(a=>a.id===entry.candidate.validationAnchor),unit=units.find(u=>u.id===subject.id);
    const args=[subject,entry,trace,anchor,unit,manifest.staticSnapshotId];
    assert.equal(admitSpeed(...args).value,subject.expectedSpeed);
    for(const mutate of [a=>{a[0].approved=false;},a=>{a[1].status='SPEED_AMBIGUOUS';},a=>{a[0].mainKey='wrong';},a=>{a[0].landKey='wrong';},
      a=>{a[2].identity.landKey='wrong';},a=>{a[1].staticSnapshotId='wrong';},a=>{a[2].snapshotId='wrong';},a=>{a[1].candidate.profile='all cavalry';},
      a=>{a[1].candidate.selectedComponent='invalid';},a=>{a[1].candidate.selectedEntityKey='wrong';},a=>{a[1].candidate.rawRunSpeed++;},
      a=>{delete a[2].roles[a[1].candidate.selectedComponent].facts.run_speed;},a=>{a[2].roles[a[1].candidate.selectedComponent].facts.run_speed.source.joins=[];},
      a=>{a[2].roles[a[1].candidate.selectedComponent].facts.fly_speed.value=10;},a=>{a[2].extraSources.push({key:'other'});},
      a=>{a[3].kind='DIRECT_ULTRA_RUNTIME';},a=>{a[3].observedCardSpeed++;},a=>{a[3].profileSha256='wrong';},a=>{a[1].bucket='competing';},
      a=>{a[1].candidate.calculatedSpeed++;},a=>{a[1].candidate.rounding='round';},a=>{a[0].expectedSpeed=Infinity;},
      a=>{a[4].movement.speed++;},a=>{a[4].name='wrong';},a=>{a[4].entities.totalHealth++;}]){
      const bad=structuredClone(args);mutate(bad);assert.throws(()=>admitSpeed(...bad));
    }
  }
});

test('explicit scope cannot expand/reorder/duplicate; arbitrary Speed or changed non-Speed cannot disappear behind overlay',async()=>{
  const {replaySpeed}=await modules();
  for(const mutate of [m=>m.subjects.pop(),m=>m.subjects.push(m.subjects[0]),m=>m.subjects.reverse(),m=>{m.inputs[0].sha256='wrong';},m=>{m.subjects[0].expectedSpeed++;}]){
    const m=structuredClone(manifest);mutate(m);assert.throws(()=>replaySpeed(m),/Static Speed admission refused/);
  }
  const before=structuredClone(units);speed.withoutSpeed(units);speed.applyProductionSpeed(units);assert.deepEqual(units,before);
  const held=report.catalog.find(c=>c.status==='SPEED_AMBIGUOUS'&&!added.some(a=>a.identity.id===c.identity.id));
  for(const mutate of [u=>{u.find(u=>u.id===held.identity.id).movement.speed=84;},u=>{u.find(u=>u.name==='Swordsmen').movement.speed=31;},
    u=>{u.find(u=>u.name==='Swordsmen').name='wrong';},u=>u.push(u[0])]){
    const changed=structuredClone(units);mutate(changed);assert.throws(()=>speed.applyProductionSpeed(changed));
  }
  const shared=require('../.test-build/src/repositories/unitSharedIdentity.js'),diagnostics=require('../.test-build/src/repositories/unitDiagnosticRepository.js').unitDiagnosticRepository;
  for(const a of sidecar.admissions){const u=units.find(u=>u.id===a.id),d=diagnostics.get(u.id);if(!d)continue;
    assert.doesNotThrow(()=>shared.assertSharedUnitIdentity(u,d));const changed=structuredClone(u);changed.movement.speed++;
    assert.throws(()=>shared.assertSharedUnitIdentity(changed,d),/collision/);
  }
});

test('the approved seven have exact values/land/mount/schema/pack provenance, while initial 74 admissions preserve their bytes',()=>{
  const expected=[['wh_main_brt_cav_grail_knights',84],['wh_main_brt_cav_knights_of_the_realm',84],['wh_dlc07_brt_cav_questing_knights_0',84],
    ['wh_dlc07_brt_cav_knights_errant_0',84],['wh_dlc07_brt_cav_grail_guardians_0',84],['wh2_main_lzd_cav_cold_ones_1',66],['wh2_main_lzd_cav_cold_one_spearmen_1',66]];
  assert.deepEqual(sidecar.admissions.slice(74).map(a=>[a.mainKey,a.value]),expected);
  assert.equal(mounted.anchors.length,4);
  const previous=JSON.parse(speed.mountedResearchInputBytes('src/data/unitSpeedAdmissions.json'));
  assert.deepEqual(sidecar.admissions.slice(0,74),previous.admissions);
  assert.equal(speed.hash(speed.serialize(previous)),'cf21af9b51d2572eb10f18d128bff8248d89fab0914c77f0582554ff018ee63d');
  for(const a of sidecar.admissions.slice(74)){
    const c=added.find(c=>c.identity.id===a.id),f=c.sourceTraces.mount;
    assert.equal(a.landKey,c.identity.landKey);assert.equal(a.selectedComponent,'mount');assert.equal(a.selectedEntityKey,c.components.mount.entityKey);
    assert.equal(a.rawRunSpeed,c.components.mount.rawRunSpeed);assert.equal(a.kind,'STATIC_DERIVED_SPEED');assert.equal(a.value,a.rawRunSpeed*10);
    assert.equal(a.profileSha256,c.candidate.profileSha256);assert.equal(a.staticSnapshotId,mounted.staticSnapshotId);
    assert.equal(f.sourcePack,'db.pack');assert.equal(f.table,'battle_entities_tables');assert.equal(f.schemaVersion,39);
    assert.deepEqual(f.joins.map(j=>j.field),['land_unit','mount','entity']);
    assert.equal(a.sourceFieldReference,'tools/wh3-importer/speed-research/mounted-validation.json#/catalog/'+mounted.catalog.indexOf(c)+'/sourceTraces/mount');
    const anchor=mounted.anchors.find(v=>v.id===a.validationAnchor.id);assert(anchor);assert.equal(a.validationAnchor.reference,anchor.manualReference);
    assert.equal(a.validationAnchor.kind,'MANUAL_CARD_VALIDATION');
  }
  assert.equal(sidecar.admissions.at(-1).landKey,'wh2_main_lzd_cav_cold_one_spearriders_1');
  assert.notEqual(sidecar.admissions.at(-1).mainKey,sidecar.admissions.at(-1).landKey);
});

test('removing only seven Speed fields restores pre-admission catalog bytes; old 74 Speed, HP, non-Speed, order and Sample stay exact',()=>{
  const before=JSON.parse(speed.mountedResearchInputBytes('src/data/units.json'));
  assert.equal(speed.hash(speed.serialize(before)),manifest.mountedFollowup.baselineUnitsSha256);
  assert.deepEqual(before.map(u=>u.id),units.map(u=>u.id));assert.equal(units.filter(u=>u.gameVersion!=='sample').length,101);
  assert.equal(units.filter(u=>u.gameVersion==='sample').length,5);
  const changed=units.filter((u,i)=>speed.serialize(u)!==speed.serialize(before[i]));
  assert.deepEqual(changed.map(u=>u.id).sort(),added.map(c=>c.identity.id).sort());
  for(const u of changed){const copy=structuredClone(u);delete copy.movement.speed;assert.deepEqual(copy,before.find(b=>b.id===u.id));}
  for(const a of sidecar.admissions.slice(0,74))assert.deepEqual(units.find(u=>u.id===a.id),before.find(u=>u.id===a.id));
  for(const [i,u] of units.entries())assert.deepEqual(u.entities,before[i].entities);
  assert.equal(units.filter(u=>u.gameVersion!=='sample'&&u.entities.totalHealth!==undefined).length,13);
});

test('every added identity refuses wrong main/land/mount/raw/expected/profile/evidence hash/snapshot or competing source',async()=>{
  const {admitSpeed,replaySpeed}=await modules(),{loadCardTraces}=await import('../tools/wh3-importer/speed-research/card-validation.mjs');
  const traces=loadCardTraces(added.map(e=>e.identity.id));
  for(const original of added){
    const entry={...original,bucket:original.reason,candidate:{...original.candidate,sourceTrace:original.sourceTraces.mount}},
      subject=manifest.subjects.find(s=>s.id===entry.identity.id),trace=traces.find(t=>t.identity.id===subject.id),a=mounted.anchors.find(a=>a.id===entry.candidate.validationAnchor),
      anchor={...a,rawRunSpeed:a.mount.rawRunSpeed,calculatedSpeed:a.observedCardSpeed},unit=units.find(u=>u.id===subject.id),args=[subject,entry,trace,anchor,unit,manifest.staticSnapshotId];
    assert.equal(admitSpeed(...args).value,subject.expectedSpeed);
    for(const change of [a=>{a[0].mainKey='wrong';},a=>{a[0].landKey=a[0].mainKey==='wh2_main_lzd_cav_cold_one_spearmen_1'?a[0].mainKey:'wrong';},
      a=>{a[1].candidate.selectedEntityKey='wrong';},a=>{a[1].candidate.rawRunSpeed++;},a=>{a[0].expectedSpeed++;},
      a=>{a[1].candidate.profile='generic mounted';},a=>{a[1].candidate.profileSha256='wrong';},a=>{a[2].snapshotId='wrong';},
      a=>{a[2].roles.mount.facts.run_speed.source.joins[2].field='wrong';},a=>{a[2].speedSchemas.mount.version++;},
      a=>{a[2].scopedTopology.mountRecords.push(a[2].scopedTopology.mountRecords[0]);},a=>{a[3].manualReference='wrong';},
      a=>{a[3].kind='DIRECT_ULTRA_RUNTIME';},a=>{a[4].movement.speed++;}]){
      const bad=structuredClone(args);change(bad);assert.throws(()=>admitSpeed(...bad),/Static Speed admission refused/);
    }
  }
  for(const change of [m=>{m.mountedFollowup.inputs[0].sha256='wrong';},m=>{m.staticSnapshotId='wrong';},m=>{m.subjects[74].landKey='wrong';},
    m=>{m.subjects.push({...m.subjects[74],id:'ca_unit_wh_main_emp_cav_outriders_0',mainKey:'wh_main_emp_cav_outriders_0'});},
    m=>{m.mountedFollowup.inputs.pop();}]){
    const bad=structuredClone(manifest);change(bad);assert.throws(()=>replaySpeed(bad),/Static Speed admission refused/);
  }
});
