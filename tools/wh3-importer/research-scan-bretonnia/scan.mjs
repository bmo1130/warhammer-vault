import assert from 'node:assert/strict';
import { classifyResearchEffect, sha256, states } from '../research-classifier/classify.mjs';
import { pins, ownForceScope, effectMappings } from '../research-classifier/policy.mjs';
import { isDeepStrictEqual as equal } from 'node:util';
import { verifySource, discoverTree, sourceGraph, compare } from './source.mjs';

// Mapping-only review 01 supersedes the original whitelist pin. The original
// policy and BEFORE result remain committed in research-mapping-review-01.
export const policySha256 = 'e9547fb5ee2967dee06a70bdf1848846b56d7a1667d91b90936b6c081866aba7';
export const originalClassifierSha256 = '921e6778ea532cff17bfc94ece5b5c164eaabea08054089f79af29161cf8921c';
export const scanStates = [...states,'UNCLASSIFIABLE_INPUT'];
const countStates = effects => Object.fromEntries(scanStates.map(s=>[s,effects.filter(e=>e.status===s).length]));
const histogram = values => Object.fromEntries([...new Set(values)].sort(compare).map(v=>[v,values.filter(x=>x===v).length]));
const numericOrder = entries => entries.sort((a,b)=>b.count-a.count||compare(a.key,b.key));

export function dedupeCandidates(candidates) {
  const groups=new Map();
  for(const candidate of candidates) {
    const key=JSON.stringify([candidate.technologyKey,candidate.effectKey,candidate.mainKey,candidate.stat]);
    if(!groups.has(key)) groups.set(key,[]); groups.get(key).push(candidate);
  }
  const result=[],conflicts=[];let exactDuplicates=0;
  for(const [identity,group] of [...groups].sort((a,b)=>compare(a[0],b[0]))) {
    if(group.some(c=>!equal(c,group[0]))) conflicts.push({identity,reasonId:'SCAN_CANDIDATE_CONFLICT',candidates:group});
    else {result.push(group[0]);exactDuplicates+=group.length-1;}
  }
  return {candidates:result,exactDuplicates,conflicts};
}

function targetShape(source,effectKey,units) {
  const g=sourceGraph(source),links=source.rows.filter(r=>source.relationTables.includes(r.table)&&r.row.effect===effectKey);
  const setKeys=[...new Set(links.filter(r=>r.table==='effect_bonus_value_ids_unit_sets_tables').map(r=>r.row.unit_set))].sort(compare);
  const sets=setKeys.map(key=>{
    const definitions=g.rows('unit_sets_tables','key',key),members=g.rows('unit_set_to_unit_junctions_tables','unit_set',key);
    const selectors=members.filter(r=>r.row.unit_caste||r.row.unit_category||r.row.unit_class);
    const explicit=members.filter(r=>r.row.unit_record&&!r.row.exclude&&!r.row.unit_caste&&!r.row.unit_category&&!r.row.unit_class);
    const identityTraces=explicit.map(member=>{
      const main=g.rows('main_units_tables','unit',member.row.unit_record);
      const land=main.length===1?g.rows('land_units_tables','key',main[0].row.land_unit):[];
      const exact=main.length===1&&land.length===1;
      return {membershipRowId:member.id,mainKey:member.row.unit_record,
        mainRowIds:main.map(r=>r.id),landKey:main[0]?.row.land_unit??null,landRowIds:land.map(r=>r.id),
        status:exact?'EXACT_STATIC_CHAIN':'IDENTITY_TRACE_INCOMPLETE',
        production:exact&&units.some(u=>u.id===`ca_unit_${member.row.unit_record}`&&u.gameVersion===pins.gameVersion),
        relationshipRefs:exact?[g.join(member,'unit_record',main[0],'unit'),g.join(main[0],'land_unit',land[0],'key')]:[]};
    });
    return {key,definitionRowIds:definitions.map(r=>r.id),membershipRowIds:members.map(r=>r.id),
      selectors:selectors.map(r=>({rowId:r.id,caste:r.row.unit_caste,category:r.row.unit_category,class:r.row.unit_class})),
      exclusions:members.filter(r=>r.row.exclude).map(r=>r.id),identityTraces};
  });
  const hasSelector=sets.some(s=>s.selectors.length),explicit=setKeys.length>0&&!hasSelector&&sets.every(s=>s.definitionRowIds.length===1&&s.identityTraces.length>0&&s.identityTraces.every(t=>t.status==='EXACT_STATIC_CHAIN'));
  const kinds=[];
  if(setKeys.length) kinds.push(hasSelector?'SELECTOR_UNIT_SET':explicit?'EXPLICIT_UNIT_SET':'UNIT_SET_UNRESOLVED');
  if(links.some(r=>r.table==='effect_bonus_value_basic_junction_tables')) kinds.push('BASIC_BONUS');
  if(links.some(r=>!['effect_bonus_value_basic_junction_tables','effect_bonus_value_ids_unit_sets_tables'].includes(r.table))) kinds.push('OTHER_TYPED_RELATION');
  if(!kinds.length) kinds.push('NO_BONUS_RELATION');
  return {kind:kinds.join('+'),relationRowIds:links.map(r=>r.id),relationTables:[...new Set(links.map(r=>r.table))].sort(compare),
    bonusIds:[...new Set(links.map(r=>r.row.bonus_value_id).filter(Boolean))].sort(compare),sets,
    hasSelector,explicitMainResolvable:explicit};
}

