const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const read=f=>JSON.parse(readFileSync(f)),hash=b=>createHash('sha256').update(b).digest('hex');
const folder='tools/wh3-importer/speed-research/',manual=read(folder+'manual-card-evidence.json'),report=read(folder+'card-validation.json');
const modules=()=>import('../tools/wh3-importer/speed-research/card-validation.mjs');
let traceCache;const traces=async()=>traceCache??= (await modules()).loadCardTraces();

test('three user in-game readings remain distinct manual provenance and uniquely validate man/mount/engine candidates',async()=>{
  assert.equal(manual.kind,'MANUAL_CARD_VALIDATION');assert.equal(manual.observationSource,'user manual in-game card reading');
  assert.equal(manual.reportedUnitSize,'ULTRA');assert.equal(manual.observedGameVersion,null);assert.equal(manual.observedAt,null);
  assert.equal(manual.staticAssociation.sha256,hash(readFileSync(folder+'report.json')));
  assert.deepEqual(manual.samples.map(s=>s.observedCardSpeed),[30,92,20]);
  assert.deepEqual(report.anchors.map(a=>[a.selectedComponent,a.rawRunSpeed,a.calculatedSpeed]),[['man',3,30],['mount',9.2,92],['engine',2,20]]);
  const {validateManualCard}=await modules(),all=await traces();
  for(const sample of manual.samples){const c=all.find(c=>c.identity.id===sample.id),a=validateManualCard(sample,c);
    assert.equal(a.kind,'MANUAL_CARD_VALIDATION');assert.equal(a.comparison,'MATCH');assert.equal(a.productionEligible,false);
    assert.equal(a.calculatedSpeed,sample.observedCardSpeed);assert(a.sourceTrace.joins.every(j=>j.evidence.includes('is_reference')));}
  assert.equal(report.transformation.status,'VALIDATED_FOR_THREE_MANUAL_CARD_ANCHORS');assert.equal(report.transformation.universalRule,false);
  assert.equal(report.transformation.flightInference,false);assert.equal(report.transformation.normalizerPolicyChanged,false);
});

test('101 candidates replay deterministically with 74 DIRECT, 27 AMBIGUOUS, zero unavailable and no Production projection',async()=>{
  const {buildCardValidation}=await modules();assert.deepEqual(buildCardValidation(),report);assert.deepEqual(buildCardValidation(),buildCardValidation());
  assert.deepEqual(report.counts,{production:101,SPEED_DIRECT_STATIC:74,SPEED_AMBIGUOUS:27,SPEED_UNAVAILABLE:0,
    directByProfile:{NONFLYING_SINGLE_MAN_RUN:70,EXACT_MOUNTED_YEOMEN_CHAIN:2,EXACT_FIELD_TREBUCHETS_CHAIN:2},singleManGround:70,singleManDirect:70});
  assert.equal(report.productionEligible,false);for(const c of report.catalog)assert.equal(c.productionEligible,false);
  assert.equal(report.catalog.filter(c=>c.candidate).length,74);
  assert.equal(report.catalog.filter(c=>c.candidate?.validationBasis==='DIRECT_MANUAL_CARD_MATCH').length,3);
  assert.equal(report.catalog.filter(c=>c.candidate?.validationBasis==='EXACT_STRUCTURAL_PROFILE_INHERITANCE').length,71);
});

