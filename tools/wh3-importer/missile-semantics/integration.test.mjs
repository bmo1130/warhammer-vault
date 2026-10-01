import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { missileSourceContract, summarizeMissileSources, verifyMissileInspection } from './contract.mjs';
import { requireSameSource, connected } from '../blocker-review/evidence.mjs';
import { loadUnitValidator } from '../normalization/validation.mjs';
import { diagnosticFactionIds } from '../catalog-identity/materialize.mjs';

const directory = process.env.WH3_MISSILE_REVIEW_DIR;
const options = { skip: directory ? false : 'Run missile-semantics/cli.mjs and set WH3_MISSILE_REVIEW_DIR to its COMPLETE output.' };
const read = async file => JSON.parse(await readFile(file, 'utf8'));
async function actual() {
  const manifest = await read(path.join(directory, 'manifest.json'));
  assert.equal(manifest.status, 'COMPLETE'); assert.equal(manifest.sourceKind, 'ca-pack');
  assert.equal(manifest.fullImport, false); assert.equal(manifest.gameExecuted, false);
  const results = await Promise.all(manifest.results.map(r => read(path.join(directory, r.file))));
  for (const r of results) {
    requireSameSource(r.inspection.evidence.provenance, manifest.provenance);
    assert.deepEqual(missileSourceContract(r.inspection.evidence, r.inspection.contract.source), r.inspection.contract);
    assert(r.inspection.evidence.rows.length <= 400 && r.inspection.evidence.steps.length <= 100);
  }
  const byKey = key => { const matches = results.filter(r => r.mainKey === key); assert.equal(matches.length, 1); return matches[0]; };
  return { manifest, results, byKey };
}
test('actual bounded CA sidecars retain 40 paths for 24 sources without broken chains or runtime claims', options, async () => {
  const { manifest, results } = await actual();
  const { diagnosticNormalization, ...graphMetrics } = manifest.metrics;
  assert.deepEqual(summarizeMissileSources(results.map(r => r.inspection.contract)), graphMetrics);
  assert.equal(diagnosticNormalization.attempted, 24); assert.equal(diagnosticNormalization.validated, 24);
  assert.equal(diagnosticNormalization.blocked, 0); assert.equal(diagnosticNormalization.fullMissileProfiles, 0);
  assert.equal(manifest.metrics.unitsInspected, 24); assert.equal(manifest.metrics.missilePaths, 40);
  assert.equal(manifest.metrics.distinctWeaponKeys, 17); assert.equal(manifest.metrics.distinctProjectileKeys, 17);
  assert.equal(manifest.metrics.incompleteChains, 0); assert.equal(manifest.metrics.staticSingle, 5); assert.equal(manifest.metrics.staticMulti, 7);
  assert.equal(manifest.metrics.runtimeRequiredUnits, 7); assert.equal(manifest.metrics.conditionalUnits, 4);
  assert.deepEqual(manifest.metrics.roles, { ENGINE: 2, JUNCTION_STATS_OVERRIDE: 1, LAND_PRIMARY: 9, MAIN_SPECIFIC_JUNCTION: 5, RIDER: 23 });
  for (const r of results) for (const p of r.inspection.contract.paths) {
    assert.equal(p.sourceMainKey, r.mainKey); assert.equal(p.activation.active, 'UNKNOWN');
    assert.equal(p.activation.precedence, 'UNRESOLVED'); assert.equal(p.activation.combination, 'UNRESOLVED');
    assert.equal(p.provenance.kind, 'DIRECT'); assert(p.weaponKey && p.projectilePaths.length);
    assert(p.edges.every(e => r.inspection.evidence.relationships.some(x => JSON.stringify(x) === JSON.stringify(e))));
  }
});
test('actual Empire shared-land pairs keep ordinary junctions and stats overrides off Supply sources', options, async () => {
  const { byKey } = await actual();
  for (const [ordinary, supply, counts] of [
    ['wh_main_emp_art_helstorm_rocket_battery', 'wh2_dlc13_emp_art_helstorm_rocket_battery_imperial_supply', [2, 1]],
    ['wh_main_emp_inf_handgunners', 'wh2_dlc13_emp_inf_handgunners_imperial_supply', [2, 1]],
    ['wh_main_emp_veh_steam_tank', 'wh2_dlc13_emp_veh_steam_tank_imperial_supply', [6, 4]],
  ]) {
    const a = byKey(ordinary).inspection.contract, b = byKey(supply).inspection.contract;
    assert.equal(a.source.landKey, b.source.landKey); assert.deepEqual([a.paths.length, b.paths.length], counts);
    assert.equal(a.paths.filter(p => p.role === 'MAIN_SPECIFIC_JUNCTION').length, 1);
    assert(!b.paths.some(p => ['MAIN_SPECIFIC_JUNCTION', 'JUNCTION_STATS_OVERRIDE'].includes(p.role)));
    assert.equal(new Set([...a.paths, ...b.paths].map(p => p.pathId)).size, a.paths.length + b.paths.length);
  }
  const steam = byKey('wh_main_emp_veh_steam_tank').inspection.contract;
  assert.equal(steam.paths.filter(p => p.role === 'RIDER').length, 3);
  assert.equal(steam.paths.filter(p => p.role === 'JUNCTION_STATS_OVERRIDE').length, 1);
  assert.equal(steam.paths.filter(p => p.weaponKey === 'wh_main_emp_steam_tank_cannon_ball').length, 3);
});
test('actual Free Company retains both effect branches, skill/bundle/ritual evidence and unresolved activation', options, async () => {
  const { byKey } = await actual(), { evidence, contract } = byKey('wh_dlc04_emp_inf_free_company_militia_0').inspection;
  assert.equal(contract.paths.length, 3);
  const conditional = contract.paths.filter(p => p.activation.placement === 'CONDITIONAL'); assert.equal(conditional.length, 2);
  const sources = conditional.flatMap(p => p.condition.enablingEffects.flatMap(e => e.conditions));
  assert(sources.some(c => c.raw.character_skill_key === 'wh2_dlc17_skill_emp_volkmar_unique_mere_mortal_men'));
  assert(sources.some(c => c.raw.effect_bundle_key === 'wh3_dlc25_ritual_emp_don_inf_guns_3'));
  assert(evidence.rows.some(r => r.table === 'rituals_tables'));
  assert(contract.conditionEvidence.edges.some(e => e.field === 'payload'));
  for (const p of conditional) for (const bonus of p.condition.enablingEffects) {
    const row = evidence.rows.find(r => r.id === bonus.rowId);
    assert(connected(evidence, row, 'effect', 'effects_tables').length === 1);
    assert(connected(evidence, row, 'missile_weapon_junction', 'unit_missile_weapon_junctions_tables').some(x => x.row.id === p.owner.junctionRowId));
  }
});
test('actual Dread Saurian and Necrofex retain attachment identities and raw pool/fire flags without arithmetic', options, async () => {
  const { byKey } = await actual();
  const dread = byKey('wh2_dlc13_lzd_mon_dread_saurian_1').inspection.contract;
  assert.equal(dread.paths.length, 12); assert(dread.paths.every(p => p.role === 'RIDER'));
  assert.equal(dread.paths.filter(p => p.weaponKey === 'wh2_main_lzd_mon_stegadon_blowpipe').length, 2);
  assert.equal(dread.paths.filter(p => p.weaponKey === 'wh2_main_lzd_javelin_rider').length, 10);
  assert.equal(dread.paths.filter(p => p.rawWeaponFlags.use_secondary_ammo_pool.value === false).length, 2);
  assert.equal(dread.paths.filter(p => p.rawWeaponFlags.use_secondary_ammo_pool.value === true).length, 10);
  const necro = byKey('wh2_dlc11_cst_mon_necrofex_colossus_0').inspection.contract;
  assert.equal(necro.paths.length, 6); assert.equal(necro.paths.filter(p => p.role === 'LAND_PRIMARY').length, 1);
  assert.equal(necro.paths.filter(p => p.role === 'RIDER').length, 5);
  for (const c of [dread, necro]) {
    assert.equal(new Set(c.paths.map(p => p.pathId)).size, c.paths.length);
    assert.equal(c.displayedAmmo, undefined); assert.equal(c.shotsPerVolley, undefined); assert.equal(c.entityCount, undefined);
    assert.equal(c.completeness, 'STRUCTURE_KNOWN_RUNTIME_UNRESOLVED');
  }
});
test('actual single primary and melee absence stay distinct from complex runtime-unresolved structures', options, async () => {
  const { byKey } = await actual();
  const ranged = byKey('wh2_dlc12_skv_inf_ratling_gun_0').inspection.contract;
  const melee = byKey('wh_main_emp_inf_swordsmen').inspection.contract;
  assert.equal(ranged.completeness, 'COMPLETE_STATIC_SINGLE'); assert.equal(ranged.paths[0].role, 'LAND_PRIMARY');
  assert.equal(melee.completeness, 'NO_MISSILE_PATH'); assert.equal(melee.paths.length, 0);
  assert.equal(melee.ammo.primary_ammo.value, 0); assert.equal(melee.ammo.secondary_ammo.value, 0);
});
test('actual complex comparison normalization also withholds Free Company/Necrofex profiles without changing the legacy pilot', options, async () => {
  const { byKey } = await actual();
  for (const key of ['wh_dlc04_emp_inf_free_company_militia_0', 'wh2_dlc13_lzd_mon_dread_saurian_1', 'wh2_dlc11_cst_mon_necrofex_colossus_0']) {
    const r = byKey(key); assert.equal(r.diagnostic.status, 'MATERIALIZED'); assert(r.diagnostic.validation.passed);
    assert.equal(r.diagnostic.normalized.unit.missile, undefined); assert.equal(r.productionEligible, false);
    assert.equal(r.diagnostic.normalized.unit.entities.count, undefined);
  }
});
test('actual context results validate independently; exactly four Units withhold 46 missile fields and preserve all other values', options, async () => {
  const { manifest } = await actual();
  const m = await read(path.join(manifest.contextDir, 'manifest.json'));
  const results = await Promise.all(m.results.map(r => read(path.join(manifest.contextDir, r.file))));
  const validate = await loadUnitValidator(); assert.deepEqual(validate(results.map(r => r.unit), diagnosticFactionIds), []);
  assert.equal(m.metrics.partial, 19); assert.equal(m.metrics.blocked, 0); assert.equal(m.metrics.validationFailures, 0);
  assert.equal(m.metrics.productionEligible, 0); assert.equal(m.metrics.defaultVisible, 12); assert.equal(m.metrics.contextOnly, 7);
  let units = 0, fields = 0;
  for (const r of results) {
    verifyMissileInspection(r.missileInspection, r.dump);
    const withheld = r.normalized.missilePresentation.withheldFields;
    if (withheld.length) { units++; fields += withheld.length; assert.equal(r.unit.missile, undefined); }
    assert(!r.provenance.fields.some(f => f.field.startsWith('missileSources') || f.field.startsWith('activation')));
    assert(!r.productionEligible); assert.equal(r.unit.missile?.ammunition, undefined);
  }
  assert.equal(units, 4); assert.equal(fields, 46);
  assert.deepEqual(m.metrics.unitFieldProvenance, { DIRECT: 497, GENERATED: 19, CURATED: 80 });
});
test('actual canonical graph and path IDs survive reversed row/edge/coverage ordering', options, async () => {
  const { results } = await actual();
  for (const r of results) {
    const e = structuredClone(r.inspection.evidence); e.rows.reverse(); e.relationships.reverse(); e.coverage.reverse();
    assert.deepEqual(missileSourceContract(e, r.inspection.contract.source), r.inspection.contract);
  }
});
