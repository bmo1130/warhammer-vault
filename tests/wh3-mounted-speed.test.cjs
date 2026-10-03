const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const read=f=>JSON.parse(readFileSync(f)),hash=b=>createHash('sha256').update(b).digest('hex');
const folder='tools/wh3-importer/speed-research/',manual=read(folder+'mounted-manual-card-evidence.json'),report=read(folder+'mounted-validation.json'),
  baseline=read(folder+'card-validation.json');
const modules=()=>import('../tools/wh3-importer/speed-research/mounted-validation.mjs');
let cached;const scope=async()=>cached??=(await modules()).loadMountedScope();
const expected=[['wh_main_brt_cav_grail_knights',84],['wh_main_brt_cav_knights_of_the_realm',84],
  ['wh_dlc07_brt_cav_questing_knights_0',84],['wh_dlc07_brt_cav_knights_errant_0',84],['wh_dlc07_brt_cav_grail_guardians_0',84],
  ['wh2_main_lzd_cav_cold_ones_1',66],['wh2_main_lzd_cav_cold_one_spearmen_1',66]];

test('three new user card observations remain manual provenance with exact rider/mount associations and four scoped anchors',async()=>{
  assert.equal(manual.kind,'MANUAL_CARD_VALIDATION');assert.equal(manual.observationSource,'user manual in-game card observation');
  assert.equal(manual.productionEligible,false);assert.equal(manual.observedAt,null);assert.equal(manual.observedGameVersion,null);assert.equal(manual.reportedUnitSize,null);
  assert.deepEqual(manual.samples.map(s=>s.observedCardSpeed),[84,66,84]);assert.equal(report.anchors.length,4);
  assert.deepEqual(report.anchors.map(a=>[a.rider.timesTenCandidate,a.mount.timesTenCandidate,a.observedCardSpeed]),[[33,92,92],[33,84,84],[33,66,66],[33,84,84]]);
  const {validateMountedCard}=await modules(),{traces}=await scope();
  for(const [i,s] of manual.samples.entries()){
    const a=validateMountedCard(s,traces.find(t=>t.identity.id===s.id),folder+'mounted-manual-card-evidence.json#/samples/'+i);
    assert.deepEqual(a,report.anchors[i+1]);assert.equal(a.kind,'MANUAL_CARD_VALIDATION');assert.equal(a.selectedComponent,'mount');
    assert.equal(a.comparison,'MATCH');assert.notEqual(a.rider.timesTenCandidate,a.observedCardSpeed);
    assert.deepEqual(a.sourceTraces.man.joins.map(j=>j.field),['land_unit','man_entity']);
    assert.deepEqual(a.sourceTraces.mount.joins.map(j=>j.field),['land_unit','mount','entity']);
  }
});

test('deterministic replay materializes only the existing mounted 17 plus Mounted Yeomen, never other buckets',async()=>{
  const {buildMountedValidation}=await modules(),{traces}=await scope();
  assert.deepEqual(buildMountedValidation(),report);assert.deepEqual(buildMountedValidation(),buildMountedValidation());
  const ids=baseline.catalog.filter(c=>c.bucket==='MOUNTED_PROFILE_NOT_VALIDATED').map(c=>c.identity.id);
  assert.deepEqual(report.catalog.map(c=>c.identity.id),ids);assert.deepEqual(traces.map(c=>c.identity.id),[...ids,'ca_unit_wh_main_brt_cav_mounted_yeomen_0']);
  assert.deepEqual(report.materializedIdentityIds,traces.map(c=>c.identity.id));assert.equal(traces.length,18);
  assert(traces.every(t=>t.profile==='MOUNTED'));assert.equal(report.productionEligible,false);
  assert.deepEqual(report.counts,{mountedReviewed:17,mountedAnchors:4,newDirect:7,mountedAmbiguous:10,unavailable:0,
    expectedCatalog:{SPEED_DIRECT_STATIC:81,SPEED_AMBIGUOUS:20,SPEED_UNAVAILABLE:0},unchangedProduction:{speedPopulated:74,speedBlank:27}});
});

