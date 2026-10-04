const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const dir='tools/wh3-importer/research-scope-review-01/',scan='tools/wh3-importer/research-scan-bretonnia/';
const json=p=>JSON.parse(readFileSync(p)),sourceBytes=readFileSync(scan+'source.json'),source=JSON.parse(sourceBytes);
const unitsBytes=readFileSync('src/data/units.json'),units=JSON.parse(unitsBytes),manifest=json(dir+'manifest.json');
const args=[sourceBytes,unitsBytes,json(scan+'manifest.json'),readFileSync('tools/wh3-importer/research-classifier/policy.mjs'),readFileSync('tools/wh3-importer/research-classifier/classify.mjs')];
const api=import('../tools/wh3-importer/research-scope-review-01/review.mjs');
const core=import('../tools/wh3-importer/research-classifier/classify.mjs');
const policy=import('../tools/wh3-importer/research-classifier/policy.mjs');
const report=json(scan+'report.json'),all=report.technologies.flatMap(t=>t.effects);
const attack='wh2_main_effect_force_stat_melee_attack_brt_knights';
const anchor=all.find(e=>e.effectKey===attack),tech=report.technologies.find(t=>t.key===anchor.technologyKey);
const junction=s=>s.rows.find(r=>r.id===anchor.sourceRowId);
const member=s=>s.rows.find(r=>r.table==='unit_set_to_unit_junctions_tables'&&r.row.unit_record==='wh_main_brt_cav_grail_knights'&&r.row.unit_set==='brt_knights');
let cached;const run=async()=>cached??=(await api).reviewScope(...args);

test('actual faction-target inventory has zero scope-only occurrences; mapping-unresolved, nonexplicit and selector cases excluded',async()=>{
  const r=await run(),p=await policy;
  assert.deepEqual(r.selected,[]);assert.equal(r.inventory.occurrences.length,79);
  assert(r.inventory.occurrences.every(e=>!e.mappingApproved&&!e.selected&&e.exclusionReasons.includes('EFFECT_MAPPING_NOT_APPROVED')));
  assert.equal(r.review.selectionExclusionCounts.EFFECT_MAPPING_NOT_APPROVED,79);
  assert.equal(r.review.selectionExclusionCounts.EXPLICIT_MAIN_CHAIN_UNRESOLVED,78);
  assert.deepEqual(r.review.targetKinds,{BASIC_BONUS:6,EXPLICIT_UNIT_SET:1,NO_BONUS_RELATION:28,OTHER_TYPED_RELATION:44});
  assert.equal(all.filter(e=>p.effectMappings[e.effectKey]).length,15);
  assert(all.filter(e=>p.effectMappings[e.effectKey]).every(e=>e.scope===p.ownForceScope.key));
  assert.equal(all.filter(e=>p.effectMappings[e.effectKey]&&e.status==='REVIEW_REQUIRED').length,0);
  // Synthetic selector flags cannot create a scope-only review selection.
  const e=structuredClone(all.find(e=>e.scope==='faction_to_faction_own_unseen'&&e.targetShape.explicitMainResolvable));
  e.targetShape.hasSelector=true;
  const inspected=(await api).inspectScopeOccurrence(e,source,units);assert.equal(inspected.selected,false);assert(inspected.exclusionReasons.includes('SELECTOR_NOT_ALLOWED'));
});