// Inventory labels describe exact bonus IDs/typed source tables. They are not
// additional operation mappings or classifier permissions.
const semanticBonusGroups={
  melee_attack:['melee_attack_mod'],melee_defense:['melee_defence_mod'],leadership:['morale'],charge_bonus:['charge_bonus'],
  weapon_damage:['melee_damage_mod_mult'],ap_damage:['melee_damage_ap_mod_mult'],
  recruitment_cost:['cost_mod','recruitment_mod_cost_land_all'],upkeep:['upkeep_mod'],reload:['reload'],
  missile_strength:['missile_damage_mod_mult','missile_damage_ap_mod_mult'],
  income:['gdp_mod_local_trade','gdp_mod_mining','gdp_mod_animal_husbandry','gdp_mod_farming','gdp_mod_manufacture','gdp_mod_subsistence','trade_income_mod','resource_production_mod'],
  building:['building_cost_mod','building_conversion_cost_mod'],
};
function semanticLabels(e) {
  const labels=Object.entries(semanticBonusGroups).filter(([,ids])=>ids.some(id=>e.targetShape.bonusIds.includes(id))).map(([key])=>key);
  if(e.targetShape.relationTables.includes('effect_bonus_value_building_set_junctions_tables')) labels.push('building');
  if(e.reasonIds.includes('CONDITIONAL_SIEGE_EFFECT')) labels.push('conditional');
  return labels.length?[...new Set(labels)]:['other'];
}

