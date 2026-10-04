const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { MemoryRouter } = require('react-router-dom');
const App = require('../.test-build/src/App.js').default;
const { comparisonUnit } = require('../.test-build/src/repositories/productionUnitSelection.js');
const { caResearchEffects: projected, researchesForUnit, calculateResearchAndManual: calculate, researchModifiers, modifierSourceLabel } = require('../.test-build/src/domain/caResearchEffect.js');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const dir = 'tools/wh3-importer/research-batch-01/';
const sourceBytes = readFileSync(dir+'source.json'), policyBytes = readFileSync(dir+'policy.json'), unitsBytes = readFileSync('src/data/units.json');
const admission = JSON.parse(readFileSync(dir+'admission.json')), report = JSON.parse(readFileSync(dir+'review.json'));
const legacy = JSON.parse(readFileSync('tools/wh3-importer/research-admission-batch-01/legacy-projection.json'));
const key = suffix => 'wh_dlc07_tech_brt_economy_'+suffix;
const grail = comparisonUnit('ca_unit_wh_main_brt_cav_grail_knights');
const pilgrim = comparisonUnit('ca_unit_wh_dlc07_brt_inf_battle_pilgrims_0');
const peasant = comparisonUnit('ca_unit_wh_dlc07_brt_peasant_mob_0');
const selected = ['industry_tournaments','farm_hoods','industry_swords'].map(key);
const close = (a,b) => assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('eight exact CA candidates replay classification/trace/projection deterministically with original slice intact', async()=>{
  const { reviewBatch } = await import('../tools/wh3-importer/research-batch-01/review.mjs');
  const baseline = legacy[0];
  const first = reviewBatch(sourceBytes,policyBytes,admission,unitsBytes,baseline);
  assert.deepEqual(first,reviewBatch(sourceBytes,policyBytes,admission,unitsBytes,baseline));
  assert.deepEqual(first.review,report); assert.deepEqual(first.projections,legacy);
  assert.equal(report.candidates.length,8);
  assert.deepEqual(report.candidates.map(c=>c.classification),['DIRECT_SUPPORTED','DIRECT_SUPPORTED','DIRECT_SUPPORTED','SUPPORTED_WITH_LIMITATION','SUPPORTED_WITH_LIMITATION','AMBIGUOUS','SUPPORTED_WITH_LIMITATION','UNSUPPORTED']);
  assert.equal(new Set(legacy.map(p=>p.researchKey)).size,5); assert.equal(legacy.length,21);
  for(const p of legacy) {
    const c = report.candidates.find(c=>c.key===p.researchKey);
    assert(c.admittedTargets.some(t=>t.unitId===p.unitId));
    for(const m of p.modifiers) assert.equal(c.effects.find(e=>e.effectKey===m.source.split(' · ')[1]).classification,'DIRECT_SUPPORTED');
    assert.equal(p.sourceKind,'CA_RESEARCH');
  }
  assert.equal(baseline.reviewSha256,'962f0a4dca447e7f4a75704e866c6ba65dc90f7484b4f59c947db0bbe702d08b');
  assert.equal(baseline.sourceSha256,'27b33c07a14d7de90f23aef9db4eaad9e1423b3c736addb38f13f213ecfa9f97');
});

test('exact positive/negative applicability uses main membership, preserves differing land identity and set overlaps',()=>{
  assert.deepEqual(researchesForUnit(grail).map(p=>p.researchKey).sort(),[...selected,key('industry_steel')].sort());
  assert.deepEqual(researchesForUnit(pilgrim).map(p=>p.researchKey).sort(),[key('industry_swords'),key('other_fanaticism'),key('other_draft')].sort());
  assert.deepEqual(researchesForUnit(peasant).map(p=>p.researchKey).sort(),[key('other_3'),key('other_1'),key('other_draft')].sort());
  assert.equal(researchesForUnit(peasant)[0].landKey,'wh_dlc07_brt_inf_peasant_mob_0');
  assert(researchesForUnit(peasant)[0].mainKey!==researchesForUnit(peasant)[0].landKey);
  for(const suffix of ['other_fanaticism','other_3','industry_4','farm_3','other_siege']) assert(calculate(grail,[],[key(suffix)]).error);
  assert.throws(()=>researchModifiers(grail,[selected[0],selected[0]]),/중복/);
  assert.throws(()=>researchModifiers({...grail,gameVersion:'wrong'},selected));
  const includes = report.unitSets.filter(s=>s.memberships.some(m=>m.mainKey==='wh_dlc07_brt_inf_grail_reliquae_0'&&!m.exclude));
  assert.equal(includes.length,2); // overlapping sets retained, not double-applied.
  assert(report.exclusionWitness.some(w=>w.mainKey==='wh_main_brt_cav_grail_knights'&&w.exclude));
});

