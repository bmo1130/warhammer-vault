// Editorial decisions, not name matching or automatic CA fact classification.
// Each exact key must pass the generic evaluator's land/Loc and DB-edge checks.
export const reviewedGameVersion = '9.0.1.0';
const permission = group => ({ table: 'units_to_groupings_military_permissions_tables', via: 'unit', target: 'main', equals: { military_group: group } });
const unitSet = key => ({ table: 'unit_set_to_unit_junctions_tables', via: 'unit_record', target: 'main', equals: { unit_set: key, exclude: false } });
const spawn = key => ({ table: 'unit_special_abilities_tables', via: 'spawned_unit', target: 'land', equals: { key, spawn_is_transformation: false, spawn_is_decoy: false } });

function decision(mainKey, landKey, presentation, checks, rule, rationale, relationship) {
  return { mainKey, expectedLandKey: landKey, expectedLocalisationKey: `land_units_onscreen_name_${landKey}`,
    presentations: [presentation], checks, rule, rationale, ...(relationship ? { relationship } : {}) };
}
function roster(mainKey, landKey, factionId, group, classification = 'PRIMARY_CATALOG_ENTRY', contextId = `${factionId}_roster`) {
  return decision(mainKey, landKey, { contextId, factionId, context: 'faction_roster', classification, defaultVisible: true },
    [permission(group)], 'EXPLICIT_FACTION_ROSTER',
    'Retain this reviewed main key in its explicit faction roster context. Permission is an invariant, not an automatic primary-faction rule.');
}
function supply(mainKey, landKey, ordinaryKey) {
  return decision(mainKey, landKey, { contextId: 'empire_imperial_supply', factionId: 'empire', context: 'imperial_supply', classification: 'CONTEXT_VARIANT', defaultVisible: false },
    [unitSet('wh2_dlc13_emp_imperial_supply'), { table: 'units_to_exclusive_faction_permissions_tables', via: 'key', target: 'main', equals: { faction: 'wh2_dlc13_emp_the_huntmarshals_expedition', allowed: true } }],
    'EXPLICIT_CONTEXT_ONLY', 'The supply set and Huntmarshal restriction support this separate editorial context; effective scripted grants remain unverified.',
    { kind: 'EDITORIAL_CONTEXT_OF', mainKey: ordinaryKey });
}
function summoned(mainKey, factionId, abilityKey, ordinaryKey) {
  return decision(mainKey, mainKey, { contextId: `${factionId}_ability_spawn`, factionId, context: 'ability_spawn', classification: 'SUMMONED_OR_SCRIPTED_VARIANT', defaultVisible: false },
    [spawn(abilityKey)], 'EXPLICIT_CONTEXT_ONLY', 'A schema-connected ability spawns this exact land record. Retain the main root separately; this does not prove runtime duration/availability.',
    { kind: 'EDITORIAL_CONTEXT_OF', mainKey: ordinaryKey });
}

export const curatedDecisions = [
  roster('wh_main_emp_art_helstorm_rocket_battery', 'wh_main_emp_art_helstorm_rocket_battery', 'empire', 'wh_main_group_empire'),
  supply('wh2_dlc13_emp_art_helstorm_rocket_battery_imperial_supply', 'wh_main_emp_art_helstorm_rocket_battery', 'wh_main_emp_art_helstorm_rocket_battery'),
  roster('wh_main_emp_inf_handgunners', 'wh_main_emp_inf_handgunners', 'empire', 'wh_main_group_empire'),
  supply('wh2_dlc13_emp_inf_handgunners_imperial_supply', 'wh_main_emp_inf_handgunners', 'wh_main_emp_inf_handgunners'),
  roster('wh_main_emp_veh_steam_tank', 'wh_main_emp_veh_steam_tank_driver', 'empire', 'wh_main_group_empire'),
  supply('wh2_dlc13_emp_veh_steam_tank_imperial_supply', 'wh_main_emp_veh_steam_tank_driver', 'wh_main_emp_veh_steam_tank'),
  roster('wh3_main_kho_mon_bloodthirster_0', 'wh3_main_kho_mon_bloodthirster_0', 'khorne', 'wh3_main_kho'),
  summoned('wh3_main_kho_mon_bloodthirster_summoned_0', 'khorne', 'wh3_main_character_abilities_greater_gate_of_khorne', 'wh3_main_kho_mon_bloodthirster_0'),
  roster('wh_main_vmp_mon_crypt_horrors', 'wh_main_vmp_mon_crypt_horrors', 'vampire_counts', 'wh_main_group_vampire_counts'),
  roster('wh2_dlc09_tmb_mon_crypt_horrors', 'wh2_dlc09_tmb_mon_crypt_horrors', 'tomb_kings', 'wh2_dlc09_tomb_kings_arkhan', 'SEPARATE_FACTION_ENTRY', 'tomb_kings_arkhan_roster'),
  summoned('wh_main_vmp_mon_crypt_horrors_summoned', 'vampire_counts', 'wh_dlc04_spell_vampires_raise_dead_upgraded_strigoi', 'wh_main_vmp_mon_crypt_horrors'),
  roster('wh_main_vmp_cav_hexwraiths', 'wh_main_vmp_cav_hexwraiths', 'vampire_counts', 'wh_main_group_vampire_counts'),
  roster('wh2_dlc09_tmb_cav_hexwraiths', 'wh2_dlc09_tmb_cav_hexwraiths', 'tomb_kings', 'wh2_dlc09_tomb_kings_arkhan', 'SEPARATE_FACTION_ENTRY', 'tomb_kings_arkhan_roster'),
  roster('wh_dlc03_bst_inf_chaos_warhounds_0', 'wh_dlc03_bst_inf_chaos_warhounds_0', 'beastmen', 'wh_dlc03_group_beastmen', 'SEPARATE_FACTION_ENTRY'),
  roster('wh_main_chs_mon_chaos_warhounds_0', 'wh_main_chs_mon_chaos_warhounds_0', 'warriors_of_chaos', 'wh_main_group_chaos', 'SEPARATE_FACTION_ENTRY'),
  roster('wh3_main_tze_mon_flamers_0', 'wh3_main_tze_mon_flamers_0', 'tzeentch', 'wh3_main_tze'),
  decision('wh3_main_pro_tze_mon_flamers_0', 'wh3_main_pro_tze_mon_flamers_0',
    { contextId: 'tzeentch_nonstandard', factionId: 'tzeentch', context: 'nonstandard', classification: 'PROLOGUE_OR_NONSTANDARD_CONTEXT', defaultVisible: false },
    [permission('wh3_main_pro_tze')], 'EXPLICIT_CONTEXT_ONLY',
    'This reviewed alternative is kept outside the default roster. The pro-group binding is recorded; actual prologue scenario usage is not established by the key or permission alone.',
    { kind: 'EDITORIAL_CONTEXT_OF', mainKey: 'wh3_main_tze_mon_flamers_0' }),
  roster('wh_main_vmp_inf_zombie', 'wh_main_vmp_inf_zombie', 'vampire_counts', 'wh_main_group_vampire_counts'),
  summoned('wh_main_vmp_inf_zombie_summoned', 'vampire_counts', 'wh_main_spell_vampires_raise_dead', 'wh_main_vmp_inf_zombie'),
];
