const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const dir='tools/wh3-importer/research-mapping-review-01/',scan='tools/wh3-importer/research-scan-bretonnia/';
const json=p=>JSON.parse(readFileSync(p)),sourceBytes=readFileSync(scan+'source.json'),source=JSON.parse(sourceBytes);
const unitsBytes=readFileSync('src/data/units.json'),units=JSON.parse(unitsBytes);
const manifest=json(dir+'manifest.json'),before=json(dir+'before.json'),baseline=json(dir+'baseline-policy.json'),selected=json(dir+'selected.json');
const args=[sourceBytes,unitsBytes,json(scan+'manifest.json'),before,baseline,selected,
  readFileSync('tools/wh3-importer/research-classifier/policy.mjs'),readFileSync('tools/wh3-importer/research-classifier/classify.mjs')];
const api=import('../tools/wh3-importer/research-mapping-review-01/review.mjs');
const core=import('../tools/wh3-importer/research-classifier/classify.mjs');
const policy=import('../tools/wh3-importer/research-classifier/policy.mjs');
const scanApi=import('../tools/wh3-importer/research-scan-bretonnia/scan.mjs');
let cached;const run=async()=>cached??=(await api).reviewMappings(...args);
const approved=selected.filter(e=>!e.effectKey.includes('missile_damage')&&!e.effectKey.includes('ward_save'));

test('exact eight occurrences/eight keys selected, selector-free own-force membership; bounded six mapping additions only',async()=>{
  const a=await api,p=await policy;a.verifyPolicyExpansion(baseline);
  assert.equal(selected.length,8);assert.equal(new Set(selected.map(e=>e.effectKey)).size,8);
  assert.deepEqual(a.approvedKeys,approved.map(e=>e.effectKey));
  for(const e of selected) {
    assert.equal(e.scope,'faction_to_force_own_unseen');assert.deepEqual(e.reasonIds,['EFFECT_MAPPING_UNVERIFIED']);
    assert.equal(e.targetShape.hasSelector,false);assert.equal(e.targetShape.explicitMainResolvable,true);
    assert(e.targetShape.sets.some(s=>s.identityTraces.some(t=>t.production)));
  }
  for(const key of Object.keys(baseline.effectMappings)) assert.deepEqual(p.effectMappings[key],baseline.effectMappings[key]);
  assert.deepEqual(p.ownForceScope,baseline.ownForceScope);assert.deepEqual(p.membershipFields,baseline.membershipFields);
  assert.deepEqual(p.selectorFields,baseline.selectorFields);assert.deepEqual(p.rejectedEffects,baseline.rejectedEffects);
});

test('committed review/trace/delta replay deterministic, original source/schema/pack/Loc and exact main!=land pointers preserved',async()=>{
  const a=await api,{sha256}=await core,r=await run();
  assert.deepEqual(a.reviewMappings(...args),r);
  for(const [file,value] of Object.entries({'source-trace.json':r.trace,'review.json':r.review,'after.json':r.after,'coverage-delta.json':r.delta})) {
    const b=JSON.stringify(value,null,2)+'\n';assert.equal(readFileSync(dir+file,'utf8'),b);assert.equal(sha256(b),manifest.outputs[file]);
  }
  for(const file of ['before.json','baseline-policy.json','selected.json'])assert.equal(sha256(readFileSync(dir+file)),manifest.inputs[file]);
  assert.equal(sha256(sourceBytes),a.sourceSha256);assert.equal(r.trace.snapshotId,baseline.pins.snapshotId);
  assert.equal(r.trace.originalExtraction.sha256,args[2].originalExtractionSha256);
  for(const ref of r.trace.rows) {
    const row=source.rows.find(r=>r.id===ref.rowId);assert(row);assert.equal(sha256(JSON.stringify(row)),ref.payloadSha256);
    assert.equal(source.schemas[ref.schemaIndex].table,row.table);
  }
  for(const s of r.trace.schemas)assert.equal(sha256(JSON.stringify(source.schemas[s.index])),s.sha256);
  const mob=r.review.occurrences.find(e=>e.effectKey==='wh_dlc07_effect_force_stat_leadership_peasant_mob');
  assert.deepEqual(mob.targetMainLandPairs,[{mainKey:'wh_dlc07_brt_peasant_mob_0',landKey:'wh_dlc07_brt_inf_peasant_mob_0'}]);
});

