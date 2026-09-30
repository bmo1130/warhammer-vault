const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const modules = Promise.all([
  import('../tools/wh3-importer/trace-unit.mjs'),
  import('../tools/wh3-importer/profiles.mjs'),
  import('../tools/wh3-importer/fixtures/profiles.mjs'),
  import('../tools/wh3-importer/fixtures/tables.mjs'),
  import('../tools/wh3-importer/report.mjs'),
]);
async function trace(name, fixture) {
  const [{ traceUnit }, { getProfile }, { threeProfileFixture }] = await modules;
  fixture ??= threeProfileFixture();
  return traceUnit(fixture.reader, fixture.schema, fixture.localisation, {}, getProfile(name), [fixture.abilityLocalisation]);
}
const value = (entries, label) => entries.find((entry) => entry.label === label)?.value;

test('each profile discovers its own localisation root and records rejected variants', async () => {
  const expected = { 'grail-knights': 'synthetic_root_a', helstorm: 'synthetic_helstorm', bloodthirster: 'synthetic_bloodthirster' };
  for (const [name, key] of Object.entries(expected)) {
    const dump = await trace(name);
    assert.equal(dump.unit.caKey, key);
    assert.equal(dump.sourceKind, 'fixture');
    assert.equal(dump.discovery.candidates.filter((candidate) => candidate.selectedByPolicy).length, 1);
    assert.equal(dump.discovery.candidates.length, name === 'grail-knights' ? 1 : 2);
  }
});

test('Grail default API preserves explicit-profile rows, joins, schemas and observations', async () => {
  const [{ traceUnit }, { getProfile }, , { fixtureDataset }, { observations }] = await modules;
  const fixture = fixtureDataset();
  const before = await traceUnit(fixture.reader, fixture.schema, fixture.localisation);
  const after = await traceUnit(fixture.reader, fixture.schema, fixture.localisation, {}, getProfile('grail-knights'));
  for (const field of ['rows', 'schemas', 'relationships', 'skippedReferences']) assert.deepEqual(after[field], before[field]);
  assert.deepEqual(observations(after), observations(before));
  assert.equal(value(observations(after), 'baseDamage'), 11);
  assert.equal(after.rows.filter((row) => row.table === 'main_units_tables').length, 1);
});

test('Helstorm follows engine missile weapon and default projectile only through schema references', async () => {
  const [, , { threeProfileFixture }] = await modules;
  const fixture = threeProfileFixture();
  const dump = await trace('helstorm', fixture);
  const tables = new Map(dump.rows.map((row) => [row.id, row.table]));
  for (const [from, field, to] of [
    ['land_units_tables', 'engine', 'battlefield_engines_tables'],
    ['battlefield_engines_tables', 'missile_weapon', 'missile_weapons_tables'],
    ['missile_weapons_tables', 'default_projectile', 'projectiles_tables'],
  ]) assert(dump.relationships.some((edge) => tables.get(edge.from) === from && edge.field === field && tables.get(edge.to) === to && edge.evidence.includes('is_reference')));
  fixture.tables.find((table) => table.table === 'missile_weapons_tables').fields.find((field) => field.name === 'default_projectile').is_reference = null;
  assert(!(await trace('helstorm', fixture)).rows.some((row) => row.table === 'projectiles_tables'));
});

test('projectile explosion and penetration chains preserve separate raw damage and missing joins', async () => {
  const [, , { threeProfileFixture }, , { observations }] = await modules;
  const fixture = threeProfileFixture();
  const dump = await trace('helstorm', fixture);
  const entries = observations(dump);
  assert.equal(value(entries, 'directBaseDamage'), 23);
  assert.equal(value(entries, 'directApDamage'), 47);
  assert.equal(value(entries, 'explosionBaseDamage'), 12);
  assert.equal(value(entries, 'explosionApDamage'), 43);
  assert.equal(value(entries, 'penetrationBudget'), 3);
  assert(!Object.hasOwn(dump, 'missileStrength'));
  fixture.tables.find((table) => table.table === 'projectiles_explosions_tables').rows = [];
  const missing = await trace('helstorm', fixture);
  assert(missing.unresolved.some((issue) => issue.field.endsWith('.explosion_type')));
  assert.equal(observations(missing).find((entry) => entry.label === 'explosionBaseDamage').status, 'unresolved');
});

test('reload, accuracy, ammo and projectile counts remain independent raw values including zero', async () => {
  const [, , { threeProfileFixture }, , { observations }] = await modules;
  const fixture = threeProfileFixture();
  fixture.tables.find((table) => table.table === 'land_units_tables').rows.find((row) => row.key === 'synthetic_hel_land').reload = 0;
  const entries = observations(await trace('helstorm', fixture));
  for (const [label, expected] of Object.entries({ landReload: 0, baseReloadTime: 19, landAccuracy: 13, marksmanshipBonus: 8, calibrationDistance: 271, calibrationArea: 143, primaryAmmo: 57, shotsPerVolley: 5, projectileNumber: 2 })) assert.equal(value(entries, label), expected);
  assert(!entries.some((entry) => ['currentReloadTime', 'missileStrength', 'displayedAmmunition'].includes(entry.label)));
});

test('shared artillery entity/engine never imports another land unit or building membership', async () => {
  const dump = await trace('helstorm');
  assert.equal(dump.rows.filter((row) => row.table === 'land_units_tables').length, 1);
  assert.equal(dump.rows.filter((row) => row.table === 'main_units_tables').length, 1);
  assert(dump.rows.some((row) => row.row.key === 'synthetic_shared_engine'));
  assert(!dump.rows.some((row) => Object.values(row.row).includes('synthetic_other_land')));
  assert(!dump.rows.some((row) => row.row.unit === 'synthetic_supply'));
});

