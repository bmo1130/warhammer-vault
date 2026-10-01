import { readFile } from 'node:fs/promises';
import { FORMAT, OBSERVATION_TYPES, UNIT_SIZES, CONFIDENCE, stable, sourceContextKey, digest } from './contract.mjs';

const text = x => typeof x === 'string' && x.trim().length > 0;
const number = x => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1e9;
const uniqueStrings = x => Array.isArray(x) && x.every(text) && new Set(x).size === x.length;
const entityTypes = new Set(['VISIBLE_COMPONENT_COUNT', 'TARGETABLE_COMPONENT', 'COMPONENT_CASUALTY', 'COMPONENT_DEATH', 'COMPONENT_WEAPON_DISABLE']);
const missileTypes = new Set(['PROJECTILE_PROFILE_ACTIVE', 'WEAPON_PATH_ACTIVE', 'WEAPON_REPLACEMENT', 'WEAPON_COEXISTENCE', 'OVERRIDE_PRECEDENCE', 'AMMO_POOL_CONSUMPTION', 'AMMO_POOL_SHARING', 'FIRE_IN_MELEE', 'RIDER_LOSS_WEAPON_DISABLE']);
export function validateRuntimeEvidence(document, index) {
  const errors = [], records = [], ids = new Set();
  if (document?.format !== FORMAT || !Array.isArray(document.observations) || document.observations.length > 10000) return { status: 'REJECTED', errors: ['Invalid format/observations or recording limit exceeded.'], records: [], conflicts: [] };
  const subjects = new Map(index.subjects.map(s => [sourceContextKey(s.sourceMainKey, s.contextId), s]));
  for (const raw of document.observations) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { errors.push({ id: null, errors: ['Observation must be an object.'] }); continue; }
    const o = structuredClone(raw), e = [], fail = message => e.push(message);
    const s = subjects.get(sourceContextKey(o?.sourceMainKey, o?.contextId));
    if (!s || !text(o?.sourceMainKey) || !(o.contextId === null || text(o.contextId))) fail('Unknown exact source/context; display names cannot link evidence.');
    if (!s || o.sourceLandKey !== s.sourceLandKey || o.catalogEntryId !== s.catalogEntryId) fail('Land/catalog identity drift.');
    if (o.gameVersion !== index.snapshot.gameVersion || o.staticSnapshotId !== index.snapshotId) fail('Game/static snapshot drift.');
    if (!text(o.id) || ids.has(o.id)) fail('Missing/duplicate observation ID.'); else ids.add(o.id);
    if (!text(o.scenarioId) || !text(o.trialId) || !text(o.samplePoint) || !text(o.subjectLabel)) fail('Scenario/trial/sample point/subject required.');
    const shape = typeof o.observationType === 'string' && Object.hasOwn(OBSERVATION_TYPES, o.observationType) ? OBSERVATION_TYPES[o.observationType] : null;
    if (!shape) fail('Unknown observation type.');
    if (!UNIT_SIZES.includes(o.unitSize)) fail('Invalid Unit Size.');
    if (!CONFIDENCE.includes(o.confidence) || !Number.isInteger(o.repetitions) || o.repetitions < 1 || o.repetitions > 10000) fail('Invalid confidence/repetitions.');
    const setup = o.setup;
    if (!setup || !['CUSTOM_BATTLE', 'CAMPAIGN_BATTLE', 'CAMPAIGN', 'PROLOGUE', 'NOT_RECORDED'].includes(setup.battleMode)) fail('Battle mode required.');
    for (const key of ['factionId', 'lord', 'difficulty', 'saveReference', 'sessionPhase']) if (!text(setup?.[key])) fail(`Missing setup.${key}.`);
    if (s && setup?.factionId !== s.factionId && setup?.factionId !== 'NOT_RECORDED') fail('Faction context mismatch.');
    for (const key of ['skills', 'rituals', 'effects', 'technologies', 'buildings']) {
      const v = setup?.[key];
      if (!v || !['KNOWN', 'NOT_RECORDED'].includes(v.status) || !uniqueStrings(v.activeKeys) || !uniqueStrings(v.labels) || (v.status === 'NOT_RECORDED' && (v.activeKeys.length || v.labels.length))) fail(`Invalid setup.${key}; unknown is explicit, not absent.`);
      // Human labels can describe interventions, but cannot claim an exact CA effect link.
      // A globally known effect can be observed on a Supply subject even when
      // that subject has no effect->weapon junction. This does not copy paths.
      const known = new Set(index.subjects.flatMap(subject => subject.knownConditionKeys ?? []));
      if (Array.isArray(v?.activeKeys) && key === 'effects' && v.activeKeys.some(k => !known.has(k))) fail('Effect key is not present in the reviewed static evidence set.');
    }
    for (const key of ['summoned', 'supplyVariant']) if (!['YES', 'NO', 'UNKNOWN'].includes(setup?.[key])) fail(`Invalid setup.${key}.`);
    if (!setup?.mods || !['NONE', 'ENABLED', 'NOT_RECORDED'].includes(setup.mods.status) || !uniqueStrings(setup.mods.ids) || (setup.mods.status !== 'ENABLED' && setup.mods.ids.length)) fail('Mods state required.');
    if (!(setup?.rank === null || (Number.isInteger(setup?.rank) && setup.rank >= 0 && setup.rank <= 100))) fail('Invalid rank.');
    for (const [key, paths] of [['entityPathIds', s?.entity?.paths], ['missilePathIds', s?.missile?.paths]]) {
      if (!uniqueStrings(o[key]) || o[key].some(id => !paths?.some(p => p.pathId === id))) fail(`Unknown/duplicate ${key}.`);
    }
    const iv = o.identityVerification;
    if (!iv || !['EXACT_SOURCE_OBSERVED', 'CONTEXT_ONLY', 'NOT_RECORDED'].includes(iv.level) || (iv.level === 'EXACT_SOURCE_OBSERVED' && !text(iv.reference))) fail('Exact runtime identity requires a trustworthy observation reference.');
    if (!['EXACT_PATH_OBSERVED', 'COMPONENT_ROLE_ONLY', 'NOT_RECORDED'].includes(o.pathBinding)) fail('Invalid path binding.');
    if (o.pathBinding === 'EXACT_PATH_OBSERVED' && !(o.entityPathIds?.length || o.missilePathIds?.length)) fail('Exact path binding requires a path.');
    if (o.pathBinding === 'EXACT_PATH_OBSERVED' && entityTypes.has(o.observationType) && !o.entityPathIds?.length) fail('Entity observation needs an exact entity path.');
    if (o.pathBinding === 'EXACT_PATH_OBSERVED' && missileTypes.has(o.observationType) && !o.missilePathIds?.length) fail('Weapon observation needs an exact missile path.');
    if (o.provenance?.kind !== 'RUNTIME_MANUAL' || !text(o.provenance?.observer) || !Array.isArray(o.provenance?.references) || o.provenance.references.some(x => !text(x)) || !(o.provenance.observedAt === null || (text(o.provenance.observedAt) && Number.isFinite(Date.parse(o.provenance.observedAt))))) fail('Invalid separate runtime provenance.');
    const v = o.observation;
    if (!v || !['CONCLUSIVE', 'INCONCLUSIVE'].includes(v.result)) fail('Observation result required.');
    if (v?.result === 'CONCLUSIVE') {
      if (o.confidence === 'INCONCLUSIVE') fail('Conclusive result cannot have inconclusive confidence.');
      if (shape === 'number') {
        if (!number(v.value) || !text(v.unit) || (['CARD_MODEL_COUNT', 'VISIBLE_COMPONENT_COUNT'].includes(o.observationType) && (!Number.isInteger(v.value) || v.unit !== 'models')) || (o.observationType === 'CARD_HEALTH' && v.unit !== 'hp') || (o.observationType === 'SUMMONED_DURATION' && v.unit !== 'seconds')) fail('Invalid numeric value/unit.');
      } else if (shape === 'state' && !['ACTIVE', 'INACTIVE', 'YES', 'NO', 'OBSERVED', 'NOT_OBSERVED'].includes(v.state)) fail('Invalid observed state.');
      else if (shape === 'description' && !text(v.description)) fail('Observed description required.');
      else if (shape === 'relationship' && !['REPLACES', 'COEXISTS', 'PRECEDES', 'SHARES', 'SEPARATE', 'DISABLES', 'UNCHANGED'].includes(v.relationship)) fail('Invalid relationship.');
      else if (shape === 'ammo' && (!number(v.before) || !number(v.after) || !text(v.poolLabel))) fail('Record raw before/after ammo and visible pool label; do not aggregate.');
      else if (shape === 'comparison' && (!Array.isArray(v.settings) || v.settings.length < 2 || v.settings.some(x => !x || !UNIT_SIZES.slice(0, 4).includes(x.unitSize) || !number(x.value)) || new Set(v.settings.map(x => x.unitSize)).size !== v.settings.length)) fail('Record distinct settings, without a scaling formula.');
    }
    // Unexpected payload fields cannot smuggle derived formulas or unvalidated path references.
    const shapeKeys = { number: ['value', 'unit'], state: ['state'], description: ['description'], relationship: ['relationship'], ammo: ['before', 'after', 'poolLabel'], comparison: ['settings'] };
    const payloadKeys = new Set(['result', 'notes', ...(v?.result === 'CONCLUSIVE' ? shapeKeys[shape] ?? [] : [])]);
    if (v && Object.keys(v).some(k => !payloadKeys.has(k))) fail('Unsupported observation payload field. Use validated path ID arrays and notes.');
    if (e.length) errors.push({ id: o.id ?? null, errors: e });
    else records.push({ observation: o, status: v.result === 'INCONCLUSIVE' ? 'VALIDATED_INCONCLUSIVE' : iv.level !== 'EXACT_SOURCE_OBSERVED' ? 'VALIDATED_IDENTITY_PENDING' : 'VALIDATED_SCOPED_OBSERVATION' });
  }
  const conflicts = detectContradictions(records);
  const conflictingIds = new Set(conflicts.flatMap(c => c.observationIds));
  for (const r of records) if (conflictingIds.has(r.observation.id)) r.status = 'CONFLICTING_RUNTIME_EVIDENCE';
  return { format: 'warhammer-vault-validated-runtime-evidence-v1', status: errors.length ? 'REJECTED' : conflicts.length ? 'CONFLICTING_RUNTIME_EVIDENCE' : 'VALIDATED',
    errors, records, conflicts, staticSnapshotId: index.snapshotId, staticModified: false, productionModified: false };
}
export function comparisonKey(o) {
  // Scenario/trial IDs are repetitions, not a way to hide contradictions in the same exact setup.
  const setup = structuredClone(o.setup);
  for (const k of ['skills', 'rituals', 'effects', 'technologies', 'buildings']) for (const field of ['activeKeys', 'labels']) setup[k][field].sort();
  setup.mods.ids.sort();
  return stable([o.staticSnapshotId, o.sourceMainKey, o.contextId, o.catalogEntryId, o.observationType, o.unitSize, setup, o.samplePoint, o.subjectLabel,
    [...o.entityPathIds].sort(), [...o.missilePathIds].sort()]);
}
function observedValue(o) {
  const { notes, ...v } = structuredClone(o.observation);
  if (v.settings) v.settings.sort((a, b) => a.unitSize.localeCompare(b.unitSize));
  return stable(v);
}
export function detectContradictions(records) {
  const groups = new Map();
  for (const { observation: o } of records) if (o.observation.result === 'CONCLUSIVE') {
    const key = comparisonKey(o); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(o);
  }
  return [...groups].filter(([, values]) => new Set(values.map(observedValue)).size > 1).map(([key, values]) => ({
    status: 'CONFLICTING_RUNTIME_EVIDENCE', scopeId: digest(key), observationIds: values.map(o => o.id).sort(), values: [...new Set(values.map(observedValue))].sort(), decision: 'NO_AUTOMATIC_WINNER',
  })).sort((a, b) => a.scopeId.localeCompare(b.scopeId));
}
export function proposeResolutions(validation) {
  if (validation.status === 'REJECTED') return { proposals: [], held: validation.records.map(r => ({ id: r.observation.id, reason: 'BATCH_REJECTED' })), productionEligible: false };
  const groups = new Map(), held = [];
  for (const r of validation.records) {
    const o = r.observation, s = o.setup;
    const pathRequired = entityTypes.has(o.observationType) || missileTypes.has(o.observationType);
    const ready = r.status === 'VALIDATED_SCOPED_OBSERVATION' && o.unitSize !== 'NOT_RECORDED' && o.trialId !== 'NOT_RECORDED' && o.provenance.observer !== 'NOT_RECORDED' && o.provenance.observedAt && o.provenance.references.length &&
      s.battleMode !== 'NOT_RECORDED' && s.factionId !== 'NOT_RECORDED' && s.lord !== 'NOT_RECORDED' && s.sessionPhase !== 'NOT_RECORDED' && s.difficulty !== 'NOT_RECORDED' && s.rank !== null && s.mods.status === 'NONE' &&
      s.summoned !== 'UNKNOWN' && s.supplyVariant !== 'UNKNOWN' && ['skills', 'rituals', 'effects', 'technologies', 'buildings'].every(k => s[k].status === 'KNOWN') &&
      (!pathRequired || o.pathBinding === 'EXACT_PATH_OBSERVED');
    if (!ready) { held.push({ id: o.id, reason: r.status === 'CONFLICTING_RUNTIME_EVIDENCE' ? r.status : 'IDENTITY_SETUP_OR_PATH_CONFIRMATION_REQUIRED' }); continue; }
    const key = comparisonKey(o); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(o);
  }
  const proposals = [];
  for (const [scope, rows] of groups) {
    if (new Set(rows.map(o => o.trialId)).size < 2) { held.push(...rows.map(o => ({ id: o.id, reason: 'INDEPENDENT_REPETITION_REQUIRED' }))); continue; }
    const o = rows[0];
    proposals.push({ id: digest(scope), status: ['CARD_MODEL_COUNT', 'CARD_HEALTH'].includes(o.observationType) ? 'RUNTIME_CONFIRMED_PER_SETTING' : 'REPEATED_SCOPED_OBSERVATION',
      staticSnapshotId: o.staticSnapshotId, sourceMainKey: o.sourceMainKey, sourceLandKey: o.sourceLandKey, contextId: o.contextId, catalogEntryId: o.catalogEntryId,
      unitSize: o.unitSize, observationType: o.observationType, setup: JSON.parse(scope)[6], samplePoint: o.samplePoint, subjectLabel: o.subjectLabel,
      entityPathIds: [...o.entityPathIds].sort(), missilePathIds: [...o.missilePathIds].sort(),
      value: JSON.parse(observedValue(o)), evidenceIds: rows.map(x => x.id).sort(), requiresReview: true, scope: 'EXACT_SOURCE_CONTEXT_SETUP_ONLY', formula: null, productionEligible: false });
  }
  return { proposals: proposals.sort((a, b) => a.id.localeCompare(b.id)), held: held.sort((a, b) => a.id.localeCompare(b.id)), productionEligible: false };
}
export async function loadRuntimeEvidence(path, index) {
  return validateRuntimeEvidence(await loadRuntimeDocument(path), index);
}
export async function loadRuntimeDocument(path) {
  const bytes = await readFile(path); if (bytes.length > 10_000_000) throw new Error('Runtime evidence exceeds 10 MB.');
  return parseRuntimeDocument(bytes.toString('utf8'));
}
export function parseRuntimeDocument(input) {
  const document = typeof input === 'string' ? JSON.parse(input.replace(/^\uFEFF/, '')) : structuredClone(input);
  if (document.format === 'warhammer-vault-runtime-recording-template-v1') {
    if (!Array.isArray(document.jobs) || document.jobs.some(j => !j || !['PENDING', 'RECORDED', 'INCONCLUSIVE'].includes(j.status) || !Array.isArray(j.observations))) throw new Error('Invalid recording template jobs/status.');
    return { format: FORMAT, observations: document.jobs.filter(j => j.status !== 'PENDING').flatMap(j => j.observations) };
  }
  return document;
}
