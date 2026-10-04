import assert from 'node:assert/strict';
import {sha256,mapVerifiedEffect,resolveExplicitTargets} from '../research-classifier/classify.mjs';
import {effectMappings,ownForceScope,pins} from '../research-classifier/policy.mjs';
import {scanResearch} from '../research-scan-bretonnia/scan.mjs';
import {sourceGraph} from '../research-scan-bretonnia/source.mjs';

export const sourceSha256='72dc47e15caa9df8a6a79ccdbe21bdf6b71d3afda9ea0a6da8e895ee881146a8';
export const baselineReportSha256='97166548e93f0144c29ddc0b412f17719f450fbd90625b78d66ab6a1756d0aa3';
export const observedFactionRecord={key:'faction_to_faction_own_unseen',location:'factionwide',
  ownership:'yours',source:'faction',target:'faction',territory:'any'};
const histogram=values=>Object.fromEntries([...new Set(values)].sort().map(v=>[v,values.filter(x=>x===v).length]));
const effects=report=>report.technologies.flatMap(t=>t.effects);

// Diagnostic selection only. The existing own-force mapping helper is used to
// isolate its already-approved mapping contract; this grants no faction scope
// permission and never rewrites source or creates a faction candidate.
export function inspectScopeOccurrence(e,source,units) {
  const g=sourceGraph(source),scope=g.one('campaign_effect_scopes_tables','key',e.scope);
  const links=e.targetShape.relationRowIds.map(id=>source.rows.find(r=>r.id===id));
  const reasons=[];let mappings=[],targets=[];
  if(scope.row.source!=='faction'||scope.row.target!=='faction')reasons.push('NOT_FACTION_TARGET_SCOPE');
  if(!effectMappings[e.effectKey])reasons.push('EFFECT_MAPPING_NOT_APPROVED');
  else try {mappings=mapVerifiedEffect(e.effectKey,e.description,e.rawValue,ownForceScope,links);}
  catch(error){reasons.push(error.reason??error.message);}
  if(!e.targetShape.explicitMainResolvable)reasons.push('EXPLICIT_MAIN_CHAIN_UNRESOLVED');
  if(e.targetShape.hasSelector)reasons.push('SELECTOR_NOT_ALLOWED');
  if(!e.targetShape.sets.some(s=>s.identityTraces.some(t=>t.production)))reasons.push('NO_EXACT_PRODUCTION_TARGET');
  if(mappings.length&&e.targetShape.explicitMainResolvable&&!e.targetShape.hasSelector) {
    try {for(const m of mappings)targets.push(...resolveExplicitTargets(source,units,links.filter(l=>l.row.bonus_value_id===m.bonus)).targets);}
    catch(error){reasons.push(error.reason??error.message);}
  }
  if(e.status!=='REVIEW_REQUIRED'||!e.reasonIds.includes('SCOPE_NOT_VERIFIED_OWN_FORCE'))reasons.push('NOT_SCOPE_ONLY_REVIEW');
  return {technologyKey:e.technologyKey,technologyName:e.technologyName,effectKey:e.effectKey,sourceRowId:e.sourceRowId,
    rawValue:e.rawValue,description:e.description,scopeKey:e.scope,scopeRowId:scope.id,
    classifierStatus:e.status,classifierReasonIds:e.reasonIds,mappingApproved:!!effectMappings[e.effectKey],
    mappings,targetKind:e.targetShape.kind,unitSets:e.targetShape.sets.map(s=>s.key),
    targetMainLandPairs:e.targetShape.sets.flatMap(s=>s.identityTraces.filter(t=>t.production).map(t=>({mainKey:t.mainKey,landKey:t.landKey}))),
    relationRowIds:e.targetShape.relationRowIds,exclusionReasons:[...new Set(reasons)],selected:reasons.length===0};
}

