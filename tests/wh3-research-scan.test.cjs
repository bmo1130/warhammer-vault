const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const folder='tools/wh3-importer/research-scan-bretonnia/';
const bytes=readFileSync(folder+'source.json'),unitsBytes=readFileSync('src/data/units.json');
const source=JSON.parse(bytes),manifest=JSON.parse(readFileSync(folder+'manifest.json'));
const policyBytes=readFileSync('tools/wh3-importer/research-classifier/policy.mjs');
const classifierBytes=readFileSync('tools/wh3-importer/research-classifier/classify.mjs');
const scanApi=import('../tools/wh3-importer/research-scan-bretonnia/scan.mjs');
const sourceApi=import('../tools/wh3-importer/research-scan-bretonnia/source.mjs');
const core=import('../tools/wh3-importer/research-classifier/classify.mjs');
const codeLF=bytes=>bytes.toString().replace(/\r\n/g,'\n');
let cached;
const run=async()=>cached??= (await scanApi).scanResearch(bytes,unitsBytes,manifest,policyBytes,classifierBytes);
const effects=r=>r.report.technologies.flatMap(t=>t.effects);
const candidates=r=>effects(r).flatMap(e=>e.candidates);

test('full source discovery is deterministic, exact culture affiliation, unique technologies and all 179 effects preserved',async()=>{
  const {discoverTree}=await sourceApi,d=discoverTree(source);
  assert.deepEqual(d,discoverTree(structuredClone(source)));
  assert.equal(d.technologies.length,68);assert.equal(d.nodeCount,75);assert.equal(d.treeSets.length,1);
  assert.equal(new Set(d.technologies.map(t=>t.key)).size,68);
  assert.equal(d.technologies.reduce((n,t)=>n+t.effectRowIds.length,0),179);
  assert.equal(d.technologies.filter(t=>t.effectRowIds.length===0).length,0);
  // Prefix-free discovery: a real tree member not named wh_dlc07_ is retained.
  assert(d.technologies.some(t=>t.key==='tech_dlc14_brt_code_of_conduct'));
  for(const t of d.technologies) for(const m of t.memberships) {
    assert.equal(m.treeSetKey,'brt_mil');assert(m.proofs.some(([from,field])=>field==='culture'&&from===d.treeSets[0].rowId));
  }
});

test('exact affiliation breaks on culture drift; an effectless technology stays discovered (synthetic edge)',async()=>{
  const {discoverTree}=await sourceApi;
  const bad=structuredClone(source);bad.rows.find(r=>r.table==='technology_node_sets_tables').row.culture='wh_main_emp_empire';
  assert.throws(()=>discoverTree(bad),/no exact Bretonnia affiliation/);
  const empty=structuredClone(source),key='wh_dlc07_tech_brt_economy_industry_tournaments';
  empty.rows=empty.rows.filter(r=>r.table!=='technology_effects_junction_tables'||r.row.technology!==key);
  empty.coverage.find(c=>c.query.table==='technology_effects_junction_tables'&&c.query.where[0].value===key).matchedRows=0;
  const d=discoverTree(empty);assert.equal(d.technologies.length,68);assert.equal(d.technologies.find(t=>t.key===key).effectRowIds.length,0);
});

test('reviewed whitelist pin, classifier integration is export-only, batch-01 identities/states/candidates exactly retained',async()=>{
  const {sha256,classifyBatch}=await core;
  assert.equal(sha256(codeLF(policyBytes)),manifest.policySha256);
  assert.equal(sha256(codeLF(classifierBytes).replace('export function classifyResearchEffect','function classifyResearchEffect')),manifest.originalClassifierSha256);
  const old=classifyBatch(readFileSync('tools/wh3-importer/research-batch-01/source.json'),unitsBytes);
  const r=await run(),subset=r.report.technologies.filter(t=>old.technologies.some(o=>o.key===t.key));
  assert.equal(subset.length,8);assert.equal(subset.flatMap(t=>t.effects).length,17);
  const counts={DIRECT_CANDIDATE:0,REVIEW_REQUIRED:0,UNSUPPORTED:0,NON_UNIT_STAT:0};
  for(const t of subset) for(const e of t.effects) {
    counts[e.status]++;const previous=old.technologies.find(o=>o.key===t.key).effects.find(o=>o.effectKey===e.effectKey);
    assert.equal(e.rawValue,previous.rawValue);assert.equal(e.scope,previous.scope);assert.equal(e.status,previous.status);
    assert.deepEqual(e.reasonIds,previous.reasonIds);
    const ordered=values=>values.slice().sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    assert.deepEqual(ordered(e.candidates),ordered(previous.candidates));
  }
  assert.deepEqual(counts,{DIRECT_CANDIDATE:9,REVIEW_REQUIRED:4,UNSUPPORTED:1,NON_UNIT_STAT:3});
});

