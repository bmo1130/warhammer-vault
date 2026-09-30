import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { RpfmClient } from './mcp-client.mjs';
import { RawPackReader } from './raw-reader.mjs';
import { resolveReferenceTable } from './trace-unit.mjs';
import { sha256File } from './hash.mjs';

// A bounded research probe, not a DB crawler. Every selected row keeps its
// processed schema, source and key. Joins between selected rows require refs.
export async function inspectTables(reader, schema, queries, maxRows = 200) {
  if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 1000) throw new Error('Inspection row limit must be an integer between 1 and 1000.');
  if (!Array.isArray(queries) || !queries.length) throw new Error('Inspection requires a nonempty explicit query list.');
  const rows = [], schemas = new Map(), coverage = [];
  for (const query of queries) {
    if (!schema.definitions[query.table] || !query.where?.length) throw new Error('Inspection requires an existing schema table and explicit named-field filters.');
    let matches = 0;
    const tables = await reader.tables(query.table);
    for (const table of tables) {
      for (const condition of query.where) {
        if (!table.fields.some((field) => field.name === condition.field)) throw new Error(`Missing inspected field: ${query.table}.${condition.field}`);
        if (!['eq', 'oneOf', 'contains'].includes(condition.op)) throw new Error(`Unsupported inspection predicate: ${condition.op}`);
        if (condition.op === 'oneOf' && !Array.isArray(condition.value)) throw new Error('oneOf requires an explicit value array.');
      }
      schemas.set(`${table.table}:${table.tableVersion}`, { table: table.table, version: table.tableVersion, fields: table.fields, localisedFields: schema.definitions[query.table].find((definition) => definition.version === table.tableVersion)?.localised_fields ?? [] });
      const selected = table.rows.filter((row) => query.where.every(({ field, op, value }) => op === 'eq' ? row[field] === value : op === 'oneOf' ? value.includes(row[field]) : typeof row[field] === 'string' && row[field].toLowerCase().includes(String(value).toLowerCase())));
      for (const row of selected) {
        matches++;
        const key = Object.fromEntries(table.fields.filter((field) => field.is_key).map((field) => [field.name, row[field.name]]));
        const id = `${table.table}:${createHash('sha256').update(JSON.stringify([table.sourcePack, table.path, key, row])).digest('hex').slice(0, 20)}`;
        if (!rows.some((record) => record.id === id)) rows.push({ id, table: table.table, key, sourcePack: table.sourcePack, sourcePackPath: table.sourcePackPath, path: table.path, tableVersion: table.tableVersion, row });
        if (rows.length > maxRows) throw new Error(`Inspection exceeded ${maxRows} rows. Narrow filters; no partial/full DB dump saved.`);
      }
    }
    coverage.push({ query, matchedRows: matches, tableFiles: tables.length });
  }
  const relationships = [];
  for (const from of rows) for (const field of schemas.get(`${from.table}:${from.tableVersion}`).fields.filter((field) => field.is_reference)) {
    const targetTable = resolveReferenceTable(field.is_reference[0], schema);
    for (const to of rows.filter((record) => record.table === targetTable && Object.hasOwn(record.row, field.is_reference[1]) && record.row[field.is_reference[1]] === from.row[field.name])) relationships.push({ from: from.id, field: field.name, to: to.id, targetField: field.is_reference[1], value: from.row[field.name], evidence: 'RPFM processed schema is_reference' });
  }
  // Same single-key Loc convention verified by the unit tracer. Composite
  // localisation keys are deliberately not guessed by this small probe.
  for (const from of rows.filter((record) => record.table !== 'Loc' && Object.keys(record.key).length === 1)) {
    const definition = schemas.get(`${from.table}:${from.tableVersion}`);
    for (const field of definition.localisedFields) {
      const key = `${from.table.replace(/_tables$/, '')}_${field.name}_${Object.values(from.key)[0]}`;
      for (const to of rows.filter((record) => record.table === 'Loc' && record.row.key === key)) relationships.push({ from: from.id, field: field.name, to: to.id, targetField: 'key', value: key, evidence: 'RPFM schema localised_fields + verified single-key Loc convention' });
    }
  }
  return { schemas: [...schemas.values()], rows, relationships, coverage };
}

