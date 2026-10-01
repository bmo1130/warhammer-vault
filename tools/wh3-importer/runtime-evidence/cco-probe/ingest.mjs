import { FORMAT, digest, stable, observationTemplate } from '../contract.mjs';
import { validateRuntimeEvidence, proposeResolutions } from '../validate.mjs';
import { verifyCandidates } from './candidates.mjs';

export const PREFIX = 'WH3_RUNTIME_PROBE|';
const lists = ['ManList', 'MountList', 'EngineList', 'EntityList'];
const kinds = new Set(['SNAPSHOT_START', 'SNAPSHOT_UNIT', 'SNAPSHOT_END', 'CURSOR', 'TRACE_START', 'TRACE_UNIT', 'TRACE_END', 'COMPONENT_LIST', 'ENTITY', 'SAMPLE_END', 'ERROR']);
const cells = new Set(['VALUE', 'NULL', 'UNSUPPORTED', 'UNSERIALIZABLE', 'INVALID_NUMBER']);
export const value = cell => cell?.status === 'VALUE' ? cell.value : undefined;
function validateEvent(e) {
  if (!e || e.format !== 'warhammer-vault-cco-probe-v1' || typeof e.sessionId !== 'string' || !e.sessionId || typeof e.runId !== 'string' || !e.runId || !Number.isSafeInteger(e.sequence) || e.sequence < 1 || !kinds.has(e.kind) || !e.data || typeof e.data !== 'object' || Array.isArray(e.data) || !e.metadata || typeof e.metadata !== 'object') throw new Error('Invalid probe envelope.');
  if (!cells.has(e.timestamp?.status) || (e.timestamp.status === 'VALUE' && (!Number.isFinite(e.timestamp.value) || e.timestamp.value < 0))) throw new Error('Invalid timestamp.');
  if (e.data.fields) {
    if (typeof e.data.fields !== 'object' || Array.isArray(e.data.fields)) throw new Error('Invalid field map.');
    for (const [name, cell] of Object.entries(e.data.fields)) {
      if (!cell || !cells.has(cell.status) || (cell.status === 'VALUE' && (cell.value === null || !['string', 'number', 'boolean', 'object'].includes(typeof cell.value)))) throw new Error(`Invalid CCO cell ${name}.`);
      if (cell.status === 'VALUE') {
        const v = cell.value;
        if ((/^(Is|.*\.Is)/.test(name) && typeof v !== 'boolean') || (/Key$/.test(name) && typeof v !== 'string') ||
            (['UniqueUiId', 'UnitContext.UniqueUiId', 'NumEntities', 'NumEntitiesInitial', 'HealthValue', 'HealthMax', 'ReloadRemainingTime'].includes(name) && (!Number.isFinite(v) || v < 0 || v > 1e9)) ||
            (['PrimaryAmmoPercent', 'SecondaryAmmoPercent', 'ReloadPercent', 'ReloadPercentMax'].includes(name) && (!Number.isFinite(v) || v < 0 || v > 1))) throw new Error(`Invalid CCO value ${name}.`);
      }
    }
  }
  if (['SNAPSHOT_UNIT', 'TRACE_UNIT', 'COMPONENT_LIST', 'ENTITY', 'SAMPLE_END'].includes(e.kind) && (!Number.isSafeInteger(e.data.sample) || e.data.sample < 0 || e.data.sample > 10000)) throw new Error('Invalid sample number.');
  if (['COMPONENT_LIST', 'ENTITY'].includes(e.kind) && !lists.includes(e.data.list)) throw new Error('Unknown component list.');
  if (e.kind === 'ENTITY' && (!e.data.fields || !Number.isInteger(e.data.index) || e.data.index < 0 || e.data.index >= 512)) throw new Error('Invalid entity index/fields.');
  if (e.kind === 'COMPONENT_LIST' && (!cells.has(e.data.size?.status) || typeof e.data.complete !== 'boolean' || (e.data.complete && (!Number.isInteger(value(e.data.size)) || value(e.data.size) < 0 || value(e.data.size) > 512)))) throw new Error('Invalid list cardinality.');
  if (['SNAPSHOT_UNIT', 'TRACE_UNIT', 'CURSOR'].includes(e.kind) && !e.data.fields && !(e.kind === 'TRACE_UNIT' && e.data.unchanged === true)) throw new Error('Missing CCO fields.');
  if (['COMPONENT_LIST', 'ENTITY', 'SAMPLE_END'].includes(e.kind) && !['SNAPSHOT', 'TRACE'].includes(e.data.mode)) throw new Error('Invalid sample mode.');
  return e;
}
// Broken lines and conflicting replays are retained as problems, never repaired.
export function parseProbeLogs(inputs) {
  const events = [], problems = [], seen = new Map(), conflictKeys = new Set(); let repeats = 0;
  for (const input of inputs) {
    if (Buffer.byteLength(input.text) > 50_000_000) throw new Error('Probe log exceeds 50 MB.');
    for (const [i, line] of input.text.split(/\r?\n/).entries()) {
      const start = line.indexOf(PREFIX); if (start < 0) continue;
      const reference = `${input.name}:${i + 1}`, payload = line.slice(start + PREFIX.length).trim();
      if (payload.length > 20000) { problems.push({ reference, status: 'INCONCLUSIVE', reason: 'OVERLONG_LINE' }); continue; }
      try {
        const event = validateEvent(JSON.parse(payload)), key = stable([event.sessionId, event.sequence]);
        const existing = seen.get(key);
        if (existing) {
          if (stable(existing.event) === stable(event)) { existing.references.push(reference); repeats++; }
          else { conflictKeys.add(key); problems.push({ reference, status: 'CONFLICTING_RUNTIME_EVIDENCE', reason: 'SAME_EVENT_ID_DIFFERENT_PAYLOAD', event }); }
        } else { const entry = { event, references: [reference], key }; seen.set(key, entry); events.push(entry); }
      } catch (e) { problems.push({ reference, status: 'INCONCLUSIVE', reason: e.message, raw: payload.slice(0, 2000) }); }
      if (events.length > 100000) throw new Error('Probe event budget exceeded.');
    }
  }
  events.sort((a, b) => a.event.sessionId.localeCompare(b.event.sessionId) || a.event.sequence - b.event.sequence);
  for (let i = 1; i < events.length; i++) if (events[i].event.sessionId === events[i - 1].event.sessionId && events[i].event.sequence !== events[i - 1].event.sequence + 1) events[i].sequenceGap = true;
  return { format: 'warhammer-vault-cco-parsed-log-v1', events, problems, repeats, conflictKeys: [...conflictKeys].sort(), actualGameVerified: false };
}
export function reconstructRuns(parsed) {
  const map = new Map();
  for (const entry of parsed.events) {
    const e = entry.event, key = stable([e.sessionId, e.runId]);
    if (!map.has(key)) map.set(key, { id: key, events: [], frames: [], cursor: [], problems: [], metadata: e.metadata, state: {}, pending: null });
    const r = map.get(key); r.events.push(entry);
    if (entry.sequenceGap) r.problems.push('SEQUENCE_GAP');
    if (stable(r.metadata) !== stable(e.metadata)) r.problems.push('METADATA_DRIFT');
    if (parsed.conflictKeys.includes(entry.key)) r.problems.push('CONFLICTING_RUNTIME_EVIDENCE');
    const d = e.data;
    if (e.kind.endsWith('_UNIT')) {
      if (r.pending) r.problems.push('PARTIAL_SAMPLE');
      if (!d.fields && !r.previousUnit) r.problems.push('REPEAT_WITHOUT_BASELINE');
      const fields = d.fields ?? r.previousUnit ?? {};
      r.previousUnit = structuredClone(fields);
      r.pending = { sample: d.sample, fields, lists: {}, timestamp: e.timestamp, reference: entry.references[0] };
    } else if (e.kind === 'COMPONENT_LIST' && r.pending?.sample === d.sample) {
      const previous = r.state[d.list] ?? {};
      // Carried trace values are valid only within this run/list/index; not stable entity identities.
      r.pending.lists[d.list] = { size: d.size, complete: d.complete, entries: d.mode === 'TRACE' ? structuredClone(previous) : {} };
    } else if (e.kind === 'ENTITY' && r.pending?.sample === d.sample) {
      const l = r.pending.lists[d.list];
      if (l) l.entries[d.index] = { index: d.index, fields: d.fields, reference: entry.references[0] }; else r.problems.push('ENTITY_WITHOUT_LIST');
    } else if (e.kind === 'SAMPLE_END' && r.pending?.sample === d.sample) {
      for (const name of lists) {
        const l = r.pending.lists[name], n = value(l?.size);
        if (!l) { r.problems.push(`MISSING_LIST:${name}`); continue; }
        for (const i of Object.keys(l.entries)) if (Number(i) >= n) delete l.entries[i];
        if (l.complete && Object.keys(l.entries).length !== n) { l.complete = false; r.problems.push(`PARTIAL_LIST:${name}`); }
        r.state[name] = structuredClone(l.entries);
      }
      r.frames.push(r.pending); r.pending = null;
    } else if (e.kind === 'CURSOR') r.cursor.push({ ...d, reference: entry.references[0] });
    else if (e.kind === 'ERROR') r.problems.push(d.reason ?? 'PROBE_ERROR');
  }
  return [...map.values()].map(r => {
    if (r.pending) { r.problems.push('PARTIAL_SAMPLE'); r.frames.push({ ...r.pending, partial: true }); }
    r.completed = r.events.some(x => ['SNAPSHOT_END', 'TRACE_END'].includes(x.event.kind));
    if (!r.completed) r.problems.push('MISSING_RUN_END');
    const trace = r.events.some(x => x.event.kind === 'TRACE_START');
    if (!r.events.some(x => ['TRACE_START', 'SNAPSHOT_START'].includes(x.event.kind))) r.problems.push('MISSING_RUN_START');
    if (trace && r.events.find(x => x.event.kind === 'TRACE_END')?.event.data.reason !== 'NOMINAL_5_SECONDS_COMPLETE') r.problems.push('TRACE_WINDOW_INTERRUPTED');
    if (trace && (r.frames.length !== 51 || r.frames.some((f, i) => f.sample !== i) || r.events.find(x => x.event.kind === 'TRACE_END')?.event.data.samples !== 50)) r.problems.push('TRACE_SAMPLE_COVERAGE_INCOMPLETE');
    delete r.state; delete r.pending; delete r.previousUnit; return r;
  });
}
export function compareRuns(parsed, manifest) {
  verifyCandidates(manifest);
  const reports = reconstructRuns(parsed).map(run => {
    const f = run.frames[0]?.fields, main = value(f?.['UnitRecordContext.Key']) ?? value(run.cursor[0]?.fields?.['UnitContext.UnitRecordContext.Key']);
    const unit = manifest.units.find(u => u.sourceMainKey === main);
    const lands = run.frames.map(f => value(f.fields['UnitRecordContext.UnitLandRecordContext.Key']));
    const mains = run.frames.map(f => value(f.fields['UnitRecordContext.Key']));
    const uids = run.frames.map(f => value(f.fields.UniqueUiId));
    const identityOK = unit && run.metadata.gameVersion === manifest.snapshot.gameVersion && run.metadata.staticSnapshotId === manifest.snapshotId &&
      (run.metadata.contextId ?? null) === unit.contextId && lands.length && lands.every(k => k === unit.sourceLandKey) && mains.every(k => k === main) &&
      uids.every(k => k !== undefined && k === uids[0]) && run.frames.every(f => value(f.fields.IsPlayerUnit) === true);
    const status = run.problems.includes('CONFLICTING_RUNTIME_EVIDENCE') ? 'CONFLICTING_RUNTIME_EVIDENCE' : !identityOK || run.problems.includes('METADATA_DRIFT') ? 'IDENTITY_PENDING' : 'SCOPED_RUNTIME_CAPTURE';
    const observedEntities = run.frames.flatMap(f => lists.flatMap(list => Object.values(f.lists[list]?.entries ?? {}).map(row => ({ list, sample: f.sample,
      recordKey: value(row.fields['EntityRecordContext.Key']), key: value(row.fields.Key), isMan: value(row.fields.IsMan), isEngine: value(row.fields.IsEngine),
      reloading: value(row.fields.IsReloading), reloadPercent: value(row.fields.ReloadPercent), ownerUiId: value(row.fields['UnitContext.UniqueUiId']), reference: row.reference }))));
    const allComplete = run.completed && unit?.status === 'STATIC_CANDIDATES_PRESERVED' && !run.problems.length && !parsed.problems.length && run.frames.every(f => !f.partial && lists.every(n => f.lists[n]?.complete));
    const classify = (observed, observable = true) => status !== 'SCOPED_RUNTIME_CAPTURE' ? status : observed ? 'OBSERVED_RUNTIME' : allComplete && observable ? 'NOT_OBSERVED' : 'INCONCLUSIVE';
    const entities = (unit?.views.AllEntitySources ?? []).map(p => {
      const keys = [p.entityKey].filter(Boolean), matched = observedEntities.filter(e => keys.includes(e.recordKey) && e.ownerUiId === uids[0]);
      return { pathId: p.pathId, role: p.role, entityKeys: keys, status: classify(matched.length, observedEntities.every(e => !!e.recordKey && e.ownerUiId === uids[0])),
        observedLists: [...new Set(matched.map(x => x.list))].sort(), references: [...new Set(matched.map(x => x.reference))],
        placementStatus: 'INCONCLUSIVE', matchMeaning: 'RECORD_KEY_OBSERVED; placement/count/targetability/HP contribution remain unproven',
        sameRecordCandidatePaths: (unit?.views.AllEntitySources ?? []).filter(other => keys.includes(other.entityKey)).map(x => x.pathId) };
    });
    const projectiles = run.frames.map(f => ({ sample: f.sample, timestamp: value(f.timestamp) ?? null, key: value(f.fields['ActiveProjectileContext.Key']), firing: value(f.fields.IsFiringMissiles), reference: f.reference }));
    const missileSources = (unit?.views.AllMissileSources ?? []).map(p => {
      const matched = projectiles.filter(x => p.ProjectileContextList.some(q => q.key === x.key));
      return { pathId: p.pathId, role: p.role, weaponKey: p.weaponKey, projectileKeys: p.ProjectileContextList.map(x => x.key),
        projectileContextStatus: classify(matched.length, projectiles.every(x => x.key !== undefined)), weaponActivationStatus: 'INCONCLUSIVE',
        UseSecondaryAmmoPool: p.UseSecondaryAmmoPool, matchedSamples: matched, reason: 'Singular unit projectile context cannot identify every simultaneous weapon source.' };
    });
    const ammo = ['PrimaryAmmoPercent', 'SecondaryAmmoPercent'].map(field => {
      const samples = run.frames.map(f => ({ sample: f.sample, value: value(f.fields[field]), reference: f.reference }));
      const valid = samples.filter(s => Number.isFinite(s.value)), decreases = valid.slice(1).filter((x, i) => x.value < valid[i].value);
      return { field, status: classify(decreases.length, valid.length >= 2 && samples.every(s => Number.isFinite(s.value))), first: valid[0]?.value ?? null, last: valid.at(-1)?.value ?? null,
        samples, decreaseObserved: decreases.length > 0, candidatePathIds: missileSources.filter(p => p.UseSecondaryAmmoPool?.value === (field === 'SecondaryAmmoPercent')).map(p => p.pathId),
        causalWeaponAttribution: 'INCONCLUSIVE', note: 'Raw pool flag comparison only; no ammo count, sharing, or multiplier formula.' };
    });
    const cursors = run.cursor.map(c => {
      const main = value(c.fields['UnitContext.UnitRecordContext.Key']), land = value(c.fields['UnitContext.UnitRecordContext.UnitLandRecordContext.Key']), key = value(c.fields['EntityRecordContext.Key']);
      const target = manifest.units.find(u => u.sourceMainKey === main && u.sourceLandKey === land);
      return { fields: c.fields, reference: c.reference, sourceMainKey: main, sourceLandKey: land,
        status: !target || !identityOK || value(c.fields['UnitContext.UniqueUiId']) !== uids[0] ? 'IDENTITY_PENDING' : key ? 'OBSERVED_RUNTIME' : 'INCONCLUSIVE',
        matchingPathIds: target?.views.AllEntitySources.filter(p => p.entityKey === key).map(p => p.pathId) ?? [] };
    });
    const unexpectedEntityKeys = [...new Set(observedEntities.filter(e => e.recordKey && !entities.some(p => p.entityKeys.includes(e.recordKey))).map(e => e.recordKey))].sort();
    const unexpectedProjectileKeys = [...new Set(projectiles.filter(p => p.key && !missileSources.some(s => s.projectileKeys.includes(p.key))).map(p => p.key))].sort();
    const reloadStateChanges = [];
    for (let i = 1; i < run.frames.length; i++) for (const list of lists) {
      const previous = run.frames[i - 1].lists[list]?.entries ?? {}, current = run.frames[i].lists[list]?.entries ?? {};
      for (const [slot, row] of Object.entries(current)) {
        const old = previous[slot]; if (!old) continue;
        const before = [value(old.fields.IsReloading), value(old.fields.ReloadPercent)], after = [value(row.fields.IsReloading), value(row.fields.ReloadPercent)];
        if (stable(before) !== stable(after)) reloadStateChanges.push({ list, index: Number(slot), sample: run.frames[i].sample,
          entityRecordKey: value(row.fields['EntityRecordContext.Key']) ?? null, before, after, reference: row.reference, entityContinuity: 'UNVERIFIED_LIST_INDEX' });
      }
    }
    return { runId: run.id, status, sourceMainKey: main ?? null, sourceLandKey: unit?.sourceLandKey ?? null, contextId: run.metadata.contextId ?? null,
      unitSize: run.metadata.unitSize ?? 'NOT_RECORDED', metadata: run.metadata, complete: allComplete, problems: run.problems,
      frames: run.frames, entities, missileSources, projectiles, ammo, cursors, unexpectedEntityKeys, unexpectedProjectileKeys,
      reloadingEntities: observedEntities.filter(x => x.reloading === true && x.ownerUiId === uids[0]), reloadStateChanges,
      firingProjectileContexts: projectiles.filter(p => p.firing === true && p.key),
      distinctObservedProjectileKeys: [...new Set(projectiles.map(p => p.key).filter(Boolean))].sort(),
      projectileContextTransitions: projectiles.slice(1).filter((p, i) => p.key !== undefined && projectiles[i].key !== undefined && p.key !== projectiles[i].key),
      simultaneousSources: 'INCONCLUSIVE', entityIndexContinuity: 'UNVERIFIED', productionEligible: false };
  });
  const settingComparisons = manifest.units.map(u => ({ sourceMainKey: u.sourceMainKey, contextId: u.contextId,
    settings: ['MEDIUM', 'ULTRA'].map(unitSize => ({ unitSize, captures: reports.filter(r => r.sourceMainKey === u.sourceMainKey && r.status === 'SCOPED_RUNTIME_CAPTURE' && r.unitSize === unitSize && r.runId.includes('snapshot-')).flatMap(r => r.frames.map(f => ({
      reference: f.reference, NumEntities: f.fields.NumEntities, NumEntitiesInitial: f.fields.NumEntitiesInitial, HealthValue: f.fields.HealthValue, HealthMax: f.fields.HealthMax,
      lists: Object.fromEntries(lists.map(name => [name, f.lists[name]?.size ?? { status: 'NULL' }])),
    }))) })), scalingMeaning: 'UNRESOLVED', formula: null, setupComparability: 'REQUIRES_REVIEW', productionEligible: false }));
  return { format: 'warhammer-vault-cco-comparison-v1', status: reports.length ? 'CAPTURES_PRESERVED' : 'NO_PROBE_EVENTS', reports, settingComparisons, parseProblems: parsed.problems,
    repeatedEventsCollapsed: parsed.repeats, staticModified: false, productionModified: false, productionEligible: false };
}