test('scan replay is byte/digest deterministic and works with CRLF code checkouts',async()=>{
  const {sha256}=await core,{scanResearch}=await scanApi;
  const result=await run();
  for(const [name,value] of Object.entries({'report.json':result.report,'summary.json':result.summary,'rejections.json':result.rejections,'representatives.json':result.representatives})) {
    const serialized=JSON.stringify(value,null,2)+'\n';assert.equal(readFileSync(folder+name,'utf8'),serialized);assert.equal(sha256(serialized),manifest.outputs[name]);
  }
  const crlf=buffer=>Buffer.from(buffer.toString().replace(/\r?\n/g,'\r\n'));
  assert.deepEqual(scanResearch(bytes,unitsBytes,manifest,crlf(policyBytes),crlf(classifierBytes)),result);
});

test('DIRECT totals, exact expansion, per Unit/stat/operation and main!=land chain are correct',async()=>{
  const r=await run(),s=r.summary;
  assert.deepEqual(s.effects.counts,{DIRECT_CANDIDATE:15,REVIEW_REQUIRED:151,UNSUPPORTED:1,NON_UNIT_STAT:12,UNCLASSIFIABLE_INPUT:0});
  assert.equal(s.technologies.withDirect,10);assert.equal(s.technologies.withoutDirect,58);assert.equal(s.technologies.mixed,12);
  assert.equal(s.candidates.total,96);assert.equal(s.candidates.units,22);assert.equal(s.candidates.paths,10);
  assert.deepEqual(s.candidates.operations,{add:37,multiply:59});assert.equal(candidates(r).length,96);
  assert.equal(Object.values(s.candidates.perUnit).reduce((a,b)=>a+b,0),96);
  assert.equal(Object.values(s.candidates.perPath).reduce((a,b)=>a+b,0),96);
  for(const e of effects(r).filter(e=>e.status!=='DIRECT_CANDIDATE')) assert.equal(e.candidates.length,0);
  const peasant=candidates(r).filter(c=>c.mainKey==='wh_dlc07_brt_peasant_mob_0');
  assert.equal(peasant.length,4);assert(peasant.every(c=>c.landKey==='wh_dlc07_brt_inf_peasant_mob_0'));
  assert(candidates(r).every(c=>c.provenance.sourceRef==='source'&&c.ruleIds.length===6));
});

test('all scope records, target/selector and semantics inventories are derived from actual occurrence data',async()=>{
  const r=await run(),report=r.report;
  assert.equal(report.scopes.length,7);assert.equal(report.scopes.reduce((n,s)=>n+s.effectCount,0),179);
  const own=report.scopes.find(s=>s.approvedScope);assert.equal(own.key,'faction_to_force_own_unseen');assert.equal(own.effectCount,62);
  assert(report.scopes.filter(s=>!s.approvedScope).every(s=>s.directCount===0));
  assert.deepEqual(Object.fromEntries(report.targetKinds.map(t=>[t.key,t.count])),{BASIC_BONUS:30,EXPLICIT_UNIT_SET:22,NO_BONUS_RELATION:50,OTHER_TYPED_RELATION:67,SELECTOR_UNIT_SET:10});
  assert.equal(r.summary.targets.explicitMainResolvableEffects,22);assert.equal(r.summary.targets.selectorEffects,10);
  assert(Object.keys(r.summary.targets.selectorKinds).every(k=>k.startsWith('caste:')));
  for(const inventory of report.semantics) {
    assert.equal(Object.values(inventory.classifierStates).reduce((a,b)=>a+b,0),inventory.count);
  }
  assert.deepEqual(Object.fromEntries(report.semantics.map(s=>[s.key,s.count])),{ap_damage:3,building:7,charge_bonus:1,conditional:1,
    income:18,leadership:3,melee_attack:5,melee_defense:3,missile_strength:2,other:130,recruitment_cost:3,reload:1,upkeep:2,weapon_damage:3});
});

