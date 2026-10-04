const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync:read}=require('node:fs');
const React=require('react');
const {renderToString}=require('react-dom/server');
const {MemoryRouter}=require('react-router-dom');
const App=require('../.test-build/src/App.js').default;
const {comparisonUnit}=require('../.test-build/src/repositories/productionUnitSelection.js');
const {researchesForUnit,researchModifiers,calculateResearchAndManual:calculate}=require('../.test-build/src/domain/caResearchEffect.js');
const {getMeleeWeaponDamage}=require('../.test-build/src/domain/unitCalculations.js');
const {getStatValue}=require('../.test-build/src/domain/unitModifiers.js');
const dir='tools/wh3-importer/research-admission-batch-01/',scan='tools/wh3-importer/research-scan-bretonnia/';
const json=p=>JSON.parse(read(p));
const report=json(scan+'report.json'),projection=json('src/data/caResearchEffect.json');
const direct=report.technologies.flatMap(t=>t.effects).filter(e=>e.status==='DIRECT_CANDIDATE');
const rawCandidates=direct.flatMap(e=>e.candidates);
const api=import('../tools/wh3-importer/research-admission-batch-01/admit.mjs');
const args={sourceBytes:read(scan+'source.json'),unitsBytes:read('src/data/units.json'),scanManifest:json(scan+'manifest.json'),
  policyBytes:read('tools/wh3-importer/research-classifier/policy.mjs'),classifierBytes:read('tools/wh3-importer/research-classifier/classify.mjs'),
  reportBytes:read(scan+'report.json'),reviewed:json(dir+'reviewed-input.json'),manifest:json(dir+'manifest.json'),legacyBytes:read(dir+'legacy-projection.json')};
const key=s=>'wh_dlc07_tech_brt_economy_'+s,unit=k=>comparisonUnit('ca_unit_'+k);
const grail=unit('wh_main_brt_cav_grail_knights'),peasant=unit('wh_dlc07_brt_peasant_mob_0'),bowman=unit('wh_main_brt_inf_peasant_bowmen');
const close=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('reviewed admission replays 15 DIRECT/96 candidates/10 technologies/22 Units with identical bytes',async()=>{
  const a=await api,first=a.admitResearch(args),second=a.admitResearch(args);
  assert.deepEqual(first,second);assert.deepEqual(first.projection,projection);
  assert.deepEqual(first.admission,json(dir+'admission.json'));assert.deepEqual(first.summary,json(dir+'summary.json'));
  assert.deepEqual([first.summary.inputDirectEffects,first.summary.admittedEffects,first.summary.admittedCandidates,first.summary.admittedTechnologies,first.summary.targetUnits],[15,15,96,10,22]);
  assert.equal(first.summary.partialTechnologies.length,5);assert.equal(first.summary.skippedEffects,164);
  assert.deepEqual(first.summary.operations,{add:37,multiply:59});
  assert.equal(first.summary.legacyContexts,21);assert.equal(first.summary.legacyModifiers,42);
  assert.equal(projection.technologies.length,new Set(projection.technologies.map(t=>t.key)).size);
  assert(!Object.hasOwn(projection,'rows')); // raw evidence stays out of app input.
});

test('all 96 candidates preserve exact technology/effect/main/land/path/operation/value; all 22 applicability sets exact',async()=>{
  const {identity}=await api;
  const expected=rawCandidates.map(identity).map(JSON.stringify).sort();
  const actual=[];
  for(const target of projection.targets) {
    const u=comparisonUnit(target.unitId),contexts=researchesForUnit(u),subset=rawCandidates.filter(c=>c.unitId===u.id);
    assert.deepEqual(contexts.map(c=>c.researchKey).sort(),[...new Set(subset.map(c=>c.technologyKey))].sort());
    const modifiers=researchModifiers(u,contexts.map(c=>c.researchKey));assert.equal(modifiers.length,subset.length);
    assert.equal(new Set(modifiers.map(m=>m.id)).size,modifiers.length);
    for(const context of contexts) {
      assert.equal(context.mainKey,target.mainKey);assert.equal(context.landKey,target.landKey);
      for(const m of context.modifiers) actual.push(JSON.stringify([context.researchKey,m.source.split(' · ')[1],context.mainKey,context.landKey,m.stat,m.operation,m.value]));
    }
  }
  assert.deepEqual(actual.sort(),expected);
  assert.equal(new Set(projection.modifiers.map(m=>m.id)).size,96);
  assert.equal(researchesForUnit(unit('wh_main_emp_inf_swordsmen')).length,0);
});

