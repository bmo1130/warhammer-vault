const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { validateUnits } = require('../.test-build/src/domain/unitValidation.js');
const { getTotalDamage } = require('../.test-build/src/domain/unitCalculations.js');
const modules = Promise.all([
  import('../tools/wh3-importer/normalization/normalizer.mjs'),
  import('../tools/wh3-importer/fixtures/normalization.mjs'),
  import('../tools/wh3-importer/normalization/policy.mjs'),
  import('../tools/wh3-importer/normalization/report.mjs'),
]);
async function run(name = 'grail-knights', data) {
  const [{ normalizeUnit }, { syntheticNormalizationInput }] = await modules;
  const { dump, context } = await syntheticNormalizationInput(name, data);
  return { result: normalizeUnit(dump, context), dump, context };
}
const get = (object, field) => field.split('.').reduce((value, key) => value?.[key], object);

for (const name of ['grail-knights', 'helstorm', 'bloodthirster']) test(`synthetic: ${name} normalization maps verified raw facts and passes the existing validator`, async () => {
  const { result, dump, context } = await run(name);
  assert.equal(result.sourceKind, 'fixture');
  assert.equal(result.unit.name, dump.unit.displayName);
  assert.equal(result.unit.melee.meleeAttack, 27);
  assert.equal(result.unit.defense.armor, 37);
  assert.equal(result.provenance.identity.caMainUnitKey, dump.unit.caKey);
  assert.notEqual(result.unit.id, dump.unit.caKey);
  assert.deepEqual(validateUnits([result.unit], [context.factionId]), []);
  for (const array of [result.unit.attributes, result.unit.abilities, result.unit.passiveAbilities, result.unit.melee.attackAttributes]) if (array) assert.equal(array.length, new Set(array).size);
});

test('HP, display speed, ammo, reload/accuracy sums, artillery aggregates and effective recruitment are omitted', async () => {
  for (const name of ['grail-knights', 'helstorm', 'bloodthirster']) {
    const { result } = await run(name);
    for (const field of ['entities.totalHealth', 'entities.healthPerEntity', 'entities.count', 'movement.speed', 'movement.groundSpeed', 'movement.chargeSpeed', 'missile.ammunition', 'missile.accuracy.accuracy', 'missile.reload.reloadSkill', 'missile.reload.currentTime', 'campaign.recruitmentRequirements', 'defense.resistances']) {
      assert.equal(get(result.unit, field), undefined, field);
      assert(result.omitted.some((entry) => entry.field === field && entry.kind === 'UNRESOLVED' && entry.reason));
    }
    assert(!result.provenance.fields.some((entry) => entry.kind === 'DERIVED_CONFIRMED'));
  }
  assert.deepEqual((await run('helstorm')).result.unit.entities, {});
  assert.deepEqual((await run('grail-knights')).result.unit.entities, {});
});

test('confirmed numeric zero and false remain values while missing fields stay absent', async () => {
  const [, { normalizationFixture }] = await modules;
  const data = normalizationFixture();
  data.tables.find((table) => table.table === 'melee_weapons_tables').rows.find((row) => row.key === 'synthetic_weapon_a').ap_damage = 0;
  const { result } = await run('grail-knights', data);
  assert.equal(result.unit.melee.damage.armorPiercing, 0);
  assert.equal(result.unit.melee.damage.bonusVsInfantry, 0);
  assert.equal(result.unit.defense.shieldBlockChance, 0);
  assert.equal(result.unit.campaign.upkeep, 0);
  assert.equal(result.unit.movement.canSkirmish, false);
  assert.equal(result.unit.movement.canFly, undefined);
  assert(result.provenance.fields.some((entry) => entry.field === 'campaign.upkeep' && entry.rawValue === 0));
});

test('direct melee damage is stored separately, with totals calculated by the existing helper', async () => {
  const { result } = await run();
  assert.deepEqual(result.unit.melee.damage, { base: 11, armorPiercing: 7, bonusVsLarge: 3, bonusVsInfantry: 0 });
  assert.equal(getTotalDamage(result.unit.melee.damage), 18);
  assert.equal(result.unit.melee.damage.total, undefined);
  assert.equal(result.unit.melee.attackInterval, 2.7);
  assert.equal(result.unit.melee.weaponLength, 0);
});

