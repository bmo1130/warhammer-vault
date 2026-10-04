import assert from 'node:assert/strict';
import { sha256, classifyBatch } from '../research-classifier/classify.mjs';
import * as policy from '../research-classifier/policy.mjs';
import { scanResearch } from '../research-scan-bretonnia/scan.mjs';
import { verifySource } from '../research-scan-bretonnia/source.mjs';

// Independent, bounded human-review decisions. Never consumed by the classifier
// as an admission oracle. No effect family, category or selector inference.
export const decisions = {
  wh2_dlc09_effect_force_stat_armour_brt_knights: {
    mappings: [['armour_mod','defense.armor','add','OP_ARMOR_FLAT']],
    basis: 'Exact CA Armour: %+n (no percent suffix), armour_mod unit-set bonus; existing numeric armor points path. Flat raw points.',
  },
  wh_dlc07_effect_force_stat_leadership_peasant_mob: {
    mappings: [['morale','defense.leadership','add','OP_LEADERSHIP_FLAT']],
    basis: 'Exact CA Leadership: %+n and morale bonus, identical operation/bonus semantics to the existing Knight leadership mapping; explicit Peasant Mob set reviewed separately.',
  },
  wh_dlc07_peasant_upkeep_penalty: {
    mappings: [['upkeep_mod','campaign.upkeep','multiply','OP_UPKEEP_PERCENT']],
    basis: 'Exact CA Upkeep: %+n% and upkeep_mod bonus. Unit campaign upkeep is a numeric cost; raw -5 is a signed -5% change under the existing multiply percentage contract, not an inverted penalty.',
  },
  wh2_main_effect_force_stat_missile_damage_brt_bowmen_yeomen: {
    reason: 'MISSILE_STRENGTH_RESEARCH_OUT_OF_SCOPE',
    basis: 'Card missile strength versus raw projectile/AP/explosion values is not an approved mapping. This task explicitly excludes missile-strength research.',
  },
  wh2_main_effect_force_stat_range_brt_bowmen_yeomen: {
    mappings: [['range_mod','missile.range','multiply','OP_RANGE_PERCENT']],
    basis: 'Exact CA Range: %+n% and range_mod bonus. Existing numeric missile.range expresses range; percentage change is directly representable without card-strength decomposition or reload conversion.',
  },
  wh2_main_effect_force_stat_weapon_strength_brt_spearmen_polemen_yeomen: {
    mappings: [['melee_damage_mod_mult','melee.damage.base','multiply','OP_BASE_DAMAGE_PERCENT'],
      ['melee_damage_ap_mod_mult','melee.damage.armorPiercing','multiply','OP_AP_DAMAGE_PERCENT']],
    basis: 'Exact CA Weapon strength: %+n% with separate base and AP melee bonus rows, same two bonus/operation meanings as the existing reviewed weapon-strength mapping; all three explicit target sets independently verified.',
  },
  wh2_main_effect_force_stat_melee_attack_brt_spearmen_polemen_yeomen: {
    mappings: [['melee_attack_mod','melee.meleeAttack','add','OP_MELEE_ATTACK_FLAT']],
    basis: 'Exact CA Melee attack: %+n (no percent suffix) and melee_attack_mod bonus; same flat meaning as existing melee attack mapping, with this exact effect and three sets reviewed separately.',
  },
  wh2_main_effect_force_stat_ward_save_paladins: {
    reason: 'WARD_PERCENTAGE_POINT_OPERATION_UNVERIFIED',
    basis: 'Unit ward is percentage points, but CA Ward save: %+n% and unit_damage_resistance_all_mod do not independently prove additive points versus a relative increase. The schema records references/types, not that operation; neither add nor multiply is approved.',
  },
};
export const approvedKeys = Object.keys(decisions).filter(key=>decisions[key].mappings);
export const sourceSha256 = '72dc47e15caa9df8a6a79ccdbe21bdf6b71d3afda9ea0a6da8e895ee881146a8';
const effectProjection = ({technologyKey,technologyName,effectKey,sourceRowId,rawValue,scope,status,reasonIds,candidates})=>
  ({technologyKey,technologyName,effectKey,sourceRowId,rawValue,scope,status,reasonIds,candidates});
const sorted = values => [...values].sort();
const allEffects = report => report.technologies.flatMap(t=>t.effects);
const allCandidates = effects => effects.flatMap(e=>e.candidates);

