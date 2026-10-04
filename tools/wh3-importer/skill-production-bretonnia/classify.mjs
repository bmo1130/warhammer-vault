import assert from 'node:assert/strict';
import {unique} from './source.mjs';
// Only numeric bonus operations already reviewed by Research/Skill artifacts.
// New exact effect identities still require the independent reviewed gate.
export const numericRules=Object.freeze({
 morale:{stat:'defense.leadership',operation:'add',basis:'skill-slice-01/review.json'},
 melee_attack_mod:{stat:'melee.meleeAttack',operation:'add',basis:'research-classifier/policy.mjs#OP_MELEE_ATTACK_FLAT'},
 melee_defence_mod:{stat:'defense.meleeDefense',operation:'add',basis:'research-classifier/policy.mjs#OP_MELEE_DEFENSE_FLAT'},
 armour_mod:{stat:'defense.armor',operation:'add',basis:'research-mapping-review-01/review.json'},
 damage_vs_large_entities:{stat:'melee.damage.bonusVsLarge',operation:'add',basis:'skill-slice-01/review.json'},
 charge_bonus:{stat:'melee.chargeBonus',operation:'multiply',basis:'skill-batch-02/review.json'},
 melee_damage_mod_mult:{stat:'melee.damage.base',operation:'multiply',basis:'skill-batch-01/review.json'},
 melee_damage_ap_mod_mult:{stat:'melee.damage.armorPiercing',operation:'multiply',basis:'skill-batch-01/review.json'},
 upkeep_mod:{stat:'campaign.upkeep',operation:'multiply',basis:'skill-batch-01/review.json'},
 cost_mod:{stat:'campaign.recruitmentCost',operation:'multiply',basis:'research-classifier/policy.mjs#OP_RECRUITMENT_PERCENT'},
 range_mod:{stat:'missile.range',operation:'multiply',basis:'research-mapping-review-01/review.json'},
});
const potential={
 unit_fatigue_resistance_mod:{path:null,reason:'UNSUPPORTED_VIGOUR_PATH'},replenishment_percentage_bonus:{path:null,reason:'UNSUPPORTED_REPLENISHMENT_PATH'},
 melee_damage_ap_mod_add:{path:'melee.damage.armorPiercing',reason:'UNREVIEWED_FLAT_AP_OPERATION'},charge_add:{path:'melee.chargeBonus',reason:'UNREVIEWED_FLAT_CHARGE_OPERATION'},
 ammo_mod:{path:'missile.ammunition',reason:'UNREVIEWED_AMMUNITION_OPERATION'},reload:{path:'missile.reload.reloadSkill',reason:'UNREVIEWED_RELOAD_SEMANTICS'},
 mod_land_movement_battle:{path:'movement.speed',reason:'UNREVIEWED_SPEED_OPERATION'},missile_damage_mod_mult:{path:'missile.projectile.baseDamage',reason:'UNREVIEWED_MISSILE_STRENGTH_MAPPING'},missile_damage_ap_mod_mult:{path:'missile.projectile.armorPiercingDamage',reason:'UNREVIEWED_MISSILE_STRENGTH_MAPPING'},
 unit_damage_resistance_magic_mod:{path:'defense.resistances.spell',reason:'UNREVIEWED_RESISTANCE_OPERATION'},unit_damage_resistance_physical_mod:{path:'defense.resistances.physical',reason:'UNREVIEWED_RESISTANCE_OPERATION'},unit_damage_resistance_missile_mod:{path:'defense.resistances.missile',reason:'UNREVIEWED_RESISTANCE_OPERATION'},unit_damage_resistance_all_mod:{path:'defense.resistances.ward',reason:'UNREVIEWED_RESISTANCE_OPERATION'},
 recruit_time_mod:{path:'campaign.recruitmentTurns',reason:'UNREVIEWED_RECRUIT_TIME_OPERATION'},miscast_chance_mod:{path:null,reason:'UNSUPPORTED_MISCAST_PATH'},general_aoe_mod:{path:null,reason:'CHARACTER_AURA_NOT_UNIT_STAT'},general_aoe_morale_effect_mod:{path:null,reason:'CHARACTER_AURA_NOT_UNIT_STAT'},
};
const nonUnitBonuses=new Set(['unit_xp_mod','unit_xp_mod_training']);
const nonUnitTables=new Set([
 'effect_bonus_value_agent_action_record_junctions_tables','effect_bonus_value_agent_junction_tables','effect_bonus_value_attrition_record_junctions_tables',
 'effect_bonus_value_battle_context_unit_attribute_junctions_tables','effect_bonus_value_building_set_junctions_tables','effect_bonus_value_id_action_results_additional_outcomes_junctions_tables','effect_bonus_value_name_record_junctions_tables',
 'effect_bonus_value_pooled_resource_factor_junctions_tables','effect_bonus_value_pooled_resource_junctions_tables','effect_bonus_value_province_growth_factor_junctions_tables','effect_bonus_value_provincial_initiative_effect_record_junctions_tables',
 'effect_bonus_value_public_order_provider_junctions_tables','effect_bonus_value_recruitment_source_junctions_tables','effect_bonus_value_scripted_junctions_tables','effect_bonus_value_subculture_junctions_tables','effect_bonus_value_unit_ability_junctions_tables',
 'effect_bonus_value_unit_attribute_junctions_tables','effect_bonus_value_unit_set_unit_attribute_junctions_tables',
]);
const count=xs=>Object.fromEntries(unique(xs).map(k=>[k,xs.filter(x=>x===k).length]));
const knownScope={key:'general_to_force_own',location:'forcewide_when_commanding',ownership:'yours',source:'character',target:'force',territory:'any'};
export function classify(inventory,memberships){
 const bySet=new Map(memberships.map(m=>[m.key,m]));
 const skills=inventory.skills.map(skill=>{
  const globalBlockers=unique([...(skill.rankLevels.length===1&&skill.rankLevels[0]===1?[]:[skill.rankLevels.length?'MULTI_RANK_UNKNOWN':'NO_SOURCE_RANK']),...(skill.safeOwnerKeys.length?[]:['RUNTIME_OWNER_AVAILABILITY']),...(skill.isBackgroundSkill?['BACKGROUND_AVAILABILITY_UNKNOWN']:[]),...(skill.unresolvedOwners.length?['UNRESOLVED_OWNER_RELATION']:[]),...(skill.levelDetails.some(d=>d.raw.campaign_key||d.raw.faction_key||d.raw.subculture_key)||skill.ancillaryRows.length||skill.dilemmaRows.length||skill.criteriaRows.length?['CONDITIONAL_LEVEL_OR_GRANT']:[])]);
  const effects=skill.effects.map(effect=>{
   const blockers=[...globalBlockers],mappings=[],targets=new Map(),candidateStats=[],typed=[];let isNonUnit=false;
   const self=effect.scope.target==='character',force=effect.scope.target==='force';
   if(self){blockers.push('SELF_CHARACTER_SCOPE');isNonUnit=true;}
   else if(!force){blockers.push('NON_UNIT_SCOPE');isNonUnit=true;}
   else if(JSON.stringify(effect.scope)!==JSON.stringify(knownScope))blockers.push('UNREVIEWED_FORCE_SCOPE');
   if(!effect.routes.length)blockers.push('UNRESOLVED_TYPED_ROUTE');
   for(const route of effect.routes){const bonus=route.raw.bonus_value_id,rule=numericRules[bonus],future=potential[bonus];
    typed.push({rowId:route.rowId,table:route.table,bonus,selectorKey:route.selectorKey??null});
    if(nonUnitTables.has(route.table)||nonUnitBonuses.has(bonus)){isNonUnit=true;blockers.push('NON_UNIT_MECHANIC');continue;}
    if(route.selectorKey){const membership=bySet.get(route.selectorKey);assert(membership);
     if(membership.status!=='STATIC_EXACT_MEMBERSHIP')blockers.push('COMPLEX_OR_CONDITIONAL_SELECTOR');
     if(['characters','lords','wh_main_brt_cha_damsel_prophetess'].includes(route.selectorKey))blockers.push('CHARACTER_SELECTOR_NOT_ORDINARY_UNIT');
     for(const m of membership.productionMembers)for(const id of m.productionUnitIds)targets.set(id,{unitId:id,mainKey:m.mainKey,landKey:m.landKey});
    }else if(rule||future)blockers.push('UNRESOLVED_UNIT_TARGET');
    if(rule){candidateStats.push(rule.stat);
     if(route.table!=='effect_bonus_value_ids_unit_sets_tables')blockers.push('UNREVIEWED_NUMERIC_ROUTE_FAMILY');
     const percent=/%\+?n%/.test(effect.description),flat=/%\+?n(?!%)/.test(effect.description);
     if(rule.operation==='multiply'?!percent:!flat||percent)blockers.push('NUMERIC_LOC_OPERATION_MISMATCH');
     mappings.push({bonus,stat:rule.stat,operation:rule.operation,value:effect.rawValue,routeRowId:route.rowId,selectorKey:route.selectorKey,basis:rule.basis});
    }else if(future){if(future.path)candidateStats.push(future.path);blockers.push(future.reason);}
    else if(!isNonUnit)blockers.push('UNREVIEWED_BONUS_SEMANTICS');
   }
   if(!targets.size&&mappings.length)blockers.push('NO_PRODUCTION_TARGET');
   if(!mappings.length&&!isNonUnit&&!blockers.some(b=>b.startsWith('UNSUPPORTED_')))blockers.push('NO_VERIFIED_NUMERIC_MAPPING');
   const all=unique(blockers);let classification;
   if(isNonUnit)classification='NON_UNIT_STAT';
   else if(all.some(b=>b.startsWith('UNSUPPORTED_')))classification='UNSUPPORTED';
   else if(all.length)classification=all.every(b=>['NO_PRODUCTION_TARGET','RUNTIME_OWNER_AVAILABILITY','BACKGROUND_AVAILABILITY_UNKNOWN'].includes(b))?'LIMITED':'REVIEW_REQUIRED';
   else classification='DIRECT';
   return {skillKey:skill.key,junctionRowId:effect.junctionRowId,effectKey:effect.effectKey,rank:effect.rank,rawValue:effect.rawValue,scopeKey:effect.scope.key,classification,blockers:all,candidateStats:unique(candidateStats),mappings,targets:[...targets.values()],typedTargets:typed,
    selectorKeys:unique(typed.map(t=>t.selectorKey).filter(Boolean)),productionTargetCount:targets.size,nonProductionTargetCount:new Set(effect.routes.flatMap(r=>r.selectorKey?bySet.get(r.selectorKey).omittedNonProduction.map(m=>m.mainKey):[])).size,
    unresolvedIdentityCount:effect.routes.reduce((n,r)=>n+(r.selectorKey?(bySet.get(r.selectorKey).identityUnresolvedCount??bySet.get(r.selectorKey).ambiguous.length):1),0),unresolvedApplicabilityBranches:effect.routes.reduce((n,r)=>n+(r.selectorKey?bySet.get(r.selectorKey).unresolvedCount:0),0),eligible:classification==='DIRECT'};
  });
  const types=unique(effects.map(e=>e.classification)),direct=effects.filter(e=>e.classification==='DIRECT');
  let classification=effects.length&&types.length===1?types[0]:direct.length?'LIMITED':types.includes('REVIEW_REQUIRED')?'REVIEW_REQUIRED':types.includes('UNSUPPORTED')?'UNSUPPORTED':types.includes('LIMITED')?'LIMITED':'NON_UNIT_STAT';
  const blockers=unique([...globalBlockers,...effects.flatMap(e=>e.blockers),...(direct.length&&direct.length<effects.length?['PARTIAL_EFFECT_POLICY_NOT_APPROVED']:[]),...(!effects.length?['NO_EFFECT_JUNCTION']:[])]);
  return {skillKey:skill.key,name:skill.name,ownerKeys:skill.ownerKeys,admissionOwnerKeys:skill.safeOwnerKeys,excludedOwners:skill.owners.filter(o=>!o.safeStaticOwner).map(o=>({key:o.subtypeKey,blockers:o.blockers})),classification,blockers,effects,directEffects:direct.length,eligible:classification==='DIRECT'&&blockers.length===0};
 });
 return {format:'wh3-bretonnia-skill-classification-v1',rules:'previously reviewed numeric bonuses + exact source gate; no new path/scope/rank semantics',partialAdmission:{allowed:false,reason:'Direct junction rows are separate, but full source alone does not prove that omitted effects cannot alter rank/applicability or interact through engine state. No generic independent-effect contract is established. Complete-effect admission only.'},skills,
  counts:{skills:count(skills.map(s=>s.classification)),effects:count(skills.flatMap(s=>s.effects).map(e=>e.classification))}};
}
export function coverage(inventory,classification,memberships,admission){
 const effects=classification.skills.flatMap(s=>s.effects),skills=classification.skills;
 const blockerCounts=count(effects.flatMap(e=>e.blockers)),rankCount=inventory.skills.reduce((n,s)=>n+s.rankLevels.length,0);
 // Marginal effect openings: remove only this blocker, preserve every other gate.
 // Skill opening additionally requires all of its rows to pass and whole-effect policy.
 const relief=unique([...effects.flatMap(e=>e.blockers),...skills.flatMap(s=>s.blockers)]).map(blocker=>{
  const openedEffects=effects.filter(e=>e.blockers.length===1&&e.blockers[0]===blocker&&e.mappings.length&&e.targets.length&&e.classification!=='NON_UNIT_STAT');
  const openedSkills=skills.filter(s=>!s.eligible&&s.effects.length&&s.effects.every(e=>e.mappings.length&&e.targets.length&&e.classification!=='NON_UNIT_STAT'&&e.blockers.every(b=>b===blocker))&&s.blockers.every(b=>b===blocker));
  return {blocker,affectedEffectJunctions:effects.filter(e=>e.blockers.includes(blocker)).length,affectedSkills:skills.filter(s=>s.blockers.includes(blocker)).length,
   marginalEffectJunctions:openedEffects.length,marginalDistinctEffects:unique(openedEffects.map(e=>e.effectKey)).length,marginalSkills:openedSkills.length,skillKeys:openedSkills.map(s=>s.skillKey),effectJunctionIds:openedEffects.map(e=>e.junctionRowId),
   risk:blocker==='MULTI_RANK_UNKNOWN'?'HIGH: incremental/replacement and deactivation require external/runtime proof':blocker.includes('SCOPE')?'HIGH: new applicability domain':blocker.includes('SELECTOR')?'HIGH: conditional engine applicability':'MEDIUM: exact operation/model proof required'};
 }).sort((a,b)=>b.marginalSkills-a.marginalSkills||b.marginalEffectJunctions-a.marginalEffectJunctions||b.affectedEffectJunctions-a.affectedEffectJunctions||a.blocker.localeCompare(b.blocker));
 return {format:'wh3-bretonnia-skill-coverage-v1',totalSkills:inventory.skills.length,totalSkillRanks:rankCount,totalEffectJunctions:effects.length,distinctEffects:unique(effects.map(e=>e.effectKey)).length,
  singleRankSkills:inventory.skills.filter(s=>s.rankLevels.length===1&&s.rankLevels[0]===1).length,multiRankSkills:inventory.skills.filter(s=>s.rankLevels.some(r=>r>1)).length,zeroRankSkills:inventory.skills.filter(s=>!s.rankLevels.length).length,
  ownerStructures:count(inventory.skills.map(s=>s.ownerTaxonomy)),bretonniaSubtypes:inventory.subtypes.length,foreignDirectOwnerSubtypes:unique(inventory.skills.flatMap(s=>s.foreignOwners.map(o=>o.subtypeKey).filter(Boolean))).length,
  supportedOwnForceJunctions:effects.filter(e=>e.scopeKey==='general_to_force_own').length,selfCharacterJunctions:effects.filter(e=>e.blockers.includes('SELF_CHARACTER_SCOPE')).length,
  selectorStructures:count(memberships.map(m=>m.taxonomy)),selectorStatus:count(memberships.map(m=>m.status)),effectClassifications:classification.counts.effects,skillClassifications:classification.counts.skills,
  directEffectCandidates:effects.filter(e=>e.classification==='DIRECT').length,directSkillCandidates:skills.filter(s=>s.eligible).length,blockerCounts,skillBlockerCounts:count(skills.flatMap(s=>s.blockers)),blockerReliefPolicy:'Remove exactly one blocker; preserve whole-Skill admission and every other condition. Rows with an unproved numeric mapping or target remain closed. Counterfactual openings require new reviewed proof, not automatic admission.',blockerRelief:relief,nextBlocker:relief.find(r=>r.marginalEffectJunctions||r.marginalSkills)??relief[0],
  partialPolicyExposure:{heldSkills:skills.filter(s=>s.blockers.includes('PARTIAL_EFFECT_POLICY_NOT_APPROVED')).length,heldDirectEffectJunctions:skills.filter(s=>s.blockers.includes('PARTIAL_EFFECT_POLICY_NOT_APPROVED')).reduce((n,s)=>n+s.directEffects,0),status:'NOT_ADMITTED; independence, omitted-effect safety and UI contract require separate proof. This is a policy-change counterfactual, not removal of one effect-semantic blocker under the current whole-Skill gate.'},
  admission:{skills:admission.skills.length,effects:admission.skills.reduce((n,s)=>n+s.effects.length,0),modifiers:admission.modifierCount,exactSkillUnitTargets:admission.skills.reduce((n,s)=>n+s.targets.length,0),uniqueProductionUnits:unique(admission.skills.flatMap(s=>s.targets.map(t=>t.unitId))).length,newSkills:admission.newSkillKeys.length,newEffects:admission.newEffectCount,newModifiers:admission.newModifierCount,newUniqueProductionUnits:admission.newProductionUnitIds.length},
  potentialFuturePaths:unique(effects.flatMap(e=>e.blockers).filter(b=>b.startsWith('UNSUPPORTED_'))),existingPathsNeedingOperationReview:unique(effects.filter(e=>e.blockers.some(b=>b.startsWith('UNREVIEWED_'))).flatMap(e=>e.candidateStats)),
  multiSkillOverlap:admission.overlaps,finalVerdict:'B'};
}
