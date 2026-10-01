import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolveOptions, extractUnit } from './extract.mjs';
import { inspectSource } from './inspect.mjs';
import { normalizeUnit } from './normalization/normalizer.mjs';
import { normalizationTargets } from './normalization/catalog.mjs';
import { loadUnitValidator } from './normalization/validation.mjs';
import { openRawSource } from './extract.mjs';
import { attemptSample } from './pilot.mjs';
import { representativeCatalog } from './pilot-catalog.mjs';

// Expected keys were discovered in CA localisation/DB, never used for discovery.
for (const [profile, expectedKey] of Object.entries({
  'grail-knights': 'wh_main_brt_cav_grail_knights',
  helstorm: 'wh_main_emp_art_helstorm_rocket_battery',
  bloodthirster: 'wh3_main_kho_mon_bloodthirster_0',
})) test(`opt-in: extract and conservatively normalize ${profile} from actual CA packs through installed RPFM`, { skip: !process.env.WH3_GAME_PATH && !process.env.WH3_INTEGRATION_CONFIG ? 'Set WH3_GAME_PATH or WH3_INTEGRATION_CONFIG and start RPFM to opt in.' : false }, async () => {
  const args = ['--output-dir', fileURLToPath(new URL('.local/integration/', import.meta.url))];
  if (process.env.WH3_INTEGRATION_CONFIG) args.push('--config', process.env.WH3_INTEGRATION_CONFIG);
  const options = await resolveOptions(args);
  const result = await extractUnit(options, profile, () => {});
  const persisted = JSON.parse(await readFile(result.jsonPath, 'utf8'));
  assert.equal(persisted.sourceKind, 'ca-pack');
  assert.equal(persisted.unit.caKey, expectedKey);
  assert(persisted.rows.some((row) => row.table === 'main_units_tables'));
  assert(persisted.rows.some((row) => row.table === 'melee_weapons_tables'));
  assert(persisted.provenance.packs.every((pack) => ['Release', 'Patch'].includes(pack.pfh_file_type)));
  assert.equal(persisted.rows.filter((row) => row.table === 'main_units_tables').length, 1);
  assert.equal(persisted.rows.filter((row) => row.table === 'land_units_tables').length, 1);
  assert.equal(persisted.discovery.candidates.filter((candidate) => candidate.selectedByPolicy).length, 1);
  assert(!persisted.rows.some((row) => row.sourcePack === 'synthetic-fixture.pack'));
  assert((await readFile(result.summaryPath, 'utf8')).includes('Manual reference comparison'));
  // Query only the freshly discovered main key. Permission evidence is live
  // CA data from the same game/schema/packs, never a fixture or guessed alias.
  const permissionTrace = await inspectSource(options, { queries: [
    { table: 'main_units_tables', where: [{ field: 'unit', op: 'eq', value: persisted.unit.caKey }] },
    { table: 'units_to_groupings_military_permissions_tables', where: [{ field: 'unit', op: 'eq', value: persisted.unit.caKey }] },
  ] });
  const normalized = normalizeUnit(persisted, { ...normalizationTargets[profile], permissionTrace });
  const validateUnits = await loadUnitValidator();
  assert.deepEqual(validateUnits([normalized.unit], Object.values(normalizationTargets).map((target) => target.factionId)), []);
  assert.equal(normalized.sourceKind, 'ca-pack');
  assert(normalized.provenance.fields.every((entry) => ['DIRECT', 'GENERATED', 'CURATED'].includes(entry.kind) && entry.source.sourcePack !== 'synthetic-fixture.pack'));
  assert.equal(normalized.provenance.fields.find(entry => entry.field === 'id').kind, 'GENERATED');
  assert.equal(normalized.provenance.fields.find(entry => entry.field === 'factionId').kind, 'CURATED');
  assert.equal(normalized.unit.entities.totalHealth, undefined);
  assert.equal(normalized.unit.entities.count, undefined);
  assert.equal(normalized.unit.movement.speed, undefined);
  assert.equal(normalized.unit.missile?.ammunition, undefined);
  assert.equal(normalized.unit.campaign.recruitmentRequirements, undefined);
  for (const array of [normalized.unit.attributes, normalized.unit.abilities, normalized.unit.passiveAbilities]) if (array) assert.equal(array.length, new Set(array).size);
  for (const entry of normalized.provenance.fields) {
    const row = [...persisted.rows, ...permissionTrace.rows].find((row) => row.id === entry.source.rowId);
    assert(row && row.row[entry.source.field] === entry.rawValue, entry.field);
    assert.equal(entry.field.split('.').reduce((object, key) => object?.[key], normalized.unit), entry.value, entry.field);
  }
  const raw = (label) => persisted.observations.find((entry) => entry.label === label);
  if (profile === 'grail-knights') {
    assert.equal(persisted.rows.length, 52, 'verified base trace regression');
    assert.equal(raw('recruitmentCost').value, 1850);
    assert.equal(raw('apDamage').value, 28);
    assert.equal(normalized.unit.melee.damage.armorPiercing, 28);
    assert.equal(normalized.unit.campaign.recruitmentCost, 1850);
    assert.deepEqual(normalized.unit.entities, {});
    assert.deepEqual(normalized.unit.abilities, ['lance']);
    assert.deepEqual(normalized.unit.passiveAbilities, ['blessing_of_the_lady']);
    assert(!persisted.rows.some((row) => row.table === 'projectiles_tables' || row.table === 'special_ability_phases_tables'));
  }
  if (profile === 'helstorm') {
    for (const label of ['missileWeaponKey', 'projectileKey', 'explosionBaseDamage', 'penetrationBudget', 'engineHitPoints', 'manEntityHitPoints', 'baseReloadTime', 'landAccuracy']) assert.equal(raw(label).status, 'raw');
    assert(persisted.relationships.some((edge) => edge.field === 'default_projectile'));
    assert(persisted.relationships.some((edge) => edge.field === 'explosion_type'));
    assert.deepEqual(normalized.unit.entities, {});
    assert.equal(normalized.unit.movement.canRun, false);
    assert(!normalized.unit.attributes?.includes('cannot_run'));
    assert.equal(normalized.unit.missile.projectile.armorPiercingDamage, 70);
    assert.equal(normalized.unit.missile.explosion.armorPiercingDamage, 51);
    assert.equal(normalized.unit.missile.reload.baseTime, 17);
    assert.equal(normalized.unit.missile.reload.reloadSkill, undefined);
  }
  if (profile === 'bloodthirster') {
    for (const label of ['manEntityFlySpeed', 'manEntityRunSpeed', 'damageModPhysical', 'damageModMagic']) assert.equal(raw(label).status, 'raw');
    assert(persisted.rows.some((row) => row.table === 'unit_attributes_tables' && row.row.key === 'flying'));
    assert(persisted.rows.some((row) => row.table === 'special_ability_phase_stat_effects_tables'));
    assert(persisted.rows.some((row) => row.table === 'Loc' && row.row.text === 'Wounds'));
    assert.equal(normalized.unit.entities.mass, 4000);
    assert.equal(normalized.unit.entities.entitySize, 'very_large');
    assert.equal(normalized.unit.movement.canFly, true);
    assert.equal(normalized.unit.movement.groundSpeed, undefined);
    assert(!normalized.unit.attributes?.includes('can_fly'));
    assert.deepEqual([...normalized.unit.passiveAbilities].sort(), ['banished', 'daemonic_instability', 'wounds']);
    assert(!normalized.unit.passiveAbilities.includes('banishment'));
    assert.equal(normalized.unit.defense.resistances, undefined);
  }
});

