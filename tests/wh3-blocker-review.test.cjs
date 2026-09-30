const { test } = require('node:test');
const assert = require('node:assert/strict');
const modules = Promise.all([
  import('../tools/wh3-importer/blocker-review/evidence.mjs'),
  import('../tools/wh3-importer/blocker-review/identity.mjs'),
  import('../tools/wh3-importer/blocker-review/structure.mjs'),
  import('../tools/wh3-importer/blocker-review/overrides.mjs'),
  import('../tools/wh3-importer/blocker-review/overlay.mjs'),
  import('../tools/wh3-importer/blocker-review/report.mjs'),
  import('../tools/wh3-importer/fixtures/tables.mjs'),
  import('../tools/wh3-importer/inspect.mjs'),
]);

async function fixture() {
  const [, , , , , , { field: f, table }, { inspectTables }] = await modules;
  const tables = [
    table('main_units_tables', [f('unit', true), f('land_unit', false, ['land_units', 'key']), f('num_men')], [{ unit: 'fixture_main', land_unit: 'fixture_land', num_men: 17 }]),
    table('land_units_tables', [f('key', true), f('man_entity', false, ['battle_entities', 'key']), f('mount', false, ['mounts', 'key']), f('engine', false, ['battlefield_engines', 'key']), f('num_mounts'), f('num_engines')], [{ key: 'fixture_land', man_entity: 'shared_entity', mount: 'fixture_mount', engine: '', num_mounts: 3, num_engines: 0 }]),
    table('mounts_tables', [f('key', true), f('entity', false, ['battle_entities', 'key'])], [{ key: 'fixture_mount', entity: 'shared_entity' }]),
    table('battle_entities_tables', [f('key', true), f('mass'), f('size'), f('hit_points'), f('projectile_penetration_resistance')], [{ key: 'shared_entity', mass: 97, size: 'large', hit_points: 13, projectile_penetration_resistance: 3 }]),
    table('land_units_to_battle_personalities_junctions_tables', [f('slot', true), f('land_unit', false, ['land_units', 'key']), f('battle_personality', false, ['battle_personalities', 'key']), f('attach'), f('riders_attachment_point')], [1, 2].map(slot => ({ slot, land_unit: 'fixture_land', battle_personality: `person_${slot}`, attach: 'autonomous_rider', riders_attachment_point: `slot_${slot}` }))),
    table('battle_personalities_tables', [f('key', true), f('battle_entity', false, ['battle_entities', 'key']), f('battle_entity_stats', false, ['battle_entity_stats', 'key']), f('autonomous_rider_can_shoot_in_melee')], [1, 2].map(i => ({ key: `person_${i}`, battle_entity: 'shared_entity', battle_entity_stats: `stats_${i}`, autonomous_rider_can_shoot_in_melee: true }))),
    table('battle_entity_stats_tables', [f('key', true), f('primary_missile_weapon', false, ['missile_weapons', 'key'])], [1, 2].map(i => ({ key: `stats_${i}`, primary_missile_weapon: `weapon_${i}` }))),
    table('missile_weapons_tables', [f('key', true), f('default_projectile', false, ['projectiles', 'key']), f('use_secondary_ammo_pool'), f('hide_secondary_range_ammo_statistics_ui')], [1, 2].map(i => ({ key: `weapon_${i}`, default_projectile: `projectile_${i}`, use_secondary_ammo_pool: i === 2, hide_secondary_range_ammo_statistics_ui: false }))),
    table('projectiles_tables', [f('key', true), f('damage')], [1, 2].map(i => ({ key: `projectile_${i}`, damage: i * 7 }))),
    table('unit_missile_weapon_junctions_tables', [f('id', true), f('unit', false, ['main_units', 'unit']), f('missile_weapon', false, ['missile_weapons', 'key']), f('battle_entity_stats_override')], [{ id: 17, unit: 'fixture_main', missile_weapon: 'weapon_2', battle_entity_stats_override: '' }]),
    table('effects_tables', [f('effect', true)], [{ effect: 'fixture_effect' }]),
    table('effect_bonus_value_missile_weapon_junctions_tables', [f('effect', true, ['effects', 'effect']), f('missile_weapon_junction', false, ['unit_missile_weapon_junctions', 'id']), f('bonus_value_id')], [{ effect: 'fixture_effect', missile_weapon_junction: 17, bonus_value_id: 'enable' }]),
    table('character_skill_level_to_effects_junctions_tables', [f('effect_key', true, ['effects', 'effect']), f('level'), f('value'), f('effect_scope')], [{ effect_key: 'fixture_effect', level: 1, value: 1, effect_scope: 'fixture_scope' }]),
  ];
  const schema = { definitions: Object.fromEntries(tables.map(t => [t.table, [{ version: t.tableVersion, fields: t.fields }]])) };
  const source = { metadata: { sourceKind: 'fixture', gameVersion: 'fixture', schemaSha256: 'fixture', packs: [] }, schema, reader: { tables: async name => tables.filter(t => t.table === name) } };
  const queries = tables.map(t => { const field = t.fields.find(f => f.is_key).name; return { table: t.table, where: [{ field, op: 'oneOf', value: t.rows.map(r => r[field]) }] }; });
  const evidence = { ...await inspectTables(source.reader, schema, queries, 100), provenance: source.metadata, issues: [] };
  return { source, tables, evidence };
}

