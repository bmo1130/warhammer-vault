import { discoverRoots, resolveReferenceTable } from './trace-unit.mjs';
import { inspectTables } from './inspect.mjs';

const query = (table, field, values) => ({ table, where: [{ field, op: 'oneOf', value: [...new Set(values)] }] });
export async function discoverSample(source, sample) {
  const { reader, schema, localisation, metadata } = source;
  const { candidates } = await discoverRoots(reader, schema, localisation, sample.displayName);
  if (candidates.length > 30) throw Object.assign(new Error('More than 30 roots for one name; bounded identity inspection refused.'), { category: 'RESOURCE_LIMIT' });
  if (!candidates.length) return { candidates: [], evidence: null };
  const main = candidates.map(c => c.row.unit), land = candidates.map(c => c.landRow.key);
  const queries = [query('main_units_tables', 'unit', main), query('land_units_tables', 'key', land)];
  const relations = [
    ['units_to_groupings_military_permissions_tables', 'unit', 'main_units_tables', 'unit', main],
    ['unit_set_to_unit_junctions_tables', 'unit_record', 'main_units_tables', 'unit', main],
    ['unit_recruitment_source_overrides_tables', 'unit', 'main_units_tables', 'unit', main],
    ['unit_missile_weapon_junctions_tables', 'unit', 'main_units_tables', 'unit', main],
    ['land_units_to_unit_abilites_junctions_tables', 'land_unit', 'land_units_tables', 'key', land],
  ];
  const unavailableRelations = [];
  for (const [table, field, target, targetField, values] of relations) {
    const tables = await reader.tables(table);
    if (tables.length && tables.every(t => t.fields.some(f => f.name === field && f.is_reference?.[1] === targetField && resolveReferenceTable(f.is_reference[0], schema) === target))) queries.push(query(table, field, values));
    else unavailableRelations.push({ table, field, reason: 'Missing table or processed schema reference; absence of membership is not established.' });
  }
  const evidence = { sourceKind: metadata.sourceKind, provenance: metadata, ...await inspectTables(reader, schema, queries, 400) };
  const discovered = candidates.map(c => ({
    mainKey: c.row.unit, landKey: c.landRow.key, localisation: { key: c.loc.key, text: c.loc.text, path: localisation.path, sourcePack: localisation.sourcePack },
    mainRow: evidence.rows.find(r => r.table === 'main_units_tables' && r.row.unit === c.row.unit)?.id,
    landRow: evidence.rows.find(r => r.table === 'land_units_tables' && r.row.key === c.landRow.key)?.id,
    main: c.row, land: c.landRow,
    permissionGroups: evidence.rows.filter(r => r.table === 'units_to_groupings_military_permissions_tables' && r.row.unit === c.row.unit).map(r => r.row.military_group),
    unitSets: evidence.rows.filter(r => r.table === 'unit_set_to_unit_junctions_tables' && r.row.unit_record === c.row.unit).map(r => ({ rowId: r.id, ...r.row })),
    recruitmentOverrides: evidence.rows.filter(r => r.table === 'unit_recruitment_source_overrides_tables' && r.row.unit === c.row.unit).map(r => ({ rowId: r.id, ...r.row })),
  }));
  return { policy: 'unique only; no paid-recruitment generalization', candidates: discovered, evidence, unavailableRelations };
}

export function discoverScope(discovery, schema) {
  const evidence = [], scopes = [];
  const hasRef = (table, row, field, target) => {
    const record = discovery.evidence.rows.find(r => r.table === table && r.row === row) ?? discovery.evidence.rows.find(r => r.table === table && (r.row.key ?? r.row.unit) === (row.key ?? row.unit));
    const f = discovery.evidence.schemas.find(s => s.table === table && s.version === record?.tableVersion)?.fields.find(f => f.name === field);
    if (row[field] && f?.is_reference && resolveReferenceTable(f.is_reference[0], schema) === target) { evidence.push({ rowId: record.id, field, value: row[field], reference: f.is_reference }); return true; }
    return false;
  };
  const c = discovery.candidates[0];
  if (!c || discovery.candidates.length !== 1) return { scopes, evidence };
  const missile = hasRef('land_units_tables', c.land, 'primary_missile_weapon', 'missile_weapons_tables');
  const engine = hasRef('land_units_tables', c.land, 'engine', 'battlefield_engines_tables');
  if (missile || engine || discovery.evidence.rows.some(r => r.table === 'unit_missile_weapon_junctions_tables')) scopes.push('missile');
  const abilities = discovery.evidence.rows.filter(r => r.table === 'land_units_to_unit_abilites_junctions_tables');
  if (abilities.length) { scopes.push('abilityPhases'); evidence.push(...abilities.map(r => ({ rowId: r.id, field: 'ability', value: r.row.ability, reason: 'Schema-verified selected-land ability membership' }))); }
  return { scopes, evidence };
}

// One-hop probes of paths the current tracer omits. Persist these separately,
// never silently broaden normalizer scope or recursively trace override paths.
export async function inspectMissileExtras(source, discovery, dump) {
  const queries = [];
  const extraWeapons = discovery.evidence.rows.filter(r => r.table === 'unit_missile_weapon_junctions_tables').map(r => r.row.missile_weapon);
  const weapons = [...new Set([...dump.rows.filter(r => r.table === 'missile_weapons_tables').map(r => r.row.key), ...extraWeapons])];
  if (!weapons.length) return { rows: [], schemas: [], relationships: [], coverage: [] };
  queries.push(query('main_units_tables', 'unit', [dump.unit.caKey]));
  if (discovery.evidence.schemas.some(s => s.table === 'unit_missile_weapon_junctions_tables')) queries.push(query('unit_missile_weapon_junctions_tables', 'unit', [dump.unit.caKey]));
  queries.push(query('missile_weapons_tables', 'key', weapons), query('missile_weapons_to_projectiles_tables', 'missile_weapon', weapons));
  const first = await inspectTables(source.reader, source.schema, queries, 100);
  const projectiles = [...new Set([...first.rows.filter(r => r.table === 'missile_weapons_tables').map(r => r.row.default_projectile), ...first.rows.filter(r => r.table === 'missile_weapons_to_projectiles_tables').map(r => r.row.projectile)].filter(Boolean))];
  if (projectiles.length) queries.push(query('projectiles_tables', 'key', projectiles));
  return { sourceKind: source.metadata.sourceKind, provenance: source.metadata, ...await inspectTables(source.reader, source.schema, queries, 150) };
}