test('exact BEFORE/AFTER coverage gains, held semantics and nine original DIRECT effects/54 candidates unchanged',async()=>{
  const r=await run(),d=r.delta;
  assert.deepEqual([d.before.technologies.total,d.before.effects.total,d.before.effects.counts.DIRECT_CANDIDATE,d.before.effects.counts.REVIEW_REQUIRED,
    d.before.candidates.total,d.before.candidates.units],[68,179,9,157,54,12]);
  assert.deepEqual([d.after.technologies.total,d.after.effects.total,d.after.effects.counts.DIRECT_CANDIDATE,d.after.effects.counts.REVIEW_REQUIRED,
    d.after.candidates.total,d.after.candidates.units],[68,179,15,151,96,22]);
  assert.deepEqual([d.newlyDirectEffects,d.newModifierCandidates,d.newTargetUnits],[6,42,10]);
  assert.deepEqual(d.perMapping.map(g=>[g.newlyDirectEffects,g.newModifierCandidates,g.newTargetUnits]),[[1,7,0],[1,1,0],[1,15,10],[1,4,4],[1,10,5],[1,5,5]]);
  assert.equal(new Set(d.perMapping.flatMap(g=>g.newTargetMainKeys)).size,10);
  const held=r.review.occurrences.filter(e=>!e.mappings.length);assert.equal(held.length,2);
  assert(held.every(e=>e.classification==='REVIEW_REQUIRED'&&e.candidateCount===0&&e.reviewReason));
  const {verifyBatchRegression}=await api;
  const batch=verifyBatchRegression(readFileSync('tools/wh3-importer/research-batch-01/source.json'),unitsBytes,manifest.batchBefore.whitelistSha256,manifest.batchBefore.reportSha256);
  assert.deepEqual([batch.technologyCount,batch.effectCount,batch.DIRECT_CANDIDATE,batch.REVIEW_REQUIRED,batch.UNSUPPORTED,batch.NON_UNIT_STAT,batch.candidateCount],[8,17,9,4,1,3,54]);
});

