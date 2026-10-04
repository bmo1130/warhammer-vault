const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const dir = 'tools/wh3-importer/research-batch-01/';
const bytes = readFileSync(dir+'source.json'), unitsBytes = readFileSync('src/data/units.json');
const source = JSON.parse(bytes), units = JSON.parse(unitsBytes);
const reportBytes = readFileSync('tools/wh3-importer/research-classifier/report.json', 'utf8');
const api = import('../tools/wh3-importer/research-classifier/classify.mjs');
const policy = import('../tools/wh3-importer/research-classifier/policy.mjs');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const allEffects = r => r.technologies.flatMap(t=>t.effects);
const allCandidates = r => allEffects(r).flatMap(e=>e.candidates);
const attack = 'wh2_main_effect_force_stat_melee_attack_brt_knights';
const attackLinks = s => s.rows.filter(r=>r.table==='effect_bonus_value_ids_unit_sets_tables'&&r.row.effect===attack);
const member = s => s.rows.find(r=>r.table==='unit_set_to_unit_junctions_tables'&&r.row.unit_set==='brt_knights'&&r.row.unit_record==='wh_main_brt_cav_grail_knights');
const rejects = (fn, reason) => assert.throws(fn, e=>e.reason===reason, reason);

test('classifier uses source-only replay, eight technologies, effect-level states and deterministic bytes', async()=>{
  const { classifyBatch } = await api;
  const r = classifyBatch(bytes, unitsBytes);
  assert.equal(JSON.stringify(r,null,2)+'\n',reportBytes);
  assert.deepEqual(r,classifyBatch(bytes,unitsBytes));
  assert.equal(r.candidateOnly,true); assert.equal(r.summary.technologyCount,8); assert.equal(r.summary.effectCount,17);
  for(const [state,n] of [['DIRECT_CANDIDATE',9],['REVIEW_REQUIRED',4],['UNSUPPORTED',1],['NON_UNIT_STAT',3]]) assert.equal(r.summary[state],n);
  assert.equal(r.summary.candidateCount,54); assert.equal(Object.keys(r.summary.candidatesPerUnit).length,12);
  const code=readFileSync('tools/wh3-importer/research-classifier/classify.mjs','utf8');
  assert(!code.includes('review.json')&&!code.includes('admission.json')&&!code.includes('research-batch-01/policy'));
});

test('human results are test-only oracles: every direct effect/old admitted modifier preserved; denied effects never direct',async()=>{
  const r=(await api).classifyBatch(bytes,unitsBytes);
  const human=JSON.parse(readFileSync(dir+'review.json'));
  for(const technology of human.candidates) {
    const t=r.technologies.find(t=>t.key===technology.key);
    assert(t); assert.equal(t.name,technology.name);
    for(const e of technology.effects) {
      const actual=t.effects.find(x=>x.effectKey===e.effectKey); assert(actual);
      assert.equal(actual.status==='DIRECT_CANDIDATE',e.classification==='DIRECT_SUPPORTED');
      assert.equal(actual.rawValue,e.value);
      if(actual.status!=='DIRECT_CANDIDATE') {assert.equal(actual.candidates.length,0);assert(actual.reasonIds.length);}
    }
    for(const target of technology.admittedTargets) for(const modifier of target.modifiers) {
      const c=t.effects.flatMap(e=>e.candidates).filter(c=>c.unitId===target.unitId&&c.stat===modifier.stat&&c.effectKey===modifier.source.split(' · ')[1]);
      assert.equal(c.length,1); assert.equal(c[0].operation,modifier.operation); assert.equal(c[0].value,modifier.value);
    }
  }
  const denied=allEffects(r).filter(e=>e.status!=='DIRECT_CANDIDATE');
  for(const fragment of ['construction_cost','gdp_mod','upkeep','recruitment_cost_all','reload','missile_damage','leadership_siege']) assert(denied.some(e=>e.effectKey.includes(fragment)));
});