test('only DIRECT admits: REVIEW/UNSUPPORTED/NON_UNIT and target, membership, rule or identity drift fail closed',async()=>{
  const {admitCandidates}=await api,canonical=(await import('../tools/wh3-importer/research-scan-bretonnia/scan.mjs')).dedupeCandidates(rawCandidates).candidates;
  for(const field of ['technologyKey','effectKey','unitId','mainKey','landKey','unitSet','effectRowId','targetRowId','mainRowId','landRowId','scope','stat','operation','rawValue','value']) {
    const changed=structuredClone(canonical);changed[0][field]=typeof changed[0][field]==='number'?999:'wrong';
    assert.throws(()=>admitCandidates(changed,canonical),undefined,field);
  }
  for(const mutate of [c=>c.membershipRowIds.push('excluded'),c=>c.relationshipRefs.pop(),c=>c.ruleIds.pop(),c=>{c.provenance.evidence.scopeRowId='wrong'},c=>{c.value=NaN}]) {
    const changed=structuredClone(canonical);mutate(changed[0]);assert.throws(()=>admitCandidates(changed,canonical));
  }
  for(const state of ['REVIEW_REQUIRED','UNSUPPORTED','NON_UNIT_STAT']) {
    const e=report.technologies.flatMap(t=>t.effects).find(e=>e.status===state);
    assert(e);assert(!projection.effects.some(p=>p.technologyKey===e.technologyKey&&p.effectKey===e.effectKey));
    assert.throws(()=>admitCandidates([...canonical,{...canonical[0],technologyKey:e.technologyKey,effectKey:e.effectKey}],canonical));
  }
});

test('source/classifier/policy/snapshot/digest/manifest/Production drift cannot refresh admission',async()=>{
  const {admitResearch}=await api;
  for(const field of ['reportSha256','policySha256','classifierSha256','sourceSha256','unitsSha256','snapshotId','legacySha256','reviewedInputSha256','baselineCommit']) {
    assert.throws(()=>admitResearch({...args,manifest:{...args.manifest,[field]:'wrong'}}),undefined,field);
  }
  for(const field of ['sourceBytes','unitsBytes','reportBytes','policyBytes','classifierBytes','legacyBytes']) {
    assert.throws(()=>admitResearch({...args,[field]:Buffer.from('corrupt')}),undefined,field);
  }
  const changed=structuredClone(args.reviewed);changed.candidates[0].identity[3]='wrong-land';
  assert.throws(()=>admitResearch({...args,reviewed:changed}));
  const badOutput=structuredClone(args.manifest);badOutput.outputs['projection.json']='wrong';
  assert.throws(()=>admitResearch({...args,manifest:badOutput}),/output digest drift/);
  const {verifyProtected}=await import('../tools/wh3-importer/research-admission-batch-01/protected.mjs');
  assert.throws(()=>verifyProtected('src/data/units.json','wrong'),/cannot evolve/);
  // A fresh checksum cannot turn an excluded membership/source snapshot into the pinned reviewed report.
  const source=JSON.parse(args.sourceBytes);source.rows.find(r=>r.table==='unit_set_to_unit_junctions_tables').row.exclude=true;
  assert.throws(()=>admitResearch({...args,sourceBytes:Buffer.from(JSON.stringify(source))}));
});

test('exact duplicates dedupe deterministically; conflicting values/source/IDs/applicability/main-land refuse, no arbitrary winner',async()=>{
  const {admitCandidates}=await api,canonical=(await import('../tools/wh3-importer/research-scan-bretonnia/scan.mjs')).dedupeCandidates(rawCandidates).candidates;
  const duplicate=admitCandidates([...canonical,structuredClone(canonical[0])],canonical);
  assert.equal(duplicate.exactDuplicates,1);assert.deepEqual(duplicate.candidates,canonical);
  assert.deepEqual(admitCandidates(canonical.slice().reverse(),canonical).candidates,canonical);
  for(const mutate of [c=>{c.value++},c=>{c.landKey='wrong'},c=>{c.unitId='another'},c=>{c.provenance.sourceRef='wrong'},c=>{c.id='same-ID-different-source'},c=>{c.membershipRowIds=['another']}]) {
    const c=structuredClone(canonical[0]);mutate(c);assert.throws(()=>admitCandidates([...canonical,c],canonical),/collision/);
  }
});