test('exact seven candidates use mount times ten and retain the distinct Cold One Spear-Riders land identity',()=>{
  const direct=report.catalog.filter(c=>c.status==='SPEED_DIRECT_STATIC');assert.deepEqual(direct.map(c=>[c.identity.mainKey,c.candidate.calculatedSpeed]),expected);
  const counts={};for(const c of direct){const p=c.candidate;
    assert.equal(c.productionEligible,false);assert.equal(p.selectedComponent,'mount');assert.equal(p.calculatedSpeed,c.components.mount.rawRunSpeed*10);
    assert.equal(p.selectedEntityKey,c.components.mount.entityKey);assert.equal(p.rounding,'NONE');assert(c.topology.mountRecords.length===1&&c.topology.entityKeys.length===2);
    assert.equal(c.mountRelation.value,c.topology.mountRecords[0].key.key);
    const a=report.anchors.find(a=>a.id===p.validationAnchor);assert(a);assert.equal(a.profileSha256,p.profileSha256);
    assert.equal(a.mount.entityKey,p.selectedEntityKey);assert.equal(a.rider.entityKey,c.components.man.entityKey);
    counts[p.validationAnchor]=(counts[p.validationAnchor]??0)+1;
  }
  assert.deepEqual(counts,{ca_unit_wh_main_brt_cav_grail_knights:2,ca_unit_wh_main_brt_cav_knights_of_the_realm:3,ca_unit_wh2_main_lzd_cav_cold_ones_1:2});
  const spear=direct.find(c=>c.identity.mainKey==='wh2_main_lzd_cav_cold_one_spearmen_1');
  assert.equal(spear.identity.landKey,'wh2_main_lzd_cav_cold_one_spearriders_1');assert.notEqual(spear.identity.mainKey,spear.identity.landKey);
});

test('remaining ten cannot inherit by category or equal numeric values; aliased man/mount sources remain unresolved',()=>{
  assert.deepEqual(report.ambiguityReasons,{EXACT_MOUNTED_PROFILE_NOT_VALIDATED:9,RIDER_MOUNT_SOURCE_NOT_DISTINGUISHABLE:1});
  const held=report.catalog.filter(c=>c.status==='SPEED_AMBIGUOUS');assert.equal(held.length,10);assert(held.every(c=>c.candidate===null));
  const outriders=held.find(c=>c.identity.name==='Outriders');assert.equal(outriders.components.mount.timesTenCandidate,84);
  assert.equal(outriders.reason,'EXACT_MOUNTED_PROFILE_NOT_VALIDATED');
  const necrofex=held.find(c=>c.identity.name==='Necrofex Colossus');assert.equal(necrofex.components.man.entityKey,necrofex.components.mount.entityKey);
  assert.equal(necrofex.reason,'RIDER_MOUNT_SOURCE_NOT_DISTINGUISHABLE');assert.equal(necrofex.components.mount.timesTenCandidate,45);
  assert(held.some(c=>c.identity.name==='Dread Saurian'));assert(held.some(c=>c.identity.name==='Blood Knights'));
});

test('wrong manual identity/components/reading, missing joins and competing matches cannot validate an anchor',async()=>{
  const {validateMountedCard}=await modules(),sample=manual.samples[0],c=(await scope()).traces.find(t=>t.identity.id===sample.id);
  for(const mutate of [s=>{s.mainKey='wrong';},s=>{s.landKey='wrong';},s=>{s.id='wrong';},s=>{s.observedCardSpeed=33;},
    s=>{s.components.man.entityKey='other';},s=>{s.components.mount.rawRunSpeed++;},s=>{s.matchingStaticComponent.role='man';}]){
    const s=structuredClone(sample);mutate(s);assert.throws(()=>validateMountedCard(s,c,'synthetic-test'),/Mounted Speed research refused/);
  }
  const changed=structuredClone(c);changed.roles.man.facts.run_speed.value=8.4;
  const s=structuredClone(sample);s.components.man.rawRunSpeed=8.4;s.components.man.timesTenCandidate=84;
  assert.throws(()=>validateMountedCard(s,changed,'synthetic-test'),/unique manual mount match/);
});