test('scope identity, exact ownership/target/schema/joins preserved; engine propagation and lifetime not inferred from strings',async()=>{
  const r=await run(),a=await api,p=await policy,{sha256}=await core;
  assert.deepEqual(r.trace.scopeRows[0].row,a.observedFactionRecord);
  assert.deepEqual(r.trace.scopeRows[1].row,p.ownForceScope);
  assert.equal(r.trace.scopeRows[0].tableVersion,2);
  assert.equal(r.trace.scopeRows[0].path,'db/campaign_effect_scopes_tables/data__');
  assert.equal(r.trace.scopeRows[0].row.ownership,'yours');assert.equal(r.trace.scopeRows[0].row.location,'factionwide');
  assert.equal(r.trace.scopeRows[0].row.target,'faction');assert.equal(r.trace.scopeRows[1].row.target,'force');
  assert.deepEqual(r.trace.junctionScopeField.is_reference,['campaign_effect_scopes','key']);
  assert(r.trace.auxiliaryRefs.every(r=>r.committedReferencedRows===0&&!r.committedReferencedSchema));
  assert.equal(r.trace.factionJunctionRowIds.length,79);
  for(const ref of r.trace.caseRowRefs)assert.equal(sha256(JSON.stringify(source.rows.find(r=>r.id===ref.rowId))),ref.payloadSha256);
  for(const join of r.trace.caseScopeJoins)assert(source.relationships.some(r=>JSON.stringify(r)===JSON.stringify(join)));
  assert.equal(r.review.questions.length,7);assert.equal(r.review.questions[4].status,'UNPROVEN_DIFFERENT_TARGET_OBJECT');
  assert.equal(r.review.conclusion,'C_NOT_WHITELISTABLE_FROM_CURRENT_EVIDENCE');assert.deepEqual(r.review.newScopeRules,[]);
  assert.equal(r.review.runtimeAction,'NONE_NO_ELIGIBLE_STATIC_CASE_TO_VALIDATE');
});

test('controls are real own-force flat/percent/campaign cases, not fabricated faction positives; five negative/near-miss contrasts retained',async()=>{
  const r=await run();assert.deepEqual(r.cases.positiveFactionCandidates,[]);
  assert.equal(r.cases.ownForceControls.length,3);assert(r.cases.ownForceControls.every(c=>c.role==='EXISTING_OWN_FORCE_CONTROL_NOT_FACTION_POSITIVE'));
  assert.deepEqual(r.cases.ownForceControls.map(c=>[c.rawValue,c.targetUnitCount]),[[5,7],[10,7],[-5,15]]);
  assert.equal(r.cases.negativeContrasts.length,5);assert(r.cases.negativeContrasts.every(c=>!c.occurrence.selected));
  const near=r.cases.negativeContrasts.find(c=>c.role==='EXPLICIT_TARGET_BUT_MAPPING_UNAPPROVED');
  assert.equal(near.occurrence.effectKey,'wh2_main_effect_building_recruitment_cost_reduction_brt_resource_iron');
  assert.equal(near.occurrence.targetMainLandPairs.length,5);assert.equal(near.occurrence.mappingApproved,false);
  const mob=near.occurrence.targetMainLandPairs.find(t=>t.mainKey==='wh_dlc07_brt_peasant_mob_0');
  assert.equal(mob.landKey,'wh_dlc07_brt_inf_peasant_mob_0');
  const {resolveExplicitTargets}=await core;
  const links=source.rows.filter(r=>near.occurrence.relationRowIds.includes(r.id));
  assert.equal(resolveExplicitTargets(source,units,links).targets.length,5);
  assert(r.cases.negativeContrasts.some(c=>c.relationTables.includes('effect_bonus_value_subculture_junctions_tables')));
  assert(r.cases.negativeContrasts.some(c=>c.relationTables.includes('effect_bonus_value_scripted_junctions_tables')));
  assert(r.cases.negativeContrasts.some(c=>c.bonusIds.includes('trade_income_mod')));
});

test('scope review outputs replay exactly and BEFORE/AFTER full report/counts/reasons have zero delta',async()=>{
  const r=await run(),{sha256}=await core;
  assert.deepEqual((await api).reviewScope(...args),r);
  for(const [file,value] of Object.entries({'selected.json':r.selected,'inventory.json':r.inventory,'scope-source-trace.json':r.trace,
    'semantic-review.json':r.review,'cases.json':r.cases,'before.json':r.summary,'after.json':r.summary,'coverage-delta.json':r.delta})) {
    const b=JSON.stringify(value,null,2)+'\n';assert.equal(readFileSync(dir+file,'utf8'),b);assert.equal(sha256(b),manifest.outputs[file]);
  }
  assert.deepEqual(r.delta.before,r.delta.after);
  assert.deepEqual([r.delta.newlyDirectEffects,r.delta.newModifierCandidates,r.delta.newTargetUnits,r.delta.newDirectTechnologies],[0,0,0,0]);
  assert.deepEqual(r.delta.newDirectEffects,[]);assert.deepEqual(r.delta.newDirectTechnologySummaries,[]);
  assert.deepEqual([r.summary.summary.technologies.total,r.summary.summary.effects.total,r.summary.summary.candidates.total,
    r.summary.summary.candidates.units,r.summary.summary.technologies.withDirect],[68,179,96,22,10]);
  assert.deepEqual(r.summary.summary.effects.counts,{DIRECT_CANDIDATE:15,REVIEW_REQUIRED:151,UNSUPPORTED:1,NON_UNIT_STAT:12,UNCLASSIFIABLE_INPUT:0});
  assert.deepEqual(r.summary.rejectionReasons,report.rejectionReasons);
});

