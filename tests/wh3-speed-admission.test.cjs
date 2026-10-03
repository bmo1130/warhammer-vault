const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const speed=require('../tools/wh3-importer/speed-policy/overlay.cjs');
const read=f=>JSON.parse(readFileSync(f)),folder='tools/wh3-importer/speed-policy/';
const manifest=read(folder+'manifest.json'),report=read('tools/wh3-importer/speed-research/card-validation.json');
const sidecar=read('src/data/unitSpeedAdmissions.json'),units=read('src/data/units.json');
const direct=report.catalog.filter(c=>c.status==='SPEED_DIRECT_STATIC');
const modules=()=>import('../tools/wh3-importer/speed-policy/admission.mjs');

test('only the previous exact 74 DIRECT identities admit static Speed, with deterministic replay/order/bytes',async()=>{
  const {replaySpeed}=await modules();
  assert.deepEqual(replaySpeed(),sidecar);assert.deepEqual(replaySpeed(),replaySpeed());
  assert.equal(speed.hash(readFileSync('src/data/unitSpeedAdmissions.json')),speed.reviewSha256);
  assert.deepEqual(sidecar.admissions.map(a=>a.id),direct.map(c=>c.identity.id));
  assert.equal(units.filter(u=>u.gameVersion!=='sample'&&Object.hasOwn(u.movement,'speed')).length,74);
  assert.equal(units.filter(u=>u.gameVersion!=='sample'&&!Object.hasOwn(u.movement,'speed')).length,27);
  assert.deepEqual(speed.applyProductionSpeed(speed.withoutSpeed(units)),units);
  assert.deepEqual(speed.applyProductionSpeed([...units].reverse()).map(u=>u.id),[...units].reverse().map(u=>u.id));
  const check=spawnSync(process.execPath,['scripts/promote-static-speed.mjs','--check'],{encoding:'utf8'});
  assert.equal(check.status,0,check.stderr);
});

test('70 man / two mount / two engine values use the reviewed source selection, not category precedence',()=>{
  const counts={};
  for(const a of sidecar.admissions){
    const c=direct.find(c=>c.identity.id===a.id).candidate;
    assert.equal(a.value,c.calculatedSpeed);assert.equal(a.value,a.rawRunSpeed*10);
    assert.equal(a.selectedComponent,c.selectedComponent);assert.equal(a.selectedEntityKey,c.selectedEntityKey);
    assert.equal(a.profile,c.profile);assert.equal(a.profileSha256,c.profileSha256);
    assert.equal(a.staticSnapshotId,manifest.staticSnapshotId);assert.equal(a.rounding,'NONE');
    assert.equal(a.kind,'STATIC_DERIVED_SPEED');assert.equal(a.validationAnchor.kind,'MANUAL_CARD_VALIDATION');
    assert.equal(a.validationAnchor.id,c.validationAnchor);assert(a.sourceFieldReference.endsWith('/candidate/sourceTrace'));
    assert.equal(units.find(u=>u.id===a.id).movement.speed,a.value);counts[a.selectedComponent]=(counts[a.selectedComponent]??0)+1;
  }
  assert.deepEqual(counts,{man:70,mount:2,engine:2});
  for(const [name,value,role] of [['Mounted Yeomen',92,'mount'],['Mounted Yeomen Archers',92,'mount'],['Field Trebuchets',20,'engine'],['Blessed Field Trebuchets',20,'engine']]){
    const u=units.find(u=>u.name===name),a=sidecar.admissions.find(a=>a.id===u.id);
    assert.equal(u.movement.speed,value);assert.equal(a.selectedComponent,role);
  }
});

test('all 27 held units, every HP/non-Speed field, order and Sample bytes reconstruct the exact prior catalog',()=>{
  const previous=speed.withoutSpeed(units);
  assert.equal(speed.hash(speed.serialize(previous)),manifest.baselineUnitsSha256);
  assert.equal(manifest.baselineUnitsSha256,'308f7dab9ae339d2629de18d350c07febe7af78bb7fdbc20f598f9a58b7a9511');
  assert.deepEqual(units.map(u=>u.id),previous.map(u=>u.id));
  assert.deepEqual(units.filter(u=>u.gameVersion==='sample'),previous.filter(u=>u.gameVersion==='sample'));
  for(const c of report.catalog.filter(c=>c.status!=='SPEED_DIRECT_STATIC')){
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
  const held=report.catalog.find(c=>c.status==='SPEED_AMBIGUOUS');
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