test('actual rejection frequencies and distinct representative patterns are deterministic, bounded, non-admitting',async()=>{
  const r=await run();assert.equal(r.rejections.reasons[0].key,'SCOPE_NOT_VERIFIED_OWN_FORCE');assert.equal(r.rejections.reasons[0].count,105);
  assert.equal(r.rejections.reasons[1].key,'EFFECT_MAPPING_UNVERIFIED');assert.equal(r.rejections.reasons[1].count,42);
  assert.equal(r.representatives.length,10);assert.equal(new Set(r.representatives.map(r=>r.pattern)).size,10);
  for(const c of r.representatives) {
    const e=effects(r).find(e=>e.technologyKey===c.technologyKey&&e.effectKey===c.effectKey);assert(e);assert.notEqual(e.status,'DIRECT_CANDIDATE');
    assert.equal(c.exactEffectOccurrences,effects(r).filter(e=>e.effectKey===c.effectKey).length);
    assert(c.coverageGainNote.includes('not a predicted DIRECT gain'));
  }
  assert.equal(r.summary.coverage,'LOW_COVERAGE');assert.equal(r.summary.admissionReadiness,'B');assert.equal(r.report.candidateOnly,true);
});

test('exact candidate dedupe, semantic overlap preservation and source/value/target/provenance conflict quarantine',async()=>{
  const {dedupeCandidates}=await scanApi,c=candidates(await run())[0];
  const duplicate=dedupeCandidates([c,structuredClone(c)]);assert.equal(duplicate.candidates.length,1);assert.equal(duplicate.exactDuplicates,1);
  const overlap=dedupeCandidates([c,{...c,technologyKey:'different-technology'}]);assert.equal(overlap.candidates.length,2);assert.equal(overlap.conflicts.length,0);
  for(const mutate of [c=>{c.value++},c=>{c.landKey='wrong'},c=>{c.unitSet='wrong'},c=>{c.membershipRowIds=['wrong']},c=>{c.provenance.sourceRef='wrong'}]) {
    const altered=structuredClone(c);mutate(altered);const conflict=dedupeCandidates([c,altered]);assert.equal(conflict.candidates.length,0);assert.equal(conflict.conflicts.length,1);
  }
});

test('source snapshot/hash/affiliation/provenance and whitelist/algorithm drift fail closed',async()=>{
  const {scanResearch}=await scanApi,{sha256}=await core;
  for(const mutate of [s=>{s.rows[0].row.key='wrong'},s=>{s.provenance.gameVersion='wrong'},s=>{s.provenance.packs[0].sha256='0'.repeat(64)},s=>{delete s.provenance}]) {
    const changed=structuredClone(source);mutate(changed);assert.throws(()=>scanResearch(Buffer.from(JSON.stringify(changed)),unitsBytes,manifest,policyBytes,classifierBytes),/source hash drift/);
  }
  const changed=structuredClone(source);changed.provenance.gameVersion='wrong';const altered=Buffer.from(JSON.stringify(changed));
  assert.throws(()=>scanResearch(altered,unitsBytes,{...manifest,sourceSha256:sha256(altered)},policyBytes,classifierBytes),/Snapshot drift/);
  assert.throws(()=>scanResearch(bytes,unitsBytes,manifest,Buffer.from(policyBytes+'\n//changed'),classifierBytes),/whitelist changed/);
  assert.throws(()=>scanResearch(bytes,unitsBytes,manifest,policyBytes,Buffer.from(classifierBytes+'\n//changed')),/logic changed/);
});

test('full scanner flags same technology/effect conflicting source values without majority selection (synthetic edge)',async()=>{
  const {scanResearch}=await scanApi,{sha256}=await core;
  const changed=structuredClone(source),j=structuredClone(changed.rows.find(r=>r.table==='technology_effects_junction_tables'&&r.row.effect==='wh2_main_effect_force_stat_melee_attack_brt_knights'));
  const oldId=j.id;j.row.value=999;j.id=`${j.table}:${sha256(JSON.stringify([j.sourcePack,j.path,j.key,j.row])).slice(0,20)}`;
  changed.rows.push(j);changed.relationships.push(...changed.relationships.filter(r=>r.from===oldId).map(r=>({...r,from:j.id})));
  for(const c of changed.coverage.filter(c=>c.query.table===j.table&&c.query.where[0].value===j.row.technology)) c.matchedRows++;
  const b=Buffer.from(JSON.stringify(changed)),r=scanResearch(b,unitsBytes,{...manifest,sourceSha256:sha256(b)},policyBytes,classifierBytes);
  const blocked=effects(r).filter(e=>e.technologyKey===j.row.technology&&e.effectKey===j.row.effect);
  assert.equal(blocked.length,2);assert(blocked.every(e=>e.status==='REVIEW_REQUIRED'&&e.reasonIds.includes('SCAN_SOURCE_CONFLICT')&&e.candidates.length===0));
});