// Lower-layer synthetic controls test exact scope rejection; they are not new
// observed evidence and cannot bypass the pinned review/scan source envelope.
test('verified mapping and target do not approve faction, similar, region, province, character or other force scope',async()=>{
  const {mapVerifiedEffect,classifyResearchEffect}=await core,p=await policy;
  const links=source.rows.filter(r=>anchor.targetShape.relationRowIds.includes(r.id));
  assert.equal(classifyResearchEffect(source,units,tech,junction(source)).status,'DIRECT_CANDIDATE');
  for(const key of ['faction_to_faction_own_unseen','faction','faction_to_faction_own_seen','faction_to_region_own_unseen',
    'faction_to_province_own_unseen','faction_to_character_own_unseen','faction_to_force_own']) {
    const existing=source.rows.find(r=>r.table==='campaign_effect_scopes_tables'&&r.row.key===key);
    const record=existing?.row??{...p.ownForceScope,key};
    assert.throws(()=>mapVerifiedEffect(attack,anchor.description,anchor.rawValue,record,links),/SCOPE_NOT_VERIFIED_OWN_FORCE/);
    if(existing) {
      const s=structuredClone(source),j=junction(s);j.row.effect_scope=key;
      const relation=s.relationships.find(r=>r.from===j.id&&r.field==='effect_scope');relation.to=existing.id;relation.value=key;
      const e=classifyResearchEffect(s,units,tech,j);
      assert.equal(e.status,'REVIEW_REQUIRED');assert.deepEqual(e.reasonIds,['SCOPE_NOT_VERIFIED_OWN_FORCE']);assert.equal(e.candidates.length,0);
    }
  }
  for(const record of [{...p.ownForceScope,ownership:'enemy'},{...p.ownForceScope,location:'local'},{...p.ownForceScope,target:'faction'}])
    assert.throws(()=>mapVerifiedEffect(attack,anchor.description,5,record,links),/SCOPE_NOT_VERIFIED/);
});

test('existing own-force selection still rejects removed membership, selector, exclusion, wrong mapping and scope schema substitution',async()=>{
  const {classifyResearchEffect,mapVerifiedEffect}=await core,p=await policy;
  for(const mutate of [
    s=>{s.rows=s.rows.filter(r=>r.id!==member(s).id)},
    s=>{member(s).row.unit_caste='cavalry'},
    s=>{member(s).row.exclude=true},
    s=>{s.schemas.find(s=>s.table==='technology_effects_junction_tables').fields.find(f=>f.name==='effect_scope').is_reference=['wrong','key']},
    s=>{junction(s).row.effect='unknown_exact_effect'},
  ]) {
    const s=structuredClone(source);mutate(s);const e=classifyResearchEffect(s,units,tech,junction(s));
    assert.equal(e.status,'REVIEW_REQUIRED');assert.equal(e.candidates.length,0);assert(e.reasonIds.length);
  }
  const links=source.rows.filter(r=>anchor.targetShape.relationRowIds.includes(r.id));
  assert.throws(()=>mapVerifiedEffect(attack+'_similar',anchor.description,5,p.ownForceScope,links),/EFFECT_MAPPING_UNVERIFIED/);
});

