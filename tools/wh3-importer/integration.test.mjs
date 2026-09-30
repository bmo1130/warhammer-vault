import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolveOptions, extractUnit } from './extract.mjs';

// Expected keys were discovered in CA localisation/DB, never used for discovery.
for (const [profile, expectedKey] of Object.entries({
  'grail-knights': 'wh_main_brt_cav_grail_knights',
  helstorm: 'wh_main_emp_art_helstorm_rocket_battery',
  bloodthirster: 'wh3_main_kho_mon_bloodthirster_0',
})) test(`opt-in: read ${profile} from actual CA packs through installed RPFM`, { skip: !process.env.WH3_GAME_PATH && !process.env.WH3_INTEGRATION_CONFIG ? 'Set WH3_GAME_PATH or WH3_INTEGRATION_CONFIG and start RPFM to opt in.' : false }, async () => {
  const args = ['--output-dir', fileURLToPath(new URL('.local/integration/', import.meta.url))];
  if (process.env.WH3_INTEGRATION_CONFIG) args.push('--config', process.env.WH3_INTEGRATION_CONFIG);
  const result = await extractUnit(await resolveOptions(args), profile, () => {});
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
  const raw = (label) => persisted.observations.find((entry) => entry.label === label);
  if (profile === 'grail-knights') {
    assert.equal(persisted.rows.length, 52, 'verified base trace regression');
    assert.equal(raw('recruitmentCost').value, 1850);
    assert.equal(raw('apDamage').value, 28);
    assert(!persisted.rows.some((row) => row.table === 'projectiles_tables' || row.table === 'special_ability_phases_tables'));
  }
  if (profile === 'helstorm') {
    for (const label of ['missileWeaponKey', 'projectileKey', 'explosionBaseDamage', 'penetrationBudget', 'engineHitPoints', 'manEntityHitPoints', 'baseReloadTime', 'landAccuracy']) assert.equal(raw(label).status, 'raw');
    assert(persisted.relationships.some((edge) => edge.field === 'default_projectile'));
    assert(persisted.relationships.some((edge) => edge.field === 'explosion_type'));
  }
  if (profile === 'bloodthirster') {
    for (const label of ['manEntityFlySpeed', 'manEntityRunSpeed', 'damageModPhysical', 'damageModMagic']) assert.equal(raw(label).status, 'raw');
    assert(persisted.rows.some((row) => row.table === 'unit_attributes_tables' && row.row.key === 'flying'));
    assert(persisted.rows.some((row) => row.table === 'special_ability_phase_stat_effects_tables'));
    assert(persisted.rows.some((row) => row.table === 'Loc' && row.row.text === 'Wounds'));
  }
});
