import { blankSetup, digest, observationTemplate, stable } from '../contract.mjs';
import { validateRuntimeEvidence, proposeResolutions } from '../validate.mjs';
import { compareRuns, parseProbeLogs, toRuntimeEvidence, value } from './ingest.mjs';

export const FREE_COMPANY = 'wh_dlc04_emp_inf_free_company_militia_0';
const lists = ['ManList', 'MountList', 'EngineList', 'EntityList'];
const modifiers = ['Mere Mortal Men! / Blessed Bullets', 'Imperial Gunnery School / Exploding Bullets'];

// These declarations supply human setup/interpretation only. Raw probe metadata
// is retained verbatim, including its custom-battle installer scenario label.
export function buildRuntimeBatch(inputs, index, candidates, declaration) {
  if (declaration.gameVersion !== index.snapshot.gameVersion || declaration.staticSnapshotId !== index.snapshotId) throw new Error('Batch declaration snapshot drift.');
  const ids = new Set(), logs = new Set();
  for (const c of declaration.cases) {
    if (!c.id || ids.has(c.id) || !c.sourceMainKey || !Array.isArray(c.sourceLogs) || !c.sourceLogs.length) throw new Error('Invalid/duplicate declared case.');
    ids.add(c.id);
    for (const log of c.sourceLogs) { if (logs.has(log)) throw new Error('A source log cannot declare two setups.'); logs.add(log); }
    if (c.modifiers && (c.sourceMainKey !== FREE_COMPANY || Object.keys(c.modifiers).sort().join(',') !== 'blessed,exploding' || Object.values(c.modifiers).some(v => typeof v !== 'boolean'))) throw new Error('Invalid Free Company modifier declaration.');
  }
  const parsed = parseProbeLogs(inputs), comparison = compareRuns(parsed, candidates, { index,
    additionalMainKeys: declaration.cases.map(c => c.sourceMainKey) });
  const declarationProblems = [];
  for (const r of comparison.reports) {
    const matches = declaration.cases.filter(c => c.sourceLogs.some(log => r.sourceLogs.includes(log)));
    if (!matches.length) continue;
    const c = matches[0];
    if (matches.length !== 1 || (r.sourceMainKey && r.sourceMainKey !== c.sourceMainKey)) {
      declarationProblems.push({ runId: r.runId, reason: 'DECLARED_IDENTITY_OR_SETUP_MISMATCH', declaredCaseIds: matches.map(c => c.id) });
      r.status = 'IDENTITY_PENDING'; r.complete = false; continue;
    }
    r.declaredCaseId = c.id;
    if (c.modifiers) {
      const subject = index.subjects.find(s => s.sourceMainKey === c.sourceMainKey && s.contextId === r.contextId);
      if (!subject || r.status !== 'SCOPED_RUNTIME_CAPTURE') continue;
      const setup = blankSetup(subject.factionId);
      setup.battleMode = c.battleMode ?? 'NOT_RECORDED';
      setup.effects = { status: 'KNOWN', activeKeys: [], labels: modifiers.map((m, i) => `${m}: ${c.modifiers[i ? 'exploding' : 'blessed'] ? 'APPLIED' : 'NOT_APPLIED'}`) };
      // Labels record the declared interventions; they do not assert CA effect keys,
      // complete effect/mod coverage, a save identity, difficulty or rank.
      r.declaredSetup = { setup, reference: declaration.declarationReference, kind: 'RUNTIME_MANUAL', caseId: c.id, modifiers: c.modifiers };
    }
  }
  const result = toRuntimeEvidence(comparison, index);
  const summaries = declaration.cases.map(c => summarizeCase(c, comparison.reports, index, declaration.declarationReference));
  // F9 snapshots are separate captures in the same battle, not independent trials.
  // Preserve their raw ammo endpoints without claiming a decrease when equal.
  for (const s of summaries) for (const series of s.snapshotSeries) for (const pool of series.ammo) {
    if (pool.first === null || pool.last === null) continue;
    const r = comparison.reports.find(r => r.runId === series.runIds[0]);
    const subject = index.subjects.find(s => s.sourceMainKey === r.sourceMainKey && s.contextId === r.contextId);
    const o = observationTemplate(subject, { id: `cco:snapshots:${digest([series.runIds, pool.field]).slice(0, 24)}`, unitSize: r.unitSize }, 'CCO_AMMO_PERCENT_CHANGE');
    o.scenarioId = r.metadata.scenarioId; o.trialId = series.sessionId; o.samplePoint = `CCO_SNAPSHOT_WINDOW:${series.firstTime}:${series.lastTime}`;
    o.subjectLabel = pool.field; if (r.declaredSetup) o.setup = structuredClone(r.declaredSetup.setup);
    o.identityVerification = { level: 'EXACT_SOURCE_OBSERVED', reference: series.references[0] };
    o.observation = { result: 'CONCLUSIVE', before: pool.first, after: pool.last, poolLabel: pool.field };
    o.confidence = 'OBSERVED_ONCE';
    o.provenance = { kind: 'RUNTIME_CCO', observer: 'WH3 battle CCO probe', observedAt: null, references: series.references,
      captureId: stable(series.runIds), ccoField: pool.field,
      notes: 'Raw endpoints across complete F9 snapshots in the same session/unit; no causal weapon attribution.' +
        (r.declaredSetup ? ` Human-declared setup: ${r.declaredSetup.reference}.` : '') };
    result.evidence.observations.push(o);
  }
  const matrix = summaries.filter(s => s.modifiers).map(s => ({ caseId: s.id, declaredModifiers: s.modifiers,
    declaredSetupReference: declaration.declarationReference, baselineProjectile: projectileFor(index, 'LAND_PRIMARY'),
    candidateOverrides: candidateOverrides(index), observedActiveProjectiles: s.projectileKeys, references: s.projectileReferences,
    captureCount: s.scopedCaptures, completeCaptures: s.completeCaptures,
    status: s.projectileKeys.length === 1 && s.completeCaptures ? 'OBSERVED_ONCE' : 'INCONCLUSIVE' }));
  const baseValidation = validateRuntimeEvidence(result.evidence, index);
  const precedence = baseValidation.status === 'VALIDATED' && !declarationProblems.length ? precedenceObservation(matrix, comparison, index, declaration) :
    { status: 'INCONCLUSIVE', scope: 'EXACT_SOURCE_GAME_DECLARED_CAMPAIGN_SETUP_ONLY', observation: null, productionEligible: false };
  if (precedence.observation) result.evidence.observations.push(precedence.observation);
  result.validation = validateRuntimeEvidence(result.evidence, index);
  result.resolutions = proposeResolutions(result.validation);
  const manifest = { batchId: declaration.batchId, gameVersion: index.snapshot.gameVersion, staticSnapshotId: index.snapshotId, snapshot: index.snapshot,
    inputs: inputs.map(input => ({ sourceLog: input.name, sourcePath: input.sourcePath ?? null, sha256: input.sha256 ?? null,
      parsedEvents: parsed.events.filter(e => e.references.some(ref => ref.startsWith(input.name + ':'))).length,
      status: parsed.events.some(e => e.references.some(ref => ref.startsWith(input.name + ':'))) ? 'PARSED' : 'NO_PROBE_EVENTS' })),
    missingInputs: [...logs].filter(name => !inputs.some(i => i.name === name)), declarationProblems,
    parsedEvents: parsed.events.length, captures: comparison.reports.length, observations: result.evidence.observations.length,
    validationStatus: result.validation.status, conflicts: result.validation.conflicts, parseProblems: parsed.problems,
    rawConflictCount: parsed.conflictKeys.length, cases: summaries, freeCompanyMatrix: matrix,
    precedence: { ...precedence, observation: precedence.observation?.id ?? null },
    rawObservationFile: 'raw-probe-events.json', comparisonFile: 'comparison-report.json',
    productionEligible: false, productionModified: false, staticModified: false };
  return { parsed, comparison, ...result, manifest };
}

