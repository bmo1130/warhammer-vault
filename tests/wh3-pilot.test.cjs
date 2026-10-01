const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateUnits } = require('../.test-build/src/domain/unitValidation.js');
const modules = Promise.all([
  import('../tools/wh3-importer/pilot-catalog.mjs'),
  import('../tools/wh3-importer/pilot-analysis.mjs'),
  import('../tools/wh3-importer/pilot.mjs'),
  import('../tools/wh3-importer/pilot-discovery.mjs'),
  import('../tools/wh3-importer/fixtures/normalization.mjs'),
  import('../tools/wh3-importer/normalization/normalizer.mjs'),
  import('../tools/wh3-importer/fixtures/tables.mjs'),
]);
const sample = { slug: 'synthetic', displayName: 'Grail Knights', reason: 'synthetic coverage', expectedCoverage: ['mount'] };
async function normalized(name = 'grail-knights') {
  const [, , , , { syntheticNormalizationInput }, { normalizeUnit }] = await modules;
  const { dump, context } = await syntheticNormalizationInput(name);
  return { sample, dump, normalized: normalizeUnit(dump, context), exceptions: [], status: 'CLEAN' };
}
async function sourceFixture() {
  const [, , , , { normalizationFixture }, , { table, field }] = await modules;
  const data = normalizationFixture();
  const permissions = table('units_to_groupings_military_permissions_tables', [field('unit', true, ['main_units', 'unit']), field('military_group', true)], [{ unit: 'synthetic_root_a', military_group: 'synthetic_group' }]);
  data.tables.push(permissions);
  data.schema.definitions[permissions.table] = [{ version: 99, fields: permissions.fields }];
  return { ...data, metadata: { sourceKind: 'fixture' }, supplementalLocalisations: [data.abilityLocalisation] };
}