test('blocker probe enforces row/query/seed bounds without saving partial rows', async () => {
  const [{ EvidenceProbe }] = await modules;
  const { source } = await fixture();
  const p = new EvidenceProbe(source, { maxRows: 1, maxQueries: 1 });
  await assert.rejects(p.select('battle_personalities_tables', 'key', ['person_1', 'person_2']), /exceeded/);
  assert.equal(p.data.rows.length, 0);
  await assert.rejects(p.select('main_units_tables', 'unit', ['fixture_main']), /budget/);
  await assert.rejects(new EvidenceProbe(source).select('main_units_tables', 'unit', Array.from({ length: 101 }, (_, i) => i)), /100/);
});
test('blocker joins reject matching strings without processed schema references', async () => {
  const [{ EvidenceProbe }] = await modules;
  const { source, tables } = await fixture();
  tables[0].fields.find(f => f.name === 'land_unit').is_reference = null;
  const p = new EvidenceProbe(source);
  await p.select('main_units_tables', 'unit', ['fixture_main']);
  await assert.rejects(p.forward('main_units_tables', 'land_unit', 'land_units_tables'), /reference/);
});
test('blocker forward missing joins are recorded instead of selecting a substitute', async () => {
  const [{ EvidenceProbe }] = await modules;
  const { source, tables } = await fixture();
  tables[0].rows[0].land_unit = 'absent';
  const p = new EvidenceProbe(source);
  await p.select('main_units_tables', 'unit', ['fixture_main']);
  await p.forward('main_units_tables', 'land_unit', 'land_units_tables');
  assert.equal(p.issues[0].matches, 0);
  assert.equal(p.rows('land_units_tables').length, 0);
});
test('identity A/B/C separates uniqueness, catalog intent and insufficient evidence', async () => {
  const [, { assessIdentity }] = await modules;
  const candidate = { mainKey: 'one', landKey: 'land', localisation: { key: 'loc' } };
  assert.equal(assessIdentity([candidate]).classification, 'A');
  assert.equal(assessIdentity([candidate, { ...candidate, mainKey: 'two' }]).classification, 'B');
  assert.equal(assessIdentity([candidate, { ...candidate, mainKey: 'two' }]).selectedKey, null);
  assert.equal(assessIdentity([candidate], [{ reason: 'missing evidence' }]).classification, 'C');
  assert.equal(assessIdentity([candidate, candidate]).classification, 'C');
});
test('identity rule audit finds zero-cost normal units and preserves counterexamples', async () => {
  const [, { auditIdentityRules }] = await modules;
  const candidate = { mainKey: 'zero_normal', main: { recruitment_cost: 0, in_encyclopedia: false }, permissionGroups: ['group'] };
  const audit = auditIdentityRules([], [{ sample: { displayName: 'Fixture' }, discovery: { candidates: [candidate] } }]);
  assert(audit.find(r => r.rule === 'positiveRecruitment').samples[0].erasesUniqueRoot);
  assert(audit.find(r => r.rule === 'encyclopedia').samples[0].erasesUniqueRoot);
  assert(audit.every(r => r.approved === false));
});
test('entity contract preserves shared-row roles, raw counts and attachment slots without arithmetic', async () => {
  const [, , { entityContract }] = await modules;
  const { evidence } = await fixture(), c = entityContract(evidence);
  assert.equal(c.roles[0].rawCount.value, 17);
  assert.equal(c.roles[1].rawCount.value, 3);
  assert.equal(c.roles[0].targets[0].rowId, c.roles[1].targets[0].rowId);
  assert.equal(c.attachments.length, 2);
  assert.deepEqual(c.displayPolicy, { count: 'OMIT', totalHealth: 'OMIT', mass: 'OMIT', size: 'OMIT' });
  assert.equal(c.count, undefined);
  assert.equal(c.totalHealth, undefined);
});
test('entity contract refuses ambiguous root/land rather than returning a representative', async () => {
  const [, , { entityContract }] = await modules;
  const { evidence } = await fixture();
  evidence.rows.push({ ...evidence.rows.find(r => r.table === 'main_units_tables'), id: 'duplicate' });
  assert.throws(() => entityContract(evidence), /one root/);
});
test('rider chain keeps both weapons, independent pool flags and false values', async () => {
  const [, , { missileContract }] = await modules;
  const { evidence } = await fixture(), c = missileContract(evidence);
  assert.equal(c.status, 'DB_CHAIN_FOUND_UNREPRESENTED');
  assert.deepEqual(c.paths.map(p => p.weaponKey), ['weapon_1', 'weapon_2']);
  assert.deepEqual(c.paths.map(p => p.useSecondaryAmmoPool.value), [false, true]);
  assert.equal(c.unitMissileComplete, false);
  assert.equal(c.ammunition, undefined);
});
test('broken projectile edges cannot produce a complete rider chain', async () => {
  const [, , { missileContract }] = await modules;
  const { evidence } = await fixture();
  evidence.relationships = evidence.relationships.filter(e => e.field !== 'default_projectile');
  assert.equal(missileContract(evidence).status, 'INCOMPLETE_DB_CHAIN');
});

