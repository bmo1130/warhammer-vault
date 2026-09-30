const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, mkdir, writeFile, rm } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const modules = Promise.all([
  import('../tools/wh3-importer/raw-reader.mjs'),
  import('../tools/wh3-importer/trace-unit.mjs'),
  import('../tools/wh3-importer/fixtures/tables.mjs'),
  import('../tools/wh3-importer/report.mjs'),
  import('../tools/wh3-importer/extract.mjs'),
  import('../tools/wh3-importer/mcp-client.mjs'),
]);

test('RPFM typed cells are paired with processed field names, including reordered columns and zero', async () => {
  const [{ namedRows }] = await modules;
  assert.deepEqual(namedRows([{ name: 'ap_damage' }, { name: 'key' }, { name: 'damage' }], [[{ I32: 0 }, { StringU8: 'synthetic' }, { I32: 11 }]]), [{ ap_damage: 0, key: 'synthetic', damage: 11 }]);
  assert.throws(() => namedRows([{ name: 'key' }], [[]]), /row width/);
  assert.throws(() => namedRows([{ name: 'key' }, { name: 'key' }], []), /duplicate/);
  assert.throws(() => namedRows([{ name: 'key' }], [[{}]]), /typed cell/);
});

test('fixture localisation discovers a synthetic root and follows schema references with provenance', async () => {
  const [, { traceUnit }, { fixtureDataset }] = await modules;
  const fixture = fixtureDataset();
  const dump = await traceUnit(fixture.reader, fixture.schema, fixture.localisation);
  assert.equal(dump.sourceKind, 'fixture');
  assert.equal(dump.unit.caKey, 'synthetic_root_a');
  assert.equal(dump.unit.gameVersion, 'unknown');
  assert(dump.provenance.extractionSource.includes('no CA pack'));
  const weapon = dump.rows.find((record) => record.table === 'melee_weapons_tables');
  assert.deepEqual(weapon.row, { key: 'synthetic_weapon_a', damage: 11, ap_damage: 7 });
  assert.equal(weapon.sourcePack, 'synthetic-fixture.pack');
  assert.equal(weapon.tableVersion, 99);
  assert.deepEqual(weapon.key, { key: 'synthetic_weapon_a' });
  assert(dump.relationships.some((edge) => edge.to === weapon.id && edge.field === 'primary_melee_weapon' && edge.value === 'synthetic_weapon_a'));
  assert(dump.relationships.some((edge) => edge.direction === 'reverse' && edge.field === 'attribute_group'));
  assert(dump.relationships.some((edge) => edge.direction === 'localisation'));
  assert.deepEqual(dump.unresolved, []);
});

test('reverse building lookup does not pull other units recruited at the same building', async () => {
  const [, { traceUnit }, { fixtureDataset }] = await modules;
  const fixture = fixtureDataset();
  const dump = await traceUnit(fixture.reader, fixture.schema, fixture.localisation);
  assert(!dump.rows.some((record) => Object.values(record.row).some((value) => String(value).includes('synthetic_other'))));
  assert(!dump.rows.some((record) => record.key.key === 'synthetic_unrelated_link'));
  const link = dump.rows.find((record) => record.table === 'building_units_allowed_tables');
  assert.equal(link.row.enabled, false, 'preserve raw eligibility flags without deriving effective recruitment');
});

test('missing foreign rows become unresolved, never fabricated', async () => {
  const [, { traceUnit }, { fixtureDataset }] = await modules;
  const fixture = fixtureDataset();
  fixture.tables.find((table) => table.table === 'melee_weapons_tables').rows = [];
  const dump = await traceUnit(fixture.reader, fixture.schema, fixture.localisation);
  assert(dump.unresolved.some((issue) => issue.field.endsWith('.primary_melee_weapon')));
  assert(!dump.rows.some((record) => record.table === 'melee_weapons_tables'));
});

test('unavailable root tables and ambiguous roots fail with actionable errors', async () => {
  const [, { traceUnit }, { fixtureDataset }] = await modules;
  const fixture = fixtureDataset();
  await assert.rejects(traceUnit({ tables: async () => [] }, fixture.schema, fixture.localisation), /CA DB root tables are not exposed/);
  fixture.tables[0].rows.push({ unit: 'synthetic_duplicate', land_unit: 'synthetic_land_a' });
  await assert.rejects(traceUnit(fixture.reader, fixture.schema, fixture.localisation), /found 2/);
});