test('pilot catalog rejects duplicates, unsafe slugs, key injection and >30 samples', async () => {
  const [{ validateCatalog, representativeCatalog }] = await modules;
  assert.equal(representativeCatalog.length, 24);
  validateCatalog(representativeCatalog);
  for (const input of [[sample, sample], [{ ...sample, caKey: 'injected' }], [{ ...sample, expectedKey: 'injected' }], [{ ...sample, rootSelection: 'paid-recruitment' }], [{ ...sample, slug: '../outside' }], Array.from({ length: 31 }, (_, i) => ({ ...sample, slug: `sample-${i}`, displayName: `Name ${i}` }))]) assert.throws(() => validateCatalog(input));
});
test('pilot discovers actual fixture roots through localisation, never catalog expected keys', async () => {
  const [, , , { discoverSample }] = await modules;
  const source = await sourceFixture();
  const result = await discoverSample(source, { ...sample, expectedKey: 'decoy' });
  assert.equal(result.candidates[0].mainKey, 'synthetic_root_a');
  const none = await discoverSample(source, { ...sample, displayName: 'Unmatched', caKey: 'synthetic_root_a' });
  assert.deepEqual(none.candidates, []);
});
test('generic scopes require named processed references and scoped ability membership', async () => {
  const [, , , { discoverSample, discoverScope }] = await modules;
  const source = await sourceFixture();
  const d = await discoverSample(source, sample);
  assert(discoverScope(d, source.schema).scopes.includes('abilityPhases'));
  d.candidates[0].land.engine = 'unverified';
  d.evidence.schemas.find(s => s.table === 'land_units_tables').fields.find(f => f.name === 'engine').is_reference = null;
  assert(!discoverScope(d, source.schema).scopes.includes('missile'));
});
test('ambiguous pilot roots remain BLOCKED even if only one is paid', async () => {
  const [, , { attemptSample }] = await modules;
  const source = await sourceFixture();
  const result = await attemptSample(source, { ...sample, displayName: 'Helstorm Rocket Battery' }, validateUnits, { synthetic_group: 'fixture' });
  assert.equal(result.status, 'BLOCKED');
  assert(result.exceptions.some(e => e.category === 'IDENTITY_AMBIGUITY'));
  assert.equal(result.normalized, null);
  assert.equal(result.discovery.candidates.length, 2);
  assert(result.discovery.candidates.every(c => c.main && c.land));
});
test('exception taxonomy validates categories/severity and carries evidence', async () => {
  const [, { exception, categories }] = await modules;
  for (const category of categories) assert.equal(exception(sample, category, 'OMISSION', 'field', 'reason', [{ raw: 0 }]).evidence[0].raw, 0);
  assert.throws(() => exception(sample, 'OTHER', 'OMISSION', '', ''));
  assert.throws(() => exception(sample, 'UNKNOWN_ABILITY', 'silent', '', ''));
});
test('CLEAN/PARTIAL/BLOCKED distinguishes semantics gates from unexpected omissions', async () => {
  const [, { classify, exception }] = await modules;
  const semantic = exception(sample, 'SEMANTICS_BLOCKED', 'OMISSION', 'movement.speed', 'unverified');
  const unknown = exception(sample, 'UNKNOWN_ABILITY', 'OMISSION', 'ability', 'unmapped');
  assert.equal(classify([semantic], {}), 'CLEAN');
  assert.equal(classify([semantic, unknown], {}), 'PARTIAL');
  assert.equal(classify([], null), 'BLOCKED');
  assert.equal(classify([], {}, [{ field: 'id' }]), 'BLOCKED');
  assert.equal(classify([{ ...unknown, severity: 'BLOCKING' }], {}), 'BLOCKED');
});
for (const kind of ['ability', 'attribute']) test(`unknown ${kind} aggregation counts distinct samples and preserves evidence`, async () => {
  const [, { aggregateIds }] = await modules;
  const item = { kind, caId: 'synthetic_unknown', mappingExists: false, sourceRow: 'row' };
  const results = [{ sample: { slug: 'a' }, ids: [item, item] }, { sample: { slug: 'b' }, ids: [item] }];
  const [r] = aggregateIds(results);
  assert.equal(r.frequency, 2);
  assert.equal(r.evidence.length, 2);
  assert.deepEqual(r.units, ['a', 'b']);
});
test('coverage separates mapped, semantics omission, bounded not-applicable and blocked', async () => {
  const [, { coverageFor, aggregateCoverage }] = await modules;
  const result = await normalized();
  result.coverage = coverageFor(result);
  assert.equal(result.coverage['melee.meleeAttack'].status, 'MAPPED');
  assert.equal(result.coverage['entities.totalHealth'].semanticsBlocked, true);
  assert.equal(result.coverage['missile.range'].status, 'NOT_APPLICABLE');
  const failed = { ...result, normalized: null, status: 'BLOCKED' };
  failed.coverage = coverageFor(failed);
  const c = aggregateCoverage([result, failed]);
  for (const count of Object.values(c.byField)) assert.equal(count.MAPPED + count.OMITTED + count.UNMAPPED + count.NOT_APPLICABLE + count.FAILED, 2);
  assert.equal(c.byField['entities.totalHealth'].semanticsBlocked, 1);
  assert.equal(c.byField['entities.totalHealth'].FAILED, 1);
});
test('positive ammo without a primary chain is unknown, never not-applicable', async () => {
  const [, { coverageFor, analyzeNormalized }] = await modules;
  const result = await normalized();
  result.dump.rows.find(r => r.table === 'land_units_tables').row.secondary_ammo = 18;
  assert.equal(coverageFor(result)['missile.range'].status, 'OMITTED');
  assert(analyzeNormalized(sample, result.dump, result.normalized, { rows: [] }).some(e => e.category === 'UNKNOWN_MISSILE_CHAIN'));
});
test('multiple weapon evidence marks missile coverage incomplete despite primary values', async () => {
  const [, { coverageFor }] = await modules;
  const result = await normalized('helstorm');
  result.exceptions = [{ category: 'MULTIPLE_MISSILE_WEAPONS' }];
  assert.equal(coverageFor(result)['missile.range'].status, 'UNMAPPED');
  assert.equal(coverageFor(result)['missile.range'].primaryValueMapped, true);
});
test('provenance distinguishes direct values, generated identity and curated aliases', async () => {
  const result = (await normalized()).normalized;
  const kind = field => result.provenance.fields.find(e => e.field === field)?.kind;
  assert.equal(kind('melee.meleeAttack'), 'DIRECT');
  assert.equal(kind('id'), 'GENERATED');
  assert.equal(kind('factionId'), 'CURATED');
  assert.equal(kind('abilities.0'), 'CURATED');
  assert(result.provenance.fields.every(e => e.source.rowId && e.source.field));
});
test('one failed sample does not erase batch results; partial is not clean', async () => {
  const [, { coverageFor }, { runSequential }] = await modules;
  const saved = [], catalog = ['a', 'b', 'c'].map(slug => ({ ...sample, slug, displayName: slug }));
  const results = await runSequential(catalog, async s => {
    if (s.slug === 'b') throw new Error('decode failed');
    const result = { ...await normalized(), sample: s, status: 'PARTIAL' };
    result.coverage = coverageFor(result); return result;
  }, async r => saved.push(r.status));
  assert.deepEqual(saved, ['PARTIAL', 'BLOCKED', 'PARTIAL']);
  assert.equal(results.length, 3);
  assert.equal(results[1].exceptions[0].reason, 'decode failed');
});
test('validation rejection retains evidence separately and exports no successful normalized Unit', async () => {
  const [, , { attemptSample }] = await modules;
  const result = await attemptSample(await sourceFixture(), sample, () => [{ field: 'id', message: 'synthetic rejection' }], { synthetic_group: 'fixture' });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.normalized, null);
  assert(result.rejectedNormalization);
  assert(result.exceptions.some(e => e.category === 'VALIDATION_FAILURE'));
});

test('missing entity evidence cannot be labeled clean because no second role was traced', async () => {
  const [, { analyzeNormalized, classify }] = await modules;
  const result = await normalized('bloodthirster');
  delete result.normalized.unit.entities.mass;
  const issues = analyzeNormalized(sample, result.dump, result.normalized, { rows: [] });
  assert(issues.some(e => e.category === 'UNKNOWN_ENTITY_ROLE'));
  assert.equal(classify(issues, result.normalized), 'PARTIAL');
});

test('multiple recognized permission aliases never select the first catalog group', async () => {
  const [, , { attemptSample }] = await modules;
  const source = await sourceFixture();
  source.tables.find(t => t.table === 'units_to_groupings_military_permissions_tables').rows.push({ unit: 'synthetic_root_a', military_group: 'another_group' });
  const result = await attemptSample(source, sample, validateUnits, { synthetic_group: 'one', another_group: 'two' });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.normalized, null);
  assert(result.exceptions.some(e => e.category === 'NO_PRIMARY_CATALOG_MAPPING'));
});