test('missile direct and explosion fields remain separate, without ammo/reload arithmetic', async () => {
  const { result } = await run('helstorm');
  assert.equal(result.unit.missile.projectile.baseDamage, 23);
  assert.equal(result.unit.missile.projectile.armorPiercingDamage, 47);
  assert.deepEqual(result.unit.missile.explosion, { baseDamage: 12, armorPiercingDamage: 43, radius: 4.7 });
  assert.equal(result.unit.missile.reload.baseTime, 19);
  assert.equal(result.unit.missile.projectile.shotsPerVolley, 5);
  assert.equal(result.unit.missile.projectile.penetration.resistanceBudget, 3);
  assert.equal(result.unit.missile.projectile.penetration.maxPenetrations, undefined);
  assert(result.facts.some((input) => input.source.field === 'primary_ammo' && input.value === 57));
});

test('campaign and custom-battle costs use base rows, never manual/current effective values', async () => {
  for (const [name, expected] of [['grail-knights', 123], ['helstorm', 131], ['bloodthirster', 273]]) {
    const { result } = await run(name);
    assert.equal(result.unit.campaign.recruitmentCost, expected);
    assert.equal(result.unit.customBattle.cost, 419);
    assert.equal(result.provenance.baseValuesOnly, true);
    assert(result.warnings.some((warning) => warning.code === 'base-values-only'));
  }
});

test('every mapped value has exact row/field/schema/pack provenance and valid join pointers', async () => {
  for (const name of ['grail-knights', 'helstorm', 'bloodthirster']) {
    const { result, dump, context } = await run(name);
    const sources = [...dump.rows, ...context.permissionTrace.rows];
    for (const entry of result.provenance.fields) {
      assert.equal(get(result.unit, entry.field), entry.value, entry.field);
      const raw = sources.find((row) => row.id === entry.source.rowId);
      assert(raw, entry.field);
      assert.deepEqual(entry.source.rowKey, raw.key);
      assert.equal(entry.rawValue, raw.row[entry.source.field]);
      assert.equal(entry.source.sourcePack, raw.sourcePack);
      assert.equal(entry.source.path, raw.path);
      assert.equal(entry.source.schemaVersion, raw.tableVersion);
      for (const edge of entry.source.joins) assert(sources.some((row) => row.id === edge.from) && sources.some((row) => row.id === edge.to));
    }
  }
});

test('manual values and serialized observations/hypotheses cannot change normalization or fill unknowns', async () => {
  const [{ normalizeUnit }, , , { renderNormalizationSummary }] = await modules;
  const { result, dump, context } = await run('helstorm');
  const before = JSON.stringify(result);
  dump.observations = [{ label: 'baseDamage', value: 99999 }];
  dump.hypotheses = { totalHealth: 99999, displaySpeed: 99999 };
  dump.manualReference = { totalHealth: 99999 };
  assert.deepEqual(normalizeUnit(dump, context), result);
  const summary = renderNormalizationSummary(result, { values: { baseDamage: 99999, recruitmentCost: 99999 }, notDirectlyComparable: { totalHealth: 99999 } });
  assert(summary.includes('manual=99999'));
  assert(summary.includes('no correction applied'));
  assert.equal(JSON.stringify(result), before);
});

test('unmapped CA ability/attribute IDs are reported with raw source instead of copied into app IDs', async () => {
  const { result } = await run('bloodthirster');
  assert.deepEqual(result.unit.passiveAbilities, ['wounds']);
  const unmapped = (await run()).result;
  // Removing explicit aliases exposes the original synthetic IDs.
  const [{ normalizeUnit }] = await modules;
  const { dump, context } = await run();
  const unknown = normalizeUnit(dump, { ...context, idMappings: { abilities: {}, attributes: {}, movement: {} } });
  assert(unknown.unmapped.some((entry) => entry.caId === 'synthetic_lance' && entry.source.field === 'key'));
  assert(unknown.unmapped.some((entry) => entry.caId === 'synthetic_attribute_a'));
  assert.equal(unknown.unit.abilities, undefined);
  assert.equal(unknown.unit.attributes, undefined);
  assert(unmapped.unit.abilities.includes('lance'));
});

test('movement state has one structured source of truth and duplicate state attributes fail validation', async () => {
  const blood = (await run('bloodthirster')).result.unit, artillery = (await run('helstorm')).result.unit;
  assert.equal(blood.movement.canFly, true);
  assert.equal(artillery.movement.canRun, false);
  assert(!blood.attributes?.includes('can_fly'));
  assert(!artillery.attributes?.includes('cannot_run'));
  const duplicate = { ...blood, attributes: [...(blood.attributes ?? []), 'can_fly'] };
  assert(validateUnits([duplicate], [blood.factionId]).some((issue) => issue.field.startsWith('attributes.')));
});

test('conservative gate rejects strongly-supported and unresolved derivations, including confirmed path-only topics', async () => {
  const [, , { allowsDerived, confirmedDerivations }] = await modules;
  assert.deepEqual(confirmedDerivations, {});
  for (const [topic, formula] of [['displaySpeed', 'x10'], ['totalHealth', 'sum'], ['runtimeOverrides', 'apply_effects'], ['unknown', 'anything']]) assert.equal(allowsDerived(topic, formula), false);
});