test('70 single-man candidates retain individually exact identities/entities/raw values with the same typed nonflying join semantics',()=>{
  const original=read(folder+'report.json'),singles=report.catalog.filter(c=>c.candidate?.profile==='NONFLYING_SINGLE_MAN_RUN');
  assert.equal(singles.length,70);assert.equal(new Set(singles.map(c=>c.candidate.selectedEntityKey)).size,45);
  for(const c of singles){const raw=original.catalog.find(o=>o.identity.id===c.identity.id),p=c.candidate;
    assert(raw.singleGroundSource);assert.equal(p.selectedComponent,'man');assert.equal(p.selectedEntityKey,raw.roles.man.key);
    assert.equal(p.rawRunSpeed,raw.roles.man.values.run_speed);assert.equal(p.calculatedSpeed,p.rawRunSpeed*10);
    assert(Number.isSafeInteger(p.calculatedSpeed)&&p.calculatedSpeed>0);assert.equal(p.rounding,'NONE');
    assert.equal(p.validationAnchor,'ca_unit_wh_main_emp_inf_swordsmen');assert.deepEqual(p.sourceTrace.joins.map(j=>j.field),['land_unit','man_entity']);}
  assert.equal(report.catalog.find(c=>c.identity.name==='Dragon Ogres').candidate.calculatedSpeed,64);
  assert.equal(report.catalog.find(c=>c.identity.name==='Vargheists').status,'SPEED_AMBIGUOUS');
});

test('mounted/engine inheritance is exact endpoint/value/flag matching, never faction/category or equal engine speed',async()=>{
  const extra=report.catalog.filter(c=>c.candidate&&c.topology!=='MAN_ONLY');
  assert.deepEqual(extra.map(c=>[c.identity.name,c.candidate.calculatedSpeed]),[['Mounted Yeomen',92],['Mounted Yeomen Archers',92],['Field Trebuchets',20],['Blessed Field Trebuchets',20]]);
  const all=await traces(),{classifyCardSpeed}=await modules();
  for(const name of ['Dread Saurian','Plagueclaw Catapults','Screaming Skull Catapults','Doom-Flayers','Skeleton Chariots','Black Coach'])
    assert.equal(classifyCardSpeed(all.find(c=>c.identity.name===name),report.anchors).status,'SPEED_AMBIGUOUS');
  const mounted=all.find(c=>c.identity.name==='Mounted Yeomen');
  for(const mutate of [c=>{c.roles.mount.key='other';},c=>{c.roles.mount.facts.run_speed.value++;},c=>{c.roles.man.facts.locomotion_constants.value='other';},
    c=>{c.movementFacts.sync_locomotion.value=true;},c=>{c.roles.mount.facts.run_speed.source.joins[2].field='wrong';}]){
    const c=structuredClone(mounted);mutate(c);assert.equal(classifyCardSpeed(c,report.anchors).status,'SPEED_AMBIGUOUS');}
});

test('manual identity/raw association mismatch and competing card matches cannot become anchors',async()=>{
  const {validateManualCard}=await modules(),all=await traces();
  for(const sample of manual.samples){const c=all.find(c=>c.identity.id===sample.id);
    for(const mutate of [s=>{s.mainKey='wrong';},s=>{s.landKey='wrong';},s=>{s.id='wrong';},s=>{s.observedCardSpeed++;},
      s=>{s.matchingStaticComponent.entityKey='other';},s=>{s.matchingStaticComponent.rawRunSpeed++;},s=>{s.matchingStaticComponent.role='other';}]){
      const bad=structuredClone(sample);mutate(bad);assert.throws(()=>validateManualCard(bad,c),/Speed card research refused/);}}
  const c=structuredClone(all.find(c=>c.identity.id===manual.samples[1].id));c.roles.man.facts.run_speed.value=9.2;
  assert.throws(()=>validateManualCard(manual.samples[1],c),/competing component match/);
});