function representatives(effects) {
  const pending=effects.filter(e=>e.status!=='DIRECT_CANDIDATE'),selected=[];
  const patterns=[
    ['UNKNOWN_EFFECT',e=>e.reasonIds.includes('EFFECT_MAPPING_UNVERIFIED'),'Review an exact effect/Loc/bonus mapping; a key whitelist expansion is required.'],
    ['UNAPPROVED_SCOPE',e=>e.reasonIds.includes('SCOPE_NOT_VERIFIED_OWN_FORCE'),'Verify the exact scope record; scope-name similarity is insufficient.'],
    ['EXPLICIT_TARGET_MAPPING_MISSING',e=>e.reasonIds.includes('EFFECT_MAPPING_UNVERIFIED')&&e.targetShape.explicitMainResolvable,'Exact targets exist; effect mapping remains unapproved.'],
    ['SELECTOR_TARGET',e=>e.targetShape.hasSelector,'Selector interpretation and exact Unit applicability both need review.'],
    ['RELOAD',e=>e.targetShape.bonusIds.includes('reload'),'Raw reload bonus sign/operation is unverified.'],
    ['MISSILE_STRENGTH',e=>e.targetShape.bonusIds.some(b=>['missile_damage_mod_mult','missile_damage_ap_mod_mult'].includes(b)),'Card strength versus raw missile fields is unverified.'],
    ['ALL_LAND',e=>e.targetShape.bonusIds.includes('recruitment_mod_cost_land_all'),'No exact explicit membership proof; no all-Unit fallback.'],
    ['SIEGE_CONDITIONAL',e=>e.reasonIds.includes('CONDITIONAL_SIEGE_EFFECT'),'Conditional applicability is outside the current engine candidate contract.'],
    ['BUILDING_TARGET',e=>e.targetShape.relationTables.includes('effect_bonus_value_building_set_junctions_tables'),'Building targets are not UnitStatPaths; review may establish exclusion, not numerical coverage.'],
    ['UPKEEP_SELECTOR',e=>e.targetShape.bonusIds.includes('upkeep_mod')&&e.targetShape.hasSelector,'Upkeep mapping and selectors remain independently unapproved.'],
  ];
  for(const [pattern,predicate,why] of patterns) {
    const pool=pending.filter(predicate),frequency=histogram(pool.map(e=>e.effectKey));
    pool.sort((a,b)=>frequency[b.effectKey]-frequency[a.effectKey]||compare(a.effectKey,b.effectKey)||compare(a.technologyKey,b.technologyKey));
    const chosen=pool.find(e=>!selected.some(s=>s.technologyKey===e.technologyKey&&s.effectKey===e.effectKey));
    if(chosen) selected.push({pattern,technologyKey:chosen.technologyKey,technologyName:chosen.technologyName,effectKey:chosen.effectKey,
      sourceRowId:chosen.sourceRowId,rawValue:chosen.rawValue,description:chosen.description??null,
      scope:chosen.scope,reasonIds:chosen.reasonIds,bonusIds:chosen.targetShape.bonusIds,unitSetKeys:chosen.targetShape.sets.map(s=>s.key),
      targetKind:chosen.targetShape.kind,why,patternEffectOccurrences:pool.length,
      exactEffectOccurrences:effects.filter(e=>e.effectKey===chosen.effectKey).length,
      coverageGainUpperBound:pool.length,coverageGainNote:'Overlapping occurrence ceiling only; not a predicted DIRECT gain. Other scope/target/mapping gates may still fail. No guarantee of numerical gain for non-Unit targets.'});
  }
  return selected;
}

