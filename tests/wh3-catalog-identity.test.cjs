const { test } = require('node:test');
const assert = require('node:assert/strict');
const modules = Promise.all([
  import('../tools/wh3-importer/catalog-identity/policy.mjs'),
  import('../tools/wh3-importer/fixtures/tables.mjs'),
  import('../tools/wh3-importer/inspect.mjs'),
]);
async function fixture() {
  const [, { field: f, table }, { inspectTables }] = await modules;
  const tables = [
    table('main_units_tables', [f('unit', true), f('land_unit', false, ['land_units', 'key']), f('recruitment_cost'), f('in_encyclopedia')], ['fixture_a', 'fixture_b'].map((unit, index) => ({ unit, land_unit: 'fixture_shared_land', recruitment_cost: index * 400, in_encyclopedia: !index }))),
    table('land_units_tables', [f('key', true)], [{ key: 'fixture_shared_land' }]),
    table('units_to_groupings_military_permissions_tables', [f('unit', true, ['main_units', 'unit']), f('military_group', true)], ['fixture_a', 'fixture_b'].map((unit, index) => ({ unit, military_group: `group_${index}` }))),
    table('unit_special_abilities_tables', [f('key', true), f('spawned_unit', false, ['land_units', 'key']), f('spawn_is_transformation'), f('spawn_is_decoy')], [{ key: 'fixture_spawn', spawned_unit: 'fixture_shared_land', spawn_is_transformation: false, spawn_is_decoy: false }]),
  ];
  const schema = { definitions: Object.fromEntries(tables.map(t => [t.table, [{ version: t.tableVersion, fields: t.fields }]])) };
  const reader = { tables: async name => tables.filter(t => t.table === name) };
  const queries = tables.map(t => { const field = t.fields.find(f => f.is_key).name; return { table: t.table, where: [{ field, op: 'oneOf', value: t.rows.map(r => r[field]) }] }; });
  const evidence = { ...await inspectTables(reader, schema, queries, 50), sourceKind: 'fixture', provenance: { sourceKind: 'fixture' }, issues: [] };
  const candidates = ['fixture_a', 'fixture_b'].map(mainKey => ({ mainKey, landKey: 'fixture_shared_land', localisation: { key: 'land_units_onscreen_name_fixture_shared_land', text: 'Same name', sourcePack: 'synthetic-fixture.pack' },
    main: tables[0].rows.find(r => r.unit === mainKey), permissionGroups: ['uninterpreted_extra_permission'], variantEvidence: { deliberatelyUnmapped: true } }));
  const decisions = candidates.map((c, index) => ({ mainKey: c.mainKey, expectedLandKey: c.landKey, expectedLocalisationKey: c.localisation.key,
    presentations: [{ contextId: `faction_${index}_roster`, factionId: `faction_${index}`, context: 'faction_roster', classification: 'SEPARATE_FACTION_ENTRY', defaultVisible: true }],
    checks: [{ table: 'units_to_groupings_military_permissions_tables', via: 'unit', target: 'main', equals: { military_group: `group_${index}` } }], rule: 'EXPLICIT_FACTION_ROSTER', rationale: 'Synthetic exact-key editorial decision' }));
  return { evidence, candidates, decisions };
}
const classify = async (f) => (await modules)[0].classifyCatalogCandidates(f.candidates, f.evidence, f.decisions);

test('catalog hotfix review still requires the exact reviewed schema/pack snapshot', async () => {
  const { hotfixSnapshot } = await import('../tools/wh3-importer/reviewed-snapshots.mjs');
  const f = await fixture(); f.evidence.sourceKind = 'ca-pack';
  f.evidence.provenance = { gameVersion: hotfixSnapshot.gameVersion, schemaSha256: hotfixSnapshot.schemaSha256,
    packs: Object.entries(hotfixSnapshot.packs).map(([file_name, sha256]) => ({ file_name, sha256 })) };
  assert.equal((await classify(f)).resolvedCandidates, 2);
  f.evidence.provenance.packs[0].sha256 = 'unreviewed-hotfix-pack';
  const blocked = await classify(f); assert.equal(blocked.resolvedCandidates, 0);
  assert(blocked.candidates.every(c => c.reasons.includes('UNREVIEWED_GAME_VERSION')));
});

