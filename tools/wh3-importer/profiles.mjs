// Table names/scopes verified against the installed WH3 schema and CA rows.
// Profiles contain no CA keys or expected stat values.
export const baseTables = [
  'main_units_tables', 'land_units_tables', 'mounts_tables', 'battle_entities_tables',
  'melee_weapons_tables', 'unit_armour_types_tables', 'unit_shield_types_tables',
  'battle_entities_size_enums_tables', 'unit_class_tables', 'unit_category_tables',
  'building_units_allowed_tables', 'building_levels_tables',
  'land_units_to_unit_abilites_junctions_tables', 'unit_abilities_tables',
  'unit_special_abilities_tables', 'unit_attributes_groups_tables',
  'unit_attributes_to_groups_junctions_tables', 'unit_attributes_tables',
  'ground_type_stat_effect_groups_tables', 'ground_type_to_stat_effects_tables',
];
export const scopeTables = {
  missile: [
    'battlefield_engines_tables', 'missile_weapons_tables', 'projectiles_tables',
    'projectiles_explosions_tables', 'projectile_penetration_junctions_tables',
    'projectile_shot_type_enum_tables',
  ],
  abilityPhases: [
    'special_ability_to_special_ability_phase_junctions_tables', 'special_ability_phases_tables',
    'special_ability_phase_stat_effects_tables', 'special_ability_phase_attribute_effects_tables',
    'special_ability_behaviour_groups_tables', 'special_ability_behaviour_groups_to_types_tables',
  ],
};
export const unitProfiles = {
  'grail-knights': { displayName: 'Grail Knights', slug: 'grail-knights', scopes: [], rootSelection: 'unique' },
  // Positive recruitment cost separates the observed Imperial Supply/summoned
  // variants. This is an explicit policy for these profiles, not a universal
  // assumption about which WH3 units are ordinary. Remaining ambiguity fails.
  helstorm: { displayName: 'Helstorm Rocket Battery', slug: 'helstorm', scopes: ['missile'], rootSelection: 'paid-recruitment' },
  bloodthirster: { displayName: 'Bloodthirster', slug: 'bloodthirster', scopes: ['abilityPhases'], rootSelection: 'paid-recruitment' },
};

export function getProfile(name) {
  if (!Object.hasOwn(unitProfiles, name)) throw new Error(`Unknown unit profile: ${name}. Choose ${Object.keys(unitProfiles).join(', ')}.`);
  return unitProfiles[name];
}

export function tablesForProfile(profile) {
  return [...new Set([...baseTables, ...profile.scopes.flatMap((scope) => {
    if (!Object.hasOwn(scopeTables, scope)) throw new Error(`Unknown trace scope: ${scope}`);
    return scopeTables[scope];
  })])];
}