test('flat/percent/campaign paths, multi-effect/multi-research/manual stacking and deselection reuse engine',()=>{
  const before = JSON.stringify(grail);
  const combined = calculate(grail,[],selected);
  assert.equal(combined.unit.melee.meleeAttack,43); assert.equal(combined.unit.defense.meleeDefense,39);
  assert.equal(combined.unit.defense.leadership,85); close(combined.unit.melee.chargeBonus,82.5);
  close(combined.unit.melee.damage.base,20.16); close(combined.unit.melee.damage.armorPiercing,31.36);
  assert.deepEqual(combined,calculate(grail,[],selected.slice().reverse()));
  const manual = [{id:'manual-charge',stat:'melee.chargeBonus',operation:'multiply',value:'15'},{id:'manual-attack',stat:'melee.meleeAttack',operation:'add',value:'8'}];
  const all = calculate(grail,manual,selected);
  assert.equal(all.unit.melee.meleeAttack,51); close(all.unit.melee.chargeBonus,93.75); // additive 10+15 percent, no sequential 1.10*1.15.
  assert.equal(all.modifiers.length,2); assert(all.modifiers.every(m=>m.id.startsWith('manual-')));
  const noTournament = calculate(grail,manual,selected.filter(k=>k!==key('industry_tournaments')));
  assert.equal(noTournament.unit.melee.meleeAttack,46); assert.equal(noTournament.unit.defense.meleeDefense,34);
  const manualOnly = calculate(grail,manual,[]); close(manualOnly.unit.melee.chargeBonus,86.25);
  assert.equal(calculate(grail,[],[]).unit.melee.chargeBonus,75);
  const cost = calculate(peasant,[],[key('other_3')]);
  close(cost.unit.campaign.recruitmentCost,peasant.campaign.recruitmentCost*.9);
  assert.equal(cost.unit.melee.meleeAttack,peasant.melee.meleeAttack+10);
  assert.equal(cost.unit.customBattle.cost,peasant.customBattle.cost);
  const pilgrimage = calculate(pilgrim,[],[key('other_fanaticism')]);
  assert.equal(pilgrimage.unit.melee.meleeAttack,pilgrim.melee.meleeAttack+5);
  assert.equal(pilgrimage.unit.defense.meleeDefense,pilgrim.defense.meleeDefense+5);
  assert.equal(JSON.stringify(grail),before);
  for(const b of all.breakdown) for(const m of b.modifiers) assert(modifierSourceLabel(m.id,selected).startsWith(m.id.startsWith('manual-')?'Manual':'WH3 Research'));
});

test('unknown base stays unknown, invalid inputs reject whole result and non-applicable/unsupported research is hidden',()=>{
  const unknown = structuredClone(grail); delete unknown.melee.damage.base;
  assert.equal(calculate(unknown,[],[key('industry_swords')]).unit.melee.damage.base,undefined);
  assert(calculate(grail,[{id:'invalid',stat:'melee.meleeAttack',operation:'add',value:''}],selected).error);
  const render = unit => renderToString(React.createElement(MemoryRouter,{initialEntries:[`/calculator?unit=${unit.id}`]},React.createElement(App)));
  const html = render(grail);
  for(const name of ['Regular Tournaments','Blinker Hoods','Master Swordsmiths']) assert(html.includes(`type="checkbox"`)&&html.includes(name));
  for(const name of ['Encourage Fanaticism','Subsidised Tools','Seamstresses','Irrigation Ditches','Siege Engineering']) assert(!html.includes(name));
  assert(render(pilgrim).includes('Encourage Fanaticism'));
  assert(render(peasant).includes('Subsidised Tools'));
  assert(render(peasant).includes('NON_UNIT_STAT'));
});