test('existing app/Calculator/Manual/Production/HP/Speed/diagnostic/shared unchanged; bounded report only changes whitelist digest',async()=>{
  const {sha256}=await core;
  const hashes={
    'src/data/units.json':'da22d7eb4d6af13856274e3f81fe18c789ed6588b6e0c956cbf97583f1350dc1',
    'src/data/caResearchEffect.json':'8faa8083057cd69360486563aff4c9c7633e2cf4d2df39e1e109adc3804d99b0',
    'src/data/unitHpAdmissions.json':'2d4e0e79e755086170358325427bfa6d6395f2d6162ba250f83b0404b21a17bd',
    'src/data/unitSpeedAdmissions.json':'2c397f2677e78c92bf9fc91c6c82c1dc43c19798e5c43335872b954f29a1e8dd',
    'src/data/unitDiagnostics.json':'1abbe4b8251320e86dbe7470bf3cf3729b7759c7c71af2af2b5b9f4ce680bb1f',
    'src/data/unitSharedIdentities.json':'3e256bf5c850df65e70a539062a5109a36c75757f8f3a34bc75d8b492aa9d13e',
    'src/pages/CalculatorPage.tsx':'a41b3f4d98e740622fd44289b6edbb69587dd73796c5962019fb3653f42456fe',
    'src/domain/caResearchEffect.ts':'865bbb4f21ecabdbbf4b4d7195d695e4fd06aaee190f650c07bc25130d8e25d3',
    'src/domain/unitModifiers.ts':'c185726116535146a58aab97a6c3208382d8e98effb8f7d8cfe72ae371e1ff91',
    'src/domain/manualModifierProfile.ts':'7fe69637988e86d1fa1dfca29f6bea48ef87e8866ac930d7d27ce9c9d650179a',
  };
  const {verifyProtected}=await import('../tools/wh3-importer/research-admission-batch-01/protected.mjs');
  for(const [file,hash] of Object.entries(hashes)) verifyProtected(file,hash);
  const previous=JSON.parse(readFileSync('tools/wh3-importer/research-mapping-review-01/manifest.json')).batchBefore;
  const report=JSON.parse(readFileSync('tools/wh3-importer/research-classifier/report.json'));
  assert.equal(sha256(JSON.stringify({...report,whitelistSha256:previous.whitelistSha256},null,2)+'\n'),previous.reportSha256);
  const units=JSON.parse(unitsBytes);assert.equal(units.filter(u=>u.gameVersion!=='sample').length,101);assert.equal(units.filter(u=>u.gameVersion==='sample').length,5);
});

test('extra typed target relations and incomplete selected joins quarantine only affected effects (synthetic edges)',async()=>{
  const {scanResearch}=await scanApi,{sha256}=await core;
  const key='wh2_main_effect_force_stat_melee_attack_brt_knights';
  const added=structuredClone(source),row=structuredClone(added.rows.find(r=>r.table==='effect_bonus_value_agent_junction_tables'));
  row.row.effect=key;row.key.effect=key;
  row.id=`${row.table}:${sha256(JSON.stringify([row.sourcePack,row.path,row.key,row.row])).slice(0,20)}`;
  added.rows.push(row);
  const target=added.rows.find(r=>r.table==='effects_tables'&&r.row.effect===key);
  added.relationships.push({from:row.id,field:'effect',to:target.id,targetField:'effect',value:key,evidence:'RPFM processed schema is_reference'});
  for(const c of added.coverage.filter(c=>c.query.table===row.table&&c.query.where[0].value.includes(key))) c.matchedRows++;
  const b=Buffer.from(JSON.stringify(added)),result=scanResearch(b,unitsBytes,{...manifest,sourceSha256:sha256(b)},policyBytes,classifierBytes);
  const e=effects(result).find(e=>e.effectKey===key);assert.equal(e.status,'UNCLASSIFIABLE_INPUT');assert.equal(e.candidates.length,0);
  assert.deepEqual(e.reasonIds,['SCAN_EXTRA_TARGET_RELATION']);
  const missing=structuredClone(source),member=missing.rows.find(r=>r.table==='unit_set_to_unit_junctions_tables'&&r.row.unit_set==='brt_knights'&&r.row.unit_record==='wh_main_brt_cav_grail_knights');
  missing.relationships=missing.relationships.filter(r=>!(r.from===member.id&&r.field==='unit_record'));
  const absent=Buffer.from(JSON.stringify(missing)),r=scanResearch(absent,unitsBytes,{...manifest,sourceSha256:sha256(absent)},policyBytes,classifierBytes);
  const quarantined=effects(r).find(e=>e.effectKey===key);assert.equal(quarantined.status,'UNCLASSIFIABLE_INPUT');assert.equal(quarantined.candidates.length,0);
  assert.deepEqual(quarantined.reasonIds,['SCAN_TARGET_TRACE_INCOMPLETE']);
  assert.equal(r.summary.effects.total,179);
});