test('extra mounts/entities, hybrid/flight/flags, schema/join/profile drift, rounding and forged anchors fail closed',async()=>{
  const {assessMounted}=await modules(),base=(await scope()).traces.find(t=>t.identity.name==='Knights of the Realm');
  assert.equal(assessMounted(base,report.anchors).status,'SPEED_DIRECT_STATIC');
  for(const mutate of [c=>{c.identity.mainKey='wrong';},c=>{c.identity.landKey='wrong';},c=>{c.scopedTopology.mountRecords.push(c.scopedTopology.mountRecords[0]);},c=>{c.scopedTopology.entityKeys.push('another');},
    c=>{c.extraSources.push({key:'extra'});},c=>{c.refs.engine.value='engine';},c=>{c.refs.articulation.value='articulation';},
    c=>{c.roles.mount.facts.fly_speed.value=1;},c=>{c.roles.mount.facts.flying_charge_speed.value=1;},c=>{c.movementFacts.sync_locomotion.value=true;},
    c=>{c.movementFacts.mounted_draughts.value=true;},c=>{c.roles.mount.key='other';},c=>{c.roles.man.facts.locomotion_constants.value='other';},
    c=>{c.roles.mount.facts.run_speed.source.joins[2].field='other';},c=>{c.speedSchemas.mount.runSpeedType='F64';},c=>{c.snapshotId='other';},
    c=>{c.roles.mount.facts.run_speed.value=8.41;}]){
    const c=structuredClone(base);mutate(c);const result=assessMounted(c,report.anchors);assert.equal(result.status,'SPEED_AMBIGUOUS');assert.equal(result.candidate,null);
  }
  const missing=structuredClone(base);delete missing.roles.mount.facts.run_speed;
  assert.equal(assessMounted(missing,report.anchors).status,'SPEED_UNAVAILABLE');
  for(const mutate of [a=>{a.kind='DIRECT_ULTRA_RUNTIME';},a=>{a.observedCardSpeed=33;},a=>{a.rider.entityKey='wrong';},a=>{a.profileSha256='wrong';},a=>{a.profileDefinition.roles.mount.entityKey='wrong';}]){
    const anchors=structuredClone(report.anchors);mutate(anchors[1]);assert.equal(assessMounted(base,anchors).status,'SPEED_AMBIGUOUS');
  }
  assert.equal(assessMounted(base,[...report.anchors,report.anchors[1]]).reason,'COMPETING_VALIDATION_PROFILES');
});

test('Production 74/27, HP13, all previous admission/manual reports and non-mounted buckets remain byte-pinned',()=>{
  for(const p of report.inputs)assert.equal(hash(readFileSync(p.file)),p.sha256);
  const units=read('src/data/units.json');assert.equal(units.filter(u=>u.gameVersion!=='sample'&&u.movement.speed!==undefined).length,74);
  assert.equal(units.filter(u=>u.gameVersion!=='sample'&&u.movement.speed===undefined).length,27);
  assert.equal(units.filter(u=>u.gameVersion!=='sample'&&u.entities.totalHealth!==undefined).length,13);
  for(const c of report.catalog)assert.equal(units.find(u=>u.id===c.identity.id).movement.speed,undefined);
  for(const [bucket,count] of Object.entries(report.untouchedBuckets)){
    const untouched=baseline.catalog.filter(c=>c.bucket===bucket);assert.equal(untouched.length,count);
    assert(untouched.every(c=>!report.materializedIdentityIds.includes(c.identity.id)));
  }
  for(const p of read('tools/wh3-importer/speed-policy/manifest.json').inputs)assert.equal(hash(readFileSync(p.file)),p.sha256);
  assert.equal(hash(readFileSync('src/data/unitSpeedAdmissions.json')),require('../tools/wh3-importer/speed-policy/overlay.cjs').reviewSha256);
  for(const p of read('tools/wh3-importer/hp-research/baseline.json').protectedFiles.filter(p=>p.file.includes('/runtime-evidence/')||
    p.file.includes('/hp-policy/inputs/')||p.file==='src/data/unitHpAdmissions.json')){
    const bytes=readFileSync(p.file);assert.equal(hash(p.hashMode==='LF_TEXT'?bytes.toString().replace(/\r\n/g,'\n'):bytes),p.sha256);
  }
});
