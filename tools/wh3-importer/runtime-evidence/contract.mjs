import { createHash } from 'node:crypto';

export const FORMAT = 'warhammer-vault-runtime-evidence-v1';
export const UNIT_SIZES = Object.freeze(['SMALL', 'MEDIUM', 'LARGE', 'ULTRA', 'NOT_RECORDED']);
export const OBSERVATION_TYPES = Object.freeze({
  CCO_NUM_ENTITIES: 'number', CCO_NUM_ENTITIES_INITIAL: 'number', CCO_HEALTH_VALUE: 'number', CCO_HEALTH_MAX: 'number',
  CCO_COMPONENT_LIST_COUNT: 'number', CCO_ACTIVE_PROJECTILE_CONTEXT: 'description', CCO_CURSOR_ENTITY: 'description', CCO_AMMO_PERCENT_CHANGE: 'ammo',
  CARD_MODEL_COUNT: 'number', CARD_HEALTH: 'number', VISIBLE_COMPONENT_COUNT: 'number',
  TARGETABLE_COMPONENT: 'state', COMPONENT_CASUALTY: 'state', COMPONENT_DEATH: 'state', COMPONENT_WEAPON_DISABLE: 'state', UNIT_SIZE_COMPARISON: 'comparison',
  PROJECTILE_PROFILE_ACTIVE: 'description', WEAPON_PATH_ACTIVE: 'state', WEAPON_REPLACEMENT: 'relationship', WEAPON_COEXISTENCE: 'relationship', OVERRIDE_PRECEDENCE: 'relationship',
  AMMO_POOL_CONSUMPTION: 'ammo', AMMO_POOL_SHARING: 'relationship', FIRE_IN_MELEE: 'state', RIDER_LOSS_WEAPON_DISABLE: 'state',
  RECRUITMENT_AVAILABLE: 'state', SUMMONED_MAIN_IDENTITY: 'description', SUMMONED_DURATION: 'number', SUPPLY_VARIANT_AVAILABILITY: 'state', ARKHAN_VARIANT_AVAILABILITY: 'state', NONSTANDARD_SCENARIO_AVAILABILITY: 'description',
});
export const CONFIDENCE = Object.freeze(['OBSERVED_ONCE', 'REPEATED', 'CROSS_SETTING_CONFIRMED', 'INCONCLUSIVE']);
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export const stable = value => JSON.stringify(canonical(value));
export const digest = value => createHash('sha256').update(stable(value)).digest('hex');
export const sourceContextKey = (main, context) => stable([main, context]);
export function snapshotIdentity(p) {
  if (!p?.gameVersion || !p.schemaSha256 || !p.packs?.length || p.packs.some(x => !x.file_name || !x.sha256)) throw new Error('Incomplete static snapshot.');
  return { gameVersion: p.gameVersion, schemaSha256: p.schemaSha256, packs: p.packs.map(x => ({ name: x.file_name, sha256: x.sha256 })).sort((a, b) => a.name.localeCompare(b.name)) };
}
export function blankSetup(factionId = 'NOT_RECORDED') {
  const state = () => ({ status: 'NOT_RECORDED', activeKeys: [], labels: [] });
  return { battleMode: 'NOT_RECORDED', factionId, lord: 'NOT_RECORDED', skills: state(), rituals: state(), effects: state(), technologies: state(), buildings: state(),
    summoned: 'UNKNOWN', supplyVariant: 'UNKNOWN', difficulty: 'NOT_RECORDED', mods: { status: 'NOT_RECORDED', ids: [] }, rank: null,
    saveReference: 'NOT_RECORDED', sessionPhase: 'NOT_RECORDED' };
}
export function observationTemplate(subject, job, type, suffix = '') {
  return { id: `${job.id}:${type}${suffix}`, jobId: job.id, gameVersion: subject.gameVersion, staticSnapshotId: subject.staticSnapshotId,
    sourceMainKey: subject.sourceMainKey, sourceLandKey: subject.sourceLandKey, contextId: subject.contextId, catalogEntryId: subject.catalogEntryId,
    scenarioId: job.id, trialId: 'NOT_RECORDED', observationType: type, unitSize: job.unitSize, setup: blankSetup(subject.factionId), samplePoint: 'BATTLE_START',
    subjectLabel: 'whole unit', entityPathIds: [], missilePathIds: [], identityVerification: { level: 'CONTEXT_ONLY', reference: null },
    pathBinding: 'NOT_RECORDED', observation: { result: 'INCONCLUSIVE', notes: '' }, confidence: 'INCONCLUSIVE', repetitions: 1,
    provenance: { kind: 'RUNTIME_MANUAL', observer: 'NOT_RECORDED', observedAt: null, references: [], notes: '' } };
}