test('candidate exact main/land/Loc/schema traces, approved mapping, raw values, rule IDs and common provenance resolve',async()=>{
  const r=(await api).classifyBatch(bytes,unitsBytes), p=await policy;
  const rows=new Map(source.rows.map(row=>[row.id,row]));
  for(const c of allCandidates(r)) {
    assert.equal(c.unitId,'ca_unit_'+c.mainKey);
    assert.equal(rows.get(c.mainRowId).row.land_unit,c.landKey);
    assert.equal(rows.get(c.landRowId).row.key,c.landKey);
    assert.equal(rows.get(c.technologyLocalisationRowId).row.text,c.technologyName);
    assert.equal(rows.get(c.effectRowId).row.value,c.rawValue); assert.equal(c.rawValue,c.value);
    assert.equal(p.operations[c.stat],c.operation);
    for(const id of c.membershipRowIds) {assert.equal(rows.get(id).row.unit_record,c.mainKey);assert.equal(rows.get(id).row.exclude,false);}
    for(const [from,field,to] of c.relationshipRefs) assert(source.relationships.some(r=>r.from===from&&r.field===field&&r.to===to));
    assert(c.ruleIds.length===6&&c.ruleIds.some(id=>id.startsWith('OP_')));
    assert.equal(c.provenance.sourceKind,'CA_RESEARCH_CANDIDATE'); assert.equal(c.provenance.sourceRef,'source');
    assert.equal(r.source.sourceSha256,hash(bytes)); assert.equal(r.source.originalExtractionSha256,source.originalExtraction.sha256);
    assert.equal(c.provenance.evidence.effectTraceSourceRowId,c.effectRowId);
  }
  const peasant=allCandidates(r).filter(c=>c.mainKey==='wh_dlc07_brt_peasant_mob_0');
  assert.equal(peasant.length,2); assert(peasant.every(c=>c.landKey==='wh_dlc07_brt_inf_peasant_mob_0'));
});

test('mixed technologies retain reasons; overlapping non-Production target is explicitly omitted, not double applied',async()=>{
  const r=(await api).classifyBatch(bytes,unitsBytes);
  const mixed=r.technologies.find(t=>t.key.endsWith('other_3'));
  assert.equal(mixed.mixed,true); assert.equal(mixed.summary.DIRECT_CANDIDATE,2); assert.equal(mixed.summary.NON_UNIT_STAT,1);
  const pilgrim=r.technologies.find(t=>t.key.endsWith('other_fanaticism'));
  for(const e of pilgrim.effects) {
    assert.equal(e.candidates.length,1); assert.equal(e.candidates[0].mainKey,'wh_dlc07_brt_inf_battle_pilgrims_0');
    assert(e.omittedTargets.some(t=>t.mainKey==='wh_dlc07_brt_inf_grail_reliquae_0'&&t.reasonIds.includes('TARGET_MEMBERSHIP_AMBIGUOUS')));
  }
  assert.equal(r.summary.rejectionReasons.REGION_SCOPE_NOT_UNIT_APPLICABLE,3);
  assert.equal(r.summary.policyRuleUsage.OP_RECRUITMENT_PERCENT,1);
});

const mutations = {
  scope:s=>{s.rows.find(r=>r.table==='technology_effects_junction_tables').row.effect_scope='faction_to_region_own_unseen'},
  effect:s=>{s.rows.find(r=>r.table==='technology_effects_junction_tables').row.effect='unreviewed_effect'},
  rawValue:s=>{s.rows.find(r=>r.table==='technology_effects_junction_tables').row.value=999},
  targetSet:s=>{attackLinks(s)[0].row.unit_set='unreviewed_set'},
  membershipUnit:s=>{member(s).row.unit_record='wh_main_emp_inf_swordsmen'},
  exclude:s=>{member(s).row.exclude=true},
  mainIdentity:s=>{s.rows.find(r=>r.table==='main_units_tables').row.unit='wrong'},
  landIdentity:s=>{s.rows.find(r=>r.table==='main_units_tables').row.land_unit='wrong'},
  schema:s=>{s.schemas[0].fields[0].is_reference=['wrong','key']},
  packHash:s=>{s.provenance.packs[0].sha256='0'.repeat(64)},
  snapshot:s=>{s.provenance.gameVersion='wrong'},
  unknownSelector:s=>{member(s).row.future_selector='unknown'},
  missingProvenance:s=>{delete s.provenance},
  originalExtraction:s=>{s.originalExtraction.sha256='0'.repeat(64)},
};
for(const [name, mutate] of Object.entries(mutations)) test(`source envelope rejects ${name} drift before DIRECT generation`, async()=>{
  const {classifyBatch}=await api;
  const s=structuredClone(source); mutate(s);
  rejects(()=>classifyBatch(Buffer.from(JSON.stringify(s)),unitsBytes),'SOURCE_HASH_DRIFT');
});

