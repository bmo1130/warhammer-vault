export const baselineCommit = '673a243196824c97cf5c9ff1fb634cd7fdb3206d';
export const skillKey = 'wh_dlc07_skill_brt_fay_battle_secrets_of_the_grail';
export const effectKey = 'wh_dlc07_effect_force_stat_magic_resistance_battle_pilgrims';
export const bonusKey = 'unit_damage_resistance_magic_mod';
export const statKey = 'stat_resistance_magic';
// Exact typed bonus matches discovered in the same CA snapshot. Names are not rules.
export const comparisonEffectKeys = Object.freeze([
  effectKey,
  'wh2_dlc09_effect_force_stat_magic_resistance_tmb_monster_rank7',
  'wh2_dlc09_effect_force_stat_magic_resistance_tmb_monster',
  'wh2_dlc11_effect_force_stat_magic_resistance_animated_hulks_mournguls',
  'wh2_dlc11_effect_force_stat_magic_resistance_cairn_wraith_hex_wraith',
  'wh2_dlc11_effect_force_stat_magic_resistance_cst_infantry',
  'wh_main_effect_character_stat_magic_resistance',
]);
export const resistanceBonuses = Object.freeze([
  bonusKey, 'unit_damage_resistance_physical_mod',
  'unit_damage_resistance_missile_mod', 'unit_damage_resistance_all_mod',
]);
export const usageTables = Object.freeze({
  character_skill_level_to_effects_junctions_tables: 'effect_key',
  technology_effects_junction_tables: 'effect',
  trait_level_effects_tables: 'effect',
  effect_bundles_to_effects_junctions_tables: 'effect_key',
});
export const serialize = value => JSON.stringify(value, null, 2) + '\n';
