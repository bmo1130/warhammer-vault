import { createHash } from 'node:crypto';
import { baseTables, tablesForProfile, unitProfiles } from './profiles.mjs';

// Names verified against the installed WH3 schema and actual db.pack inventory.
// The bounded allowlist prevents following unrelated campaign/audio/VFX data.
export const trackedTables = baseTables;
const reverseTargets = {
  building_units_allowed_tables: 'main_units_tables',
  land_units_to_unit_abilites_junctions_tables: 'land_units_tables',
  unit_attributes_to_groups_junctions_tables: 'unit_attributes_groups_tables',
  unit_special_abilities_tables: 'unit_abilities_tables',
  ground_type_to_stat_effects_tables: 'ground_type_stat_effect_groups_tables',
  special_ability_to_special_ability_phase_junctions_tables: 'unit_special_abilities_tables',
  special_ability_phase_stat_effects_tables: 'special_ability_phases_tables',
  special_ability_phase_attribute_effects_tables: 'special_ability_phases_tables',
  special_ability_behaviour_groups_to_types_tables: 'special_ability_behaviour_groups_tables',
};

export function resolveReferenceTable(referenceName, schema) {
  if (Object.hasOwn(schema.definitions, referenceName)) return referenceName;
  const matches = Object.keys(schema.definitions).filter((name) => name.endsWith('_tables') && name.slice(0, -7) === referenceName);
  return matches.length === 1 ? matches[0] : undefined;
}

export async function discoverRoots(reader, schema, localisation, displayName) {
  const mainTables = await reader.tables('main_units_tables');
  const landTables = await reader.tables('land_units_tables');
  if (!mainTables.length || !landTables.length) throw new Error('CA DB root tables are not exposed. Check loaded CA pack inventory and WH3 schema; do not infer that the unit is absent.');
  const nameRows = localisation.rows.filter((row) => row.text === displayName);
  const candidates = [];
  for (const landTable of landTables) {
    // This naming convention was confirmed by the actual Loc row and the
    // schema's land_units.localised_fields entry named onscreen_name.
    const definitions = schema.definitions[landTable.table] ?? [];
    if (!definitions.some((definition) => definition.version === landTable.tableVersion && definition.localised_fields?.some((field) => field.name === 'onscreen_name'))) continue;
    for (const landRow of landTable.rows) {
      const loc = nameRows.find((row) => row.key === `land_units_onscreen_name_${landRow.key}`);
      if (!loc) continue;
      for (const table of mainTables) {
        const reference = table.fields.find((field) => field.name === 'land_unit')?.is_reference;
        if (!reference || resolveReferenceTable(reference[0], schema) !== landTable.table || reference[1] !== 'key') continue;
        for (const row of table.rows.filter((row) => row.land_unit === landRow.key)) candidates.push({ table, row, landTable, landRow, loc });
      }
    }
  }
  return { candidates, mainTables, landTables };
}

// Exact source seed: no display-name search, cost policy or candidate ordering.
export async function discoverExactRoot(reader, schema, localisation, identity) {
  const fail = reason => { throw Object.assign(new Error(reason), { category: 'SOURCE_IDENTITY_DRIFT' }); };
  if (!identity?.mainKey || !identity.landKey || !identity.localisationKey) fail('Exact main/land/localisation identity is required.');
  const mainTables = await reader.tables('main_units_tables'), landTables = await reader.tables('land_units_tables');
  const roots = mainTables.flatMap(table => table.rows.filter(row => row.unit === identity.mainKey).map(row => ({ table, row })));
  if (roots.length !== 1) fail(`Exact main key has ${roots.length} source rows; no pack precedence selected.`);
  const root = roots[0], ref = root.table.fields.find(f => f.name === 'land_unit')?.is_reference;
  if (!root.table.fields.some(f => f.name === 'unit' && f.is_key) || !ref || resolveReferenceTable(ref[0], schema) !== 'land_units_tables' || ref[1] !== 'key' || root.row.land_unit !== identity.landKey) fail('Exact main/land key or processed schema reference drift.');
  const lands = landTables.flatMap(table => table.rows.filter(row => row.key === identity.landKey).map(row => ({ table, row })));
  if (lands.length !== 1) fail(`Expected one exact land row; found ${lands.length}.`);
  const land = lands[0];
  if (!land.table.fields.some(f => f.name === 'key' && f.is_key) || !schema.definitions[land.table.table]?.some(d => d.version === land.table.tableVersion && d.localised_fields?.some(f => f.name === 'onscreen_name'))) fail('Land key/localised_fields schema drift.');
  if (identity.localisationKey !== `land_units_onscreen_name_${identity.landKey}`) fail('Expected localisation identity drift.');
  const locs = localisation.rows.filter(row => row.key === identity.localisationKey);
  if (locs.length !== 1 || typeof locs[0].text !== 'string' || !locs[0].text || (identity.displayName !== undefined && locs[0].text !== identity.displayName)) fail('Exact localisation is missing, duplicated or changed.');
  return { candidates: [{ ...root, landTable: land.table, landRow: land.row, loc: locs[0] }], mainTables, landTables };
}

