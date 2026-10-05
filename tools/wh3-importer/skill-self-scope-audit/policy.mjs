import {numericRules} from '../skill-production-bretonnia/classify.mjs';
export const baselineCommit='1e3323b5b49a82c8b2a5911191f0faf99b30ef45';
export const families=['CHARACTER_COMBAT_STAT','CHARACTER_CAMPAIGN_STAT','ABILITY_OR_PASSIVE','MOUNT_OR_EQUIPMENT','FORCE_OR_ARMY_INDIRECT','NON_NUMERIC_OR_NON_UNIT','MIXED_CHARACTER_AND_UNIT','UNKNOWN'];
const stats={
 melee_attack_mod:['melee.meleeAttack'],melee_defence_mod:['defense.meleeDefense'],armour_mod:['defense.armor'],morale:['defense.leadership'],
 melee_damage_mod_mult:['melee.damage.base'],melee_damage_ap_mod_mult:['melee.damage.armorPiercing'],damage_vs_large_entities:['melee.damage.bonusVsLarge'],
 charge_bonus:['melee.chargeBonus'],charge_add:['melee.chargeBonus'],unit_damage_resistance_all_mod:['defense.resistances.ward'],
 unit_damage_resistance_missile_mod:['defense.resistances.missile'],unit_damage_resistance_physical_mod:['defense.resistances.physical'],
 mod_land_movement_battle:['movement.speed'],general_bodyguard_size_mod:['entities.totalHealth'],
};
const basicCampaign=new Set(['line_of_sight_extension','general_admiral_action_point_bonus','recuperation_time_mod','percentage_of_xp_to_give_other_characters_of_same_type']);
const agentTables=new Set(['effect_bonus_value_agent_junction_tables','effect_bonus_value_agent_action_record_junctions_tables','effect_bonus_value_id_action_results_additional_outcomes_junctions_tables']);
const abilityTables=new Set(['effect_bonus_value_unit_ability_junctions_tables','effect_bonus_value_unit_attribute_junctions_tables','effect_bonus_value_special_ability_phase_record_junctions_tables']);
// Exact typed table/bonus combinations; effect/Skill key prefixes are never rules.
export function interpretRoute(route){
 const bonus=route.raw.bonus_value_id,table=route.table;
 if((table==='effect_bonus_value_ids_unit_sets_tables'&&stats[bonus]&&bonus!=='general_bodyguard_size_mod')||(table==='effect_bonus_value_basic_junction_tables'&&bonus==='general_bodyguard_size_mod')){
  const rule=numericRules[bonus];return {family:'CHARACTER_COMBAT_STAT',candidateStats:stats[bonus],operation:rule?.operation??'UNREVIEWED',operationStatus:rule?'REUSED_VERIFIED_UNIT_OPERATION_SELF_APPLICABILITY_UNREVIEWED':'UNREVIEWED',operationBasis:rule?.basis??null,bonus,table};
 }
 if(abilityTables.has(table)||(table==='effect_bonus_value_basic_junction_tables'&&bonus==='spell_mastery_percentage_mod')||(table==='effect_bonus_value_ids_unit_sets_tables'&&bonus==='miscast_chance_mod'))return {family:'ABILITY_OR_PASSIVE',candidateStats:[],operation:'NON_UNIT_PARAMETER',bonus,table};
 if(agentTables.has(table)||(table==='effect_bonus_value_basic_junction_tables'&&basicCampaign.has(bonus)))return {family:'CHARACTER_CAMPAIGN_STAT',candidateStats:[],operation:'UNREVIEWED_CAMPAIGN_PARAMETER',bonus,table};
 if(table==='effect_bonus_value_scripted_junctions_tables'){
  if(route.raw.scripted_record==='experience_mod')return {family:'CHARACTER_CAMPAIGN_STAT',candidateStats:[],operation:'SCRIPT_EXECUTION_UNREVIEWED',bonus,table};
  // Exact source effect's localisation establishes intended post-win movement;
  // the script does not exist in this source and execution remains unproved.
  return {family:'UNKNOWN',candidateStats:[],operation:'SCRIPT_EXECUTION_UNREVIEWED',bonus,table};
 }
 if((table==='effect_bonus_value_ids_unit_sets_tables'&&['general_aoe_mod','general_aoe_morale_effect_mod'].includes(bonus))||(table==='effect_bonus_value_basic_junction_tables'&&['can_fight_night_battles','can_fight_night_battles_naval','tunnel_interception_chance'].includes(bonus)))return {family:'FORCE_OR_ARMY_INDIRECT',candidateStats:[],operation:'INDIRECT_APPLICABILITY_UNREVIEWED',bonus,table};
 if(table==='effect_bonus_value_name_record_junctions_tables'||(table==='effect_bonus_value_basic_junction_tables'&&bonus==='immortal'))return {family:'NON_NUMERIC_OR_NON_UNIT',candidateStats:[],operation:'NON_NUMERIC',bonus,table};
 return {family:'UNKNOWN',candidateStats:[],operation:'UNREVIEWED',bonus,table};
}
export function semantic(effect,skill,ancillaries){
 const routes=effect.routes.map(interpretRoute),mountGrants=skill.ancillaryRows.filter(r=>r.raw.level===effect.rank).map(r=>ancillaries.get(r.raw.granted_ancillary)).filter(Boolean);
 const kinds=[...new Set(routes.map(r=>r.family))];let family=kinds.length===1?kinds[0]:kinds.length>1?'MIXED_CHARACTER_AND_UNIT':'UNKNOWN';
 const notes=[];
 if(!routes.length&&mountGrants.length&&mountGrants.every(a=>a.row.category==='mount'&&a.row.provided_bodyguard_unit)){family='MOUNT_OR_EQUIPMENT';notes.push('Same Skill/rank grants a mount ancillary with exact provided_bodyguard_unit. Effect runtime activation route remains unresolved.');}
 if(effect.scope.key==='general_to_character_own_forcewide_heroes_only'){family='FORCE_OR_ARMY_INDIRECT';notes.push('Character target is forcewide heroes, not the origin Lord.');}
 if(effect.effectKey==='wh3_main_effect_force_all_campaign_movement_range_post_battle_win'&&routes.every(r=>r.table==='effect_bonus_value_scripted_junctions_tables')){family='FORCE_OR_ARMY_INDIRECT';notes.push('Typed scripted record + localisation establish intended post-win campaign movement; script execution and numeric operation remain unknown.');}
 const combat=family==='CHARACTER_COMBAT_STAT';
 return {family,numericCombatCandidate:combat,candidateStats:[...new Set(routes.flatMap(r=>r.candidateStats))].sort(),operations:routes,operationVerifiedForExistingUnitArithmetic:combat&&routes.every(r=>r.operationStatus==='REUSED_VERIFIED_UNIT_OPERATION_SELF_APPLICABILITY_UNREVIEWED'),
  characterCombatRelevance:combat?'DIRECT_NUMERIC_CANDIDATE':family==='ABILITY_OR_PASSIVE'?'BATTLE_ABILITY_NOT_BASE_STAT':family==='FORCE_OR_ARMY_INDIRECT'?'INDIRECT_CONTEXT_DEPENDENT':family==='MOUNT_OR_EQUIPMENT'?'CHANGES_BATTLE_PROFILE_IDENTITY':family==='UNKNOWN'?'UNKNOWN':'NOT_DIRECT_COMBAT_STAT',
  ordinaryUnitRelevance:combat?'CHARACTER_SELF_ONLY_NOT_ARMY_TARGET':family==='FORCE_OR_ARMY_INDIRECT'?'INDIRECT_OR_OTHER_CHARACTER_TARGET_ONLY':'NO_DIRECT_ORDINARY_UNIT_MODIFIER',
  evidenceStatus:combat?'SOURCE_STAT_INTENT_CONFIRMED_RUNTIME_APPLICATION_NOT_OBSERVED':family==='UNKNOWN'?'SOURCE_INSUFFICIENT':'SOURCE_TYPED_MECHANIC_INTENT_NO_RUNTIME_PROOF',mountAncillaryRowIds:mountGrants.map(a=>a.id),notes};
}
