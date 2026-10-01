import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { entityStructureContract, summarizeEntityStructures, verifyEntityInspection } from './contract.mjs';
import { compareEntityNormalization } from './cli.mjs';
import { loadUnitValidator } from '../normalization/validation.mjs';
import { requireSameSource } from '../blocker-review/evidence.mjs';

const directory = process.env.WH3_ENTITY_REVIEW_DIR;
const options = { skip: directory ? false : 'Run entity-semantics/cli.mjs and set WH3_ENTITY_REVIEW_DIR to its COMPLETE output.' };
const read = async file => JSON.parse(await readFile(file, 'utf8'));
async function actual() {
  const manifest = await read(path.join(directory, 'manifest.json'));
  assert.equal(manifest.status, 'COMPLETE'); assert.equal(manifest.sourceKind, 'ca-pack');
  assert.equal(manifest.fullImport, false); assert.equal(manifest.gameExecuted, false);
  const results = await Promise.all(manifest.results.map(r => read(path.join(directory, r.file))));
  for (const r of results) {
    requireSameSource(r.inspection.evidence.provenance, manifest.provenance);
    assert.deepEqual(verifyEntityInspection(r.inspection, r.dump), r.inspection.contract);
    assert(r.inspection.evidence.rows.length <= 400 && r.inspection.evidence.steps.length <= 60);
  }
  const byKey = key => { const matches = results.filter(r => r.mainKey === key); assert.equal(matches.length, 1); return matches[0]; };
  return { manifest, results, byKey };
}
test('actual 25 exact CA sources retain 70 component paths with no incomplete chains or diagnostic failures', options, async () => {
  const { manifest, results } = await actual(), { diagnosticNormalization, ...metrics } = manifest.metrics;
  assert.deepEqual(summarizeEntityStructures(results.map(r => r.inspection.contract)), metrics);
  assert.equal(metrics.unitsInspected, 25); assert.equal(metrics.entityPaths, 70);
  assert.deepEqual(metrics.roles, { ARTICULATED: 4, ENGINE: 6, MAN: 25, MOUNT: 9, PERSONALITY_ATTACHMENT: 26 });
  assert.equal(metrics.distinctEntityKeys, 33); assert.equal(metrics.distinctStatsKeys, 6);
  assert.equal(metrics.rawCardinalityFieldsObserved, 75); assert.equal(metrics.completeSingle, 14); assert.equal(metrics.completeMultiRole, 11);
  assert.equal(metrics.presentationUnresolved, 25); assert.equal(metrics.incompleteChains, 0);
  assert.equal(metrics.countSafe, 0); assert.equal(metrics.hpSafe, 0); assert.equal(metrics.massSafe, 14); assert.equal(metrics.sizeSafe, 14);
  assert.deepEqual(diagnosticNormalization, { attempted: 25, validated: 25, blocked: 0, validationFailures: 0,
    withheldUnits: 0, withheldFields: 0, changedEntityFields: 0, nonEntityChangedUnits: 0, productionEligible: 0 });
});
test('actual Necrofex and Dread Saurian preserve shared role keys, separate attachment slots and stats owners', options, async () => {
  const { byKey } = await actual();
  for (const [key, men, attachments, paths, entityKeys] of [
    ['wh2_dlc11_cst_mon_necrofex_colossus_0', 5, 5, 7, 2],
    ['wh2_dlc13_lzd_mon_dread_saurian_1', 12, 12, 14, 4],
  ]) {
    const c = byKey(key).inspection.contract;
    assert.deepEqual(['numMen', 'numMounts', 'numEngines'].map(k => c.rawCardinality[k].fact.value), [men, 1, 0]);
    assert.equal(c.rawCardinality.attachmentRows.value, attachments); assert.equal(c.rawCardinality.attachmentSlots.value, attachments);
    assert.equal(c.paths.length, paths); assert.equal(new Set(c.paths.map(p => p.entityKey)).size, entityKeys);
    assert.equal(c.paths.filter(p => p.role === 'PERSONALITY_ATTACHMENT').length, attachments);
    assert(c.paths.filter(p => p.role === 'PERSONALITY_ATTACHMENT').every(p => p.stats.length === 1 && p.owner.slot.value));
    assert.equal(new Set(c.paths.map(p => p.pathId)).size, paths);
    assert.equal(c.presentation.massSafe, false); assert.equal(c.presentation.sizeSafe, false);
  }
  const necro = byKey('wh2_dlc11_cst_mon_necrofex_colossus_0').inspection.contract;
  assert.equal(necro.paths.find(p => p.role === 'MAN').entityKey, necro.paths.find(p => p.role === 'MOUNT').entityKey);
});
test('actual Black Coach and Skeleton Chariots preserve articulated rows and raw 1/2/1 and 24/2/12 counts', options, async () => {
  const { byKey } = await actual();
  for (const [key, counts, attachments, paths] of [
    ['wh_main_vmp_veh_black_coach', [1, 2, 1], 1, 5],
    ['wh2_dlc09_tmb_veh_skeleton_chariot_0', [24, 2, 12], 2, 6],
  ]) {
    const r = byKey(key), c = r.inspection.contract;
    assert.deepEqual(['numMen', 'numMounts', 'numEngines'].map(k => c.rawCardinality[k].fact.value), counts);
    assert.equal(c.paths.length, paths); assert.equal(c.rawCardinality.attachmentRows.value, attachments);
    assert.equal(c.articulated.length, 1); assert.equal(c.paths.filter(p => p.role === 'ARTICULATED').length, 1);
    assert.equal(c.paths.filter(p => p.role === 'AMMO_CAISSON').length, 0); // Empty CA reference, not a missing edge.
    assert(c.paths.some(p => p.role === 'ENGINE') && c.paths.some(p => p.role === 'MOUNT'));
    assert.equal(c.presentation.countSafe, false); assert.equal(c.presentation.hpSafe, false);
    assert.deepEqual(r.diagnostic.normalized.unit.entities, {});
  }
});
test('actual infantry/monster retain per-MAN properties while cavalry/artillery keep composite omissions', options, async () => {
  const { byKey } = await actual();
  for (const key of ['wh_main_emp_inf_swordsmen', 'wh3_main_kho_mon_bloodthirster_0']) {
    const r = byKey(key), c = r.inspection.contract;
    assert.equal(c.completeness, 'COMPLETE_SINGLE_ENTITY'); assert.equal(c.paths[0].role, 'MAN');
    assert.equal(r.diagnostic.normalized.unit.entities.mass, c.paths[0].entity.fields.mass.value);
    assert.equal(r.diagnostic.normalized.unit.entities.entitySize, c.paths[0].entity.fields.size.value);
    assert.deepEqual(r.diagnostic.normalized.unit, r.beforeNormalization.unit);
  }
  for (const key of ['wh_main_brt_cav_grail_knights', 'wh_main_emp_art_helstorm_rocket_battery']) {
    const r = byKey(key); assert.equal(r.inspection.contract.completeness, 'COMPLETE_MULTI_ROLE');
    assert.equal(r.diagnostic.normalized.unit.entities.mass, undefined); assert.equal(r.diagnostic.normalized.unit.entities.entitySize, undefined);
  }
});
test('actual raw health, size/mass/collision/movement and paths remain owned facts with no scaling or arithmetic', options, async () => {
  const { results } = await actual();
  for (const r of results) {
    const c = r.inspection.contract;
    assert.equal(c.health.status, 'RAW_LAND_BONUS_ONLY'); assert.equal(c.runtime.unitSizeScaling, 'UNRESOLVED');
    for (const p of c.paths) {
      assert.equal(p.sourceMainKey, r.mainKey); assert.equal(p.cardinalityMeaning, 'UNRESOLVED');
      assert.equal(p.health.status, 'RAW_ENTITY_HEALTH'); assert.equal(p.health.displayRelation, 'UNRESOLVED');
      for (const field of ['mass', 'size', 'height', 'radius', 'hit_points', 'run_speed', 'projectile_penetration_resistance']) {
        assert.equal(p.entity.fields[field].value, p.entity.row[field]); assert.equal(p.entity.fields[field].source.rowId, p.entity.id);
      }
      for (const edge of p.edges) assert(r.inspection.evidence.relationships.some(e => JSON.stringify(e) === JSON.stringify(edge)));
    }
    for (const key of ['displayedModelCount', 'totalEntities', 'effectiveModels', 'totalHP', 'averageMass', 'aggregateMass']) assert.equal(c[key], undefined);
    for (const field of ['count', 'totalHealth', 'healthPerEntity', 'unitScale']) assert.equal(r.diagnostic.normalized.unit.entities[field], undefined);
  }
});
test('actual global size/scalar evidence is saved independently and never applied to source cardinalities', options, async () => {
  const size = await read(path.join(directory, 'unit-size-evidence.json'));
  assert.equal(size.status, 'UNRESOLVED'); assert.equal(size.applicationToSourceCounts, 'UNRESOLVED');
  assert(size.evidence.rows.some(r => r.table === 'unit_sizes_tables'));
  assert(size.evidence.rows.some(r => r.table === 'unit_stat_to_size_scaling_values_tables'));
  assert(size.evidence.relationships.some(e => e.field === 'size'));
  assert(size.evidence.relationships.some(e => e.field === 'stat'));
  assert(size.evidence.rows.length <= 400); assert.equal(size.evidence.issues.length, 0);
});
test('actual diagnostic normalization preserves all Unit values, non-entity field provenance and missile sidecars', options, async () => {
  const { results, manifest } = await actual(), validate = await loadUnitValidator();
  const oldManifest = await read(path.join(manifest.contextDir, 'manifest.json'));
  const old = await Promise.all(oldManifest.results.map(r => read(path.join(manifest.contextDir, r.file))));
  for (const r of results) {
    assert.equal(r.diagnostic.status, 'MATERIALIZED'); assert.equal(r.productionEligible, false);
    assert.deepEqual(validate([r.diagnostic.normalized.unit], r.diagnostic.validation.registryIds), []);
    assert.deepEqual(compareEntityNormalization(r.beforeNormalization, r.diagnostic.normalized), r.comparison);
    assert.deepEqual(r.beforeNormalization.unit, r.diagnostic.normalized.unit);
    assert.deepEqual(r.beforeNormalization.provenance.fields, r.diagnostic.normalized.provenance.fields);
    if (r.contextId) {
      const previous = old.find(p => p.request.mainKey === r.mainKey && p.request.contextId === r.contextId); assert(previous);
      assert.deepEqual(r.diagnostic.normalized.unit, previous.unit);
      assert.deepEqual(r.missileInspection, previous.missileInspection);
    }
  }
});
test('actual canonical entity replay is invariant to reversed row/edge/coverage order', options, async () => {
  const { results } = await actual();
  for (const r of results) {
    const e = structuredClone(r.inspection.evidence); e.rows.reverse(); e.relationships.reverse(); e.coverage.reverse();
    assert.deepEqual(entityStructureContract(e, r.inspection.contract.source), r.inspection.contract);
  }
});