export async function traceUnitByMainKey(reader, schema, localisation, metadata, identity, scopes = [], supplementalLocalisations = []) {
  return traceUnit(reader, schema, localisation, metadata, { displayName: identity.displayName, slug: 'exact-source', scopes, rootSelection: 'exact-main', sourceIdentity: identity }, supplementalLocalisations);
}

export async function traceUnit(reader, schema, localisation, metadata = {}, profile = unitProfiles['grail-knights'], supplementalLocalisations = []) {
  const { displayName } = profile;
  const allowedTables = tablesForProfile(profile);
  if (!['unique', 'paid-recruitment', 'exact-main'].includes(profile.rootSelection)) throw new Error(`Unsupported root selection: ${profile.rootSelection}`);
  const unresolved = [];
  const problem = (field, reason) => unresolved.push({ field, reason });
  const { candidates, mainTables, landTables } = profile.rootSelection === 'exact-main'
    ? await discoverExactRoot(reader, schema, localisation, profile.sourceIdentity)
    : await discoverRoots(reader, schema, localisation, displayName);
  const candidateEvidence = candidates.map((candidate) => ({
    mainKey: candidate.row.unit, landKey: candidate.landRow.key, localisationKey: candidate.loc.key,
    sourcePack: candidate.table.sourcePack, path: candidate.table.path,
    recruitmentCost: Object.hasOwn(candidate.row, 'recruitment_cost') ? candidate.row.recruitment_cost : null,
    selectedByPolicy: ['unique', 'exact-main'].includes(profile.rootSelection) || (typeof candidate.row.recruitment_cost === 'number' && candidate.row.recruitment_cost > 0),
  }));
  const eligible = candidates.filter((_, index) => candidateEvidence[index].selectedByPolicy);
  if (eligible.length !== 1) throw new Error(`Expected one localisation-confirmed ${displayName} root, found ${eligible.length} after ${profile.rootSelection} policy. Candidates: ${JSON.stringify(candidateEvidence)}. Check localisation, CA DB pack/schema, or duplicate roots; no guessed key is used.`);
  const root = eligible[0];
  if (!Object.hasOwn(root.row, 'unit')) throw new Error('main_units root no longer has the verified unit key field.');
  const records = new Map();
  const schemas = new Map();
  const queue = [];
  const relationships = new Map();
  const skippedReferences = new Map();
  const edges = (from, field, to, targetField, value, direction = 'forward') => {
    const edge = { from: from.id, field, to: to.id, targetField, value, direction, evidence: 'RPFM processed schema is_reference' };
    relationships.set(JSON.stringify(edge), edge);
  };
  const add = (table, row) => {
    const keyFields = table.fields.filter((field) => field.is_key).map((field) => field.name);
    const key = Object.fromEntries(keyFields.map((field) => [field, row[field]]));
    const identity = JSON.stringify([table.sourcePack, table.path, keyFields.length ? key : row]);
    const id = `${table.table}:${createHash('sha256').update(identity).digest('hex').slice(0, 20)}`;
    if (!records.has(id)) {
      const record = { id, table: table.table, key, sourcePack: table.sourcePack, sourcePackPath: table.sourcePackPath, path: table.path, tableVersion: table.tableVersion, row };
      records.set(id, record); queue.push({ table, row, record });
      schemas.set(`${table.table}:${table.tableVersion}`, { table: table.table, version: table.tableVersion, fields: table.fields });
      if (!keyFields.length) problem(id, 'Schema has no declared row key; identity uses the complete raw row, not a positional index.');
      for (const definition of (schema.definitions[table.table] ?? []).filter((item) => item.version === table.tableVersion)) {
        for (const localisedField of definition.localised_fields ?? []) {
          // Same verified table/field/key localisation convention as root
          // discovery. Only matching child names from explicitly supplied Loc
          // files are retained, never unrelated rows from those files.
          if (keyFields.length !== 1) continue;
          const locKey = `${table.table.replace(/_tables$/, '')}_${localisedField.name}_${row[keyFields[0]]}`;
          for (const loc of supplementalLocalisations) for (const locRow of loc.rows.filter((entry) => entry.key === locKey)) {
            const locRecord = add(loc, locRow);
            const edge = { from: locRecord.id, field: 'key', to: record.id, targetField: keyFields[0], value: row[keyFields[0]], direction: 'localisation', evidence: 'Exact child Loc key + matching schema localised_fields + declared row key' };
            relationships.set(JSON.stringify(edge), edge);
          }
        }
      }
    }
    return records.get(id);
  };
  const rootRecord = add(root.table, root.row);
  const locRecord = add(localisation, root.loc);
  const landRecord = add(root.landTable, root.landRow);
  relationships.set('localisation', { from: locRecord.id, field: 'key', to: landRecord.id, targetField: 'key', value: root.landRow.key, direction: 'localisation', evidence: 'Exact onscreen_name Loc key + matching schema localised_fields + land_units.key' });

  const loaded = new Map();
  const load = async (name) => {
    if (!loaded.has(name)) {
      const tables = await reader.tables(name);
      loaded.set(name, tables);
      if (!tables.length) problem(name, 'Schema table is not exposed by the explicitly opened CA pack; relation coverage is unknown.');
    }
    return loaded.get(name);
  };
  loaded.set('main_units_tables', mainTables); loaded.set('land_units_tables', landTables);
  const limit = 250;
  for (let position = 0; position < queue.length; position++) {
    if (records.size > limit) throw new Error('Single-unit trace exceeded 250 rows; review schema relationships rather than dumping the DB.');
    const { table, row, record } = queue[position];
    for (const field of table.fields) {
      const ref = field.is_reference;
      if (!ref || row[field.name] === '' || row[field.name] === null || row[field.name] === undefined) continue;
      const targetName = resolveReferenceTable(ref[0], schema);
      if (!targetName || !allowedTables.includes(targetName)) {
        skippedReferences.set(`${record.id}:${field.name}`, { from: record.id, field: field.name, targetTable: ref[0], value: row[field.name], reason: 'Outside the bounded single-unit trace scope.' });
        continue;
      }
      if ((targetName === 'main_units_tables' && row[field.name] !== root.row.unit) || (targetName === 'land_units_tables' && row[field.name] !== root.landRow.key)) {
        skippedReferences.set(`${record.id}:${field.name}`, { from: record.id, field: field.name, targetTable: targetName, value: row[field.name], reason: `A different unit is outside the single ${displayName} trace.` });
        continue;
      }
      const tables = await load(targetName);
      let matches = 0;
      for (const target of tables) {
        if (!target.fields.some((candidate) => candidate.name === ref[1])) { problem(`${targetName}.${ref[1]}`, 'Referenced field is absent from the processed schema.'); continue; }
        for (const targetRow of target.rows.filter((candidate) => candidate[ref[1]] === row[field.name])) {
          edges(record, field.name, add(target, targetRow), ref[1], row[field.name]); matches++;
        }
      }
      if (!matches) problem(`${record.id}.${field.name}`, `No source row found in ${targetName}.${ref[1]} for ${JSON.stringify(row[field.name])}.`);
      else if (matches > 1) problem(`${record.id}.${field.name}`, 'Multiple raw rows match; all sources retained, no pack precedence guessed.');
    }
    for (const [name, allowedTarget] of Object.entries(reverseTargets)) {
      if (!allowedTables.includes(name)) continue;
      if (table.table !== allowedTarget) continue;
      if (allowedTarget === 'main_units_tables' && record.id !== rootRecord.id) continue;
      if (allowedTarget === 'land_units_tables' && record.id !== landRecord.id) continue;
      if (!schema.definitions[name]) continue;
      // Do not decode reverse tables unless schema metadata references this table.
      if (!schema.definitions[name].some((definition) => definition.fields.some((field) => field.is_reference && resolveReferenceTable(field.is_reference[0], schema) === table.table))) continue;
      for (const reverse of await load(name)) {
        for (const field of reverse.fields.filter((field) => field.is_reference && resolveReferenceTable(field.is_reference[0], schema) === table.table)) {
          const targetField = field.is_reference[1];
          if (!Object.hasOwn(row, targetField)) { problem(`${record.id}.${targetField}`, 'Reverse reference target field is missing.'); continue; }
          for (const reverseRow of reverse.rows.filter((candidate) => candidate[field.name] === row[targetField])) edges(add(reverse, reverseRow), field.name, record, targetField, row[targetField], 'reverse');
        }
      }
    }
  }
  return {
    format: 'warhammer-vault-wh3-raw-v1', sourceKind: metadata.sourceKind ?? 'fixture',
    unit: { displayName, caKey: root.row.unit, gameVersion: metadata.gameVersion ?? 'unknown', extractedAt: metadata.extractedAt ?? new Date().toISOString() },
    discovery: { profile: profile.slug, policy: profile.rootSelection, candidates: candidateEvidence },
    provenance: { ...metadata, extractionSource: metadata.sourceKind === 'ca-pack' ? 'Direct PackFile decode; no dependency-cache rows, no mod merge, no Unit normalization' : 'Synthetic fixture tables; no CA pack was read' },
    rootRow: rootRecord.id, schemas: [...schemas.values()], rows: [...records.values()],
    relationships: [...relationships.values()], skippedReferences: [...skippedReferences.values()],
    unresolved,
  };
}