for(const e of approved) {
  test(`exact mapping mutations fail closed: ${e.effectKey}`,async()=>{
    const {mapVerifiedEffect,buildResearchCandidate,resolveExplicitTargets}=await core,p=await policy;
    const rule=p.effectMappings[e.effectKey],links=source.rows.filter(r=>e.targetShape.relationRowIds.includes(r.id));
    const m=mapVerifiedEffect(e.effectKey,e.description,e.rawValue,p.ownForceScope,links)[0];
    assert.throws(()=>mapVerifiedEffect(e.effectKey+'_similar',e.description,e.rawValue,p.ownForceScope,links),/EFFECT_MAPPING_UNVERIFIED/);
    const wrongLoc=e.description.replace('%+n%', '%+n').replace('%+n',m.operation==='add'?'%+n%':'%+n');
    assert.throws(()=>mapVerifiedEffect(e.effectKey,wrongLoc,e.rawValue,p.ownForceScope,links),/LOCALISATION_MAPPING_MISMATCH/);
    for(const bad of ['5%',NaN,Infinity]) assert.throws(()=>mapVerifiedEffect(e.effectKey,e.description,bad,p.ownForceScope,links),/RAW_VALUE_NOT_FINITE/);
    assert.throws(()=>mapVerifiedEffect(e.effectKey,e.description,e.rawValue,{...p.ownForceScope,target:'region'},links),/SCOPE_NOT_VERIFIED/);
    const wrongLinks=structuredClone(links);wrongLinks[0].row.bonus_value_id='similar_bonus';
    assert.throws(()=>mapVerifiedEffect(e.effectKey,e.description,e.rawValue,p.ownForceScope,wrongLinks),/TARGET_SET_OR_BONUS_MISMATCH/);
    const c=json(scan+'report.json').technologies.flatMap(t=>t.effects).flatMap(e=>e.candidates).find(c=>c.effectKey===e.effectKey&&c.stat===m.stat);
    const j=source.rows.find(r=>r.id===c.effectRowId),t={key:c.technologyKey,name:c.technologyName,localisationRowId:c.technologyLocalisationRowId};
    assert.throws(()=>buildResearchCandidate(t,j,{...m,operation:'set'},c,c.provenance.evidence),/UNKNOWN_OPERATION/);
    assert.throws(()=>buildResearchCandidate(t,j,{...m,stat:'unsupported.path'},c,c.provenance.evidence),/UNKNOWN_OPERATION/);
    // A supported path with the same operation is still not this exact mapping.
    assert.throws(()=>buildResearchCandidate(t,j,{...m,stat:m.operation==='add'?'defense.meleeDefense':'melee.chargeBonus'},c,c.provenance.evidence),/EFFECT_MAPPING_UNVERIFIED/);
    assert.throws(()=>buildResearchCandidate(t,j,{...m,value:m.value+1},c,c.provenance.evidence),/RAW_VALUE_TRANSFORMATION_NOT_APPROVED/);
    const badMembership=structuredClone(source),member=badMembership.rows.find(r=>r.id===c.membershipRowIds[0]);member.row.unit_record='wh_main_emp_inf_swordsmen';
    assert.throws(()=>resolveExplicitTargets(badMembership,units,links.filter(l=>l.row.bonus_value_id===m.bonus)),/SOURCE_RELATIONSHIP_MISSING|IDENTITY_NOT_EXACT/);
    for(const mutate of [s=>{s.rows.find(r=>r.id===e.localisationRowId).row.text='wrong'},s=>{s.provenance.gameVersion='wrong'},
      s=>{s.provenance.packs[0].sha256='0'.repeat(64)},s=>{s.rows.find(r=>r.id===e.sourceRowId).row.value++}]) {
      const changed=structuredClone(source);mutate(changed);const b=Buffer.from(JSON.stringify(changed)),a=args.slice();a[0]=b;
      const {reviewMappings}=await api;assert.throws(()=>reviewMappings(...a),/Reviewed source hash drift/);
    }
    const manifestDrift={...args[2],sourceSha256:'0'.repeat(64)};
    const a=args.slice();a[2]=manifestDrift;
    const {reviewMappings}=await api;assert.throws(()=>reviewMappings(...a),/source hash drift/);
    assert(rule.reviewRef);
  });
  test(`raw signed values and exact duplicate/overlap semantics preserved: ${e.effectKey}`,async()=>{
    const {mapVerifiedEffect,buildResearchCandidate}=await core,p=await policy,{dedupeCandidates}=await scanApi;
    const links=source.rows.filter(r=>e.targetShape.relationRowIds.includes(r.id));
    const c=json(scan+'report.json').technologies.flatMap(t=>t.effects).flatMap(e=>e.candidates).find(c=>c.effectKey===e.effectKey);
    const j=source.rows.find(r=>r.id===c.effectRowId),t={key:c.technologyKey,name:c.technologyName,localisationRowId:c.technologyLocalisationRowId};
    for(const value of [0,-5,0.25]) {
      const m=mapVerifiedEffect(e.effectKey,e.description,value,p.ownForceScope,links).find(m=>m.stat===c.stat);
      const candidate=buildResearchCandidate(t,{...j,row:{...j.row,value}},m,c,c.provenance.evidence);
      assert.equal(candidate.rawValue,value);assert.equal(candidate.value,value);
    }
    assert.equal(dedupeCandidates([c,structuredClone(c)]).exactDuplicates,1);
    assert.equal(dedupeCandidates([c,{...c,technologyKey:'another-research'}]).candidates.length,2);
    assert.equal(dedupeCandidates([c,{...c,effectKey:'another-effect'}]).candidates.length,2);
    assert.equal(dedupeCandidates([c,{...c,value:c.value+1}]).candidates.length,0);
  });
}

test('review rejects out-of-batch inventory/decision or existing policy drift, and all protected app/runtime/MEDIUM bytes unchanged',async()=>{
  const a=await api,{sha256}=await core;
  const changed=structuredClone(baseline);changed.ownForceScope.target='region';assert.throws(()=>a.verifyPolicyExpansion(changed),/Only reviewed/);
  const inventory=structuredClone(selected);inventory.push(inventory[0]);const altered=args.slice();altered[5]=inventory;
  assert.throws(()=>a.reviewMappings(...altered),/inventory drift/);
  for(const [path,hash] of Object.entries(manifest.protectedFiles)) {
    const bytes=readFileSync(path);assert.equal(sha256(/\.(?:mjs|ts|tsx|ps1|md)$/.test(path)?bytes.toString().replace(/\r\n/g,'\n'):bytes),hash,path);
  }
  assert.equal(units.filter(u=>u.gameVersion!=='sample').length,101);assert.equal(units.filter(u=>u.gameVersion==='sample').length,5);
});
