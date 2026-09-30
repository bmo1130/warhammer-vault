const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFile, writeFile, unlink } = require('node:fs/promises');
const { createHash, randomUUID } = require('node:crypto');
const path = require('node:path');
const modules = Promise.all([
  import('../tools/wh3-importer/trace-unit.mjs'),
  import('../tools/wh3-importer/profiles.mjs'),
  import('../tools/wh3-importer/fixtures/profiles.mjs'),
  import('../tools/wh3-importer/report.mjs'),
  import('../tools/wh3-importer/hypotheses.mjs'),
  import('../tools/wh3-importer/inspect.mjs'),
]);
async function trace(name = 'helstorm', fixture) {
  const [{ traceUnit }, { getProfile }, { threeProfileFixture }] = await modules;
  fixture ??= threeProfileFixture();
  return traceUnit(fixture.reader, fixture.schema, fixture.localisation, {}, getProfile(name), [fixture.abilityLocalisation]);
}

test('observation modules preserve all three pre-refactor synthetic observations and complete summary digests', async () => {
  const [, , , { observations, addObservationUnresolved, renderSummary }] = await modules;
  const baseline = JSON.parse(await readFile(path.join(__dirname, 'fixtures/observations-regression.json')));
  assert.equal(baseline.sourceKind, 'synthetic-fixture');
  for (const [name, expected] of Object.entries(baseline.profiles)) {
    const dump = await trace(name);
    dump.unit.extractedAt = '2000-01-01T00:00:00.000Z';
    const entries = observations(dump);
    addObservationUnresolved(dump, entries);
    assert.equal(createHash('sha256').update(JSON.stringify(entries)).digest('hex'), expected.observationsSha256);
    const file = name === 'grail-knights' ? 'manual-reference.json' : `manual-references/${name}.json`;
    const manual = JSON.parse(await readFile(path.join(__dirname, '../tools/wh3-importer', file)));
    assert.equal(createHash('sha256').update(renderSummary(dump, entries, manual)).digest('hex'), expected.summarySha256);
  }
});

test('streamed SHA256 equals buffer hashing for empty, UTF8 and multi-chunk binary input', async () => {
  const { sha256File } = await import('../tools/wh3-importer/hash.mjs');
  const file = path.resolve(__dirname, `.hash-${randomUUID()}.tmp`);
  try {
    for (const input of [Buffer.alloc(0), Buffer.from('전쟁 서고\n'), Buffer.from(Array.from({ length: 200_001 }, (_, index) => index % 256))]) {
      await writeFile(file, input);
      assert.equal(await sha256File(file), createHash('sha256').update(input).digest('hex'));
    }
  } finally { await unlink(file).catch((error) => { if (error.code !== 'ENOENT') throw error; }); }
});

test('research arithmetic keeps missing HP, null, non-numeric and non-finite inputs unknown, including real zero', async () => {
  const [, , , , { evaluateHypothesis, hypothesisEvidence }] = await modules;
  for (const value of [null, undefined, '8', NaN, Infinity]) assert.equal(evaluateHypothesis('x + 1', { x: { value } }, ({ x }) => x + 1).value, null);
  assert.equal(evaluateHypothesis('x + 1', { x: { value: 0 } }, ({ x }) => x + 1).value, 1);
  const evidence = hypothesisEvidence(await trace());
  assert.equal(evidence.hp.bonusPerMan.value, null, 'fixture has no HP bonus/count; do not substitute manual HP');
  assert.equal(evidence.hp.mountedPair.value, null, 'absent mount is unknown, not zero');
  assert.equal(evidence.hp.bonusPerMan.status, 'UNRESOLVED');
});

test('speed hypotheses retain source field and raw speed without writing a displayed speed', async () => {
  const [, , , , { hypothesisEvidence }] = await modules;
  const dump = await trace('bloodthirster'), before = JSON.stringify(dump);
  const evidence = hypothesisEvidence(dump);
  assert.equal(evidence.speed.flight.value, 79);
  assert.equal(evidence.speed.flight.inputs.rawSpeed.value, 7.9);
  assert.equal(evidence.speed.flight.inputs.rawSpeed.source.field, 'fly_speed');
  assert.equal(evidence.speed.flight.status, 'UNRESOLVED', 'arithmetic is not independent display validation');
  assert.equal(JSON.stringify(dump), before);
  assert(!Object.hasOwn(dump.unit, 'displaySpeed'));
});

test('ammo hypothesis preserves volley/projectile counts, fractional evidence and zero-divisor unknown', async () => {
  const [, , { threeProfileFixture }, , { hypothesisEvidence }] = await modules;
  const fixture = threeProfileFixture();
  const result = hypothesisEvidence(await trace('helstorm', fixture));
  assert.equal(result.ammo.value, 11.4, '57 / 5 is not rounded to a plausible display');
  assert.equal(result.independentProjectileFields.projectile_number.value, 2);
  assert.equal(result.independentProjectileFields.shots_per_volley.value, 5);
  fixture.tables.find((table) => table.table === 'projectiles_tables').rows[0].shots_per_volley = 0;
  assert.equal(hypothesisEvidence(await trace('helstorm', fixture)).ammo.value, null);
});