test('malformed/missing raw values and removed schema references cannot be filled by convenient rows', async () => {
  const [{ normalizeUnit }] = await modules;
  const { dump, context } = await run();
  const weapon = dump.rows.find((row) => row.table === 'melee_weapons_tables');
  weapon.row.ap_damage = null;
  assert.equal(normalizeUnit(dump, context).unit.melee.damage.armorPiercing, undefined);
  delete weapon.row.damage;
  assert.equal(normalizeUnit(dump, context).unit.melee.damage.base, undefined);
  dump.schemas.find((schema) => schema.table === 'land_units_tables').fields.find((field) => field.name === 'primary_melee_weapon').is_reference = null;
  assert.deepEqual(normalizeUnit(dump, context).unit.melee.damage, {});
});

test('affiliation evidence must contain the selected raw unit and explicit verified military group', async () => {
  const [{ normalizeUnit }] = await modules;
  const { dump, context } = await run();
  assert.throws(() => normalizeUnit(dump, { ...context, militaryGroup: 'guessed_group' }), /verified permission/);
  assert.throws(() => normalizeUnit(dump, { ...context, permissionTrace: undefined }), /permission evidence/);
  const changed = structuredClone(context.permissionTrace);
  changed.relationships[0].value = 'other_unit';
  assert.throws(() => normalizeUnit(dump, { ...context, permissionTrace: changed }), /verified permission/);
});

test('actual traces require the reviewed game version and matching schema/pack affiliation evidence', async () => {
  const [{ normalizeUnit }, , { supportedGameVersion }] = await modules;
  const { dump, context } = await run();
  dump.sourceKind = 'ca-pack';
  dump.unit.gameVersion = supportedGameVersion;
  dump.provenance = { schemaSha256: 'same-schema', packs: [{ file_name: 'db.pack', sha256: 'same-pack' }] };
  context.permissionTrace.sourceKind = 'ca-pack';
  context.permissionTrace.provenance = { ...structuredClone(dump.provenance), gameVersion: supportedGameVersion };
  assert.equal(normalizeUnit(dump, context).sourceKind, 'ca-pack');
  dump.unit.gameVersion = 'unreviewed-version';
  assert.throws(() => normalizeUnit(dump, context), /reviewed normalization policy/);
  dump.unit.gameVersion = supportedGameVersion;
  context.permissionTrace.provenance.schemaSha256 = 'other-schema';
  assert.throws(() => normalizeUnit(dump, context), /differ in game\/schema\/pack version/);
  context.permissionTrace.provenance.schemaSha256 = 'same-schema';
  context.permissionTrace.provenance.packs[0].sha256 = 'other-pack';
  assert.throws(() => normalizeUnit(dump, context), /differ in game\/schema\/pack version/);
});

test('conflicting active/passive flags stay unmapped and never choose one by name', async () => {
  const [{ normalizeUnit }] = await modules;
  const { dump, context } = await run();
  dump.rows.find((row) => row.table === 'unit_special_abilities_tables' && row.row.key === 'synthetic_lance').row.passive = true;
  const result = normalizeUnit(dump, context);
  assert.equal(result.unit.abilities, undefined);
  assert(result.unmapped.some((entry) => entry.caId === 'synthetic_lance' && entry.reason.includes('conflicting')));
});

test('normalization IDs are deterministic and CLI excludes unknown/research profiles before reading artifacts', async () => {
  assert.equal((await run()).result.unit.id, (await run()).result.unit.id);
  const command = spawnSync(process.execPath, ['tools/wh3-importer/normalize-cli.mjs', 'handgunners'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' });
  assert.equal(command.status, 1);
  assert(command.stderr.includes('Unknown unit profile'));
  assert(!command.stdout.includes('Connecting'));
});

test('source fallback and group descriptions are separate from detailed importer provenance', async () => {
  const { result } = await run();
  assert(result.unit.source.includes('Synthetic fixture'));
  assert(result.unit.sources.campaign.startsWith(result.unit.source));
  assert(result.unit.sources.campaign.includes('recruitment_cost'));
  assert.notEqual(result.unit.sources.publicStats, result.unit.sources.hiddenStats);
  assert(result.provenance.generatedMetadata.some((entry) => entry.field === 'sources.campaign'));
  assert.equal(result.unit.provenance, undefined);
  const labels = await readFile(path.join(__dirname, '../src/domain/unitLabels.ts'), 'utf8');
  assert(labels.includes("banished: '추방됨'"));
});