test('joins require verified schema references, not matching strings or guessed table keys', async () => {
  const [, { traceUnit }, { fixtureDataset }] = await modules;
  const fixture = fixtureDataset();
  fixture.tables[1].fields.find((field) => field.name === 'primary_melee_weapon').is_reference = null;
  const dump = await traceUnit(fixture.reader, fixture.schema, fixture.localisation);
  assert(!dump.rows.some((record) => record.table === 'melee_weapons_tables'));
  fixture.tables[0].fields.find((field) => field.name === 'land_unit').is_reference = null;
  await assert.rejects(traceUnit(fixture.reader, fixture.schema, fixture.localisation), /found 0/);
});

test('summary separates raw observations, unknown derived values and manual comparisons', async () => {
  const [, { traceUnit }, { fixtureDataset }, { observations, addObservationUnresolved, renderSummary }] = await modules;
  const fixture = fixtureDataset();
  const dump = await traceUnit(fixture.reader, fixture.schema, fixture.localisation);
  const entries = observations(dump);
  assert.equal(entries.find((entry) => entry.label === 'baseDamage').value, 11);
  assert.equal(entries.find((entry) => entry.label === 'entityCount').status, 'unresolved');
  addObservationUnresolved(dump, entries);
  assert(dump.unresolved.some((issue) => issue.field === 'totalHealth'));
  const before = JSON.stringify(dump);
  const summary = renderSummary(dump, entries, { values: { baseDamage: 987, entityCount: 456 }, notDirectlyComparable: { totalHealth: 999 } });
  assert.equal(JSON.stringify(dump), before, 'manual reference never changes raw values');
  assert(summary.includes('raw value differs'));
  assert(summary.includes('Manual reference values'));
  assert(summary.includes('**fixture**'));
  assert(!Object.hasOwn(dump.rows.find((row) => row.table === 'melee_weapons_tables').row, 'totalDamage'));
});

test('CLI game path is configured and validated without requiring a real installation in unit tests', async () => {
  const [, , , , { resolveOptions }] = await modules;
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'wv-wh3-importer-'));
  try {
    const config = path.join(temporary, 'config.json');
    await writeFile(config, '{}');
    await assert.rejects(resolveOptions(['--config', config], {}), /game path missing/);
    await assert.rejects(resolveOptions(['--config', config, '--game-path', temporary], {}), /CA packs not found/);
    await assert.rejects(resolveOptions(['--unsupported', 'x'], {}), /Unknown argument/);
    await assert.rejects(resolveOptions(['--game-path'], {}), /Missing value/);
    await mkdir(path.join(temporary, 'data'));
    for (const file of ['db.pack', 'local_en.pack']) await writeFile(path.join(temporary, 'data', file), 'synthetic path-validation file, never opened as a pack');
    const options = await resolveOptions(['--config', config], { WH3_GAME_PATH: temporary });
    assert.equal(options.gamePath, temporary);
    assert.equal(options.rpfmUrl, 'http://127.0.0.1:45127/mcp');
  } finally {
    assert.equal(path.dirname(path.resolve(temporary)), path.resolve(os.tmpdir()));
    assert(path.basename(temporary).startsWith('wv-wh3-importer-'));
    await rm(temporary, { recursive: true, force: true });
  }
});

test('MCP adapter refuses undiscovered tools and nonlocal endpoints', async () => {
  const [, , , , , { RpfmClient }] = await modules;
  assert.throws(() => new RpfmClient('https://example.com/mcp'), /loopback/);
  await assert.rejects(new RpfmClient().call('invented_api'), /does not expose/);
});

test('Pack reader refuses Mod or Movie sources instead of mixing mod data', async () => {
  const [{ RawPackReader }] = await modules;
  for (const type of ['Mod', 'Movie']) {
    const reader = new RawPackReader({ call: async () => ({ StringContainerInfo: ['fixture', { pfh_file_type: type }] }) });
    await assert.rejects(reader.open('synthetic.pack'), /CA Release\/Patch pack/);
  }
});
