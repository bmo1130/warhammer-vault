// Local integration only. Reads installed CA packs through the existing RPFM
// adapter; writes ignored extraction evidence, never app/admission data.
import { mkdirSync, writeFileSync } from 'node:fs';
import { openRawSource, resolveOptions } from '../tools/wh3-importer/extract.mjs';
import { inspectTables } from '../tools/wh3-importer/inspect.mjs';
import { pins } from '../tools/wh3-importer/research-classifier/policy.mjs';
import { digest, snapshotIdentity } from '../tools/wh3-importer/runtime-evidence/contract.mjs';
import assert from 'node:assert/strict';
const folder = 'generated/wh3/research-scan-bretonnia';
mkdirSync(folder, { recursive: true });
const source = await openRawSource(await resolveOptions(process.argv.slice(2)));
try {
  assert.equal(digest(snapshotIdentity(source.metadata)), pins.snapshotId, 'Snapshot drift: extraction halted');
  assert.equal(source.metadata.rpfmVersion, pins.rpfmVersion);
  assert.equal(source.metadata.schemaFormatVersion, pins.schemaFormatVersion);
  const accumulated = { schemas: [], rows: [], coverage: [] };
  const eq = (table, field, value) => ({ table, where: [{ field, op: 'eq', value }] });
  const oneOf = (table, field, value) => ({ table, where: [{ field, op: 'oneOf', value: [...new Set(value)].sort() }] });
  const rows = table => accumulated.rows.filter(r => r.table === table);
  const query = async q => {
    const result = await inspectTables(source.reader, source.schema, [q], 1000);
    for (const row of result.rows) {
      const old = accumulated.rows.find(r => r.id === row.id);
      if (old) assert.deepEqual(row, old); else accumulated.rows.push(row);
    }
    for (const schema of result.schemas) {
      const old = accumulated.schemas.find(s => s.table === schema.table && s.version === schema.version);
      if (old) assert.deepEqual(schema, old); else accumulated.schemas.push(schema);
    }
    accumulated.coverage.push(...result.coverage);
    console.log(`${q.table}: ${result.rows.length} matched`);
  };
  const queryMany = async (table, field, values) => {
    const sorted = [...new Set(values)].sort();
    // Bounded chunks keep the existing inspection cap. No partial table dump.
    for (let i = 0; i < sorted.length; i += 25) await query(oneOf(table, field, sorted.slice(i, i + 25)));
  };
  const culture = 'wh_main_brt_bretonnia';
  await query(eq('cultures_tables', 'key', culture));
  await query(eq('cultures_subcultures_tables', 'culture', culture));
  const subcultures = rows('cultures_subcultures_tables').map(r => r.row.subculture);
  await query(oneOf('factions_tables', 'subculture', subcultures));
  await query(eq('technology_node_sets_tables', 'culture', culture));
  await query(oneOf('technology_node_sets_tables', 'subculture', subcultures));
  await query(oneOf('technology_node_sets_tables', 'faction_key', rows('factions_tables').map(r => r.row.key)));
  const sets = rows('technology_node_sets_tables').map(r => r.row.key);
  for (const key of sets) await query(eq('technology_nodes_tables', 'technology_node_set', key));
  const keys = [...new Set(rows('technology_nodes_tables').map(r => r.row.technology_key))].sort();
  await queryMany('technologies_tables', 'key', keys);
  for (const key of keys) await query(eq('technology_effects_junction_tables', 'technology', key));
  const nodeKeys = rows('technology_nodes_tables').map(r => r.row.key);
  await queryMany('technology_node_links_tables', 'parent_key', nodeKeys);
  await queryMany('technology_node_links_tables', 'child_key', nodeKeys);
  const effects = [...new Set(rows('technology_effects_junction_tables').map(r => r.row.effect))].sort();
  await queryMany('effects_tables', 'effect', effects);
  await queryMany('campaign_effect_scopes_tables', 'key', rows('technology_effects_junction_tables').map(r => r.row.effect_scope));
  // Discover relation tables by actual schema references, never key-name meaning.
  const present = new Set(source.reader.packs.flatMap(p => p.files.filter(f => f.file_type === 'DB').map(f => f.path.split('/')[1])));
  const relationTables = Object.keys(source.schema.definitions).filter(table => table.startsWith('effect_bonus_value_') &&
    present.has(table) && source.schema.definitions[table].some(d => d.fields.some(f => f.name === 'effect' &&
      JSON.stringify(f.is_reference) === JSON.stringify(['effects', 'effect'])))).sort();
  for (const table of relationTables) await queryMany(table, 'effect', effects);
  const unitSets = rows('effect_bonus_value_ids_unit_sets_tables').map(r => r.row.unit_set);
  for (const key of [...new Set(unitSets)].sort()) {
    await query(eq('unit_sets_tables', 'key', key));
    await query(eq('unit_set_to_unit_junctions_tables', 'unit_set', key));
  }
  const mainKeys = accumulated.rows.flatMap(r => accumulated.schemas.find(s => s.table === r.table && s.version === r.tableVersion)
    .fields.filter(f => JSON.stringify(f.is_reference) === JSON.stringify(['main_units', 'unit']))
    .map(f => r.row[f.name])).filter(Boolean);
  await queryMany('main_units_tables', 'unit', mainKeys);
  await queryMany('land_units_tables', 'key', rows('main_units_tables').map(r => r.row.land_unit));
  const originalTables = source.reader.tables.bind(source.reader);
  source.reader.tables = async name => name.startsWith('Loc:') ? [await source.reader.decode(source.local, name.slice(4))] : originalTables(name);
  for (const [table, field, values] of [['technologies', 'onscreen_name', keys], ['effects', 'description', effects]]) {
    const name = `Loc:text/db/${table}__.loc`, decoded = (await source.reader.tables(name))[0];
    source.schema.definitions[name] = [{ version: decoded.tableVersion, fields: decoded.fields }];
    await queryMany(name, 'key', values.map(v => `${table}_${field}_${v}`));
  }
  // Cross-stage relationships are regenerated from the actual selected schema
  // definitions and full selected rows; no inferred joins or target expansion.
  const relationships = [];
  const byTable = table => accumulated.rows.filter(r => r.table === table);
  for (const from of accumulated.rows) {
    const schema = accumulated.schemas.find(s => s.table === from.table && s.version === from.tableVersion);
    for (const f of schema.fields.filter(f => f.is_reference)) {
      const table = `${f.is_reference[0]}_tables`, targetField = f.is_reference[1];
      for (const to of byTable(table).filter(r => r.row[targetField] === from.row[f.name])) relationships.push({
        from: from.id, field: f.name, to: to.id, targetField, value: from.row[f.name], evidence: 'RPFM processed schema is_reference' });
    }
    if (Object.keys(from.key).length === 1 && from.table !== 'Loc') for (const f of schema.localisedFields) {
      const value = `${from.table.replace(/_tables$/, '')}_${f.name}_${Object.values(from.key)[0]}`;
      for (const to of byTable('Loc').filter(r => r.row.key === value)) relationships.push({
        from: from.id, field: f.name, to: to.id, targetField: 'key', value, evidence: 'RPFM schema localised_fields + verified single-key Loc convention' });
    }
  }
  const raw = { format: 'wh3-bretonnia-tree-extraction-v1', extractedAt: new Date().toISOString(),
    provenance: source.metadata, affiliationRoot: culture, relationTables, ...accumulated, relationships };
  writeFileSync(`${folder}/raw.json`, JSON.stringify(raw, null, 2) + '\n');
  console.log(`Complete: ${keys.length} technologies, ${rows('technology_effects_junction_tables').length} effects, ${accumulated.rows.length} rows`);
} finally { await source.client.close(); }
