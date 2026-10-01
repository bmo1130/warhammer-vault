const { test } = require('node:test');
const assert = require('node:assert/strict');
const modules = Promise.all([
  import('../tools/wh3-importer/missile-semantics/collect.mjs'),
  import('../tools/wh3-importer/missile-semantics/contract.mjs'),
  import('../tools/wh3-importer/fixtures/tables.mjs'),
  import('../tools/wh3-importer/normalization/normalizer.mjs'),
  import('../tools/wh3-importer/fixtures/normalization.mjs'),
]);
async function fixture({ primary = true, rider = false, junction = false } = {}) {
  const [, , { table, field: f }] = await modules;
  const tables = [], add = (name, fields, rows = []) => tables.push(table(`${name}_tables`, fields, rows));
  const key = f('key', true), ref = (name, target, targetField = 'key', isKey = false) => f(name, isKey, [target, targetField]);
  add('main_units', [f('unit', true), ref('land_unit', 'land_units')], ['main_a', 'main_b'].map(unit => ({ unit, land_unit: 'land_a' })));
  add('land_units', [key, ref('primary_missile_weapon', 'missile_weapons'), ref('engine', 'battlefield_engines'), f('primary_ammo'), f('secondary_ammo'), f('infinite_secondary_ammo')],
    [{ key: 'land_a', primary_missile_weapon: primary ? 'weapon_a' : '', engine: '', primary_ammo: primary ? 17 : 0, secondary_ammo: rider ? 31 : 0, infinite_secondary_ammo: false }]);
  add('battlefield_engines', [key, ref('missile_weapon', 'missile_weapons'), ref('battle_entity', 'battle_entities')]);
  add('battle_entities', [key], [{ key: 'entity_a' }]);
  add('land_units_to_battle_personalities_junctions', [ref('land_unit', 'land_units', 'key', true), ref('battle_personality', 'battle_personalities', 'key', true), f('attach'), f('riders_attachment_point')],
    rider ? [1, 2].map(i => ({ land_unit: 'land_a', battle_personality: `person_${i}`, attach: 'autonomous_rider', riders_attachment_point: `slot_${i}` })) : []);
  add('battle_personalities', [key, ref('battle_entity', 'battle_entities'), ref('battle_entity_stats', 'battle_entity_stats'), f('autonomous_rider_can_shoot_in_melee')],
    [1, 2].map(i => ({ key: `person_${i}`, battle_entity: 'entity_a', battle_entity_stats: 'stats_a', autonomous_rider_can_shoot_in_melee: i === 1 })));
  add('battle_entity_stats', [key, ref('primary_missile_weapon', 'missile_weapons')], [{ key: 'stats_a', primary_missile_weapon: 'weapon_r' }]);
  add('missile_weapons', [key, ref('default_projectile', 'projectiles'), f('precursor'), f('use_secondary_ammo_pool'), f('hide_secondary_range_ammo_statistics_ui')],
    ['a', 'b', 'r'].map(suffix => ({ key: `weapon_${suffix}`, default_projectile: `projectile_${suffix}`, precursor: false, use_secondary_ammo_pool: suffix === 'r', hide_secondary_range_ammo_statistics_ui: false })));
  add('missile_weapons_to_projectiles', [ref('missile_weapon', 'missile_weapons', 'key', true), ref('projectile', 'projectiles', 'key', true)]);
  add('projectiles', [key, ref('explosion_type', 'projectiles_explosions'), ref('projectile_penetration', 'projectile_penetration_junctions')],
    ['a', 'b', 'r'].map(suffix => ({ key: `projectile_${suffix}`, explosion_type: '', projectile_penetration: '' })));
  add('projectiles_explosions', [key]); add('projectile_penetration_junctions', [key]);
  add('unit_missile_weapon_junctions', [f('id', true), ref('unit', 'main_units', 'unit'), ref('missile_weapon', 'missile_weapons'), ref('battle_entity_stats_override', 'battle_entity_stats')],
    junction ? [{ id: 7, unit: 'main_a', missile_weapon: 'weapon_b', battle_entity_stats_override: '' }] : []);
  add('effect_bonus_value_missile_weapon_junctions', [ref('missile_weapon_junction', 'unit_missile_weapon_junctions', 'id', true), ref('effect', 'effects', 'effect', true), f('bonus_value_id')],
    junction ? [{ missile_weapon_junction: 7, effect: 'effect_a', bonus_value_id: 'enable' }] : []);
  add('effects', [f('effect', true)], [{ effect: 'effect_a' }]);
  add('character_skill_level_to_effects_junctions', [ref('effect_key', 'effects', 'effect', true), ref('character_skill_key', 'character_skills'), ref('effect_scope', 'campaign_effect_scopes'), f('value')],
    junction ? [{ effect_key: 'effect_a', character_skill_key: 'skill_a', effect_scope: 'scope_a', value: 1 }] : []);
  add('character_skills', [key], [{ key: 'skill_a' }]); add('campaign_effect_scopes', [key], [{ key: 'scope_a' }]);
  add('effect_bundles_to_effects_junctions', [ref('effect_key', 'effects', 'effect', true), ref('effect_bundle_key', 'effect_bundles'), ref('effect_scope', 'campaign_effect_scopes')]);
  add('effect_bundles', [key]);
  add('technology_effects_junction', [ref('effect', 'effects', 'effect', true)]);
  add('building_effects_junction', [ref('effect', 'effects', 'effect', true)]);
  add('character_skill_nodes', [key, ref('character_skill_key', 'character_skills')]);
  add('character_skill_node_set_items', [ref('item', 'character_skill_nodes', 'key', true), ref('set', 'character_skill_node_sets')]);
  add('character_skill_node_sets', [key, ref('agent_subtype_key', 'agent_subtypes')]); add('agent_subtypes', [key]);
  add('ritual_payload_effect_bundles', [ref('effect_bundle', 'effect_bundles', 'key', true), ref('payload', 'ritual_payloads')]);
  add('ritual_payloads', [key]); add('rituals', [key, ...['completion_payload', 'start_payload', 'self_payload'].map(s => ref(s, 'ritual_payloads'))]);
  const source = { tables, reader: { async tables(name) { return tables.filter(t => t.table === name); } },
    schema: { definitions: Object.fromEntries(tables.map(t => [t.table, [{ version: 99, fields: t.fields }]])) },
    metadata: { sourceKind: 'fixture', gameVersion: 'fixture', schemaSha256: 'schema_a', packs: [] } };
  const dump = { unit: { caKey: 'main_a' }, rootRow: 'root', rows: [{ id: 'root', row: { land_unit: 'land_a' } }], provenance: source.metadata, sourceKind: 'fixture' };
  return { source, dump, find: name => tables.find(t => t.table === `${name}_tables`) };
}
async function inspect(f) { return (await modules)[0].inspectMissileSources(f.source, f.dump); }
async function replay(r) { return (await modules)[1].missileSourceContract(r.evidence, r.contract.source); }