export function scanResearch(sourceBytes,unitsBytes,manifest,policyBytes,classifierBytes) {
  assert.equal(manifest.format,'wh3-bretonnia-research-scan-manifest-v1');
  assert.equal(manifest.classifierCommit,'031666d408d8c92aa144c84b959410314859e099');
  const codeLF = bytes => bytes.toString().replace(/\r\n/g,'\n');
  assert.equal(manifest.policySha256,policySha256);assert.equal(sha256(codeLF(policyBytes)),policySha256,'Policy whitelist changed');
  assert.equal(manifest.originalClassifierSha256,originalClassifierSha256);
  // The sole integration change exports an existing pure function; its body and
  // every other classifier byte must match the benchmark baseline.
  assert.equal(sha256(codeLF(classifierBytes).replace('export function classifyResearchEffect','function classifyResearchEffect')),originalClassifierSha256,'Classifier logic changed');
  const source=verifySource(sourceBytes,unitsBytes,manifest),units=JSON.parse(unitsBytes),discovery=discoverTree(source),g=sourceGraph(source);
  const technologies=discovery.technologies.map(t=>{
    const effects=t.effectRowIds.map(id=>{
      const junction=source.rows.find(r=>r.id===id);
      let shape,shapeError;
      try {shape=targetShape(source,junction.row.effect,units);}
      catch(error) {
        shapeError=error.message;
        const links=source.rows.filter(r=>source.relationTables.includes(r.table)&&r.row.effect===junction.row.effect);
        shape={kind:'UNCLASSIFIABLE_TARGET_SHAPE',relationRowIds:links.map(r=>r.id),relationTables:[...new Set(links.map(r=>r.table))].sort(compare),
          bonusIds:[...new Set(links.map(r=>r.row.bonus_value_id).filter(Boolean))].sort(compare),sets:[],hasSelector:false,explicitMainResolvable:false};
      }
      const group=g.rows('technology_effects_junction_tables','technology',t.key).filter(r=>r.row.effect===junction.row.effect);
      let classified;
      if(shapeError) classified={effectKey:junction.row.effect,sourceRowId:id,rawValue:junction.row.value,scope:junction.row.effect_scope,status:'UNCLASSIFIABLE_INPUT',reasonIds:['SCAN_TARGET_TRACE_INCOMPLETE'],error:shapeError,candidates:[],omittedTargets:[]};
      else if(group.length>1) classified={effectKey:junction.row.effect,sourceRowId:id,rawValue:junction.row.value,scope:junction.row.effect_scope,status:'REVIEW_REQUIRED',reasonIds:['SCAN_SOURCE_CONFLICT'],candidates:[],omittedTargets:[],conflictingRowIds:group.map(r=>r.id)};
      else try { classified=classifyResearchEffect(source,units,t,junction); }
      catch(error) {classified={effectKey:junction.row.effect,sourceRowId:id,rawValue:junction.row.value,scope:junction.row.effect_scope,status:'UNCLASSIFIABLE_INPUT',reasonIds:['SCAN_INPUT_SHAPE_NOT_SUPPORTED'],error:error.message,candidates:[],omittedTargets:[]};}
      if(classified.status==='DIRECT_CANDIDATE'&&shape.relationTables.some(table=>!['effect_bonus_value_ids_unit_sets_tables','effect_bonus_value_basic_junction_tables'].includes(table))) {
        classified.status='UNCLASSIFIABLE_INPUT';classified.reasonIds=['SCAN_EXTRA_TARGET_RELATION'];classified.candidates=[];
      }
      return {...classified,technologyKey:t.key,technologyName:t.name,targetShape:shape};
    });
    return {...t,effects,summary:countStates(effects),mixed:new Set(effects.map(e=>e.status)).size>1};
  });
  const effects=technologies.flatMap(t=>t.effects),deduped=dedupeCandidates(effects.flatMap(e=>e.candidates));
  for(const conflict of deduped.conflicts) for(const c of conflict.candidates) {
    const e=effects.find(e=>e.technologyKey===c.technologyKey&&e.effectKey===c.effectKey);
    e.status='REVIEW_REQUIRED';e.reasonIds=['SCAN_CANDIDATE_CONFLICT'];e.candidates=[];
  }
  for(const t of technologies) {t.summary=countStates(t.effects);t.mixed=new Set(t.effects.map(e=>e.status)).size>1;}
  const candidates=dedupeCandidates(effects.flatMap(e=>e.candidates)).candidates;
  const scopes=g.rows('campaign_effect_scopes_tables').map(row=>{
    const subset=effects.filter(e=>e.scope===row.row.key);
    return {key:row.row.key,rowId:row.id,record:row.row,effectCount:subset.length,technologyCount:new Set(subset.map(e=>e.technologyKey)).size,
      classifierStates:countStates(subset),approvedScope:equal(row.row,ownForceScope),directCount:subset.filter(e=>e.status==='DIRECT_CANDIDATE').length,representativeEffect:subset[0]?.effectKey??null};
  }).sort((a,b)=>compare(a.key,b.key));
  const targetKinds=[...new Set(effects.map(e=>e.targetShape.kind))].sort(compare).map(key=>{
    const subset=effects.filter(e=>e.targetShape.kind===key);return {key,count:subset.length,classifierStates:countStates(subset)};
  });
  const semantics=[...new Set(effects.flatMap(semanticLabels))].sort(compare).map(key=>{
    const subset=effects.filter(e=>semanticLabels(e).includes(key));return {key,count:subset.length,classifierStates:countStates(subset),
      currentExactMappingCount:subset.filter(e=>effectMappings[e.effectKey]).length,bonusIds:[...new Set(subset.flatMap(e=>e.targetShape.bonusIds))].sort(compare)};
  });
  const overlaps=Object.entries(histogram(candidates.map(c=>`${c.mainKey}:${c.stat}`))).filter(([,n])=>n>1).map(([key,count])=>({key,count}));
  const summary={
    technologies:{total:technologies.length,nodes:discovery.nodeCount,withoutEffects:technologies.filter(t=>!t.effects.length).length,
      withEffects:technologies.filter(t=>t.effects.length).length,withDirect:technologies.filter(t=>t.summary.DIRECT_CANDIDATE>0).length,
      mixed:technologies.filter(t=>t.mixed).length,withoutDirect:technologies.filter(t=>!t.summary.DIRECT_CANDIDATE).length},
    effects:{total:effects.length,uniqueEffectKeys:new Set(effects.map(e=>e.effectKey)).size,counts:countStates(effects),
      percentages:Object.fromEntries(scanStates.map(s=>[s,100*effects.filter(e=>e.status===s).length/effects.length]))},
    candidates:{total:candidates.length,units:new Set(candidates.map(c=>c.mainKey)).size,paths:new Set(candidates.map(c=>c.stat)).size,
      operations:histogram(candidates.map(c=>c.operation)),perPath:histogram(candidates.map(c=>c.stat)),perEffect:histogram(candidates.map(c=>c.effectKey)),
      perTechnology:histogram(candidates.map(c=>c.technologyKey)),perUnit:histogram(candidates.map(c=>c.mainKey))},
    duplicates:{exactCandidatesRemoved:deduped.exactDuplicates,semanticOverlapGroups:overlaps,conflictingCandidates:deduped.conflicts},
    targets:{explicitMainResolvableEffects:effects.filter(e=>e.targetShape.explicitMainResolvable).length,
      explicitMainResolvablePercent:100*effects.filter(e=>e.targetShape.explicitMainResolvable).length/effects.length,
      selectorEffects:effects.filter(e=>e.targetShape.hasSelector).length,selectorPercent:100*effects.filter(e=>e.targetShape.hasSelector).length/effects.length,
      selectorKinds:histogram(effects.flatMap(e=>[...new Set(e.targetShape.sets.flatMap(s=>s.selectors.flatMap(r=>[['caste',r.caste],['category',r.category],['class',r.class]].filter(([,v])=>v).map(([k,v])=>`${k}:${v}`))))]))},
    coverage:'LOW_COVERAGE',admissionReadiness:'B',
  };
  const rejectionReasons=numericOrder(Object.entries(histogram(effects.flatMap(e=>e.reasonIds))).map(([key,count])=>({key,count})));
  const report={format:'wh3-bretonnia-research-scan-v1',candidateOnly:true,source:{path:'tools/wh3-importer/research-scan-bretonnia/source.json',
    sha256:manifest.sourceSha256,originalExtraction:source.originalExtraction,snapshotId:pins.snapshotId,policySha256,provenance:source.provenance},
    discovery,summary,scopes,targetKinds,semantics,rejectionReasons,technologies};
  return {report,summary,rejections:{effectCount:effects.length,reasons:rejectionReasons},representatives:representatives(effects)};
}
