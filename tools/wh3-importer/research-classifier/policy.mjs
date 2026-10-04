// A bounded semantics whitelist, not the human review/classification oracle.
// New source snapshots/effect keys require a separate review of these pins.
export const pins = Object.freeze({
  sourceSha256: 'bf658783ef8fd44abad4a25109535ee7acc380baad28c12c4d5d0ad867b5b297',
  unitsSha256: 'da22d7eb4d6af13856274e3f81fe18c789ed6588b6e0c956cbf97583f1350dc1',
  originalExtractionSha256: '4d5049c492464e158780dcd0a371bae60731cdb4d89b032af98376ddf87236ca',
  snapshotId: 'c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5',
  gameVersion: '9.0.2.0', rpfmVersion: '5.1.0', schemaFormatVersion: 5,
  schemaSha256: '5d628a0167b34a096752c5c21acd16493834a987c80dc9f02364617f796ba2a4',
  processedSchemasSha256: '6853250d81a9600bcf2df2c4f451fe353a535d290fb5a7d849b378271e650215',
  packs: {
    'db.pack': 'd0fafac984b3985ec47cec0ea957591424f1077e52ef61941dbf2dc46e6cf723',
    'local_en.pack': 'f979527a5aaecf293a4e66afc25ed6c760e4107ef4920b73bd56e10e2652fd6a',
  },
});
export const technologyKeys = ['industry_tournaments', 'farm_hoods', 'industry_swords',
  'other_fanaticism', 'other_3', 'industry_4', 'farm_3', 'other_siege']
  .map(s => `wh_dlc07_tech_brt_economy_${s}`);
export const ownForceScope = Object.freeze({ key: 'faction_to_force_own_unseen',
  location: 'factionwide', ownership: 'yours', source: 'faction', target: 'force', territory: 'any' });
