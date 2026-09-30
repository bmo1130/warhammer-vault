// Synthetic data for join tests. None of these keys or numbers are CA data,
// user-provided wiki values, or real extraction results.
const field = (name, is_key = false, is_reference = null) => ({ name, is_key, is_reference, field_type: 'StringU8' });
const table = (name, fields, rows) => ({ table: name, path: `db/${name}/synthetic_fixture`, sourcePack: 'synthetic-fixture.pack', sourcePackPath: 'fixture-only', tableVersion: 99, fields, rows });

export function fixtureDataset() {
  const tables = [
    table('main_units_tables', [field('unit', true), field('land_unit', false, ['land_units', 'key']), field('recruitment_cost')], [
      { unit: 'synthetic_root_a', land_unit: 'synthetic_land_a', recruitment_cost: 123 },
      { unit: 'synthetic_other', land_unit: 'synthetic_other_land', recruitment_cost: 999 },
    ]),
    table('land_units_tables', [field('key', true), field('primary_melee_weapon', false, ['melee_weapons', 'key']), field('attribute_group', false, ['unit_attributes_groups', 'group_name'])], [
      { key: 'synthetic_land_a', primary_melee_weapon: 'synthetic_weapon_a', attribute_group: 'synthetic_group_a' },
      { key: 'synthetic_other_land', primary_melee_weapon: 'synthetic_other_weapon', attribute_group: '' },
    ]),
    table('melee_weapons_tables', [field('key', true), field('damage'), field('ap_damage')], [{ key: 'synthetic_weapon_a', damage: 11, ap_damage: 7 }]),
    table('unit_attributes_groups_tables', [field('group_name', true)], [{ group_name: 'synthetic_group_a' }]),
    table('unit_attributes_to_groups_junctions_tables', [field('attribute', true, ['unit_attributes', 'key']), field('attribute_group', true, ['unit_attributes_groups', 'group_name'])], [{ attribute: 'synthetic_attribute_a', attribute_group: 'synthetic_group_a' }]),
    table('unit_attributes_tables', [field('key', true)], [{ key: 'synthetic_attribute_a' }]),
    table('building_units_allowed_tables', [field('key', true), field('building', false, ['building_levels', 'level_name']), field('unit', false, ['main_units', 'unit']), field('enabled')], [
      { key: 'synthetic_link_a', building: 'synthetic_building_a', unit: 'synthetic_root_a', enabled: false },
      { key: 'synthetic_unrelated_link', building: 'synthetic_building_a', unit: 'synthetic_other', enabled: true },
    ]),
    table('building_levels_tables', [field('level_name', true), field('level')], [{ level_name: 'synthetic_building_a', level: 2 }]),
  ];
  const schema = { version: 99, definitions: Object.fromEntries(tables.map((item) => [item.table, [{ version: 99, fields: item.fields, localised_fields: item.table === 'land_units_tables' ? [field('onscreen_name')] : [] }]])) };
  const localisation = { ...table('Loc', [field('key', true), field('text'), field('tooltip')], [{ key: 'land_units_onscreen_name_synthetic_land_a', text: 'Grail Knights', tooltip: false }]), path: 'text/db/synthetic_fixture.loc' };
  const reader = { async tables(name) { return tables.filter((item) => item.table === name); } };
  return { tables, schema, localisation, reader };
}