test('source, interpretation, exact target, exclude, schema, scope, operation, pack/snapshot mutations fail closed',async()=>{
  const { reviewBatch } = await import('../tools/wh3-importer/research-batch-01/review.mjs');
  const source = JSON.parse(sourceBytes), policy = JSON.parse(policyBytes), baseline = legacy[0];
  const mutations = [
    s=>{s.rows.find(r=>r.table==='technologies_tables').row.key='wrong'},
    s=>{s.rows.find(r=>r.table==='Loc').row.key='wrong'},
    s=>{s.rows.find(r=>r.table==='technology_effects_junction_tables').row.effect='wrong'},
    s=>{s.rows.find(r=>r.table==='technology_effects_junction_tables').row.value=999},
    s=>{s.rows.find(r=>r.table==='technology_effects_junction_tables').row.effect_scope='wrong'},
    s=>{s.rows.find(r=>r.table==='effect_bonus_value_ids_unit_sets_tables').row.unit_set='wrong'},
    s=>{s.rows.find(r=>r.table==='unit_set_to_unit_junctions_tables').row.exclude=true},
    s=>{s.rows.find(r=>r.table==='main_units_tables').row.land_unit='wrong'},
    s=>{s.schemas.find(d=>d.table==='technology_effects_junction_tables').fields.find(f=>f.name==='effect').is_reference=['wrong','key']},
    s=>{s.provenance.packs[0].sha256='wrong'},
    s=>{s.provenance.gameVersion='wrong'},
  ];
  for(const mutate of mutations) {const changed=structuredClone(source);mutate(changed);assert.throws(()=>reviewBatch(Buffer.from(JSON.stringify(changed)),policyBytes,admission,unitsBytes,baseline),/Source drift/);}
  for(const mutate of [p=>{p.candidates[1].effects[0].mapping[0].operation='add'},p=>{p.candidates[1].admittedTargets[0].mainKey='wrong'},p=>{p.candidates[1].admittedTargets[0].landKey='wrong'},p=>{p.candidates[6].effects[1].classification='DIRECT_SUPPORTED'}]) {
    const changed=structuredClone(policy);mutate(changed);assert.throws(()=>reviewBatch(sourceBytes,Buffer.from(JSON.stringify(changed)),admission,unitsBytes,baseline),/Interpretation drift/);
  }
  for(const field of ['sourceSha256','policySha256','originalExtractionSha256','snapshotId','unitsSha256','baselineResearchKey']) assert.throws(()=>reviewBatch(sourceBytes,policyBytes,{...admission,[field]:'wrong'},unitsBytes,baseline));
  const badOperation=structuredClone(policy);badOperation.candidates[1].effects[0].mapping[0].operation='add';
  const bytes=Buffer.from(JSON.stringify(badOperation));
  assert.throws(()=>reviewBatch(sourceBytes,bytes,{...admission,policySha256:hash(bytes)},unitsBytes,baseline),/Wrong flat\/percent/);
  const badStat=structuredClone(policy);badStat.candidates[1].effects[0].mapping[0].stat='entities.totalHealth';
  const statBytes=Buffer.from(JSON.stringify(badStat));
  assert.throws(()=>reviewBatch(sourceBytes,statBytes,{...admission,policySha256:hash(statBytes)},unitsBytes,baseline),/Wrong stat\/operation/);
  // Refreshing the source checksum/row ID is still not enough to admit an excluded unit.
  const excluded=structuredClone(source);
  const member=excluded.rows.find(r=>r.table==='unit_set_to_unit_junctions_tables'&&r.row.unit_set==='brt_knights'&&r.row.unit_record==='wh_main_brt_cav_grail_knights');
  const previousId=member.id; member.row.exclude=true;
  member.id=`${member.table}:${hash(JSON.stringify([member.sourcePack,member.path,member.key,member.row])).slice(0,20)}`;
  for(const j of excluded.relationships) {if(j.from===previousId)j.from=member.id;if(j.to===previousId)j.to=member.id;}
  const excludedBytes=Buffer.from(JSON.stringify(excluded));
  assert.throws(()=>reviewBatch(excludedBytes,policyBytes,{...admission,sourceSha256:hash(excludedBytes)},unitsBytes,baseline),/Excluded unit/);
});