export const operations = Object.freeze({
  'melee.meleeAttack': 'add', 'defense.meleeDefense': 'add', 'defense.leadership': 'add',
  'melee.chargeBonus': 'multiply', 'melee.damage.base': 'multiply',
  'melee.damage.armorPiercing': 'multiply', 'campaign.recruitmentCost': 'multiply',
  'defense.armor': 'add', 'campaign.upkeep': 'multiply', 'missile.range': 'multiply',
});
const mapping = (bonus, stat, ruleId) => ({ bonus, stat, operation: operations[stat], ruleId });
export const effectMappings = {
  // Exact reviewed additions only; CA Loc, bonus/schema joins and snapshot
  // proof are in research-mapping-review-01/review.json. No family inference.
  wh2_dlc09_effect_force_stat_armour_brt_knights: {
    description: 'Armour: %+n for Knight units', sets: ['brt_knights'],
    reviewRef: 'research-mapping-review-01/review.json#wh2_dlc09_effect_force_stat_armour_brt_knights',
    mappings: [mapping('armour_mod', 'defense.armor', 'OP_ARMOR_FLAT')],
  },
  wh_dlc07_effect_force_stat_leadership_peasant_mob: {
    description: 'Leadership: %+n for Peasant Mob units', sets: ['wh_dlc07_peasant_mob'],
    reviewRef: 'research-mapping-review-01/review.json#wh_dlc07_effect_force_stat_leadership_peasant_mob',
    mappings: [mapping('morale', 'defense.leadership', 'OP_LEADERSHIP_FLAT')],
  },
  wh_dlc07_peasant_upkeep_penalty: {
    description: 'Upkeep: %+n% for non-Knight units', sets: ['wh_dlc07_peasant_economy_unit_set'],
    reviewRef: 'research-mapping-review-01/review.json#wh_dlc07_peasant_upkeep_penalty',
    mappings: [mapping('upkeep_mod', 'campaign.upkeep', 'OP_UPKEEP_PERCENT')],
  },
  wh2_main_effect_force_stat_range_brt_bowmen_yeomen: {
    description: 'Range: %+n% for Peasant Bowmen and Mounted Yeomen Archers units', sets: ['brt_bow_cav', 'brt_bow_inf'],
    reviewRef: 'research-mapping-review-01/review.json#wh2_main_effect_force_stat_range_brt_bowmen_yeomen',
    mappings: [mapping('range_mod', 'missile.range', 'OP_RANGE_PERCENT')],
  },
  wh2_main_effect_force_stat_weapon_strength_brt_spearmen_polemen_yeomen: {
    description: 'Weapon strength: %+n% for Spearmen-at-Arms, Men-at-Arms (Polearms) and Mounted Yeomen units',
    sets: ['brt_polearms', 'brt_spear_inf', 'brt_squires_yeomen'],
    reviewRef: 'research-mapping-review-01/review.json#wh2_main_effect_force_stat_weapon_strength_brt_spearmen_polemen_yeomen',
    mappings: [mapping('melee_damage_mod_mult', 'melee.damage.base', 'OP_BASE_DAMAGE_PERCENT'),
      mapping('melee_damage_ap_mod_mult', 'melee.damage.armorPiercing', 'OP_AP_DAMAGE_PERCENT')],
  },
  wh2_main_effect_force_stat_melee_attack_brt_spearmen_polemen_yeomen: {
    description: 'Melee attack: %+n for Spearmen-at-Arms, Men-at-Arms (Polearms) and Mounted Yeomen units',
    sets: ['brt_polearms', 'brt_spear_inf', 'brt_squires_yeomen'],
    reviewRef: 'research-mapping-review-01/review.json#wh2_main_effect_force_stat_melee_attack_brt_spearmen_polemen_yeomen',
    mappings: [mapping('melee_attack_mod', 'melee.meleeAttack', 'OP_MELEE_ATTACK_FLAT')],
  },
  wh2_main_effect_force_stat_melee_attack_brt_knights: {
    description: 'Melee attack: %+n for Knights units', sets: ['brt_knights'],
    mappings: [mapping('melee_attack_mod', 'melee.meleeAttack', 'OP_MELEE_ATTACK_FLAT')],
  },
  wh2_main_effect_force_stat_melee_defence_brt_knights: {
    description: 'Melee defence: %+n for Knight units', sets: ['brt_knights'],
    mappings: [mapping('melee_defence_mod', 'defense.meleeDefense', 'OP_MELEE_DEFENSE_FLAT')],
  },
  wh2_main_effect_force_stat_charge_bonus_pct_brt_knights: {
    description: 'Charge bonus: %+n% for Knight units', sets: ['brt_knights'],
    mappings: [mapping('charge_bonus', 'melee.chargeBonus', 'OP_CHARGE_PERCENT')],
  },
  wh_dlc07_effect_force_stat_leadership_knights: {
    description: 'Leadership: %+n for Knight units', sets: ['brt_knights'],
    mappings: [mapping('morale', 'defense.leadership', 'OP_LEADERSHIP_FLAT')],
  },
  wh2_main_effect_force_stat_weapon_strength_brt_knights_swordsmen_footsquires: {
    description: 'Weapon strength: %+n% for Sword Infantry and all Knight units', sets: ['brt_knights', 'brt_sword_inf'],
    mappings: [mapping('melee_damage_mod_mult', 'melee.damage.base', 'OP_BASE_DAMAGE_PERCENT'),
      mapping('melee_damage_ap_mod_mult', 'melee.damage.armorPiercing', 'OP_AP_DAMAGE_PERCENT')],
  },
  wh2_main_effect_force_stat_melee_attack_pilgrims_reliquae: {
    description: 'Melee attack: %+n for Battle Pilgrims and Grail Reliquae units', sets: ['brt_reliquae', 'dlc07_brt_inf_battle_pilgrims'],
    mappings: [mapping('melee_attack_mod', 'melee.meleeAttack', 'OP_MELEE_ATTACK_FLAT')],
  },
  wh2_main_effect_force_stat_melee_defence_brt_pilgrims_reliquae: {
    description: 'Melee defence: %+n for Battle Pilgrims and Grail Reliquae units', sets: ['brt_reliquae', 'dlc07_brt_inf_battle_pilgrims'],
    mappings: [mapping('melee_defence_mod', 'defense.meleeDefense', 'OP_MELEE_DEFENSE_FLAT')],
  },
  wh_dlc07_effect_force_stat_melee_attack_peasant_mob: {
    description: 'Melee attack: %+n for Peasant Mob units', sets: ['wh_dlc07_peasant_mob'],
    mappings: [mapping('melee_attack_mod', 'melee.meleeAttack', 'OP_MELEE_ATTACK_FLAT')],
  },
  wh_main_effect_tech_recruitment_cost_reduction_peasant_mob: {
    description: 'Recruitment cost: %+n% for Peasant Mob units', sets: ['wh_dlc07_peasant_mob'],
    mappings: [mapping('cost_mod', 'campaign.recruitmentCost', 'OP_RECRUITMENT_PERCENT')],
  },
};
// Exact known non-unit/unsupported semantics. Unknown keys never inherit these.
export const rejectedEffects = {
  wh_main_effect_building_construction_cost_mod_infrastructure: ['NON_UNIT_STAT', 'NON_UNIT_BUILDING_EFFECT', 'REGION_SCOPE_NOT_UNIT_APPLICABLE'],
  wh_dlc07_effect_economy_gdp_mod_industry: ['NON_UNIT_STAT', 'NON_UNIT_ECONOMY_EFFECT', 'REGION_SCOPE_NOT_UNIT_APPLICABLE'],
  wh_dlc07_effect_economy_gdp_mod_farming: ['NON_UNIT_STAT', 'NON_UNIT_ECONOMY_EFFECT', 'REGION_SCOPE_NOT_UNIT_APPLICABLE'],
  wh_main_effect_force_all_campaign_recruitment_cost_all: ['REVIEW_REQUIRED', 'ALL_LAND_TARGET_UNRESOLVED'],
  wh_main_effect_force_army_campaign_upkeep_cost_infantry: ['REVIEW_REQUIRED', 'CASTE_SELECTOR_UNSUPPORTED', 'UPKEEP_MAPPING_NOT_APPROVED'],
  wh2_main_effect_force_stat_reload_time_reduction_brt_trebuchet: ['REVIEW_REQUIRED', 'RELOAD_MAPPING_UNVERIFIED'],
  wh2_main_effect_force_stat_missile_damage_brt_trebuchet: ['UNSUPPORTED', 'MISSILE_STRENGTH_MAPPING_UNVERIFIED'],
  wh_main_effect_force_stat_leadership_siege_attack: ['REVIEW_REQUIRED', 'CONDITIONAL_SIEGE_EFFECT'],
};
export const membershipFields = ['exclude', 'unit_caste', 'unit_category', 'unit_class', 'unit_record', 'unit_set'];
export const selectorFields = ['unit_caste', 'unit_category', 'unit_class'];
export const baseRuleIds = ['SOURCE_HASH_AND_SNAPSHOT_VERIFIED', 'SCOPE_OWN_FORCE_VERIFIED',
  'TARGET_EXPLICIT_MAIN_MEMBERSHIP', 'MAIN_LAND_SCHEMA_JOIN_VERIFIED', 'VALUE_FINITE_RAW_PRESERVED'];

// Callers cannot mutate the whitelist or re-pin its trusted envelope in memory.
function freeze(value) {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
}
for (const value of [pins, technologyKeys, ownForceScope, operations, effectMappings, rejectedEffects,
  membershipFields, selectorFields, baseRuleIds]) freeze(value);