export async function inspectSource(options, { queries, schemaFilter, maxRows = 200 }) {
  const client = new RpfmClient(options.rpfmUrl);
  try {
    await client.connect(); await client.call('set_game_selected', { game_name: 'warhammer_3', rebuild_dependencies: false });
    const { Schema: schema } = await client.call('get_schema');
    if (!schema?.definitions) throw new Error('WH3 schema unavailable.');
    const schemaSha256 = createHash('sha256').update(JSON.stringify(schema)).digest('hex');
    const reader = new RawPackReader(client);
    const db = await reader.open(path.join(options.gamePath, 'data', 'db.pack'));
    if (schemaFilter) {
      const pattern = new RegExp(schemaFilter, 'i');
      const inventory = new Set(db.files.filter((file) => file.file_type === 'DB').map((file) => file.path.split('/')[1]));
      // Schema/inventory metadata only, no table row decoded by this command.
      return Object.entries(schema.definitions).filter(([name]) => pattern.test(name)).map(([table, definitions]) => ({ table, presentInPack: inventory.has(table), definitions: definitions.map(({ version, fields, localised_fields }) => ({ version, fields: fields.map(({ name, is_reference, description }) => ({ name, is_reference, description })), localised_fields })) }));
    }
    const local = await reader.open(path.join(options.gamePath, 'data', 'local_en.pack'));
    // Loc inspection uses an explicit observed path, never all localisation.
    const originalTables = reader.tables.bind(reader);
    reader.tables = async (name) => name.startsWith('Loc:') ? [await reader.decode(local, name.slice(4))] : originalTables(name);
    // Loc tables have no schema.definitions entry in RPFM. Supply only the
    // actual decoded definition fields for the explicitly selected file.
    for (const query of queries.filter((query) => query.table.startsWith('Loc:'))) {
      const decoded = (await reader.tables(query.table))[0];
      schema.definitions[query.table] = [{ version: decoded.tableVersion, fields: decoded.fields }];
    }
    const result = await inspectTables(reader, schema, queries, maxRows);
    const { gameVersion } = await import('./extract.mjs');
    let rpfmVersion = 'unknown';
    try {
      const response = await fetch(new URL('/version', options.rpfmUrl), { signal: AbortSignal.timeout(5000) });
      if (response.ok) rpfmVersion = (await response.json()).version ?? 'unknown';
    } catch { /* Never confuse the MCP library version with RPFM. */ }
    return { format: 'warhammer-vault-wh3-inspection-v1', sourceKind: 'ca-pack', extractedAt: new Date().toISOString(), provenance: { ...await gameVersion(options.gamePath), rpfmVersion, schemaFormatVersion: schema.version, schemaSha256, accessMethod: 'Direct RPFM PackFile; bounded explicit queries, no effect application', packs: await Promise.all(reader.packs.map(async ({ info }) => ({ ...info, sha256: await sha256File(info.file_path) }))) }, ...result };
  } finally { await client.close().catch(() => undefined); }
}

export async function inspectionCli(argv) {
  const { resolveOptions } = await import('./extract.mjs');
  const flags = {}, remaining = [];
  for (let index = 0; index < argv.length; index++) {
    if (['--schema-filter', '--queries', '--output', '--max-rows'].includes(argv[index])) {
      const flag = argv[index], value = argv[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
      flags[flag] = value;
    }
    else remaining.push(argv[index]);
  }
  if (!flags['--schema-filter'] && !flags['--queries']) throw new Error('Supply --schema-filter REGEX or --queries JSON_FILE.');
  if (flags['--schema-filter'] && flags['--queries']) throw new Error('Choose schema metadata or bounded row queries, not both.');
  const queries = flags['--queries'] ? JSON.parse(await readFile(flags['--queries'], 'utf8')) : undefined;
  const result = await inspectSource(await resolveOptions(remaining), { schemaFilter: flags['--schema-filter'], queries, maxRows: flags['--max-rows'] ? Number(flags['--max-rows']) : 200 });
  if (flags['--output']) { const output = path.resolve(flags['--output']); await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(result, null, 2) + '\n'); console.log(`Inspection evidence: ${output}`); }
  else console.log(JSON.stringify(result, null, 2));
}
