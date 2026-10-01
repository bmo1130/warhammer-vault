const { test } = require('node:test');
const assert = require('node:assert/strict');
const modules = Promise.all([
  import('../tools/wh3-importer/entity-semantics/collect.mjs'), import('../tools/wh3-importer/entity-semantics/contract.mjs'),
  import('../tools/wh3-importer/fixtures/tables.mjs'), import('../tools/wh3-importer/fixtures/normalization.mjs'),
  import('../tools/wh3-importer/normalization/normalizer.mjs'), import('../tools/wh3-importer/entity-semantics/cli.mjs'),
]);
async function fixture({ mounted = false, engine = false, articulated = false, attachments = false, sharedEntity = false } = {}) {
  const [, , { table, field: f }] = await modules;
  const tables = [], add = (name, fields, rows = []) => tables.push(table(`${name}_tables`, fields, rows));
  const key = f('key', true), ref = (name, target, targetField = 'key', isKey = false) => f(name, isKey, [target, targetField]);
  add('main_units', [f('unit', true), ref('land_unit', 'land_units'), f('num_men')], ['main_a', 'main_b'].map(unit => ({ unit, land_unit: 'land_a', num_men: 24 })));
  add('land_units', [key, ref('man_entity', 'battle_entities'), ref('mount', 'mounts'), ref('engine', 'battlefield_engines'),
    ref('articulated_record', 'land_unit_articulated_vehicles'), f('num_mounts'), f('num_engines'), f('bonus_hit_points')],
    [{ key: 'land_a', man_entity: 'entity_a', mount: mounted ? 'mount_a' : '', engine: engine ? 'engine_a' : '',
      articulated_record: articulated ? 'art_a' : '', num_mounts: 2, num_engines: 12, bonus_hit_points: 97 }]);
  add('battle_entities', [key, ...['mass', 'size', 'hit_points', 'radius', 'run_speed', 'projectile_penetration_resistance'].map(n => f(n)), ref('locomotion_constants', 'battle_entity_locomotion_constants')],
    ['entity_a', 'entity_b'].map((key, i) => ({ key, mass: i ? 1700 : 113, size: i ? 'large' : 'small', hit_points: i ? 49 : 17,
      radius: 0.2, run_speed: 1.7, projectile_penetration_resistance: 4, locomotion_constants: 'loco_a' })));
  add('battle_entity_locomotion_constants', [key, f('inertia')], [{ key: 'loco_a', inertia: 31 }]);
  add('mounts', [key, ref('entity', 'battle_entities')], [{ key: 'mount_a', entity: sharedEntity ? 'entity_a' : 'entity_b' }]);
  add('battlefield_engines', [key, ref('battle_entity', 'battle_entities')], [{ key: 'engine_a', battle_entity: 'entity_b' }]);
  add('land_unit_articulated_vehicles', [key, ref('articulated_entity', 'battle_entities'), ref('ammo_caisson_entity', 'battle_entities'), f('engine_articulation_node_index')],
    [{ key: 'art_a', articulated_entity: 'entity_b', ammo_caisson_entity: 'entity_b', engine_articulation_node_index: 2 }]);
  add('land_units_to_battle_personalities_junctions', [ref('land_unit', 'land_units', 'key', true), ref('battle_personality', 'battle_personalities', 'key', true),
    f('attach'), f('riders_attachment_point'), f('engine_articulation_index')],
    attachments ? [1, 2].map(i => ({ land_unit: 'land_a', battle_personality: `person_${i}`, attach: 'autonomous_rider', riders_attachment_point: `slot_${i}`, engine_articulation_index: -1 })) : []);
  add('battle_personalities', [key, ref('battle_entity', 'battle_entities'), ref('battle_entity_stats', 'battle_entity_stats')],
    [1, 2].map(i => ({ key: `person_${i}`, battle_entity: 'entity_a', battle_entity_stats: 'stats_a' })));
  add('battle_entity_stats', [key, f('primary_missile_weapon')], [{ key: 'stats_a', primary_missile_weapon: 'same_weapon' }]);
  add('unit_missile_weapon_junctions', [f('id', true), ref('unit', 'main_units', 'unit'), ref('battle_entity_stats_override', 'battle_entity_stats')],
    [{ id: 4, unit: 'main_a', battle_entity_stats_override: 'stats_a' }]);
  const source = { tables, reader: { async tables(name) { return tables.filter(t => t.table === name); } },
    schema: { definitions: Object.fromEntries(tables.map(t => [t.table, [{ version: 99, fields: t.fields }]])) },
    metadata: { sourceKind: 'fixture', gameVersion: 'fixture', schemaSha256: 'fixture', packs: [] } };
  const dump = { unit: { caKey: 'main_a' }, rootRow: 'root', rows: [{ id: 'root', row: { land_unit: 'land_a' } }], provenance: source.metadata, sourceKind: 'fixture' };
  return { source, dump, find: name => tables.find(t => t.table === `${name}_tables`) };
}
async function inspect(f) { return (await modules)[0].inspectEntityStructure(f.source, f.dump); }
async function replay(r) { return (await modules)[1].entityStructureContract(r.evidence, r.contract.source); }