export function toRuntimeEvidence(report, index) {
  const observations = [], held = [];
  for (const r of report.reports) {
    const s = index.subjects.find(s => s.sourceMainKey === r.sourceMainKey && s.contextId === r.contextId);
    if (r.status !== 'SCOPED_RUNTIME_CAPTURE' || !s) { held.push({ runId: r.runId, status: r.status }); continue; }
    function add(type, ccoField, payload, reference, samplePoint, label = 'whole unit') {
      const o = observationTemplate(s, { id: `cco:${digest([r.runId, type, ccoField, reference]).slice(0, 32)}`, unitSize: r.unitSize }, type);
      o.scenarioId = r.metadata.scenarioId ?? 'CCO_P0'; o.trialId = r.runId; o.subjectLabel = label; o.samplePoint = samplePoint;
      // Setup facts not exposed by CCO stay NOT_RECORDED. Never infer no mods/effects.
      if (r.metadata.setup) o.setup = structuredClone(r.metadata.setup);
      o.identityVerification = { level: 'EXACT_SOURCE_OBSERVED', reference };
      o.observation = { result: 'CONCLUSIVE', ...payload }; o.confidence = 'OBSERVED_ONCE';
      o.provenance = { kind: 'RUNTIME_CCO', observer: 'WH3 battle CCO probe', observedAt: null, references: [reference],
        captureId: r.runId, ccoField, notes: 'Direct runtime CCO value. Runtime executable/pack consistency and missing setup fields still require confirmation.' };
      observations.push(o);
    }
    if (r.runId.includes('snapshot-')) for (const frame of r.frames.filter(f => !f.partial)) {
      const time = `CCO_TIME:${value(frame.timestamp) ?? 'UNKNOWN'}`;
      for (const [field, type, unit] of [['NumEntities', 'CCO_NUM_ENTITIES', 'runtime_entities'], ['NumEntitiesInitial', 'CCO_NUM_ENTITIES_INITIAL', 'runtime_entities'], ['HealthValue', 'CCO_HEALTH_VALUE', 'runtime_hp'], ['HealthMax', 'CCO_HEALTH_MAX', 'runtime_hp']]) {
        const v = value(frame.fields[field]); if (Number.isFinite(v)) add(type, field, { value: v, unit }, frame.reference, time);
      }
      for (const [name, list] of Object.entries(frame.lists)) if (list.complete) add('CCO_COMPONENT_LIST_COUNT', `${name}.Size`, { value: value(list.size), unit: 'runtime_entities' }, frame.reference, time, name);
    }
    for (const a of r.ammo) if (a.first !== null && a.last !== null && r.complete && r.runId.includes('trace-')) add('CCO_AMMO_PERCENT_CHANGE', a.field,
      { before: a.first, after: a.last, poolLabel: a.field }, a.samples[0].reference, `CCO_TRACE_WINDOW:${value(r.frames[0].timestamp) ?? 'UNKNOWN'}:${value(r.frames.at(-1).timestamp) ?? 'UNKNOWN'}`, a.field);
    for (const p of r.projectiles.filter(p => p.key)) {
      if (!r.missileSources.some(s => s.projectileKeys.includes(p.key))) { held.push({ runId: r.runId, reason: 'UNREVIEWED_PROJECTILE_KEY', key: p.key }); continue; }
      add('CCO_ACTIVE_PROJECTILE_CONTEXT', 'ActiveProjectileContext.Key', { description: p.key }, p.reference, `CCO_TIME:${p.timestamp ?? 'UNKNOWN'}`, 'unit projectile context');
    }
    for (const c of r.cursors.filter(c => c.status === 'OBSERVED_RUNTIME')) {
      const key = value(c.fields['EntityRecordContext.Key']);
      if (!c.matchingPathIds.length) { held.push({ runId: r.runId, reason: 'UNREVIEWED_ENTITY_KEY', key }); continue; }
      add('CCO_CURSOR_ENTITY', 'EntityContext.EntityRecordContext.Key', { description: key }, c.reference, 'CCO_CURSOR', `cursor:${key}`);
    }
  }
  const evidence = { format: FORMAT, observations }, validation = validateRuntimeEvidence(evidence, index);
  return { evidence, validation, resolutions: proposeResolutions(validation), held,
    triage: { RUNTIME_REQUIRED: held.length + report.reports.reduce((n, r) => n + r.missileSources.length, 0),
      STATIC_DB_FOLLOWUP: report.reports.reduce((n, r) => n + r.unexpectedEntityKeys.length + r.unexpectedProjectileKeys.length, 0),
      CONFLICTING_RUNTIME_EVIDENCE: report.parseProblems.filter(p => p.status === 'CONFLICTING_RUNTIME_EVIDENCE').length + validation.conflicts.length,
      notes: 'Additional capture triage, alongside preserved unresolved-triage.json. NOT_OBSERVED does not resolve omissions.' }, productionEligible: false };
}