test('negative applicability: Peasant main/land separate, Pilgrims exact only, no peasant/range bleed to Grail',()=>{
  assert(!researchesForUnit(grail).some(c=>['other_1','other_3','other_draft','other_fanaticism','other_fletchers'].map(key).includes(c.researchKey)));
  const p=researchesForUnit(peasant)[0];assert.equal(p.mainKey,'wh_dlc07_brt_peasant_mob_0');assert.equal(p.landKey,'wh_dlc07_brt_inf_peasant_mob_0');
  assert.throws(()=>researchModifiers(grail,[key('other_fletchers')]));
  for(const t of projection.targets.filter(t=>t.unitId!=='ca_unit_wh_dlc07_brt_inf_battle_pilgrims_0')) assert(!researchesForUnit(comparisonUnit(t.unitId)).some(c=>c.researchKey===key('other_fanaticism')));
});

test('technology toggle combines admitted effects only, old Grail results persist, manual and same-stat stacks restore',()=>{
  const old=['industry_tournaments','farm_hoods','industry_swords'].map(key),base=JSON.stringify(grail);
  const original=calculate(grail,[],old);assert.equal(original.unit.melee.meleeAttack,43);assert.equal(original.unit.defense.meleeDefense,39);
  close(original.unit.melee.chargeBonus,82.5);close(original.unit.melee.damage.base,20.16);close(original.unit.melee.damage.armorPiercing,31.36);
  const newKeys=[...old,key('industry_steel')];assert.equal(calculate(grail,[],newKeys).unit.defense.armor,grail.defense.armor+8);
  const manual=[{id:'manual-armor',stat:'defense.armor',operation:'add',value:'2'},{id:'manual-attack',stat:'melee.meleeAttack',operation:'add',value:'8'}];
  const all=calculate(grail,manual,newKeys);assert.equal(all.unit.defense.armor,grail.defense.armor+10);assert.equal(all.unit.melee.meleeAttack,51);
  assert.deepEqual(all,calculate(grail,manual,newKeys.slice().reverse()));assert.equal(all.modifiers.length,2);
  assert.equal(calculate(grail,manual,old).unit.defense.armor,grail.defense.armor+2);
  assert.equal(JSON.stringify(grail),base);
  const ranged=calculate(bowman,[],[key('other_fletchers')]);close(ranged.unit.missile.range,bowman.missile.range*1.05);
  assert.equal(researchModifiers(bowman,[key('other_fletchers')]).length,1); // missile damage/ammunition excluded.
  const spearman=unit('wh_main_brt_inf_spearmen_at_arms');
  const spears=calculate(spearman,[],[key('other_spears')]);
  assert.equal(spears.unit.melee.meleeAttack,spearman.melee.meleeAttack+5);
  close(getMeleeWeaponDamage(spears.unit),getMeleeWeaponDamage(spearman)*1.1);
  assert.equal(calculate(grail,[],[]).unit.defense.armor,grail.defense.armor);
});

test('unknown, zero, negative upkeep and weapon components preserve existing Modifier contracts',()=>{
  const unknown=structuredClone(peasant);delete unknown.campaign.upkeep;
  assert.equal(calculate(unknown,[],[key('other_draft')]).unit.campaign.upkeep,undefined);
  const zero=structuredClone(peasant);zero.campaign.upkeep=0;
  assert.equal(calculate(zero,[],[key('other_draft')]).unit.campaign.upkeep,0);
  assert.equal(researchModifiers(peasant,[key('other_draft')])[0].value,-5);
  close(calculate(peasant,[],[key('other_draft')]).unit.campaign.upkeep,peasant.campaign.upkeep*.95);
  const sameStat=calculate(peasant,[{id:'manual-upkeep',stat:'campaign.upkeep',operation:'multiply',value:'0'}],[key('other_draft')]);
  close(sameStat.unit.campaign.upkeep,peasant.campaign.upkeep*.95);
  assert.equal(getStatValue(calculate(unknown,[],[key('other_draft')]).unit,'campaign.upkeep'),undefined);
});

test('all partial technologies expose exclusions and CA_RESEARCH stat/op/value read-only; no unsupported checkbox',()=>{
  for(const target of projection.targets) {
    const html=renderToString(React.createElement(MemoryRouter,{initialEntries:[`/calculator?unit=${target.unitId}`]},React.createElement(App)));
    for(const context of researchesForUnit(comparisonUnit(target.unitId))) {
      assert(html.includes(context.name));assert(html.includes('CA_RESEARCH'));assert(html.includes('read-only'));
      if(context.partial){assert(html.includes('검증된 효과만 적용'));for(const e of context.omittedEffects)assert(html.includes(e.effectKey));}
    }
  }
});
