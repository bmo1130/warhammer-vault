import { threeProfileFixture } from './profiles.mjs';
import { field as f, table } from './tables.mjs';
import { traceUnit } from '../trace-unit.mjs';
import { getProfile } from '../profiles.mjs';

// Entirely synthetic values/keys, deliberately different from CA/manual stats.
export const syntheticIdMappings = {
  abilities: { synthetic_lance: 'lance', synthetic_blessing: 'blessing_of_the_lady', synthetic_passive: 'wounds' },
  attributes: { synthetic_attribute_a: 'perfect_vigour' },
  movement: { synthetic_flying: { field: 'movement.canFly', value: true }, synthetic_cant_run: { field: 'movement.canRun', value: false } },
};

export function normalizationFixture() {
  const data = threeProfileFixture();
  const find = (name) => data.tables.find((item) => item.table === name);
  const main = find('main_units_tables'), land = find('land_units_tables');
  main.fields.push(...['num_men', 'multiplayer_cost', 'upkeep_cost', 'create_time', 'tier', 'can_siege'].map((name) => f(name)));
  for (const row of main.rows) Object.assign(row, { num_men: 17, multiplayer_cost: 419, upkeep_cost: 0, create_time: 2, tier: 3, can_siege: row.unit !== 'synthetic_root_a' });
  land.fields.push(f('mount', false, ['mounts', 'key']), f('armour', false, ['unit_armour_types', 'key']), f('shield', false, ['unit_shield_types', 'key']), f('category', false, ['unit_category', 'key']), ...['morale', 'melee_attack', 'melee_defence', 'charge_bonus', 'bonus_hit_points', 'num_mounts', 'can_skirmish'].map((name) => f(name)));
  for (const row of land.rows) Object.assign(row, { mount: '', engine: row.engine ?? '', armour: 'synthetic_armour', shield: 'synthetic_shield', category: 'synthetic_category', morale: 53, melee_attack: 27, melee_defence: 19, charge_bonus: 33, bonus_hit_points: 41, num_mounts: 0, can_skirmish: false });
  Object.assign(land.rows.find((row) => row.key === 'synthetic_land_a'), { man_entity: 'synthetic_rider', mount: 'synthetic_mount', num_mounts: 17 });
  Object.assign(land.rows.find((row) => row.key === 'synthetic_hel_land'), { attribute_group: 'synthetic_hel_group' });
  const entities = find('battle_entities_tables');
  entities.fields.push(f('size'), f('projectile_penetration_resistance'));
  for (const row of entities.rows) Object.assign(row, { size: 'large', projectile_penetration_resistance: 4 });
  entities.rows.push({ key: 'synthetic_rider', mass: 113, hit_points: 14, run_speed: 1.3, size: 'small' }, { key: 'synthetic_mount_entity', mass: 997, hit_points: 11, run_speed: 6.3, size: 'medium' });
  const weapons = find('melee_weapons_tables');
  weapons.fields.push(...['bonus_v_large', 'bonus_v_infantry', 'melee_attack_interval', 'weapon_length', 'splash_attack_max_attacks', 'splash_attack_target_size', 'is_magical', 'ignition_amount'].map((name) => f(name)));
  for (const row of weapons.rows) Object.assign(row, { bonus_v_large: 3, bonus_v_infantry: 0, melee_attack_interval: 2.7, weapon_length: 0, splash_attack_max_attacks: 2, splash_attack_target_size: 'small', is_magical: true, ignition_amount: 1 });
  const projectile = find('projectiles_tables');
  projectile.fields.push(...['effective_range', 'bonus_v_large', 'bonus_v_infantry', 'burst_size'].map((name) => f(name)));
  Object.assign(projectile.rows[0], { effective_range: 271, bonus_v_large: 0, bonus_v_infantry: 2, burst_size: 1 });
  const groups = find('unit_attributes_groups_tables'); groups.rows.push({ group_name: 'synthetic_hel_group' });
  find('unit_attributes_to_groups_junctions_tables').rows.push({ attribute: 'synthetic_cant_run', attribute_group: 'synthetic_hel_group' });
  find('unit_attributes_tables').rows.push({ key: 'synthetic_cant_run' });
  find('land_units_to_unit_abilites_junctions_tables').rows.push({ ability: 'synthetic_lance', land_unit: 'synthetic_land_a' }, { ability: 'synthetic_blessing', land_unit: 'synthetic_land_a' });
  find('unit_abilities_tables').rows.push({ key: 'synthetic_lance', source_type: 'active' }, { key: 'synthetic_blessing', source_type: 'passive' });
  find('unit_special_abilities_tables').rows.push({ key: 'synthetic_lance', passive: false }, { key: 'synthetic_blessing', passive: true });
  data.tables.push(
    table('mounts_tables', [f('key', true), f('entity', false, ['battle_entities', 'key'])], [{ key: 'synthetic_mount', entity: 'synthetic_mount_entity' }]),
    table('unit_armour_types_tables', [f('key', true), f('armour_value')], [{ key: 'synthetic_armour', armour_value: 37 }]),
    table('unit_shield_types_tables', [f('key', true), f('missile_block_chance')], [{ key: 'synthetic_shield', missile_block_chance: 0 }]),
    table('unit_category_tables', [f('key', true), f('localised_name')], [{ key: 'synthetic_category', localised_name: 'Synthetic category' }]),
  );
  data.schema.definitions = Object.fromEntries(data.tables.map((item) => [item.table, [{ version: 99, fields: item.fields, localised_fields: item.table === 'land_units_tables' || item.table === 'unit_abilities_tables' ? [f('onscreen_name')] : [] }]]));
  return data;
}

export async function syntheticNormalizationInput(name, data = normalizationFixture()) {
  const dump = await traceUnit(data.reader, data.schema, data.localisation, { extractedAt: '2000-01-01T00:00:00.000Z' }, getProfile(name), [data.abilityLocalisation]);
  const root = dump.rows.find((row) => row.id === dump.rootRow);
  const permissionTable = table('units_to_groupings_military_permissions_tables', [f('unit', true, ['main_units', 'unit']), f('military_group', true)], []);
  const group = `synthetic_group_${name.replaceAll('-', '_')}`;
  const link = { id: 'synthetic_permission', ...Object.fromEntries(['table', 'path', 'sourcePack', 'sourcePackPath', 'tableVersion'].map((key) => [key, permissionTable[key]])), key: { unit: dump.unit.caKey, military_group: group }, row: { unit: dump.unit.caKey, military_group: group } };
  const permissionTrace = {
    format: 'warhammer-vault-wh3-inspection-v1', sourceKind: 'fixture', provenance: { extractionSource: 'Synthetic permission evidence; no CA data' },
    rows: [root, link], schemas: [dump.schemas.find((schema) => schema.table === 'main_units_tables'), { table: permissionTable.table, version: 99, fields: permissionTable.fields }],
    relationships: [{ from: link.id, field: 'unit', to: root.id, targetField: 'unit', value: dump.unit.caKey, evidence: 'RPFM processed schema is_reference (synthetic fixture)' }],
  };
  return { dump, context: { factionId: `fixture_catalog_${name.replaceAll('-', '_')}`, militaryGroup: group, permissionTrace, idMappings: syntheticIdMappings } };
}
