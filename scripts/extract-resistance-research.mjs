// Only missing spell-resistance comparisons/UI/phase metadata, not a full extraction.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {openRawSource, resolveOptions} from '../tools/wh3-importer/extract.mjs';
import {sha256} from '../tools/wh3-importer/research-classifier/classify.mjs';
import {verifySource} from '../tools/wh3-importer/skill-production-bretonnia/source.mjs';
import {comparisonEffectKeys, bonusKey, statKey, usageTables, serialize} from '../tools/wh3-importer/resistance-research/policy.mjs';

const priorDir = 'tools/wh3-importer/skill-production-bretonnia/';
const manifest = JSON.parse(fs.readFileSync(priorDir + 'manifest.json'));
const prior = verifySource(fs.readFileSync(priorDir + 'source.json'), manifest);
const s = await openRawSource(await resolveOptions());
try {
  assert.equal(s.metadata.gameVersion, prior.provenance.gameVersion);
  assert.equal(s.metadata.schemaSha256, prior.provenance.schemaSha256);
  for (const pack of prior.provenance.packs) assert(s.metadata.packs.some(p => p.file_name === pack.file_name && p.sha256 === pack.sha256));
  const rows = new Map(), schemas = new Map(), coverage = [];
  async function query(table, where, selection) {
    const tables = await s.reader.tables(table), matches = [];
    for (const t of tables) {
      for (const f of Object.keys(where)) assert(t.fields.some(x => x.name === f), `Missing field ${table}.${f}`);
      const definition = table === 'Loc' ? null : s.schema.definitions[table].find(d => d.version === t.tableVersion);
      schemas.set(`${table}:${t.tableVersion}`, {table, version: t.tableVersion, fields: t.fields.map(({name, field_type, is_key, is_reference, description}) => ({name, field_type, is_key, is_reference, description})), localisedFields: definition?.localised_fields ?? []});
      for (const row of t.rows.filter(r => Object.entries(where).every(([f, values]) => values.includes(r[f])))) {
        const key = Object.fromEntries(t.fields.filter(f => f.is_key).map(f => [f.name, row[f.name]]));
        const id = `${table}:${sha256(JSON.stringify([t.sourcePack, t.path, key, row])).slice(0, 20)}`;
        matches.push({id, table, key, sourcePack: t.sourcePack, sourcePackPath: t.sourcePackPath, path: t.path, tableVersion: t.tableVersion, row});
      }
    }
    const selected = selection ? selection(matches) : matches;
    for (const record of selected) rows.set(record.id, record);
    coverage.push({table, where, tableFiles: tables.length, matchedRows: matches.length, retainedRows: selected.length, selection: selection ? 'One exact row per distinct how, chosen by sorted row ID; counterexamples only' : 'All exact matches'});
    assert(rows.size <= 600, 'Resistance research row bound exceeded');
  }
  await query('effect_bonus_value_ids_unit_sets_tables', {bonus_value_id: [bonusKey], effect: comparisonEffectKeys});
  await query('effects_tables', {effect: comparisonEffectKeys});
  for (const [table, field] of Object.entries(usageTables)) await query(table, {[field]: comparisonEffectKeys});
  await query('campaign_bonus_value_ids_unit_sets_tables', {key: [bonusKey]});
  await query('ui_unit_stats_tables', {key: [statKey]});
  await query('unit_stat_localisations_tables', {stat_key: [statKey]});
  await query('modifiable_unit_stats_tables', {stat_key: [statKey]});
  await query('special_ability_phase_stat_effects_tables', {stat: [statKey]}, matches => {
    const byHow = new Map();
    for (const r of matches.sort((a, b) => a.id.localeCompare(b.id))) if (!byHow.has(r.row.how)) byHow.set(r.row.how, r);
    return [...byHow.values()];
  });
  const originalTables = s.reader.tables.bind(s.reader);
  for (const [path, keys] of [
    ['text/db/effects__.loc', comparisonEffectKeys.map(k => 'effects_description_' + k)],
    ['text/db/unit_stat_localisations__.loc', ['unit_stat_localisations_onscreen_name_' + statKey, 'unit_stat_localisations_tooltip_' + statKey]],
  ]) {
    const decoded = await s.reader.decode(s.local, path);
    s.reader.tables = async name => name === 'Loc' ? [decoded] : originalTables(name);
    await query('Loc', {key: keys});
  }
  const result = {format: 'wh3-resistance-extraction-v1', extractedAt: new Date().toISOString(), provenance: s.metadata, sourceSha256: manifest.sourceSha256, comparisonEffectKeys, schemas: [...schemas.values()], rows: [...rows.values()].sort((a, b) => a.id.localeCompare(b.id)), coverage};
  fs.mkdirSync('generated/wh3/resistance-research', {recursive: true});
  fs.writeFileSync('generated/wh3/resistance-research/raw.json', serialize(result));
  console.log(JSON.stringify({rows: rows.size, schemas: schemas.size, coverage}));
} finally { await s.client.close(); }