test('catalog preserves identical names, distinct source keys and full original evidence', async () => {
  const f = await fixture(), before = JSON.stringify(f), r = await classify(f);
  assert.equal(r.candidates.length, 2);
  assert.deepEqual(r.candidates.map(c => c.source.mainKey), ['fixture_a', 'fixture_b']);
  assert(r.candidates.every(c => c.source.displayName === 'Same name' && c.candidate.variantEvidence.deliberatelyUnmapped));
  assert.equal(new Set(r.candidates.flatMap(c => c.presentations.map(p => p.id))).size, 2);
  assert.equal(JSON.stringify(f), before);
});
test('legitimate cross-faction contexts both remain default roster entries', async () => {
  const r = await classify(await fixture());
  assert.deepEqual(r.candidates.map(c => c.presentations[0].factionId), ['faction_0', 'faction_1']);
  assert(r.candidates.every(c => c.presentations[0].defaultVisible && c.presentations[0].classification === 'SEPARATE_FACTION_ENTRY'));
});
test('shared land references do not merge main identities or certify complete stat equivalence', async () => {
  const r = await classify(await fixture());
  assert.deepEqual(r.candidates.map(c => c.statIdentity.sharedWithMainKeys), [['fixture_b'], ['fixture_a']]);
  assert(r.candidates.every(c => c.statIdentity.fullBattleProfileEquivalence === 'NOT_ESTABLISHED'));
  assert.notEqual(r.candidates[0].source.mainKey, r.candidates[1].source.mainKey);
});
test('ability-spawn context never overwrites the roster source', async () => {
  const f = await fixture(), b = f.decisions[1];
  b.presentations = [{ contextId: 'ability_spawn', factionId: 'faction_0', context: 'ability_spawn', classification: 'SUMMONED_OR_SCRIPTED_VARIANT', defaultVisible: false }];
  b.rule = 'EXPLICIT_CONTEXT_ONLY';
  b.checks = [{ table: 'unit_special_abilities_tables', via: 'spawned_unit', target: 'land', equals: { key: 'fixture_spawn', spawn_is_transformation: false, spawn_is_decoy: false } }];
  b.relationship = { kind: 'EDITORIAL_CONTEXT_OF', mainKey: 'fixture_a' };
  const r = await classify(f);
  assert.equal(r.candidates.length, 2);
  assert.equal(r.candidates[0].presentations[0].defaultVisible, true);
  assert.equal(r.candidates[1].presentations[0].defaultVisible, false);
  assert.equal(r.candidates[1].decision.checkedEvidence[0].rows[0].facts.spawn_is_decoy.value, false);
});
test('no explicit curated decisions leaves every ambiguous candidate unresolved and BLOCKED', async () => {
  const f = await fixture(); f.decisions = [];
  const r = await classify(f);
  assert.equal(r.policyResolution, 'POLICY_STILL_UNRESOLVED');
  assert.equal(r.unresolvedCandidates, 2);
  assert.equal(r.importStatus, 'BLOCKED');
  assert.equal(r.selectedKey, null);
  assert(r.candidates.every(c => c.presentations.length === 0 && c.candidate));
});
test('cost, encyclopedia, display name and ordering cannot select or change catalog identity', async () => {
  const f = await fixture(), first = await classify(f);
  f.candidates.reverse(); f.decisions.reverse();
  for (const c of f.candidates) { c.main.recruitment_cost = 0; c.main.in_encyclopedia = false; c.localisation.text = 'Changed display label'; }
  const second = await classify(f);
  assert.deepEqual(second.candidates.map(c => c.presentations), first.candidates.map(c => c.presentations));
  assert.equal(second.importStatus, 'BLOCKED');
  assert.equal(second.selectedKey, null);
});
test('curated decisions match exact CA keys; names and suffixes cannot substitute', async () => {
  const f = await fixture(); f.decisions[1].mainKey = 'fixture_b_summoned';
  const r = await classify(f);
  assert.equal(r.candidates[1].policyStatus, 'POLICY_STILL_UNRESOLVED');
  const { resolveCatalogRequest } = (await modules)[0];
  assert.equal(resolveCatalogRequest(r, { mainKey: 'fixture_b', contextId: 'faction_1_roster' }).status, 'BLOCKED');
});
test('explicit source plus context produces only a plan; missing/incorrect context remains BLOCKED', async () => {
  const { resolveCatalogRequest } = (await modules)[0], r = await classify(await fixture());
  for (const request of [undefined, { contextId: 'faction_0_roster' }, { mainKey: 'fixture_a' }, { mainKey: 'fixture_a', contextId: 'faction_1_roster' }, { mainKey: 'FIXTURE_A', contextId: 'faction_0_roster' }]) assert.equal(resolveCatalogRequest(r, request).status, 'BLOCKED');
  const plan = resolveCatalogRequest(r, { mainKey: 'fixture_a', contextId: 'faction_0_roster' });
  assert.equal(plan.status, 'CATALOG_PLAN_READY');
  assert.equal(plan.unitMaterialized, false);
  assert.equal(r.importStatus, 'BLOCKED');
  assert.equal(r.selectedKey, null);
});
test('one main root can have explicit distinct presentation contexts without inventing a second source', async () => {
  const f = await fixture();
  f.decisions[0].presentations.push({ ...f.decisions[0].presentations[0], contextId: 'explicit_other_context', factionId: 'faction_1' });
  const r = await classify(f), c = r.candidates[0];
  assert.equal(r.candidates.length, 2);
  assert.equal(new Set(c.presentations.map(p => p.id)).size, 2);
  assert(c.presentations.every(p => p.sourceMainKey === 'fixture_a'));
});
test('matching membership strings without schema edges cannot approve an editorial decision', async () => {
  const f = await fixture(); f.evidence.relationships = f.evidence.relationships.filter(e => e.field !== 'unit');
  const r = await classify(f);
  assert.equal(r.resolvedCandidates, 0);
  assert(r.candidates.every(c => c.reasons.some(r => r.startsWith('EVIDENCE_GUARD_FAILED'))));
});
test('land/localisation drift, duplicate source candidates and unreviewed versions fail closed', async () => {
  const f = await fixture(); f.decisions[0].expectedLandKey = 'unexpected_land';
  assert((await classify(f)).candidates[0].reasons.includes('CURATED_IDENTITY_DRIFT'));
  const duplicate = await fixture(); duplicate.candidates.push(duplicate.candidates[0]);
  assert.equal((await classify(duplicate)).candidates.length, 3);
  assert.equal((await classify(duplicate)).policyResolution, 'POLICY_STILL_UNRESOLVED');
  const version = await fixture(); version.evidence.sourceKind = 'ca-pack'; version.evidence.provenance.gameVersion = 'unreviewed';
  assert.equal((await classify(version)).resolvedCandidates, 0);
});
test('decision registry rejects duplicate keys/contexts and roster-visible context variants', async () => {
  const { validateDecisions } = (await modules)[0], f = await fixture();
  assert.throws(() => validateDecisions([f.decisions[0], f.decisions[0]]), /duplicate/);
  f.decisions[0].presentations.push(f.decisions[0].presentations[0]);
  assert.throws(() => validateDecisions(f.decisions), /duplicate/);
  f.decisions[0].presentations.pop(); f.decisions[0].presentations[0].classification = 'CONTEXT_VARIANT';
  assert.throws(() => validateDecisions(f.decisions), /overwrite/);
});
test('catalog ID tuple encoding cannot collide on separator characters', async () => {
  const { catalogEntryId } = (await modules)[0];
  assert.notEqual(catalogEntryId('a:b', 'c'), catalogEntryId('a', 'b:c'));
  assert.notEqual(catalogEntryId('a%3Ab', 'c'), catalogEntryId('a:b', 'c'));
});
test('existing Unit validation and ID routes allow duplicate display names across faction entries', () => {
  const { validateUnits } = require('../.test-build/src/domain/unitValidation.js');
  const { pathFor } = require('../.test-build/src/domain/entities.js');
  const { grailKnightsFixture } = require('../.test-build/tests/fixtures/units.js');
  const units = ['one', 'two'].map((id, i) => ({ ...grailKnightsFixture, id, name: 'Same display name', factionId: `fixture_${i}` }));
  assert.deepEqual(validateUnits(units, units.map(u => u.factionId)), []);
  assert.notEqual(pathFor('unit', units[0].id), pathFor('unit', units[1].id));
  units[1].id = units[0].id;
  assert(validateUnits(units, units.map(u => u.factionId)).some(x => x.field === 'id'));
});