test('Bloodthirster flight is raw entity movement plus schema-backed attribute membership', async () => {
  const [, , , , { observations }] = await modules;
  const dump = await trace('bloodthirster');
  const entries = observations(dump);
  assert.equal(value(entries, 'manEntityRunSpeed'), 3.7);
  assert.equal(value(entries, 'manEntityFlySpeed'), 7.9);
  assert(dump.rows.some((row) => row.table === 'unit_attributes_tables' && row.row.key === 'synthetic_flying'));
  assert(!entries.some((entry) => entry.label === 'displaySpeed'));
  assert.equal(entries.find((entry) => entry.label === 'manEntityFlySpeed').source.field, 'fly_speed');
});

test('resistance base fields and ability phase effects stay separate, with child Loc provenance', async () => {
  const [, , , , { observations }] = await modules;
  const dump = await trace('bloodthirster');
  assert.equal(value(observations(dump), 'damageModPhysical'), 17);
  const effect = dump.rows.find((row) => row.table === 'special_ability_phase_stat_effects_tables' && row.row.stat === 'stat_resistance_physical');
  assert.equal(effect.row.value, 7);
  assert.equal(effect.row.how, 'add');
  assert(dump.relationships.some((edge) => edge.from === effect.id && edge.field === 'phase' && edge.direction === 'reverse'));
  assert(dump.rows.some((row) => row.table === 'Loc' && row.row.text === 'Synthetic passive label' && row.path === 'text/db/synthetic_abilities.loc'));
  assert(dump.skippedReferences.some((edge) => edge.field === 'spawned_unit' && edge.value === 'synthetic_other_land'));
  assert(!dump.rows.some((row) => row.table === 'land_units_tables' && row.row.key === 'synthetic_other_land'));
  assert(!dump.rows.some((row) => row.table === 'unit_attributes_groups_tables' && row.row.group_name === 'synthetic_group_a'));
});

test('manual references never fill unknowns or change any profile raw rows', async () => {
  const [, , , , { observations, addObservationUnresolved, renderSummary }] = await modules;
  for (const name of ['grail-knights', 'helstorm', 'bloodthirster']) {
    const dump = await trace(name);
    const entries = observations(dump);
    addObservationUnresolved(dump, entries);
    const manualFile = name === 'grail-knights' ? 'manual-reference.json' : `manual-references/${name}.json`;
    const manual = JSON.parse(await readFile(path.join(__dirname, '../tools/wh3-importer', manualFile)));
    const before = JSON.stringify(dump);
    const summary = renderSummary(dump, entries, manual);
    assert.equal(JSON.stringify(dump), before);
    assert(!Object.hasOwn(dump, 'totalHealth'));
    assert(dump.unresolved.some((issue) => issue.field === 'totalHealth'));
    assert(summary.includes('conversion/semantics unresolved'));
    assert(!entries.some((entry) => entry.label === 'totalWeaponDamage'));
    if (name === 'helstorm') assert.equal(entries.find((entry) => entry.label === 'customBattleCost').status, 'unresolved');
  }
});

test('three profiles cannot mix each other unit roots or scopes', async () => {
  const [, , { threeProfileFixture }] = await modules;
  const fixture = threeProfileFixture();
  const dumps = await Promise.all(['grail-knights', 'helstorm', 'bloodthirster'].map((name) => trace(name, fixture)));
  assert.equal(new Set(dumps.map((dump) => dump.rootRow)).size, 3);
  for (const dump of dumps) assert.deepEqual(dump.rows.filter((row) => row.table === 'main_units_tables').map((row) => row.row.unit), [dump.unit.caKey]);
  assert(!dumps[0].rows.some((row) => row.table === 'projectiles_tables' || row.table === 'special_ability_phases_tables'));
  assert(!dumps[1].rows.some((row) => row.table === 'special_ability_phases_tables'));
  assert(!dumps[2].rows.some((row) => row.table === 'projectiles_tables'));
});

test('paid recruitment policy still rejects multiple accepted roots and missing cost evidence', async () => {
  const [, , { threeProfileFixture }] = await modules;
  const fixture = threeProfileFixture();
  const main = fixture.tables.find((table) => table.table === 'main_units_tables');
  main.rows.find((row) => row.unit === 'synthetic_supply').recruitment_cost = 1;
  await assert.rejects(trace('helstorm', fixture), /found 2.*Candidates:.*synthetic_supply/);
  delete main.rows.find((row) => row.unit === 'synthetic_supply').recruitment_cost;
  delete main.rows.find((row) => row.unit === 'synthetic_helstorm').recruitment_cost;
  await assert.rejects(trace('helstorm', fixture), /found 0.*recruitmentCost.*null/);
});

test('profiles contain no CA keys/stats, and CLI rejects unknown profiles before game access', async () => {
  const [, { getProfile, unitProfiles }] = await modules;
  assert.throws(() => getProfile('unknown-profile'), /Unknown unit profile/);
  for (const profile of Object.values(unitProfiles)) assert.deepEqual(Object.keys(profile).sort(), ['displayName', 'rootSelection', 'scopes', 'slug']);
  assert(!JSON.stringify(unitProfiles).includes('wh_main_'));
  const command = spawnSync(process.execPath, ['tools/wh3-importer/cli.mjs', 'unknown-profile'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' });
  assert.equal(command.status, 1);
  assert(command.stderr.includes('Unknown unit profile'));
  assert(!command.stdout.includes('Connecting'));
});