test('single MAN retains one complete path, physical/raw-health/locomotion owners; count/HP/scaling remain unresolved', async () => {
  const r = await inspect(await fixture()), c = r.contract;
  assert.equal(c.completeness, 'COMPLETE_SINGLE_ENTITY'); assert.equal(c.paths.length, 1); assert.equal(c.paths[0].role, 'MAN');
  assert.equal(c.paths[0].entity.fields.mass.value, 113); assert.equal(c.paths[0].health.entityHitPoints.value, 17);
  assert.equal(c.paths[0].locomotion[0].row.fields.inertia.value, 31);
  assert(c.presentation.massSafe && c.presentation.sizeSafe && c.presentation.penetrationSafe);
  assert.equal(c.presentation.countSafe, false); assert.equal(c.presentation.hpSafe, false);
  assert.equal(c.health.landBonusHitPoints.value, 97); assert.equal(c.health.landTotalHealth, null);
  assert.equal(c.runtime.unitSizeScaling, 'UNRESOLVED');
});
test('multi-role paths retain repeated entity keys across MAN/MOUNT/ENGINE/articulated/caisson/attachment placements', async () => {
  const c = (await inspect(await fixture({ mounted: true, engine: true, articulated: true, attachments: true, sharedEntity: true }))).contract;
  assert.equal(c.completeness, 'COMPLETE_MULTI_ROLE'); assert.equal(c.paths.length, 7);
  assert.equal(new Set(c.paths.map(p => p.pathId)).size, 7);
  assert.deepEqual([...new Set(c.paths.map(p => p.role))].sort(), ['AMMO_CAISSON', 'ARTICULATED', 'ENGINE', 'MAN', 'MOUNT', 'PERSONALITY_ATTACHMENT']);
  assert.equal(c.paths.filter(p => p.entityKey === 'entity_a').length, 4);
  assert(!c.presentation.massSafe && !c.presentation.sizeSafe && !c.presentation.penetrationSafe);
});
test('raw role cardinalities, attachment rows and slots never become displayed model count/HP/mass sums', async () => {
  const c = (await inspect(await fixture({ mounted: true, engine: true, articulated: true, attachments: true }))).contract;
  assert.deepEqual(['numMen', 'numMounts', 'numEngines'].map(k => c.rawCardinality[k].fact.value), [24, 2, 12]);
  assert.equal(c.rawCardinality.attachmentRows.value, 2); assert.equal(c.rawCardinality.attachmentSlots.value, 2);
  for (const value of Object.values(c.rawCardinality)) { assert.equal(value.semanticsStatus, 'RAW_COUNT_ONLY'); assert.equal(value.cardinalityMeaning, 'UNRESOLVED'); }
  for (const key of ['displayedModelCount', 'totalEntities', 'effectiveModels', 'totalHP', 'averageMass', 'aggregateMass']) {
    assert.equal(c[key], undefined); assert(c.paths.every(p => p[key] === undefined));
  }
  assert.equal(c.paths.find(p => p.role === 'MOUNT').health.entityHitPoints.value, 49); // No mount + rider or entity HP × count.
});
test('attachments retain separate stats ownership and slots when entity and stats keys are reused', async () => {
  const c = (await inspect(await fixture({ attachments: true }))).contract;
  const attachments = c.paths.filter(p => p.role === 'PERSONALITY_ATTACHMENT'); assert.equal(attachments.length, 2);
  assert.equal(new Set(attachments.map(p => p.owner.slot.value)).size, 2);
  assert(attachments.every(p => p.stats[0].key === 'stats_a' && p.entityKey === 'entity_a'));
  assert.equal(new Set(attachments.map(p => p.pathId)).size, 2); assert.equal(c.paths.length, 3);
  assert.equal(c.presentation.massSafe, false); // Even the same physical entity key does not erase roles.
});
test('broken schema edges and missing targets stay incomplete without key/string repair', async () => {
  for (const field of ['man_entity', 'mount', 'articulated_entity', 'battle_personality', 'battle_entity_stats', 'locomotion_constants']) {
    const r = await inspect(await fixture({ mounted: true, articulated: true, attachments: true }));
    r.evidence.relationships = r.evidence.relationships.filter(e => e.field !== field);
    const c = await replay(r); assert.equal(c.completeness, 'INCOMPLETE_DB_CHAIN', field); assert.equal(c.presentation.massSafe, false);
  }
  const f = await fixture(); f.find('land_units').fields.find(f => f.name === 'man_entity').is_reference = null;
  const c = (await inspect(f)).contract; assert.equal(c.completeness, 'INCOMPLETE_DB_CHAIN'); assert.equal(c.paths[0].entityKey, null);
});
test('unqueried reverse scope and unavailable component table cannot prove single-role completeness', async () => {
  const r = await inspect(await fixture()); r.evidence.coverage = [];
  assert.equal((await replay(r)).completeness, 'INCOMPLETE_DB_CHAIN');
  const f = await fixture({ mounted: true }); f.find('mounts').rows = [];
  const c = (await inspect(f)).contract; assert.equal(c.completeness, 'INCOMPLETE_DB_CHAIN'); assert(c.paths.some(p => p.role === 'MOUNT' && p.entity === null));
});
test('main-specific stats override never propagates to same-land sibling; path IDs include exact source', async () => {
  const f = await fixture({ mounted: true }), a = await inspect(f); f.dump.unit.caKey = 'main_b'; const b = await inspect(f);
  assert.equal(a.contract.statsOverrides.length, 1); assert.equal(b.contract.statsOverrides.length, 0);
  assert.equal(a.contract.source.landKey, b.contract.source.landKey);
  assert.equal(new Set([...a.contract.paths, ...b.contract.paths].map(p => p.pathId)).size, 4);
});
test('row/relationship/query ordering cannot change paths, ownership, cardinalities or presentation', async () => {
  const r = await inspect(await fixture({ mounted: true, engine: true, articulated: true, attachments: true }));
  r.evidence.rows.reverse(); r.evidence.relationships.reverse(); r.evidence.coverage.reverse();
  assert.deepEqual(await replay(r), r.contract);
});
test('unknown applicability and incomplete graphs never invent an entity', async () => {
  const f = await fixture(); f.find('land_units').rows[0].man_entity = '';
  const c = (await inspect(f)).contract; assert.equal(c.completeness, 'UNKNOWN_APPLICABILITY'); assert.equal(c.paths.length, 0); assert.equal(c.presentation.massSafe, false);
});
test('tampered safe facets, source/main/land and version/schema/pack drift cannot authorize presentation', async () => {
  const f = await fixture(), r = await inspect(f), { verifyEntityInspection } = (await modules)[1];
  const tampered = structuredClone(r); tampered.contract.presentation.countSafe = true;
  assert.throws(() => verifyEntityInspection(tampered, f.dump), /replay/);
  for (const field of ['gameVersion', 'schemaSha256', 'packs']) {
    const dump = structuredClone(f.dump); dump.provenance[field] = field === 'packs' ? [{ file_name: 'x', sha256: 'bad' }] : 'changed';
    assert.throws(() => verifyEntityInspection(r, dump), /changed/);
  }
  const dump = structuredClone(f.dump); dump.unit.caKey = 'other'; assert.throws(() => verifyEntityInspection(r, dump), /exact source/);
  dump.unit.caKey = 'main_a'; dump.rows[0].row.land_unit = 'other'; assert.throws(() => verifyEntityInspection(r, dump), /land identity/);
});