test('manual rendering cannot mutate raw rows or hypothesis inputs/unknowns', async () => {
  const [, , , { observations, renderSummary }, { hypothesisEvidence }] = await modules;
  const dump = await trace(), before = JSON.stringify(hypothesisEvidence(dump));
  const manual = { values: { baseReloadTime: 9999, primaryAmmo: 9999 }, notDirectlyComparable: { totalHealth: 9999 } };
  renderSummary(dump, observations(dump), manual);
  assert.equal(JSON.stringify(hypothesisEvidence(dump)), before);
  assert.equal(hypothesisEvidence(dump).hp.bonusOnce.value, null);
});

test('paid selection remains profile-specific; unique zero-cost roots are valid and research registry stays separate', async () => {
  const [, { unitProfiles }, { threeProfileFixture }] = await modules;
  const { researchProfiles } = await import('../tools/wh3-importer/research-profiles.mjs');
  const fixture = threeProfileFixture();
  fixture.tables.find((table) => table.table === 'main_units_tables').rows.find((row) => row.unit === 'synthetic_root_a').recruitment_cost = 0;
  assert.equal((await trace('grail-knights', fixture)).discovery.policy, 'unique');
  assert.deepEqual(Object.keys(unitProfiles), ['grail-knights', 'helstorm', 'bloodthirster']);
  assert(!JSON.stringify(researchProfiles).includes('wh_main_'));
  assert(Object.values(researchProfiles).every((profile) => profile.research));
});

test('bounded inspection preserves raw source/schema joins and no-match coverage', async () => {
  const [, , { threeProfileFixture }, , , { inspectTables }] = await modules;
  const f = threeProfileFixture();
  const queries = [
    { table: 'battlefield_engines_tables', where: [{ field: 'key', op: 'eq', value: 'synthetic_shared_engine' }] },
    { table: 'battle_entities_tables', where: [{ field: 'key', op: 'oneOf', value: ['synthetic_engine_entity'] }] },
    { table: 'battle_entities_tables', where: [{ field: 'key', op: 'eq', value: 'absent' }] },
  ];
  const evidence = await inspectTables(f.reader, f.schema, queries);
  assert.equal(evidence.rows.length, 2);
  assert.equal(evidence.coverage[2].matchedRows, 0);
  assert.equal(evidence.relationships[0].field, 'battle_entity');
  assert(evidence.relationships[0].evidence.includes('is_reference'));
  assert(evidence.rows.every((row) => row.sourcePack && row.path && row.tableVersion === 99));
  assert(evidence.schemas.every((schema) => schema.fields.length));
});

test('inspection rejects missing filters, unsupported fields/operators and unsafe row limits', async () => {
  const [, , { threeProfileFixture }, , , { inspectTables }] = await modules;
  const f = threeProfileFixture();
  const q = [{ table: 'battle_entities_tables', where: [{ field: 'key', op: 'contains', value: 'synthetic' }] }];
  for (const limit of [NaN, Infinity, 0, 1.5, 1001]) await assert.rejects(inspectTables(f.reader, f.schema, q, limit), /row limit/);
  await assert.rejects(inspectTables(f.reader, f.schema, q, 1), /exceeded/);
  await assert.rejects(inspectTables(f.reader, f.schema, [{ table: 'battle_entities_tables', where: [] }]), /explicit named-field/);
  await assert.rejects(inspectTables(f.reader, f.schema, [{ table: 'battle_entities_tables', where: [{ field: 'guessed', op: 'eq', value: 1 }] }]), /Missing inspected field/);
  await assert.rejects(inspectTables(f.reader, f.schema, [{ table: 'battle_entities_tables', where: [{ field: 'key', op: 'all' }] }]), /Unsupported/);
});

test('curated findings use explicit confidence/status, stay research-only and never authorize uncertain formulas', async () => {
  const findings = JSON.parse(await readFile(path.join(__dirname, '../tools/wh3-importer/semantics-findings.json')));
  assert.equal(findings.productionUse, false);
  for (const topic of Object.values(findings.topics)) {
    assert(['CONFIRMED', 'STRONGLY SUPPORTED', 'UNRESOLVED'].includes(topic.status));
    assert(['YES', 'PARTIAL', 'NO'].includes(topic.safeToNormalize));
    assert(topic.confidence && topic.evidence.length);
    if (topic.status === 'UNRESOLVED') assert.notEqual(topic.safeToNormalize, 'YES');
  }
  assert.equal(findings.topics.totalHealth.status, 'UNRESOLVED');
  assert.equal(findings.topics.reloadTime.status, 'UNRESOLVED');
});