export function reviewScope(sourceBytes,unitsBytes,scanManifest,policyBytes,classifierBytes) {
  assert.equal(sha256(sourceBytes),sourceSha256,'Scope review source hash drift');
  const result=scanResearch(sourceBytes,unitsBytes,scanManifest,policyBytes,classifierBytes);
  assert.equal(sha256(JSON.stringify(result.report,null,2)+'\n'),baselineReportSha256,'Scope baseline report drift');
  const source=JSON.parse(sourceBytes),units=JSON.parse(unitsBytes),g=sourceGraph(source),all=effects(result.report);
  const scope=g.one('campaign_effect_scopes_tables','key',observedFactionRecord.key);
  assert.deepEqual(scope.row,observedFactionRecord,'Observed faction scope record drift');
  const own=g.one('campaign_effect_scopes_tables','key',ownForceScope.key);assert.deepEqual(own.row,ownForceScope);
  const factionKeys=source.rows.filter(r=>r.table==='campaign_effect_scopes_tables'&&r.row.source==='faction'&&r.row.target==='faction').map(r=>r.row.key);
  assert.deepEqual(factionKeys,[observedFactionRecord.key]);
  const inventory=all.filter(e=>factionKeys.includes(e.scope)).map(e=>inspectScopeOccurrence(e,source,units));
  const selected=inventory.filter(e=>e.selected);
  assert.equal(inventory.length,79);assert.equal(selected.length,0);
  assert.equal(all.filter(e=>effectMappings[e.effectKey]&&e.scope!==ownForceScope.key).length,0,
    'Approved mappings outside existing own-force scope require a new review');
  const controls=['wh2_main_effect_force_stat_melee_attack_brt_knights','wh2_main_effect_force_stat_charge_bonus_pct_brt_knights','wh_dlc07_peasant_upkeep_penalty']
    .map(key=>{const e=all.find(e=>e.effectKey===key);assert.equal(e.status,'DIRECT_CANDIDATE');return {
      role:'EXISTING_OWN_FORCE_CONTROL_NOT_FACTION_POSITIVE',technologyKey:e.technologyKey,technologyName:e.technologyName,
      effectKey:key,scope:e.scope,rawValue:e.rawValue,description:e.description,sourceRowId:e.sourceRowId,
      mappings:effectMappings[key].mappings,unitSets:e.targetShape.sets.map(s=>s.key),targetUnitCount:new Set(e.candidates.map(c=>c.mainKey)).size};});
  const contrastKeys=['wh_dlc05_faction_political_diplomacy_mod_technology_bretonnia',
    'wh_dlc07_effect_chivalry_dummy','wh_dlc07_effect_increased_chivalry_tomb_kings',
    'wh_main_effect_economy_trade_tariff_mod','wh2_main_effect_building_recruitment_cost_reduction_brt_resource_iron'];
  const contrast=contrastKeys.map(key=>{const e=all.find(e=>e.effectKey===key&&e.scope===scope.row.key);assert(e);return {
    role:e.targetShape.explicitMainResolvable?'EXPLICIT_TARGET_BUT_MAPPING_UNAPPROVED':'NON_UNIT_OR_UNRESOLVED_CONTRAST',
    occurrence:inventory.find(i=>i.sourceRowId===e.sourceRowId),localisationRowId:e.localisationRowId,
    bonusIds:e.targetShape.bonusIds,relationTables:e.targetShape.relationTables};});
  const junctionSchema=g.definition(source.rows.find(r=>r.table==='technology_effects_junction_tables'));
  assert.deepEqual(junctionSchema.fields.find(f=>f.name==='effect_scope').is_reference,['campaign_effect_scopes','key']);
  const auxiliaryRefs=g.definition(scope).fields.filter(f=>f.is_reference).map(f=>({field:f.name,reference:f.is_reference,
    committedReferencedRows:source.rows.filter(r=>r.table===`${f.is_reference[0]}_tables`).length,
    committedReferencedSchema:source.schemas.some(s=>s.table===`${f.is_reference[0]}_tables`)}));
  const caseIds=new Set([...controls.map(c=>c.sourceRowId),...contrast.map(c=>c.occurrence.sourceRowId)]);
  const joins=source.relationships.filter(r=>caseIds.has(r.from)&&r.field==='effect_scope');
  for(const relation of joins)g.join(source.rows.find(r=>r.id===relation.from),'effect_scope',source.rows.find(r=>r.id===relation.to),'key');
  const trace={sourceRef:'tools/wh3-importer/research-scan-bretonnia/source.json',sourceSha256,
    originalExtraction:source.originalExtraction,snapshotId:pins.snapshotId,provenance:source.provenance,
    scopeRows:[scope,own],scopeSchema:g.definition(scope),junctionScopeField:junctionSchema.fields.find(f=>f.name==='effect_scope'),
    auxiliaryRefs,caseScopeJoins:joins,
    factionJunctionRowIds:inventory.map(e=>e.sourceRowId),
    caseRowRefs:[...caseIds].map(id=>({rowId:id,payloadSha256:sha256(JSON.stringify(source.rows.find(r=>r.id===id)))})),
    note:'String fields with schema references are recorded, not engine propagation/lifetime proof. Referenced enum/object rows and scope localised_text are absent from this committed projection.'};
  const review={format:'wh3-research-scope-review-v1',sourceKind:'MANUAL_CA_SCOPE_REVIEW',candidateOnly:true,
    conclusion:'C_NOT_WHITELISTABLE_FROM_CURRENT_EVIDENCE',selectedOccurrenceCount:0,examinedFactionOccurrences:79,
    approvedMappingOccurrences:15,approvedMappingsOutsideOwnForce:0,newScopeRules:[],newEffectMappings:[],
    scopeRecordRef:scope.id,snapshotId:pins.snapshotId,sourceSha256,
    selectionExclusionCounts:histogram(inventory.flatMap(e=>e.exclusionReasons)),targetKinds:histogram(inventory.map(e=>e.targetKind)),
    questions:[
      {question:'Research completion applies to the whole own faction?',status:'METADATA_ONLY_LIFETIME_UNPROVEN',
        evidence:'location=factionwide, ownership=yours, source/target=faction. Completion, installation and lifetime are not independently demonstrated by these rows.'},
      {question:'All exact eligible Unit members receive the faction-targeted stat?',status:'UNPROVEN',
        evidence:'No approved mapping occurrence under this scope. The sole explicit-main case also requires a separate, currently forbidden mapping review.'},
      {question:'Independent of a particular army/lord?',status:'METADATA_ONLY_PROPAGATION_UNPROVEN',
        evidence:'target=faction differs from target=force; no army/lord selector appears in that record. This does not prove inherited per-Unit propagation.'},
      {question:'Representable by research selected -> eligible Unit modified?',status:'UNPROVEN',
        evidence:'No qualifying positive case establishes Unit applicability under the faction target.'},
      {question:'Equivalent Unit calculation to faction_to_force_own_unseen?',status:'UNPROVEN_DIFFERENT_TARGET_OBJECT',
        evidence:'The two exact records differ in key and target=faction versus force. No equivalence fallback is justified.'},
      {question:'Would provenance require a separate rule if later approved?',status:'YES_CONDITIONAL_NO_RULE_ADDED',
        evidence:'Exact scope identity/target must remain distinct; never relabel it as SCOPE_OWN_FORCE_VERIFIED.'},
      {question:'Can the same scope have different effect target semantics?',status:'OBSERVED_DIFFERENT_RELATIONS',
        evidence:'79 occurrences: typed relations 44, no inspected bonus relation 28, basic bonus 6, explicit unit-set 1. Scope alone does not define a Unit stat.'},
    ],runtimeAction:'NONE_NO_ELIGIBLE_STATIC_CASE_TO_VALIDATE',
    remainingUnknowns:['Engine propagation from faction target to Units','Research installation/persistence semantics',
      'Referenced scope object/location/ownership/territory records and scope localisation are not materialized'],
    nextStep:'Keep the exact own-force rule. Existing 96 DIRECT candidates can undergo separate human admission review; do not expand another mapping/scope in this task.'};
  const summary={summary:result.summary,rejectionReasons:result.rejections.reasons,fullReportSha256:baselineReportSha256};
  return {selected,inventory:{sourceRef:trace.sourceRef,sourceSha256,scopeRecord:scope.row,scopeRowId:scope.id,
    examinedOccurrences:79,selectedOccurrences:0,occurrences:inventory},trace,review,
    cases:{positiveFactionCandidates:[],ownForceControls:controls,negativeContrasts:contrast},
    summary,delta:{scopeRulesAdded:[],newlyDirectEffects:0,newModifierCandidates:0,newTargetUnits:0,newDirectTechnologies:0,
      newDirectEffects:[],newDirectTechnologySummaries:[],before:summary,after:summary}};
}