test('semantic mapping guards independently reject scope/key/bonus/set/localisation/raw-value and bad operation',async()=>{
  const { mapVerifiedEffect, buildResearchCandidate, classifyBatch }=await api;
  const { ownForceScope,effectMappings }=await policy;
  const args=[attack,effectMappings[attack].description,5,ownForceScope,attackLinks(source)];
  assert.equal(mapVerifiedEffect(...args)[0].value,5);
  for(const [index,value,reason] of [[0,'unknown','EFFECT_MAPPING_UNVERIFIED'],[1,'Melee attack: %+n%','LOCALISATION_MAPPING_MISMATCH'],
    [2,NaN,'RAW_VALUE_NOT_FINITE'],[2,'5','RAW_VALUE_NOT_FINITE'],[3,{...ownForceScope,target:'region'},'SCOPE_NOT_VERIFIED_OWN_FORCE'],
    [4,[], 'TARGET_SET_OR_BONUS_MISMATCH']]) {const a=args.slice();a[index]=value;rejects(()=>mapVerifiedEffect(...a),reason);}
  const c=allCandidates(classifyBatch(bytes,unitsBytes)).find(c=>c.effectKey===attack);
  const junction=source.rows.find(r=>r.id===c.effectRowId);
  const t={key:c.technologyKey,name:c.technologyName,localisationRowId:c.technologyLocalisationRowId};
  const m=mapVerifiedEffect(...args)[0];
  rejects(()=>buildResearchCandidate(t,junction,{...m,operation:'set'},c,c.provenance.evidence),'UNKNOWN_OPERATION');
  rejects(()=>buildResearchCandidate(t,junction,{...m,value:999},c,c.provenance.evidence),'RAW_VALUE_TRANSFORMATION_NOT_APPROVED');
  rejects(()=>buildResearchCandidate(t,junction,m,c,{}),'CANDIDATE_PROVENANCE_MISSING');
  // Zero is valid semantics. This synthetic lower-layer test never repins the source or generates a committed report.
  const zero=mapVerifiedEffect(attack,args[1],0,ownForceScope,args[4])[0];
  const fixture={...junction,row:{...junction.row,value:0}};
  const candidate=buildResearchCandidate(t,fixture,zero,c,c.provenance.evidence);
  assert.equal(candidate.value,0); assert.equal(candidate.rawValue,0);
  assert.equal(mapVerifiedEffect(attack,args[1],0.25,ownForceScope,args[4])[0].value,0.25);
});

test('target semantic guards reject selectors, exclusions, coverage, broken identity/schema joins and experience ranges',async()=>{
  const { resolveExplicitTargets }=await api;
  for(const [mutate,reason] of [
    [s=>{member(s).row.unit_caste='melee_infantry'},'SELECTOR_UNSUPPORTED'],
    [s=>{member(s).row.future_selector='x'},'UNKNOWN_MEMBERSHIP_SELECTOR'],
    [s=>{member(s).row.exclude=true},'TARGET_EXCLUDED_OR_CONFLICTING'],
    [s=>{s.coverage=[]},'TARGET_COVERAGE_INCOMPLETE'],
    [s=>{s.rows.find(r=>r.table==='main_units_tables'&&r.row.unit===member(s).row.unit_record).row.land_unit='unknown'},'IDENTITY_NOT_EXACT'],
    [s=>{s.schemas.find(r=>r.table==='main_units_tables').fields.find(f=>f.name==='land_unit').is_reference=['wrong','key']},'SCHEMA_REFERENCE_CORRUPT'],
    [s=>{s.rows.find(r=>r.table==='unit_sets_tables'&&r.row.key==='brt_knights').row.use_unit_exp_level_range=true},'SET_COMPOSITION_UNRESOLVED'],
    [s=>{s.relationships=s.relationships.filter(r=>!(r.from===member(s).id&&r.field==='unit_record'))},'SOURCE_RELATIONSHIP_MISSING'],
  ]) {const s=structuredClone(source);mutate(s);rejects(()=>resolveExplicitTargets(s,units,attackLinks(s)),reason);}
});

