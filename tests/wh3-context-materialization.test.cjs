const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateUnits } = require('../.test-build/src/domain/unitValidation.js');
const modules = Promise.all([
  import('../tools/wh3-importer/catalog-identity/materialize.mjs'),
  import('../tools/wh3-importer/catalog-identity/policy.mjs'),
  import('../tools/wh3-importer/fixtures/normalization.mjs'),
  import('../tools/wh3-importer/fixtures/tables.mjs'),
  import('../tools/wh3-importer/pilot-discovery.mjs'),
  import('../tools/wh3-importer/blocker-review/evidence.mjs'),
  import('../tools/wh3-importer/normalization/normalizer.mjs'),
  import('../tools/wh3-importer/trace-unit.mjs'),
]);
async function fixture() {
  const [, { classifyCatalogCandidates }, { normalizationFixture, syntheticIdMappings }, { table, field: f }, { discoverSample }, { EvidenceProbe }] = await modules;
  const source = normalizationFixture();
  const main = source.tables.find(t => t.table === 'main_units_tables');
  const original = main.rows.find(r => r.unit === 'synthetic_root_a');
  const keys = ['synthetic_root_a', 'synthetic_second_roster', 'synthetic_spawn_root'];
  main.rows.push({ ...original, unit: keys[1], recruitment_cost: 0 }, { ...original, unit: keys[2], recruitment_cost: 13 });
  source.tables.push(
    table('units_to_groupings_military_permissions_tables', [f('unit', true, ['main_units', 'unit']), f('military_group', true)], keys.slice(0, 2).map((unit, i) => ({ unit, military_group: `fixture_group_${i}` }))),
    table('unit_missile_weapon_junctions_tables', [f('unit', true, ['main_units', 'unit']), f('missile_weapon', false, ['missile_weapons', 'key'])], []),
  );
  const abilities = source.tables.find(t => t.table === 'unit_special_abilities_tables');
  abilities.fields.push(f('spawned_unit', false, ['land_units', 'key']), f('spawn_is_decoy'));
  abilities.rows.push({ key: 'fixture_spawn', spawned_unit: 'synthetic_land_a', spawn_is_decoy: false });
  for (const t of source.tables) source.schema.definitions[t.table] = [{ version: t.tableVersion, fields: t.fields, localised_fields: ['land_units_tables', 'unit_abilities_tables'].includes(t.table) ? [f('onscreen_name')] : [] }];
  source.metadata = { sourceKind: 'fixture', gameVersion: 'fixture', schemaSha256: 'synthetic-schema', packs: [] };
  source.supplementalLocalisations = [source.abilityLocalisation];
  const discovery = await discoverSample(source, { displayName: 'Grail Knights' });
  const p = new EvidenceProbe(source);
  await p.select('main_units_tables', 'unit', keys); await p.forward('main_units_tables', 'land_unit', 'land_units_tables');
  await p.reverse('units_to_groupings_military_permissions_tables', 'unit', 'main_units_tables');
  await p.reverse('unit_special_abilities_tables', 'spawned_unit', 'land_units_tables');
  const decisions = keys.map((mainKey, i) => ({ mainKey, expectedLandKey: 'synthetic_land_a', expectedLocalisationKey: 'land_units_onscreen_name_synthetic_land_a',
    presentations: [{ contextId: i === 2 ? 'ability_spawn' : `faction_${i}_roster`, factionId: i === 1 ? 'tomb_kings' : 'vampire_counts', context: i === 2 ? 'ability_spawn' : 'faction_roster', classification: i === 2 ? 'SUMMONED_OR_SCRIPTED_VARIANT' : 'SEPARATE_FACTION_ENTRY', defaultVisible: i !== 2 }],
    checks: i === 2 ? [{ table: 'unit_special_abilities_tables', via: 'spawned_unit', target: 'land', equals: { key: 'fixture_spawn', spawn_is_decoy: false } }] : [{ table: 'units_to_groupings_military_permissions_tables', via: 'unit', target: 'main', equals: { military_group: `fixture_group_${i}` } }],
    rule: i === 2 ? 'EXPLICIT_CONTEXT_ONLY' : 'EXPLICIT_FACTION_ROSTER', rationale: 'Explicit synthetic fixture context' }));
  const review = structuredClone(classifyCatalogCandidates(discovery.candidates, p.artifact(), decisions));
  return { source, review, decisions, keys, options: { decisions, idMappings: syntheticIdMappings, productionFactionIds: ['vampire_counts'] } };
}
async function attempt(f, index = 0, request, validate = validateUnits) {
  return (await modules)[0].materializeCatalogRequest(f.source, f.review, request ?? { mainKey: f.keys[index], contextId: f.decisions[index].presentations[0].contextId }, validate, f.options);
}
test('materialization requires an exact source and context; name-only or forged READY cannot start tracing', async () => {
  const f = await fixture();
  let reads = 0; f.source.reader = { tables: async () => { reads++; throw new Error('Should not access source'); } };
  for (const request of [{ displayName: 'Grail Knights' }, { mainKey: f.keys[0] }, { contextId: 'faction_0_roster' }, { mainKey: f.keys[0], contextId: 'wrong' }]) {
    const r = await attempt(f, 0, request); assert.equal(r.status, 'BLOCKED_POLICY'); assert.equal(r.plan, null); assert.equal(r.unit, null);
  }
  assert.equal(reads, 0);
  f.review.policyResolution = 'POLICY_STILL_UNRESOLVED';
  assert.equal((await attempt(f)).status, 'BLOCKED_POLICY');
});
test('shared land and same names materialize separate cross-faction IDs and independent Unit objects', async () => {
  const f = await fixture(), a = await attempt(f), b = await attempt(f, 1);
  assert.equal(a.status, 'MATERIALIZED'); assert.equal(b.status, 'MATERIALIZED');
  assert.equal(a.unit.name, b.unit.name); assert.notEqual(a.unit.id, b.unit.id);
  const { pathFor } = require('../.test-build/src/domain/entities.js');
  assert.equal(decodeURIComponent(pathFor('unit', a.unit.id).split('/').at(-1)), a.unit.id);
  assert.equal(a.provenance.identity.caLandUnitKey, b.provenance.identity.caLandUnitKey);
  assert.notEqual(a.provenance.catalog.sourceMainKey, b.provenance.catalog.sourceMainKey);
  assert.notEqual(a.provenance.catalog.contextId, b.provenance.catalog.contextId);
  assert.notEqual(a.unit.factionId, b.unit.factionId);
  assert.equal(a.unit.campaign.recruitmentCost, 123); assert.equal(b.unit.campaign.recruitmentCost, 0);
  const old = a.unit.defense.armor; b.unit.defense.armor = 999;
  assert.equal(a.unit.defense.armor, old);
  assert.equal(a.productionEligible, false); assert.equal(b.productionEligible, false);
  assert.equal(b.validation.production.passed, false); assert.equal(b.validation.diagnostic.passed, true);
});
test('spawn context without a roster permission materializes diagnostically without overwriting primary', async () => {
  const f = await fixture(), a = await attempt(f), s = await attempt(f, 2);
  assert.equal(s.status, 'MATERIALIZED'); assert.notEqual(s.unit.id, a.unit.id);
  assert.equal(s.provenance.catalog.defaultVisible, false);
  assert.equal(s.provenance.catalog.classification, 'SUMMONED_OR_SCRIPTED_VARIANT');
  assert(s.productionReasons.includes('CONTEXT_ONLY_PRESENTATION'));
  assert.deepEqual(s.provenance.identity.candidateMilitaryGroups, []);
  assert.equal(s.productionEligible, false);
});
test('exact trace bypasses an ambiguous name but preserves schema and raw-source tracing', async () => {
  const f = await fixture(), { traceUnit, traceUnitByMainKey } = (await modules)[7];
  await assert.rejects(traceUnit(f.source.reader, f.source.schema, f.source.localisation, f.source.metadata, { displayName: 'Grail Knights', slug: 'ambiguous', rootSelection: 'unique', scopes: [] }), /found 3/);
  const source = f.review.candidates.find(c => c.source.mainKey === f.keys[1]).source;
  const dump = await traceUnitByMainKey(f.source.reader, f.source.schema, f.source.localisation, f.source.metadata, source);
  assert.equal(dump.unit.caKey, f.keys[1]); assert.equal(dump.discovery.policy, 'exact-main');
  assert.equal(dump.discovery.candidates.length, 1);
  assert(dump.relationships.some(e => e.field === 'land_unit' && e.evidence.includes('is_reference')));
});
test('land, localisation, duplicate main and processed-reference drift fail closed with retained request', async () => {
  for (const mutate of [
    f => { f.source.tables.find(t => t.table === 'main_units_tables').rows.find(r => r.unit === f.keys[0]).land_unit = 'wrong'; },
    f => { f.source.localisation.rows.find(r => r.key === 'land_units_onscreen_name_synthetic_land_a').key = 'wrong'; },
    f => { f.source.localisation.rows.find(r => r.key === 'land_units_onscreen_name_synthetic_land_a').text = 'Drifted'; },
    f => { const t = f.source.tables.find(t => t.table === 'main_units_tables'); t.rows.push({ ...t.rows.find(r => r.unit === f.keys[0]) }); },
    f => { f.source.tables.find(t => t.table === 'main_units_tables').fields.find(x => x.name === 'land_unit').is_reference = null; },
    f => { f.source.localisation.path = 'changed.loc'; },
  ]) {
    const f = await fixture(); mutate(f); const r = await attempt(f);
    assert.equal(r.status, 'BLOCKED_SOURCE_DRIFT', r.error.reason); assert.equal(r.unit, null); assert.equal(r.normalized, null); assert.equal(r.request.mainKey, f.keys[0]);
  }
});
test('source kind, game version, schema and pack mismatch fail before tracing', async () => {
  for (const mutate of [f => { f.source.metadata.gameVersion = 'drifted'; }, f => { f.source.metadata.schemaSha256 = 'changed'; }, f => { f.source.metadata.packs = [{ file_name: 'fixture', sha256: 'changed' }]; }, f => { f.source.metadata.sourceKind = 'ca-pack'; }]) {
    const f = await fixture(); mutate(f); const r = await attempt(f);
    assert.equal(r.status, 'BLOCKED_SOURCE_DRIFT'); assert.equal(r.traced, false); assert.equal(r.unit, null);
  }
});
test('missing current DB guard blocks a previously ready catalog plan', async () => {
  const f = await fixture(); f.source.tables.find(t => t.table === 'units_to_groupings_military_permissions_tables').rows = [];
  const r = await attempt(f); assert.equal(r.status, 'BLOCKED_SOURCE_DRIFT'); assert.equal(r.unit, null);
});
test('serialized presentation overrides and candidate order cannot alter materialized identity', async () => {
  const f = await fixture(), a = await attempt(f);
  f.review.candidates.reverse(); f.decisions.reverse();
  f.review.candidates.find(c => c.source.mainKey === f.keys[0]).presentations[0].factionId = 'forged';
  const b = await attempt(f, 0, a.request);
  assert.equal(b.status, 'MATERIALIZED'); assert.deepEqual(b.unit, a.unit);
  assert.equal(b.unit.factionId, 'vampire_counts');
});
test('presentation collisions retain rejected normalization and never overwrite a successful result', async () => {
  const f = await fixture(); f.options.usedIds = new Set();
  const a = await attempt(f), before = JSON.stringify(a.unit), b = await attempt(f);
  assert.equal(b.status, 'BLOCKED_ID_COLLISION'); assert.equal(b.unit, null); assert.equal(b.normalized, null);
  assert.equal(b.rejectedNormalization.unit.id, a.unit.id); assert.equal(JSON.stringify(a.unit), before);
  const summary = (await modules)[0].summarizeMaterializations([a, b]); assert.equal(summary.materialized, 1); assert.equal(summary.blocked, 1);
});
test('final publication failure cannot leave MATERIALIZED status or a successful Unit', async () => {
  const f = await fixture();
  f.options.usedIds = new class extends Set { add() { throw new Error('Deliberate ID registry failure'); } }();
  const r = await attempt(f);
  assert.equal(r.status, 'BLOCKED_NORMALIZATION'); assert.equal(r.quality, 'BLOCKED');
  assert.equal(r.unit, null); assert.equal(r.normalized, null); assert(r.rejectedNormalization);
  assert.equal((await modules)[0].summarizeMaterializations([r]).materialized, 0);
});
test('validator rejection is retained separately and not counted as successful materialization', async () => {
  const f = await fixture(), r = await attempt(f, 0, undefined, units => [{ unitId: units[0].id, field: 'entities.count', message: 'Deliberate test rejection' }]);
  assert.equal(r.status, 'BLOCKED_VALIDATION'); assert.equal(r.unit, null); assert.equal(r.normalized, null); assert(r.rejectedNormalization);
  assert.equal(r.validation.diagnostic.passed, false);
  const summary = (await modules)[0].summarizeMaterializations([r]); assert.equal(summary.materialized, 0); assert.equal(summary.validationFailures, 1);
});
test('validator exceptions also count as validation failures without a successful Unit', async () => {
  const f = await fixture(), r = await attempt(f, 0, undefined, () => { throw new Error('Deliberate validator exception'); });
  assert.equal(r.status, 'BLOCKED_VALIDATION'); assert.equal(r.unit, null); assert.equal(r.normalized, null);
  assert(r.rejectedNormalization); assert.equal((await modules)[0].summarizeMaterializations([r]).validationFailures, 1);
});
test('normalization exception leaves source/plan evidence and no successful Unit', async () => {
  const f = await fixture(); f.options.idMappings = { ...f.options.idMappings, abilities: { synthetic_lance: 'Invalid ID' } };
  const r = await attempt(f); assert.equal(r.status, 'BLOCKED_NORMALIZATION'); assert.equal(r.unit, null); assert(r.plan && r.tracedIdentity && r.dump);
});
test('legacy stat values and field provenance remain identical outside the explicit id/faction context change', async () => {
  const f = await fixture(), { normalizeUnit } = (await modules)[6];
  const r = await attempt(f);
  const legacy = normalizeUnit(r.dump, { factionId: 'vampire_counts', militaryGroup: 'fixture_group_0', permissionTrace: r.discovery.evidence, idMappings: f.options.idMappings });
  assert.deepEqual({ ...r.unit, id: legacy.unit.id }, legacy.unit);
  const entityFields = ['entities.entitySize', 'entities.mass', 'defense.projectilePenetrationResistance'];
  assert.deepEqual(r.omissions.filter(o => !entityFields.includes(o.field)), legacy.omitted.filter(o => !entityFields.includes(o.field)));
  assert(r.entityInspection); assert.equal(r.normalized.entityPresentation.completeness, 'INCOMPLETE_DB_CHAIN'); // This older fixture omits the attachment/articulated schema.
  assert.deepEqual(r.unmapped, legacy.unmapped);
  assert.deepEqual(r.provenance.fields.filter(f => !['id', 'factionId'].includes(f.field)), legacy.provenance.fields.filter(f => !['id', 'factionId'].includes(f.field)));
  assert.deepEqual(r.provenance.fields.map(f => f.kind), legacy.provenance.fields.map(f => f.kind));
  assert.equal(legacy.provenance.catalog, undefined);
});
test('diagnostic registry is explicit and cannot silently admit an unknown faction', async () => {
  const f = await fixture(); f.options.diagnosticFactionIds = ['vampire_counts'];
  const r = await attempt(f, 1); assert.equal(r.status, 'BLOCKED_VALIDATION');
  assert(r.validation.diagnostic.issues.some(i => i.field === 'factionId'));
});
test('materialization metrics separate plans, partial results, default roster and context-only entries', async () => {
  const f = await fixture(), results = [];
  for (let i = 0; i < 3; i++) results.push(await attempt(f, i));
  const s = (await modules)[0].summarizeMaterializations(results);
  for (const metric of ['attempted', 'planReady', 'traced', 'normalized', 'validated', 'materialized', 'partial']) assert.equal(s[metric], 3);
  assert.equal(s.defaultVisible, 2); assert.equal(s.contextOnly, 1); assert.equal(s.blocked, 0); assert.equal(s.validationFailures, 0); assert.equal(s.productionEligible, 0);
  assert(s.semanticsOmissionEvents > 0); assert(s.structuralOmissionEvents > 0);
});