function projectileFor(index, role) {
  return index.subjects.find(s => s.sourceMainKey === FREE_COMPANY && s.contextId === null)?.missile.paths.find(p => p.role === role)?.projectilePaths[0]?.key ?? null;
}
function candidateOverrides(index) {
  return index.subjects.find(s => s.sourceMainKey === FREE_COMPANY && s.contextId === null)?.missile.paths.filter(p => p.role !== 'LAND_PRIMARY')
    .map(p => ({ pathId: p.pathId, weaponKey: p.weaponKey, projectileKeys: p.projectilePaths.map(q => q.key), activation: p.activation })) ?? [];
}
function summarizeCase(c, reports, index, reference) {
  const all = reports.filter(r => r.declaredCaseId === c.id), scoped = all.filter(r => r.status === 'SCOPED_RUNTIME_CAPTURE');
  const frames = scoped.flatMap(r => r.frames.filter(f => !f.partial));
  const first = frames[0];
  const subject = index.subjects.find(s => s.sourceMainKey === c.sourceMainKey && s.contextId === null);
  const groups = new Map();
  for (const r of scoped.filter(r => r.complete && r.runId.includes('snapshot-') && r.frames.every(f => Number.isFinite(value(f.timestamp))))) {
    const key = stable([JSON.parse(r.runId)[0], value(r.frames[0].fields.UniqueUiId), r.unitSize]);
    if (!groups.has(key)) groups.set(key, []); groups.get(key).push(r);
  }
  const snapshotSeries = [...groups.values()].filter(rs => rs.length > 1).map(rs => {
    rs.sort((a, b) => value(a.frames[0].timestamp) - value(b.frames[0].timestamp));
    const fs = rs.flatMap(r => r.frames), changes = [];
    for (let i = 1; i < fs.length; i++) for (const list of lists) for (const [slot, row] of Object.entries(fs[i].lists[list]?.entries ?? {})) {
      const previous = fs[i - 1].lists[list]?.entries[slot];
      if (!previous || value(row.fields['EntityRecordContext.Key']) !== value(previous.fields['EntityRecordContext.Key']) ||
        value(row.fields['UnitContext.UniqueUiId']) !== value(fs[i].fields.UniqueUiId) ||
        value(previous.fields['UnitContext.UniqueUiId']) !== value(fs[i - 1].fields.UniqueUiId)) continue;
      const before = value(previous.fields.ReloadRemainingTime), after = value(row.fields.ReloadRemainingTime);
      if (Number.isFinite(before) && Number.isFinite(after) && before !== after) changes.push({ list, index: Number(slot),
        entityRecordKey: value(row.fields['EntityRecordContext.Key']), before, after, decreaseObserved: after < before,
        references: [previous.reference, row.reference], entityContinuity: 'UNVERIFIED_LIST_INDEX' });
    }
    return { sessionId: JSON.parse(rs[0].runId)[0], runIds: rs.map(r => r.runId), firstTime: value(fs[0].timestamp), lastTime: value(fs.at(-1).timestamp),
      references: fs.map(f => f.reference), reloadRemainingTimeChanges: changes,
      ammo: ['PrimaryAmmoPercent', 'SecondaryAmmoPercent'].map(field => {
        const values = fs.map(f => value(f.fields[field]));
        return { field, first: Number.isFinite(values[0]) ? values[0] : null, last: Number.isFinite(values.at(-1)) ? values.at(-1) : null,
          decreaseObserved: values.slice(1).some((v, i) => Number.isFinite(v) && Number.isFinite(values[i]) && v < values[i]), causalWeaponAttribution: 'INCONCLUSIVE' };
      }) };
  });
  return { id: c.id, sourceMainKey: c.sourceMainKey, sourceLandKey: subject?.sourceLandKey ?? null, contextId: subject?.contextId ?? null,
    sourceLogs: c.sourceLogs, scopedCaptures: scoped.length, completeCaptures: scoped.filter(r => r.complete).length,
    heldCaptures: all.length - scoped.length, sampleCount: frames.length,
    staticCandidateCounts: { entity: subject?.entity?.paths.length ?? null, missile: subject?.missile?.paths.length ?? null },
    firstUnitFields: first ? Object.fromEntries(['NumEntities', 'HealthValue', 'HealthMax'].map(k => [k, first.fields[k] ?? { status: 'NULL' }])) : null,
    firstComponentViews: first ? Object.fromEntries(lists.map(list => {
      const rows = Object.values(first.lists[list]?.entries ?? {}), keys = [...new Set(rows.map(row => value(row.fields['EntityRecordContext.Key'])).filter(Boolean))];
      return [list, { size: first.lists[list]?.size ?? { status: 'NULL' }, identities: keys,
        recordCounts: keys.map(recordKey => {
          const matching = rows.filter(row => value(row.fields['EntityRecordContext.Key']) === recordKey);
          return { recordKey, entries: matching.length, isMan: [...new Set(matching.map(row => value(row.fields.IsMan)))],
            isEngine: [...new Set(matching.map(row => value(row.fields.IsEngine)))],
            ownerMatchesSelectedUnit: matching.every(row => value(row.fields['UnitContext.UniqueUiId']) === value(first.fields.UniqueUiId)) };
        }) }];
    })) : null,
    sharedRecordViews: scoped.flatMap(r => r.sharedRecordViews), projectileKeys: [...new Set(scoped.flatMap(r => r.distinctObservedProjectileKeys))].sort(),
    projectileReferences: [...new Set(scoped.flatMap(r => r.projectiles.filter(p => p.key).map(p => p.reference)))],
    traceWindows: scoped.filter(r => r.runId.includes('trace-')).map(r => ({ runId: r.runId, samples: r.frames.length, complete: r.complete,
      ammo: r.ammo.map(({ field, first, last, decreaseObserved }) => ({ field, first, last, decreaseObserved })),
      reloadChanges: r.reloadStateChanges.length, reloadRecordKeys: [...new Set(r.reloadStateChanges.map(c => c.entityRecordKey))].sort() })),
    snapshotSeries, modifiers: c.modifiers ?? null,
    interpretation: { kind: 'RUNTIME_MANUAL', reference, text: c.interpretation, status: frames.length ? 'HUMAN_INTERPRETATION_OF_CAPTURE' : 'MISSING_RUNTIME_INPUT' },
    problems: all.flatMap(r => r.problems.map(reason => ({ runId: r.runId, reason }))),
    entityIndexContinuity: 'UNVERIFIED', simultaneousSources: 'INCONCLUSIVE', physicalComponentCount: null,
    productionEligible: false };
}
function precedenceObservation(matrix, comparison, index, declaration) {
  const states = [[false, false], [true, false], [false, true], [true, true]].map(([blessed, exploding]) => matrix.filter(m => m.declaredModifiers.blessed === blessed && m.declaredModifiers.exploding === exploding));
  const pending = { status: 'INCONCLUSIVE', scope: 'EXACT_SOURCE_GAME_DECLARED_CAMPAIGN_SETUP_ONLY', observation: null, productionEligible: false };
  if (states.some(rows => rows.length !== 1 || rows[0].status !== 'OBSERVED_ONCE')) return pending;
  const [base, blessed, exploding, both] = states.map(rows => rows[0]), keys = [base, blessed, exploding, both].map(row => row.observedActiveProjectiles[0]);
  if (keys[0] !== base.baselineProjectile || keys[1] === keys[0] || keys[2] === keys[0] || keys[1] === keys[2] || keys[3] !== keys[2] ||
    !blessed.candidateOverrides.some(p => p.projectileKeys.includes(keys[1])) || !exploding.candidateOverrides.some(p => p.projectileKeys.includes(keys[2]))) return pending;
  const r = comparison.reports.find(r => r.declaredCaseId === both.caseId && r.status === 'SCOPED_RUNTIME_CAPTURE' && r.complete);
  if (!r) return pending;
  const subject = index.subjects.find(s => s.sourceMainKey === FREE_COMPANY && s.contextId === r.contextId);
  const o = observationTemplate(subject, { id: `${declaration.batchId}:free-company`, unitSize: r.unitSize }, 'OVERRIDE_PRECEDENCE');
  o.scenarioId = declaration.batchId; o.trialId = JSON.parse(r.runId)[0]; o.setup = structuredClone(r.declaredSetup.setup);
  o.samplePoint = 'OBSERVED_OVERLAP_SETUP'; o.subjectLabel = 'Exploding Bullets > Blessed Bullets';
  o.identityVerification = { level: 'EXACT_SOURCE_OBSERVED', reference: both.references[0] };
  o.missilePathIds = subject.missile.paths.map(p => p.pathId); o.pathBinding = 'COMPONENT_ROLE_ONLY';
  o.observation = { result: 'CONCLUSIVE', relationship: 'PRECEDES', notes: `Observed active projectile ${keys[3]} with both declared modifiers applicable. Baseline ${keys[0]}; blessed-only ${keys[1]}; exploding-only ${keys[2]}. Scope: Free Company Militia, ${declaration.gameVersion}, this human-declared campaign setup and these two modifiers only. No universal override rule or exact weapon-source attribution.` };
  o.confidence = 'OBSERVED_ONCE'; o.provenance = { kind: 'RUNTIME_MANUAL', observer: 'Human setup declaration with CCO comparison', observedAt: null,
    references: [declaration.declarationReference, ...matrix.flatMap(m => m.references)], notes: 'Interpretation combines human-declared applicability and separately referenced raw CCO active projectile observations.' };
  return { status: 'OBSERVED_ONCE', scope: pending.scope, winner: modifiers[1], loser: modifiers[0], observedProjectile: keys[3], observation: o, productionEligible: false };
}