test('one processed primary path permits raw single-profile base mappings, never asserts active runtime state', async () => {
  const r = await inspect(await fixture());
  assert.equal(r.contract.completeness, 'COMPLETE_STATIC_SINGLE'); assert.equal(r.contract.paths.length, 1);
  assert.equal(r.contract.paths[0].role, 'LAND_PRIMARY'); assert.equal(r.contract.paths[0].activation.active, 'UNKNOWN');
  assert.equal(r.contract.presentation.singleBlockSafe, true); assert.deepEqual(await replay(r), r.contract);
});
test('zero-ammo/no paths, positive-ammo/no paths and unavailable reverse tables remain distinct', async () => {
  const f = await fixture({ primary: false }); assert.equal((await inspect(f)).contract.completeness, 'NO_MISSILE_PATH');
  f.find('land_units').rows[0].primary_ammo = 9;
  assert.equal((await inspect(f)).contract.completeness, 'UNKNOWN_APPLICABILITY');
  f.source.tables.splice(f.source.tables.findIndex(t => t.table === 'unit_missile_weapon_junctions_tables'), 1);
  const r = await inspect(f); assert.equal(r.contract.completeness, 'INCOMPLETE_DB_CHAIN'); assert(r.contract.issues.length);
});
test('main junction ownership is exact; shared-land sibling cannot inherit it', async () => {
  const f = await fixture({ junction: true }), a = await inspect(f);
  f.dump.unit.caKey = 'main_b'; const b = await inspect(f);
  assert.equal(a.contract.paths.length, 2); assert.equal(b.contract.paths.length, 1);
  assert(!b.evidence.rows.some(r => r.table === 'unit_missile_weapon_junctions_tables'));
  assert(a.contract.paths.every(p => p.sourceMainKey === 'main_a')); assert(b.contract.paths.every(p => p.sourceMainKey === 'main_b'));
});
test('same rider weapon at two attachment slots preserves distinct path IDs, entity/stats owners and raw flags', async () => {
  const r = await inspect(await fixture({ rider: true })), riders = r.contract.paths.filter(p => p.role === 'RIDER');
  assert.equal(riders.length, 2); assert.equal(new Set(riders.map(p => p.weaponKey)).size, 1); assert.equal(new Set(riders.map(p => p.pathId)).size, 2);
  assert.deepEqual(riders.map(p => p.owner.attachment.riders_attachment_point.value).sort(), ['slot_1', 'slot_2']);
  assert(riders.every(p => p.owner.entity.length && p.owner.statsRowId && p.rawWeaponFlags.use_secondary_ammo_pool.value === true));
  assert.deepEqual(riders.map(p => p.owner.fireFlags.autonomous_rider_can_shoot_in_melee.value).sort(), [false, true]);
});
test('attachment counts and pool flags never compute displayed ammo, shots, DPS or entity counts', async () => {
  const r = await inspect(await fixture({ rider: true }));
  assert.equal(r.contract.ammo.primary_ammo.value, 17); assert.equal(r.contract.ammo.secondary_ammo.value, 31);
  assert.equal(r.contract.rawCounts.attachmentRows, 2);
  assert.equal(r.contract.ammoSemantics.displayConversion, 'UNRESOLVED'); assert.equal(r.contract.ammoSemantics.poolSharing, 'UNRESOLVED');
  for (const key of ['displayedAmmo', 'shotsPerVolley', 'entityCount', 'dps', 'multiplier']) assert.equal(r.contract[key], undefined);
  assert(r.contract.paths.every(p => p.multiplier === undefined));
});
test('effect conditions retain skill/scope rows but active, precedence and combination remain unknown', async () => {
  const r = await inspect(await fixture({ junction: true })), path = r.contract.paths.find(p => p.role === 'MAIN_SPECIFIC_JUNCTION');
  assert.equal(path.activation.placement, 'CONDITIONAL'); assert.equal(path.activation.active, 'UNKNOWN');
  assert.equal(path.activation.precedence, 'UNRESOLVED'); assert.equal(path.activation.combination, 'UNRESOLVED');
  assert.equal(path.condition.enablingEffects[0].conditions[0].raw.character_skill_key, 'skill_a');
  assert(r.contract.conditionEvidence.edges.some(e => e.field === 'effect_scope'));
});
test('broken projectile, owner and enabling-effect edges fail graph completeness without raw string fallback', async () => {
  for (const field of ['default_projectile', 'battle_personality', 'effect']) {
    const r = await inspect(await fixture({ rider: true, junction: true }));
    r.evidence.relationships = r.evidence.relationships.filter(e => e.field !== field);
    const c = await replay(r); assert.equal(c.completeness, 'INCOMPLETE_DB_CHAIN'); assert.equal(c.presentation.singleBlockSafe, false);
  }
});
test('missing target and matching keys lacking processed references cannot establish a weapon path', async () => {
  const f = await fixture(); f.find('missile_weapons').rows = f.find('missile_weapons').rows.filter(r => r.key !== 'weapon_a');
  let r = await inspect(f); assert.equal(r.contract.completeness, 'INCOMPLETE_DB_CHAIN'); assert.equal(r.contract.paths[0].weaponKey, null);
  const g = await fixture(); g.find('land_units').fields.find(f => f.name === 'primary_missile_weapon').is_reference = null;
  r = await inspect(g); assert.equal(r.contract.completeness, 'INCOMPLETE_DB_CHAIN'); assert.equal(r.contract.paths[0].weaponKey, null);
});
test('candidate/row/relationship ordering and suggestive key names cannot choose a representative weapon', async () => {
  const r = await inspect(await fixture({ rider: true, junction: true }));
  r.evidence.rows.reverse(); r.evidence.relationships.reverse(); r.evidence.coverage.reverse();
  assert.deepEqual(await replay(r), r.contract);
  assert.equal(r.contract.presentation.singleBlockSafe, false); assert.equal(r.contract.selectedWeapon, undefined);
});
test('alternate projectile references remain separate paths and disallow single-block presentation', async () => {
  const f = await fixture(); f.find('missile_weapons_to_projectiles').rows.push({ missile_weapon: 'weapon_a', projectile: 'projectile_b' });
  const r = await inspect(f); assert.equal(r.contract.paths.length, 1); assert.equal(r.contract.paths[0].projectilePaths.length, 2);
  assert.equal(r.contract.completeness, 'STRUCTURE_KNOWN_RUNTIME_UNRESOLVED'); assert.equal(r.contract.presentation.singleBlockSafe, false);
  f.find('missile_weapons').rows.find(r => r.key === 'weapon_a').default_projectile = '';
  const alternateOnly = await inspect(f);
  assert.equal(alternateOnly.contract.paths[0].projectilePaths.length, 1);
  assert.equal(alternateOnly.contract.completeness, 'STRUCTURE_KNOWN_RUNTIME_UNRESOLVED');
  assert.equal(alternateOnly.contract.presentation.singleBlockSafe, false);
});
test('tampered summaries, other main/land identities and changed source snapshots cannot authorize normalization', async () => {
  const f = await fixture(), r = await inspect(f), { verifyMissileInspection } = (await modules)[1];
  r.contract.presentation.singleBlockSafe = false; assert.throws(() => verifyMissileInspection(r, f.dump), /replay/);
  const g = await inspect(f); f.dump.unit.caKey = 'other'; assert.throws(() => verifyMissileInspection(g, f.dump), /exact source/);
  f.dump.unit.caKey = 'main_a'; f.dump.rows[0].row.land_unit = 'other'; assert.throws(() => verifyMissileInspection(g, f.dump), /land identity/);
  f.dump.rows[0].row.land_unit = 'land_a'; f.dump.provenance = { ...f.dump.provenance, gameVersion: 'changed' };
  assert.throws(() => verifyMissileInspection(g, f.dump), /changed/);
});
test('normalization withholds complex missile values with provenance; nonmissile Unit values and fields remain identical', async () => {
  const [, { missileSourceContract }, , { normalizeUnit }, { normalizationFixture, syntheticNormalizationInput }] = await modules;
  const data = normalizationFixture(), { dump, context } = await syntheticNormalizationInput('helstorm', data);
  // A deliberately incomplete, otherwise exact evidence graph must fail closed
  // for missile presentation. It must not change the legacy selector itself.
  dump.provenance = { ...dump.provenance, packs: [], gameVersion: 'fixture', schemaSha256: 'fixture' };
  const main = dump.rows.find(r => r.id === dump.rootRow);
  const evidence = { ...structuredClone(dump), coverage: [], issues: [] };
  const inspection = { evidence, contract: missileSourceContract(evidence, { mainKey: main.row.unit, landKey: main.row.land_unit }) };
  const old = normalizeUnit(dump, context), fresh = normalizeUnit(dump, { ...context, missileInspection: inspection });
  assert(old.unit.missile); assert.equal(fresh.unit.missile, undefined);
  const { missile, ...rest } = old.unit; assert.deepEqual(fresh.unit, rest);
  assert.deepEqual(fresh.provenance.fields, old.provenance.fields.filter(f => !f.field.startsWith('missile.')));
  assert.deepEqual(fresh.missilePresentation.withheldFields.map(f => [f.field, f.value, f.source]), old.provenance.fields.filter(f => f.field.startsWith('missile.')).map(f => [f.field, f.value, f.source]));
  assert.deepEqual(normalizeUnit(dump, context), old); // Optional gate does not mutate legacy mode.
});
test('complete static single sidecar preserves every legacy Unit field and its provenance', async () => {
  const [, , { table, field: f }, { normalizeUnit }, { normalizationFixture, syntheticNormalizationInput }] = await modules;
  const data = normalizationFixture(), land = data.tables.find(t => t.table === 'land_units_tables');
  land.fields.push(f('primary_missile_weapon', false, ['missile_weapons', 'key']));
  for (const row of land.rows) row.primary_missile_weapon = '';
  const { dump, context } = await syntheticNormalizationInput('helstorm', data);
  const emptyTables = [
    ['land_units_to_battle_personalities_junctions_tables', [f('land_unit', true, ['land_units', 'key'])]],
    ['unit_missile_weapon_junctions_tables', [f('unit', true, ['main_units', 'unit'])]],
    ['missile_weapons_to_projectiles_tables', [f('missile_weapon', true, ['missile_weapons', 'key'])]],
  ];
  for (const [name, fields] of emptyTables) if (!data.tables.some(t => t.table === name)) {
    data.tables.push(table(name, fields, [])); data.schema.definitions[name] = [{ version: 99, fields }];
  }
  dump.provenance = { ...dump.provenance, packs: [], gameVersion: 'fixture', schemaSha256: 'fixture' };
  data.metadata = { ...dump.provenance, sourceKind: 'fixture' };
  const inspection = await (await modules)[0].inspectMissileSources(data, dump);
  assert.equal(inspection.contract.completeness, 'COMPLETE_STATIC_SINGLE', JSON.stringify(inspection.contract.issues));
  const old = normalizeUnit(dump, context), fresh = normalizeUnit(dump, { ...context, missileInspection: inspection });
  assert.deepEqual(fresh.unit, old.unit); assert.deepEqual(fresh.provenance, old.provenance);
  assert.deepEqual(fresh.omitted, old.omitted); assert.deepEqual(fresh.missilePresentation.withheldFields, []);
});
test('same main/land keys cannot conceal changed raw missile rows in the trace', async () => {
  const f = await fixture(), r = await inspect(f), { verifyMissileInspection } = (await modules)[1];
  f.dump.rows = structuredClone(r.evidence.rows); f.dump.rootRow = f.dump.rows.find(x => x.table === 'main_units_tables').id;
  assert.deepEqual(verifyMissileInspection(r, f.dump), r.contract);
  f.dump.rows.find(x => x.table === 'missile_weapons_tables').row.use_secondary_ammo_pool = true;
  assert.throws(() => verifyMissileInspection(r, f.dump), /raw row\/pointer drift/);
});
test('counts distinguish complete multi-source structure from incomplete DB chains and UI presentation', async () => {
  const { summarizeMissileSources } = (await modules)[1];
  const contracts = await Promise.all([{}, { rider: true }, { primary: false }].map(async options => (await inspect(await fixture(options))).contract));
  const summary = summarizeMissileSources(contracts);
  assert.equal(summary.unitsInspected, 3); assert.equal(summary.missilePaths, 4); assert.equal(summary.incompleteChains, 0);
  assert.equal(summary.completeSidecarUnrepresentable, 1); assert.equal(summary.singleBlockBaseMappingSafe, 1);
});
