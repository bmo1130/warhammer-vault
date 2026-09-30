// Synthetic keys/values only. Relationships mirror the inspected processed
// schema, not real stats or manual reference values. Never a CLI fallback.
import { field as f, table, fixtureDataset } from './tables.mjs';

export function threeProfileFixture() {
  const fixture = fixtureDataset();
  const { tables, localisation } = fixture;
  const main = tables.find((table) => table.table === 'main_units_tables');
  const land = tables.find((table) => table.table === 'land_units_tables');
  const attrs = tables.find((table) => table.table === 'unit_attributes_to_groups_junctions_tables');
  main.rows.push(
    { unit: 'synthetic_helstorm', land_unit: 'synthetic_hel_land', recruitment_cost: 131 },
    { unit: 'synthetic_supply', land_unit: 'synthetic_hel_land', recruitment_cost: 0 },
    { unit: 'synthetic_bloodthirster', land_unit: 'synthetic_blood_land', recruitment_cost: 273 },
    { unit: 'synthetic_summoned', land_unit: 'synthetic_summoned_land', recruitment_cost: 0 },
  );
  land.fields.push(f('engine', false, ['battlefield_engines', 'key']), f('man_entity', false, ['battle_entities', 'key']), f('primary_ammo'), f('reload'), f('accuracy'), f('num_engines'), f('damage_mod_physical'), f('damage_mod_magic'));
  land.rows.push(
    { key: 'synthetic_hel_land', engine: 'synthetic_shared_engine', man_entity: 'synthetic_crew', primary_melee_weapon: 'synthetic_hel_melee', attribute_group: '', primary_ammo: 57, reload: 6, accuracy: 13, num_engines: 7 },
    { key: 'synthetic_blood_land', engine: '', man_entity: 'synthetic_flying_entity', primary_melee_weapon: 'synthetic_blood_melee', attribute_group: 'synthetic_blood_group', damage_mod_physical: 17, damage_mod_magic: 29 },
    { key: 'synthetic_summoned_land', engine: '', man_entity: 'synthetic_flying_entity', primary_melee_weapon: 'synthetic_blood_melee', attribute_group: '' },
  );
  // Another unit shares the engine, entity, projectile, ability and phase. No
  // reverse traversal may pull its land row or junction membership into output.
  land.rows.find((row) => row.key === 'synthetic_other_land').engine = 'synthetic_shared_engine';
  land.rows.find((row) => row.key === 'synthetic_other_land').man_entity = 'synthetic_flying_entity';
  tables.find((table) => table.table === 'melee_weapons_tables').rows.push(
    { key: 'synthetic_hel_melee', damage: 9, ap_damage: 4 },
    { key: 'synthetic_blood_melee', damage: 19, ap_damage: 31 },
  );
  tables.find((table) => table.table === 'unit_attributes_groups_tables').rows.push({ group_name: 'synthetic_blood_group' });
  attrs.rows.push({ attribute: 'synthetic_flying', attribute_group: 'synthetic_blood_group' });
  tables.find((table) => table.table === 'unit_attributes_tables').rows.push({ key: 'synthetic_flying' });
  tables.push(
    table('battlefield_engines_tables', [f('key', true), f('battle_entity', false, ['battle_entities', 'key']), f('missile_weapon', false, ['missile_weapons', 'key'])], [
      { key: 'synthetic_shared_engine', battle_entity: 'synthetic_engine_entity', missile_weapon: 'synthetic_launcher' },
    ]),
    table('battle_entities_tables', [f('key', true), f('run_speed'), f('fly_speed'), f('hit_points'), f('mass')], [
      { key: 'synthetic_crew', run_speed: 1.7, fly_speed: 0, hit_points: 12, mass: 87 },
      { key: 'synthetic_engine_entity', run_speed: 2.9, fly_speed: 0, hit_points: 321, mass: 876 },
      { key: 'synthetic_flying_entity', run_speed: 3.7, fly_speed: 7.9, hit_points: 15, mass: 4321 },
    ]),
    table('missile_weapons_tables', [f('key', true), f('default_projectile', false, ['projectiles', 'key'])], [{ key: 'synthetic_launcher', default_projectile: 'synthetic_rocket' }]),
    table('projectiles_tables', [f('key', true), f('explosion_type', false, ['projectiles_explosions', 'key']), f('projectile_penetration', false, ['projectile_penetration_junctions', 'key']), f('damage'), f('ap_damage'), f('base_reload_time'), f('marksmanship_bonus'), f('calibration_distance'), f('calibration_area'), f('shots_per_volley'), f('projectile_number')], [
      { key: 'synthetic_rocket', explosion_type: 'synthetic_explosion', projectile_penetration: 'synthetic_penetration', damage: 23, ap_damage: 47, base_reload_time: 19, marksmanship_bonus: 8, calibration_distance: 271, calibration_area: 143, shots_per_volley: 5, projectile_number: 2 },
    ]),
    table('projectiles_explosions_tables', [f('key', true), f('detonation_damage'), f('detonation_damage_ap'), f('detonation_radius')], [{ key: 'synthetic_explosion', detonation_damage: 12, detonation_damage_ap: 43, detonation_radius: 4.7 }]),
    table('projectile_penetration_junctions_tables', [f('key', true), f('max_penetration'), f('entity_size_cap')], [{ key: 'synthetic_penetration', max_penetration: 3, entity_size_cap: 'small' }]),
    table('land_units_to_unit_abilites_junctions_tables', [f('ability', true, ['unit_abilities', 'key']), f('land_unit', true, ['land_units', 'key'])], [
      { ability: 'synthetic_passive', land_unit: 'synthetic_blood_land' },
      { ability: 'synthetic_passive', land_unit: 'synthetic_other_land' },
    ]),
    table('unit_abilities_tables', [f('key', true), f('source_type')], [{ key: 'synthetic_passive', source_type: 'passive' }]),
    table('unit_special_abilities_tables', [f('key', true, ['unit_abilities', 'key']), f('passive'), f('spawned_unit', false, ['land_units', 'key'])], [{ key: 'synthetic_passive', passive: true, spawned_unit: 'synthetic_other_land' }]),
    table('special_ability_to_special_ability_phase_junctions_tables', [f('special_ability', true, ['unit_special_abilities', 'key']), f('phase', true, ['special_ability_phases', 'id'])], [{ special_ability: 'synthetic_passive', phase: 'synthetic_phase' }]),
    table('special_ability_phases_tables', [f('id', true), f('damage_amount')], [{ id: 'synthetic_phase', damage_amount: 37 }]),
    table('special_ability_phase_stat_effects_tables', [f('phase', true, ['special_ability_phases', 'id']), f('stat', true), f('value'), f('how')], [
      { phase: 'synthetic_phase', stat: 'stat_resistance_physical', value: 7, how: 'add' },
      { phase: 'synthetic_phase', stat: 'scalar_speed', value: 0.63, how: 'mult' },
    ]),
    table('special_ability_phase_attribute_effects_tables', [f('phase', true, ['special_ability_phases', 'id']), f('attribute', true, ['unit_attributes', 'key'])], [{ phase: 'synthetic_phase', attribute: 'synthetic_attribute_a' }]),
  );
  localisation.rows.push(
    { key: 'land_units_onscreen_name_synthetic_hel_land', text: 'Helstorm Rocket Battery', tooltip: false },
    { key: 'land_units_onscreen_name_synthetic_blood_land', text: 'Bloodthirster', tooltip: false },
    { key: 'land_units_onscreen_name_synthetic_summoned_land', text: 'Bloodthirster', tooltip: false },
  );
  fixture.schema.definitions = Object.fromEntries(tables.map((item) => [item.table, [{ version: 99, fields: item.fields, localised_fields: item.table === 'land_units_tables' || item.table === 'unit_abilities_tables' ? [f('onscreen_name')] : [] }]]));
  fixture.abilityLocalisation = { ...table('Loc', [f('key', true), f('text'), f('tooltip')], [{ key: 'unit_abilities_onscreen_name_synthetic_passive', text: 'Synthetic passive label', tooltip: false }]), path: 'text/db/synthetic_abilities.loc' };
  return fixture;
}