test('rounding, flight, missing source, changed schema/snapshot and invalid validation basis remain fail closed',async()=>{
  const {classifyCardSpeed}=await modules(),base=(await traces()).find(c=>c.identity.name==='Swordsmen');
  for(const raw of [3.15,3.0000000004]){const c=structuredClone(base);c.roles.man.facts.run_speed.value=raw;
    const result=classifyCardSpeed(c,report.anchors);assert.equal(result.bucket,'TRANSFORMATION_ROUNDING_EDGE_CASE');assert.equal(result.candidate,null);}
  for(const mutate of [c=>{c.roles.man.facts.fly_speed.value=1;},c=>{c.roles.man.facts.fly_speed=null;},
    c=>{c.speedSchemas.man.runSpeedType='F64';},c=>{c.snapshotId='0'.repeat(64);},c=>{c.roles.man.facts.run_speed.source.field='charge_speed';},
    c=>{c.roles.man.facts.run_speed.source.schemaVersion++;},
    c=>{c.extraSources.push({key:'another'});},c=>{c.movementFacts.mounted_draughts.value=true;}]){
    const c=structuredClone(base);mutate(c);assert.equal(classifyCardSpeed(c,report.anchors).status,'SPEED_AMBIGUOUS');}
  const missing=structuredClone(base);missing.status='SPEED_UNAVAILABLE';missing.reasons=['man.EXACT_JOIN_MISSING'];
  assert.equal(classifyCardSpeed(missing,report.anchors).status,'SPEED_UNAVAILABLE');
  for(const raw of ['3',null,NaN,Infinity,0,-1]){const c=structuredClone(base);c.roles.man.facts.run_speed.value=raw;
    assert.equal(classifyCardSpeed(c,report.anchors).status,'SPEED_UNAVAILABLE');}
  for(const mutate of [a=>{a.kind='DIRECT_ULTRA_RUNTIME';},a=>{a.selectedComponent='mount';},a=>{a.observedCardSpeed++;},a=>{a.profileSha256='0'.repeat(64);},a=>{a.profile='generic cavalry';}]){
    const anchors=structuredClone(report.anchors);mutate(anchors[0]);assert.equal(classifyCardSpeed(base,anchors).status,'SPEED_AMBIGUOUS');}
  assert.equal(classifyCardSpeed(base,[...report.anchors,report.anchors[0]]).bucket,'MULTIPLE_COMPETING_INTERPRETATIONS');
});

test('ambiguity buckets are disjoint and suggestions target exact profiles within the largest bucket without assuming a winner',()=>{
  assert.deepEqual(report.ambiguityBuckets,{ARTICULATED_COMPONENT_AMBIGUITY:2,ENGINE_VEHICLE_PRECEDENCE_UNRESOLVED:5,FLYING_SEMANTICS_UNRESOLVED:3,MOUNTED_PROFILE_NOT_VALIDATED:17});
  assert.equal(Object.values(report.ambiguityBuckets).reduce((a,b)=>a+b,0),27);
  assert.deepEqual(report.suggestions.map(s=>s.identity.name),['Knights of the Realm','Cold One Riders','Grail Knights']);
  assert.deepEqual(report.suggestions.map(s=>s.possibleExactProfileCoverage),[3,2,2]);
  for(const s of report.suggestions){assert.equal(report.catalog.find(c=>c.identity.id===s.identity.id).bucket,'MOUNTED_PROFILE_NOT_VALIDATED');
    assert.equal(Object.keys(s.compareCardAgainst).join(),'man,mount');assert.notEqual(s.compareCardAgainst.man.timesTenCandidate,s.compareCardAgainst.mount.timesTenCandidate);}
});

test('Production Speed remains absent, HP/non-HP/Sample bytes and old findings remain unchanged',()=>{
  assert.equal(hash(readFileSync('src/data/units.json')),'308f7dab9ae339d2629de18d350c07febe7af78bb7fdbc20f598f9a58b7a9511');
  assert.equal(hash(readFileSync('tools/wh3-importer/hp-policy/review.json')),'4b094f4fb9ee1898674c68b686eafec22c15545808aa128283d5c62942b8f833');
  assert.equal(hash(readFileSync('tools/wh3-importer/hp-policy/static-review.json')),'2a717a9d31c2c1fc2e62fa75bc8d5574a7289cb708efa8dcd415a8d14e361a55');
  const production=read('src/data/units.json').filter(u=>u.gameVersion!=='sample');assert.equal(production.filter(u=>u.entities.totalHealth!==undefined).length,13);
  assert(production.every(u=>['speed','groundSpeed','chargeSpeed'].every(f=>!Object.hasOwn(u.movement,f))));
  assert.equal(read('tools/wh3-importer/semantics-findings.json').topics.displaySpeed.safeToNormalize,'NO');
});