test('source/hash/schema/snapshot/membership drift rejected before scope review output, even with caller-repinned manifest',async()=>{
  const a=await api,{sha256}=await core;
  for(const mutate of [
    s=>{s.rows.find(r=>r.table==='campaign_effect_scopes_tables').row.ownership='enemy'},
    s=>{s.schemas.find(s=>s.table==='campaign_effect_scopes_tables').fields[0].field_type='I32'},
    s=>{s.provenance.gameVersion='wrong'},s=>{s.provenance.packs[0].sha256='0'.repeat(64)},
    s=>{s.rows=s.rows.filter(r=>r.id!==member(s).id)},s=>{member(s).row.exclude=true},
    s=>{member(s).row.unit_class='unknown'},s=>{junction(s).row.effect='unknown'},
  ]) {
    const changed=structuredClone(source);mutate(changed);const b=Buffer.from(JSON.stringify(changed)),altered=args.slice();
    altered[0]=b;altered[2]={...args[2],sourceSha256:sha256(b)};
    assert.throws(()=>a.reviewScope(...altered),/Scope review source hash drift/);
  }
  const wrong=args.slice();wrong[2]={...args[2],sourceSha256:'0'.repeat(64)};assert.throws(()=>a.reviewScope(...wrong),/source hash drift/);
});

test('same technology/effect conflicting scopes quarantine without majority or fabricated eligibility (synthetic scanner edge)',async()=>{
  const {scanResearch}=await import('../tools/wh3-importer/research-scan-bretonnia/scan.mjs'),{sha256}=await core;
  const s=structuredClone(source),old=junction(s),j=structuredClone(old);j.row.effect_scope='faction_to_faction_own_unseen';
  j.id=`${j.table}:${sha256(JSON.stringify([j.sourcePack,j.path,j.key,j.row])).slice(0,20)}`;
  const scope=s.rows.find(r=>r.table==='campaign_effect_scopes_tables'&&r.row.key===j.row.effect_scope);s.rows.push(j);
  s.relationships.push(...s.relationships.filter(r=>r.from===old.id).map(r=>r.field==='effect_scope'?{...r,from:j.id,to:scope.id,value:j.row.effect_scope}:{...r,from:j.id}));
  for(const c of s.coverage.filter(c=>c.query.table===j.table&&c.query.where[0].value===j.row.technology))c.matchedRows++;
  const b=Buffer.from(JSON.stringify(s)),r=scanResearch(b,unitsBytes,{...args[2],sourceSha256:sha256(b)},args[3],args[4]);
  const occurrences=r.report.technologies.flatMap(t=>t.effects).filter(e=>e.technologyKey===anchor.technologyKey&&e.effectKey===attack);
  assert.equal(occurrences.length,2);assert(occurrences.every(e=>e.status==='REVIEW_REQUIRED'&&e.candidates.length===0&&e.reasonIds.includes('SCAN_SOURCE_CONFLICT')));
});

test('existing own-force 15 effects/96 candidates and all prior Research/code/data/evidence bytes preserved',async()=>{
  const {sha256,classifyBatch}=await core,p=await policy;
  assert.equal(all.filter(e=>e.status==='DIRECT_CANDIDATE'&&e.scope===p.ownForceScope.key).length,15);
  assert.equal(all.flatMap(e=>e.candidates).length,96);
  for(const [path,hash] of Object.entries(manifest.unchangedFiles)) (await import('../tools/wh3-importer/research-admission-batch-01/protected.mjs')).verifyProtected(path,hash);
  const protectedFiles=json(manifest.protectedManifestPath).protectedFiles;
  for(const [path,hash] of Object.entries(protectedFiles)) {
    (await import('../tools/wh3-importer/research-admission-batch-01/protected.mjs')).verifyProtected(path,hash);
  }
  const batch=classifyBatch(readFileSync('tools/wh3-importer/research-batch-01/source.json'),unitsBytes);
  assert.deepEqual([batch.summary.technologyCount,batch.summary.effectCount,batch.summary.DIRECT_CANDIDATE,batch.summary.REVIEW_REQUIRED,batch.summary.UNSUPPORTED,batch.summary.NON_UNIT_STAT,batch.summary.candidateCount],[8,17,9,4,1,3,54]);
  const m=await import('../tools/wh3-importer/research-mapping-review-01/review.mjs');
  assert.equal(m.approvedKeys.length,6);m.verifyPolicyExpansion(json('tools/wh3-importer/research-mapping-review-01/baseline-policy.json'));
  assert.equal(units.filter(u=>u.gameVersion!=='sample').length,101);assert.equal(units.filter(u=>u.gameVersion==='sample').length,5);
});