// The real normalizer gate is tested on full synthetic traces, not a second
// implementation of the gate. Extra personality/articulated paths must prevent
// the formerly man-only selector from producing a representative property.
async function normalizationInput({ attachments = false, articulated = false } = {}) {
  const [, , { table, field: f }, { normalizationFixture, syntheticNormalizationInput }] = await modules;
  const data = normalizationFixture(), land = data.tables.find(t => t.table === 'land_units_tables');
  land.fields.push(f('articulated_record', false, ['land_unit_articulated_vehicles', 'key']), f('num_engines'));
  for (const r of land.rows) Object.assign(r, { articulated_record: '', num_engines: 0 });
  const entity = data.tables.find(t => t.table === 'battle_entities_tables');
  entity.fields.push(f('locomotion_constants', false, ['battle_entity_locomotion_constants', 'key']));
  for (const r of entity.rows) r.locomotion_constants = '';
  const main = data.tables.find(t => t.table === 'main_units_tables'), key = main.rows.find(r => r.unit === 'synthetic_bloodthirster').land_unit;
  // The profile fixture's exact key is read from its scoped land, not inferred.
  const target = land.rows.find(r => r.key === key);
  if (articulated) target.articulated_record = 'synthetic_art';
  data.tables.push(
    table('battle_entity_locomotion_constants_tables', [f('key', true)], []),
    table('land_unit_articulated_vehicles_tables', [f('key', true), f('articulated_entity', false, ['battle_entities', 'key']), f('ammo_caisson_entity', false, ['battle_entities', 'key'])],
      [{ key: 'synthetic_art', articulated_entity: target.man_entity, ammo_caisson_entity: '' }]),
    table('land_units_to_battle_personalities_junctions_tables', [f('land_unit', true, ['land_units', 'key']), f('battle_personality', true, ['battle_personalities', 'key']), f('attach'), f('riders_attachment_point')],
      attachments ? [{ land_unit: key, battle_personality: 'synthetic_person', attach: 'autonomous_rider', riders_attachment_point: 'slot_1' }] : []),
    table('battle_personalities_tables', [f('key', true), f('battle_entity', false, ['battle_entities', 'key']), f('battle_entity_stats', false, ['battle_entity_stats', 'key'])],
      [{ key: 'synthetic_person', battle_entity: target.man_entity, battle_entity_stats: '' }]),
    table('unit_missile_weapon_junctions_tables', [f('id', true), f('unit', false, ['main_units', 'unit']), f('battle_entity_stats_override', false, ['battle_entity_stats', 'key'])], []),
  );
  for (const t of data.tables) data.schema.definitions[t.table] = [{ version: 99, fields: t.fields, localised_fields: t.table === 'land_units_tables' || t.table === 'unit_abilities_tables' ? [f('onscreen_name')] : [] }];
  const { dump, context } = await syntheticNormalizationInput('bloodthirster', data);
  const metadata = { sourceKind: 'fixture', gameVersion: 'fixture', schemaSha256: 'fixture', packs: [] };
  dump.provenance = metadata;
  return { dump, context, source: { ...data, metadata } };
}
test('verified simple normalization retains existing per-entity fields, omissions and DIRECT/GENERATED/CURATED provenance', async () => {
  const f = await normalizationInput(), { normalizeUnit } = (await modules)[4];
  const old = normalizeUnit(f.dump, f.context), inspection = await inspect(f);
  const fresh = normalizeUnit(f.dump, { ...f.context, entityInspection: inspection });
  assert.equal(inspection.contract.completeness, 'COMPLETE_SINGLE_ENTITY', JSON.stringify(inspection.contract.issues));
  assert.deepEqual(fresh.unit, old.unit); assert.deepEqual(fresh.provenance, old.provenance); assert.deepEqual(fresh.omitted, old.omitted);
  assert.equal(fresh.entityPresentation.withheldFields.length, 0);
});
test('attachment-only and articulated-only composites withhold formerly mapped mass/size/penetration and preserve complete provenance', async () => {
  const { normalizeUnit } = (await modules)[4], { compareEntityNormalization } = (await modules)[5];
  for (const option of [{ attachments: true }, { articulated: true }]) {
    const f = await normalizationInput(option), old = normalizeUnit(f.dump, f.context), inspection = await inspect(f);
    const fresh = normalizeUnit(f.dump, { ...f.context, entityInspection: inspection });
    assert.equal(fresh.entityPresentation.withheldFields.length, 3);
    for (const w of fresh.entityPresentation.withheldFields) {
      const { reason, sourcePaths, ...previous } = w;
      assert.deepEqual(previous, old.provenance.fields.find(p => p.field === w.field)); assert(reason && sourcePaths.length);
      assert.equal(w.field.split('.').reduce((o, key) => o?.[key], fresh.unit), undefined);
    }
    const comparison = compareEntityNormalization(old, fresh);
    assert(comparison.nonEntityValuesUnchanged && comparison.nonEntityProvenanceUnchanged && comparison.nonEntityOmissionsUnchanged && comparison.missilePresentationUnchanged);
    assert.equal(comparison.changedEntityFields.length, 3);
    assert.deepEqual(normalizeUnit(f.dump, f.context), old); // Gate cannot mutate legacy mode.
    assert.equal(fresh.unit.entities.count, undefined); assert.equal(fresh.unit.entities.healthPerEntity, undefined); assert.equal(fresh.unit.entities.totalHealth, undefined);
  }
});
test('each physical property facet is independent; invalid size does not suppress verified single-role mass', async () => {
  const f = await fixture(); f.find('battle_entities').rows[0].size = 'not_a_known_size';
  const c = (await inspect(f)).contract; assert(c.presentation.massSafe); assert.equal(c.presentation.sizeSafe, false);
  assert.equal(c.paths[0].entity.fields.size.value, 'not_a_known_size');
});
test('forged target row identity and changed raw source pointers fail closed despite matching reference strings', async () => {
  const r = await inspect(await fixture({ attachments: true }));
  r.evidence.rows.find(x => x.table === 'battle_entity_stats_tables').key.key = 'forged_identity';
  assert.equal((await replay(r)).completeness, 'INCOMPLETE_DB_CHAIN');
  const f = await normalizationInput(), inspection = await inspect(f), { normalizeUnit } = (await modules)[4];
  const broken = structuredClone(inspection);
  broken.evidence.relationships = broken.evidence.relationships.filter(e => e.field !== 'man_entity');
  broken.contract = await replay(broken);
  const withheld = normalizeUnit(f.dump, { ...f.context, entityInspection: broken }).entityPresentation.withheldFields;
  assert.equal(withheld.length, 3); assert(withheld.every(w => w.sourcePaths.some(p => p.role === 'MAN')));
  const row = inspection.evidence.rows.find(x => x.table === 'battle_entities_tables');
  row.path = 'db/battle_entities_tables/other_pack_row';
  inspection.contract = await replay(inspection);
  assert.throws(() => normalizeUnit(f.dump, { ...f.context, entityInspection: inspection }), /raw row\/pointer drift/);
});