export function verifyPolicyExpansion(baseline) {
  const current=Object.fromEntries(Object.keys(baseline).map(key=>[key,policy[key]]));
  current.effectMappings=Object.fromEntries(Object.entries(current.effectMappings).filter(([key])=>!approvedKeys.includes(key)));
  current.operations={...current.operations};
  for(const path of ['defense.armor','campaign.upkeep','missile.range']) delete current.operations[path];
  assert.deepEqual(current,baseline,'Only reviewed exact mappings/operation entries may change');
  assert.deepEqual(sorted(Object.keys(policy.effectMappings).filter(key=>!baseline.effectMappings[key])),sorted(approvedKeys));
  for(const key of approvedKeys) {
    assert.deepEqual(policy.effectMappings[key].mappings.map(m=>[m.bonus,m.stat,m.operation,m.ruleId]),decisions[key].mappings);
    assert.equal(policy.effectMappings[key].reviewRef,`research-mapping-review-01/review.json#${key}`);
  }
}

export function reviewMappings(sourceBytes, unitsBytes, scanManifest, before, baselinePolicy, selected, policyBytes, classifierBytes) {
  assert.equal(sha256(sourceBytes),sourceSha256,'Reviewed source hash drift');
  verifyPolicyExpansion(baselinePolicy);
  const source=verifySource(sourceBytes,unitsBytes,scanManifest);
  const result=scanResearch(sourceBytes,unitsBytes,scanManifest,policyBytes,classifierBytes);
  const afterEffects=allEffects(result.report);
  // Replay BEFORE by removing only the exact reviewed whitelist additions.
  // Every other old effect, omission/reason and original candidate must match.
  const reconstructed=afterEffects.map(e=>effectProjection(approvedKeys.includes(e.effectKey)?
    {...e,status:'REVIEW_REQUIRED',reasonIds:['EFFECT_MAPPING_UNVERIFIED'],candidates:[]}:e));
  assert.deepEqual(reconstructed,before.effects,'Unreviewed classification or original candidate changed');
  const selection=afterEffects.filter(e=>reconstructed.find(b=>b.sourceRowId===e.sourceRowId).reasonIds.includes('EFFECT_MAPPING_UNVERIFIED')&&e.targetShape.explicitMainResolvable);
  assert.equal(selection.length,8);assert.deepEqual(sorted(selection.map(e=>e.effectKey)),sorted(Object.keys(decisions)));
  const inventory=selection.map(e=>({technologyKey:e.technologyKey,technologyName:e.technologyName,effectKey:e.effectKey,
    sourceRowId:e.sourceRowId,rawValue:e.rawValue,description:e.description,localisationRowId:e.localisationRowId,
    scope:e.scope,reasonIds:['EFFECT_MAPPING_UNVERIFIED'],targetShape:e.targetShape}));
  assert.deepEqual(inventory,selected,'Exact selected occurrence inventory drift');

  const rowIds=new Set();
  const row = id => {const r=source.rows.find(r=>r.id===id);assert(r,'Missing reviewed row');rowIds.add(id);return r;};
  const occurrences=selection.map(e=>{
    const d=decisions[e.effectKey],junction=row(e.sourceRowId);
    const tech=row(source.rows.find(r=>r.table==='technologies_tables'&&r.row.key===e.technologyKey).id);
    const effect=row(source.rows.find(r=>r.table==='effects_tables'&&r.row.effect===e.effectKey).id);
    const loc=row(e.localisationRowId),scope=row(source.rows.find(r=>r.table==='campaign_effect_scopes_tables'&&r.row.key===e.scope).id);
    row(source.rows.find(r=>r.table==='Loc'&&r.row.key===`technologies_onscreen_name_${e.technologyKey}`).id);
    assert.deepEqual(scope.row,policy.ownForceScope);assert.equal(e.targetShape.hasSelector,false);
    const links=e.targetShape.relationRowIds.map(row);
    for(const s of e.targetShape.sets) {
      s.definitionRowIds.forEach(row);s.membershipRowIds.forEach(row);
      for(const t of s.identityTraces){t.mainRowIds.forEach(row);t.landRowIds.forEach(row);}
    }
    if(d.mappings) {
      assert.equal(e.status,'DIRECT_CANDIDATE');assert.equal(loc.row.text,policy.effectMappings[e.effectKey].description);
      assert.equal(loc.row.key,`effects_description_${e.effectKey}`);
      assert(links.every(l=>l.table==='effect_bonus_value_ids_unit_sets_tables'));
      assert.deepEqual(sorted(e.targetShape.sets.map(s=>s.key)),sorted(policy.effectMappings[e.effectKey].sets));
    } else {assert.equal(e.status,'REVIEW_REQUIRED');assert.equal(e.candidates.length,0);assert(!policy.effectMappings[e.effectKey]);}
    const mappings=(d.mappings??[]).map(([bonus,stat,operation,ruleId])=>({bonus,stat,operation,ruleId,
      rawValueSemantics:operation==='add'?'FLAT_POINTS':'SIGNED_PERCENT_CHANGE',rawValue:e.rawValue,
      conversion:'RAW_PRESERVED',evidenceRef:`source-trace.json#${e.effectKey}`,
      firstVerifiedTechnology:e.technologyKey,localisationIdentity:loc.row.key,
      localisationRowId:loc.id,localisationSha256:sha256(JSON.stringify(loc)),
      bonusRowIds:links.filter(l=>l.row.bonus_value_id===bonus).map(l=>l.id),basis:d.basis}));
    return {technologyKey:e.technologyKey,technologyName:e.technologyName,effectKey:e.effectKey,sourceRowId:junction.id,
      effectDefinitionRowId:effect.id,technologyRowId:tech.id,description:loc.row.text,rawValue:e.rawValue,scope:e.scope,
      classification:e.status,reviewReason:d.reason??null,mappings,basis:d.basis,
      targetMainLandPairs:e.targetShape.sets.flatMap(s=>s.identityTraces.filter(t=>t.production).map(t=>({mainKey:t.mainKey,landKey:t.landKey}))),
      candidateCount:e.candidates.length,omittedTargets:e.omittedTargets};
  });
  const trace={sourceRef:'tools/wh3-importer/research-scan-bretonnia/source.json',sourceSha256,
    snapshotId:policy.pins.snapshotId,originalExtraction:source.originalExtraction,provenance:source.provenance,
    rows:sorted(rowIds).map(id=>{const r=row(id);return {rowId:id,table:r.table,key:r.key,path:r.path,
      payloadSha256:sha256(JSON.stringify(r)),schemaIndex:source.schemas.findIndex(s=>s.table===r.table&&s.version===r.tableVersion)};}),
    // These are lossless pointers into the already committed full source.
    relationships:source.relationships.filter(r=>rowIds.has(r.from)&&rowIds.has(r.to)),
    schemas:[...new Set([...rowIds].map(id=>{const r=row(id);return source.schemas.findIndex(s=>s.table===r.table&&s.version===r.tableVersion)}))].sort((a,b)=>a-b)
      .map(index=>({index,sha256:sha256(JSON.stringify(source.schemas[index])),definition:source.schemas[index]}))};
  const beforeCandidates=allCandidates(before.effects),beforeUnits=new Set(beforeCandidates.map(c=>c.mainKey));
  const gains=occurrences.filter(e=>e.mappings.length).map(e=>{
    const subset=afterEffects.filter(a=>a.effectKey===e.effectKey&&a.status==='DIRECT_CANDIDATE'),cs=allCandidates(subset);
    const units=sorted(new Set(cs.map(c=>c.mainKey))).filter(key=>!beforeUnits.has(key));
    return {effectKey:e.effectKey,newlyDirectEffects:subset.length,newModifierCandidates:cs.length,newTargetUnits:units.length,newTargetMainKeys:units};
  });
  const afterUnits=new Set(allCandidates(afterEffects).map(c=>c.mainKey));
  const delta={before:before.summary,after:result.summary,
    newlyDirectEffects:result.summary.effects.counts.DIRECT_CANDIDATE-before.summary.effects.counts.DIRECT_CANDIDATE,
    newModifierCandidates:result.summary.candidates.total-before.summary.candidates.total,
    newTargetUnits:afterUnits.size-beforeUnits.size,
    perMapping:gains,newTargetMainKeys:sorted([...afterUnits].filter(key=>!beforeUnits.has(key))),
    note:'Per-mapping new Units are relative to the same BEFORE set and overlap; do not sum them.'};
  return {trace,review:{format:'wh3-exact-research-mapping-review-v1',sourceKind:'MANUAL_CA_MAPPING_REVIEW',candidateOnly:true,
    snapshotId:policy.pins.snapshotId,sourceSha256,provenance:source.provenance,occurrences},
    after:{summary:result.summary,rejections:result.rejections.reasons,selected:occurrences.map(e=>({effectKey:e.effectKey,classification:e.classification,candidateCount:e.candidateCount})),
      fullReportRef:'tools/wh3-importer/research-scan-bretonnia/report.json',fullReportSha256:sha256(JSON.stringify(result.report,null,2)+'\n')},delta};
}

export function verifyBatchRegression(sourceBytes,unitsBytes,expectedWhitelist,expectedHash) {
  const r=classifyBatch(sourceBytes,unitsBytes);
  assert.equal(sha256(JSON.stringify({...r,whitelistSha256:expectedWhitelist},null,2)+'\n'),expectedHash,
    'Old batch changed beyond whitelist metadata digest');
  return r.summary;
}