export function batchMarkdown(manifest) {
  return `# ${manifest.batchId}\n\nGame ${manifest.gameVersion}; static snapshot \`${manifest.staticSnapshotId}\`.\n\n` +
    `${manifest.parsedEvents} parsed events; ${manifest.captures} captures; ${manifest.observations} canonical observations; validation ${manifest.validationStatus}; validation/raw conflicts ${manifest.conflicts.length}/${manifest.rawConflictCount}; parse problems ${manifest.parseProblems.length}; productionEligible=false.\n\n` +
    '## Inputs\n\n' + manifest.inputs.map(i => `- ${i.sourceLog}: ${i.status}, ${i.parsedEvents} events; SHA256 ${i.sha256}; source ${i.sourcePath}`).join('\n') +
    `\n\nMissing inputs: ${manifest.missingInputs.join(', ') || 'NONE'}. Declaration mismatches: ${manifest.declarationProblems.length}.\n\n## Cases\n\n` +
    manifest.cases.map(c => `### ${c.id}\n\n- Main/land: ${c.sourceMainKey} / ${c.sourceLandKey}\n- Static entity/missile paths: ${c.staticCandidateCounts.entity ?? 'NOT_REVIEWED'} / ${c.staticCandidateCounts.missile}\n- Scoped/held captures: ${c.scopedCaptures}/${c.heldCaptures}; samples: ${c.sampleCount}\n- Raw first fields: ${JSON.stringify(c.firstUnitFields)}\n- Context views: ${JSON.stringify(c.firstComponentViews)}\n- Active projectile keys: ${c.projectileKeys.join(', ') || 'not observed'}\n- Trace windows: ${JSON.stringify(c.traceWindows)}\n- Snapshot pool endpoints: ${JSON.stringify(c.snapshotSeries.map(s => ({ ammo: s.ammo, reloadChanges: s.reloadRemainingTimeChanges.length, reloadDecreases: s.reloadRemainingTimeChanges.filter(c => c.decreaseObserved).length })))}\n- Human interpretation (${c.interpretation.status}): ${c.interpretation.text}\n- Unresolved: index continuity UNVERIFIED; simultaneous sources INCONCLUSIVE; physical count not summed; parent/weapon path pairing unverified.\n- Capture problems: ${[...new Set(c.problems.map(p => p.reason))].join(', ') || 'NONE'}; productionEligible=false.\n`).join('\n') +
    '\n## Free Company precedence matrix\n\n| Case | Blessed declared | Exploding declared | Observed active projectile | Status |\n| --- | --- | --- | --- | --- |\n' +
    manifest.freeCompanyMatrix.map(m => `| ${m.caseId} | ${m.declaredModifiers.blessed} | ${m.declaredModifiers.exploding} | ${m.observedActiveProjectiles.join(', ') || 'MISSING'} | ${m.status} |`).join('\n') +
    `\n\nPrecedence: ${manifest.precedence.status}; ${manifest.precedence.winner ?? 'unresolved'} > ${manifest.precedence.loser ?? 'unresolved'}. Scope: ${manifest.precedence.scope}.\n\nSetup/modifier applicability is human-declared; active projectiles and counters are CCO-observed. Baseline and available overrides remain static candidates in manifest.json; weaponActivationStatus remains INCONCLUSIVE. Raw inputs are copied unchanged under inputs/. No production admission or global rule.\n`;
}