test('opt-in: representative current stat label and experience evidence exists in CA packs', { skip: !process.env.WH3_GAME_PATH && !process.env.WH3_INTEGRATION_CONFIG ? 'Set WH3_GAME_PATH or WH3_INTEGRATION_CONFIG and start RPFM to opt in.' : false }, async () => {
  const args = process.env.WH3_INTEGRATION_CONFIG ? ['--config', process.env.WH3_INTEGRATION_CONFIG] : [];
  const result = await inspectSource(await resolveOptions(args), { queries: [
    { table: 'ui_unit_stats_tables', where: [{ field: 'key', op: 'eq', value: 'stat_resistance_magic' }] },
    { table: 'unit_stat_localisations_tables', where: [{ field: 'stat_key', op: 'eq', value: 'stat_resistance_magic' }] },
    { table: 'Loc:text/db/unit_stat_localisations__.loc', where: [{ field: 'key', op: 'eq', value: 'unit_stat_localisations_onscreen_name_stat_resistance_magic' }] },
    { table: 'unit_experience_bonuses_tables', where: [{ field: 'stat', op: 'eq', value: 'stat_reloading' }] },
  ] });
  assert.equal(result.sourceKind, 'ca-pack');
  assert(result.rows.some((row) => row.table === 'Loc' && row.row.text.includes('Spell Resistance')));
  assert(result.rows.some((row) => row.table === 'unit_experience_bonuses_tables' && row.row.value === 1));
  assert(result.relationships.some((edge) => edge.field === 'localisation' && edge.evidence.includes('is_reference')));
  assert(result.relationships.some((edge) => edge.field === 'onscreen_name' && edge.evidence.includes('localised_fields')));
  assert(result.provenance.packs.every((pack) => /^[a-f0-9]{64}$/.test(pack.sha256)));
});

test('opt-in: generic pilot subset preserves ambiguity, untraced missile evidence and reader cache', { skip: !process.env.WH3_GAME_PATH && !process.env.WH3_INTEGRATION_CONFIG ? 'Set WH3_GAME_PATH or WH3_INTEGRATION_CONFIG and start RPFM to opt in.' : false }, async () => {
  const args = process.env.WH3_INTEGRATION_CONFIG ? ['--config', process.env.WH3_INTEGRATION_CONFIG] : [];
  const source = await openRawSource(await resolveOptions(args), () => {});
  try {
    const validate = await loadUnitValidator();
    const results = [];
    for (const displayName of ['Dragon Ogres', 'Handgunners', 'Dread Saurian']) results.push(await attemptSample(source, representativeCatalog.find(s => s.displayName === displayName), validate));
    assert.deepEqual(results.map(r => r.status), ['CLEAN', 'BLOCKED', 'PARTIAL']);
    assert.equal(results[0].dump.sourceKind, 'ca-pack');
    assert(results[1].discovery.candidates.length > 1);
    assert.equal(results[1].normalized, null);
    assert(results[2].exceptions.some(e => e.category === 'UNKNOWN_MISSILE_CHAIN'));
    assert.notEqual(results[2].coverage['missile.range'].status, 'NOT_APPLICABLE');
    const before = source.reader.cache.size;
    const first = await source.reader.tables('land_units_tables');
    const second = await source.reader.tables('land_units_tables');
    assert.equal(source.reader.cache.size, before);
    assert.equal(first[0], second[0]);
  } finally { await source.client.close(); }
});