test('identical membership dedupes deterministically; include/exclude and multiple set conflicts never choose majority',async()=>{
  const { resolveExplicitTargets }=await api;
  const baseline=resolveExplicitTargets(source,units,attackLinks(source));
  const duplicate=structuredClone(source); duplicate.rows.push(structuredClone(member(duplicate)));
  const coverage=duplicate.coverage.find(c=>c.query.table==='unit_set_to_unit_junctions_tables'&&c.query.where[0].value==='brt_knights');
  coverage.matchedRows++;
  assert.deepEqual(resolveExplicitTargets(duplicate,units,attackLinks(duplicate)),baseline);
  duplicate.rows.at(-1).row.exclude=true;
  rejects(()=>resolveExplicitTargets(duplicate,units,attackLinks(duplicate)),'TARGET_MEMBERSHIP_CONFLICT');
  const overlap=structuredClone(source), link=structuredClone(attackLinks(overlap)[0]);
  const existing=overlap.rows.find(r=>r.table==='effect_bonus_value_ids_unit_sets_tables'&&r.row.unit_set==='brt_sword_inf');
  link.id=existing.id;link.row.unit_set='brt_sword_inf';
  const moved=structuredClone(member(overlap));moved.id='overlap';moved.row.unit_set='brt_sword_inf';overlap.rows.push(moved);
  const set=overlap.rows.find(r=>r.table==='unit_sets_tables'&&r.row.key==='brt_sword_inf');
  overlap.relationships.push({from:moved.id,field:'unit_set',to:set.id,targetField:'key',value:'brt_sword_inf'});
  overlap.coverage.find(c=>c.query.table==='unit_set_to_unit_junctions_tables'&&c.query.where[0].value==='brt_sword_inf').matchedRows++;
  rejects(()=>resolveExplicitTargets(overlap,units,[...attackLinks(overlap),link]),'TARGET_MEMBERSHIP_AMBIGUOUS');
});

test('app Research, Production 101/Sample5, HP/Speed, diagnostic/shared and original batch bytes unchanged',async()=>{
  const protectedHashes={
    'src/data/caResearchEffect.json':'8faa8083057cd69360486563aff4c9c7633e2cf4d2df39e1e109adc3804d99b0',
    'src/data/units.json':'da22d7eb4d6af13856274e3f81fe18c789ed6588b6e0c956cbf97583f1350dc1',
    'src/data/unitSpeedAdmissions.json':'2c397f2677e78c92bf9fc91c6c82c1dc43c19798e5c43335872b954f29a1e8dd',
    'src/data/unitHpAdmissions.json':'2d4e0e79e755086170358325427bfa6d6395f2d6162ba250f83b0404b21a17bd',
    'src/data/unitDiagnostics.json':'1abbe4b8251320e86dbe7470bf3cf3729b7759c7c71af2af2b5b9f4ce680bb1f',
    'src/data/unitSharedIdentities.json':'3e256bf5c850df65e70a539062a5109a36c75757f8f3a34bc75d8b492aa9d13e',
    [dir+'source.json']:(await policy).pins.sourceSha256,
  };
  for(const [path,expected] of Object.entries(protectedHashes)) assert.equal(hash(readFileSync(path)),expected,path);
  assert.equal(units.filter(u=>u.gameVersion!=='sample').length,101);
  assert.equal(units.filter(u=>u.gameVersion==='sample').length,5);
  const clone=JSON.parse(unitsBytes);clone[0].id='wrong';
  const {classifyBatch}=await api;
  rejects(()=>classifyBatch(bytes,Buffer.from(JSON.stringify(clone))),'PRODUCTION_HASH_DRIFT');
});