test('unowned attachment rows cannot contribute rider weapon paths', async () => {
  const [, , { missileContract }] = await modules;
  const { evidence } = await fixture();
  const attachmentIds = new Set(evidence.rows.filter(r => r.table === 'land_units_to_battle_personalities_junctions_tables').map(r => r.id));
  evidence.relationships = evidence.relationships.filter(e => !(e.field === 'land_unit' && attachmentIds.has(e.from)));
  const c = missileContract(evidence);
  assert.equal(c.status, 'INCOMPLETE_DB_CHAIN');
  assert.equal(c.paths.length, 0);
});
test('raw facts reject forged row identity and metadata-free fields', async () => {
  const [{ rawFact }] = await modules;
  const { evidence } = await fixture();
  const root = evidence.rows.find(r => r.table === 'main_units_tables');
  assert.equal(rawFact(evidence, root, 'num_men').value, 17);
  assert.equal(rawFact(evidence, root, 'guessed'), null);
  root.key.unit = 'forged';
  assert.equal(rawFact(evidence, root, 'num_men'), null);
});
test('override conditions are evidence, never active state or precedence', async () => {
  const [, , , { overrideContract }] = await modules;
  const { evidence } = await fixture(), c = overrideContract(evidence);
  assert.equal(c.entries[0].enablingEffects[0].conditions.length, 1);
  assert.equal(c.entries[0].active, 'UNKNOWN');
  assert.equal(c.entries[0].precedence, 'UNRESOLVED');
  assert.equal(c.unitMissileComplete, false);
  evidence.relationships = evidence.relationships.filter(e => e.field !== 'effect_key');
  assert.equal(overrideContract(evidence).entries[0].enablingEffects[0].conditions.length, 0);
});
test('review overlay adds omissions without mutating Units, clearing failures or hiding unknown chains', async () => {
  const [, , { entityContract, missileContract }, , { applyReviewOverlay }] = await modules;
  const { evidence } = await fixture();
  const sample = { slug: 'fixture', displayName: 'Fixture' };
  const result = { sample, status: 'BLOCKED', dump: { unit: { caKey: 'fixture_main' } }, normalized: null, exceptions: [{ category: 'UNKNOWN_MISSILE_CHAIN', severity: 'OMISSION' }] };
  const before = JSON.stringify(result);
  const [next] = applyReviewOverlay([result], [{ sample, evidence, entityContract: entityContract(evidence), missileContract: missileContract(evidence) }]);
  assert.equal(JSON.stringify(result), before);
  assert.equal(next.status, 'BLOCKED');
  assert.equal(next.exceptions.length, 2);
  assert.equal(next.normalized, null);
  assert.equal(next.productionEligible, false);
});
test('different schema or pack snapshots cannot be combined', async () => {
  const [{ requireSameSource }] = await modules;
  const p = { gameVersion: 'v', schemaSha256: 's', packs: [{ file_name: 'db.pack', sha256: 'hash' }] };
  requireSameSource(p, structuredClone(p));
  assert.throws(() => requireSameSource(p, { ...p, schemaSha256: 'other' }), /changed/);
  assert.throws(() => requireSameSource(p, { ...p, packs: [{ file_name: 'db.pack', sha256: 'other' }] }), /changed/);
});
