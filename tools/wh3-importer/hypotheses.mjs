import { observationContext } from './observations/context.mjs';

// Research arithmetic only. No formula here is a verified game algorithm.
// Missing/non-numeric inputs stay unknown; manual values never enter inputs.
export function evaluateHypothesis(formula, inputs, calculate) {
  const known = Object.values(inputs).every((input) => typeof input?.value === 'number' && Number.isFinite(input.value));
  const value = known ? calculate(Object.fromEntries(Object.entries(inputs).map(([name, input]) => [name, input.value]))) : null;
  return { formula, status: 'UNRESOLVED', value: Number.isFinite(value) ? value : null, inputs };
}

export function hypothesisEvidence(dump) {
  const { root, land, rider: man, mountEntity: mount, engineEntity: engine, projectile } = observationContext(dump);
  const raw = (record, field) => ({
    value: record && Object.hasOwn(record.row, field) ? record.row[field] : null,
    source: record ? { rowId: record.id, sourcePack: record.sourcePack, table: record.table, path: record.path, key: record.key, schemaVersion: record.tableVersion, field } : null,
  });
  const B = raw(land, 'bonus_hit_points'), M = raw(man, 'hit_points'), N = raw(root, 'num_men');
  const R = raw(mount, 'hit_points'), E = raw(engine, 'hit_points'), K = raw(land, 'num_engines');
  const hp = {
    bonusOnce: evaluateHypothesis('B + M * N', { B, M, N }, ({ B, M, N }) => B + M * N),
    bonusPerMan: evaluateHypothesis('(B + M) * N', { B, M, N }, ({ B, M, N }) => (B + M) * N),
    mountedPair: evaluateHypothesis('(B + M + R) * N', { B, M, R, N }, ({ B, M, R, N }) => (B + M + R) * N),
    crewPlusEngine: evaluateHypothesis('(B + M) * N + E * K', { B, M, N, E, K }, ({ B, M, N, E, K }) => (B + M) * N + E * K),
    bonusAlsoPerEngine: evaluateHypothesis('(B + M) * N + (B + E) * K', { B, M, N, E, K }, ({ B, M, N, E, K }) => (B + M) * N + (B + E) * K),
  };
  const speed = {};
  for (const [name, record, field] of [
    ['manRun', man, 'run_speed'], ['mountRun', mount, 'run_speed'],
    ['engineRun', engine, 'run_speed'], ['flight', man, 'fly_speed'],
  ]) speed[name] = evaluateHypothesis('rawSpeed * 10', { rawSpeed: raw(record, field) }, ({ rawSpeed }) => rawSpeed * 10);
  const ammo = evaluateHypothesis('primaryAmmo / shotsPerVolley', { primaryAmmo: raw(land, 'primary_ammo'), shotsPerVolley: raw(projectile, 'shots_per_volley') }, ({ primaryAmmo, shotsPerVolley }) => shotsPerVolley > 0 ? primaryAmmo / shotsPerVolley : NaN);
  return {
    sourceKind: dump.sourceKind, unit: dump.unit, provenance: dump.provenance,
    hp, speed, ammo,
    independentProjectileFields: Object.fromEntries(['projectile_number', 'shots_per_volley', 'burst_size', 'base_reload_time', 'marksmanship_bonus', 'calibration_distance', 'calibration_area', 'spread'].map((field) => [field, raw(projectile, field)])),
    landReload: raw(land, 'reload'), landAccuracy: raw(land, 'accuracy'),
  };
}
