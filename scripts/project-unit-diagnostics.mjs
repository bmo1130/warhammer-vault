// A bounded display projection of the completed batch. No extraction, ingestion,
// normalization, precedence inference, or Unit writer is involved.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { verifyIndex } from '../tools/wh3-importer/runtime-evidence/static-index.mjs';
import { verifyCandidates } from '../tools/wh3-importer/runtime-evidence/cco-probe/candidates.mjs';

const batch = 'generated/wh3/runtime-evidence/runtime-2026-10-01-9.0.2-final/';
const inputs = [];
function read(file) {
  const bytes = readFileSync(new URL(`../${file}`, import.meta.url));
  inputs.push({ file, sha256: createHash('sha256').update(bytes).digest('hex') });
  return JSON.parse(bytes);
}
const manifest = read(`${batch}manifest.json`);
const comparison = read(`${batch}comparison-report.json`);
const validated = read(`${batch}validated-evidence.json`);
const candidates = verifyCandidates(read('generated/wh3/runtime-evidence/cco-p0-9.0.2/static-candidates.json'));
const index = read('generated/wh3/runtime-evidence/cco-p0-9.0.2/static-index.json');
verifyIndex(index);
if (manifest.batchId !== 'runtime-2026-10-01-9.0.2' || manifest.gameVersion !== '9.0.2.0' ||
    manifest.staticSnapshotId !== index.snapshotId || candidates.snapshotId !== index.snapshotId ||
    validated.staticSnapshotId !== index.snapshotId || validated.status !== 'VALIDATED' ||
    validated.errors.length || validated.conflicts.length || manifest.conflicts.length ||
    manifest.parseProblems.length || manifest.rawConflictCount || manifest.missingInputs.length ||
    manifest.declarationProblems.length || manifest.productionEligible !== false ||
    manifest.productionModified !== false || manifest.staticModified !== false) {
  throw new Error('Display projection requires the completed, unchanged, validated batch.');
}
const names = ['black-coach', 'skeleton-chariots', 'dread-saurian', 'necrofex-colossus', 'free-company-baseline'];
const entries = names.map(caseId => {
  const first = manifest.cases.find(c => c.id === caseId);
  const subject = index.subjects.find(s => s.sourceMainKey === first.sourceMainKey && s.contextId === first.contextId);
  if (!subject || subject.sourceLandKey !== first.sourceLandKey) throw new Error('Exact diagnostic identity missing.');
  const source = candidates.units.find(u => u.sourceMainKey === subject.sourceMainKey);
  const cases = manifest.cases.filter(c => c.sourceMainKey === subject.sourceMainKey && c.sourceLandKey === subject.sourceLandKey && c.contextId === subject.contextId);
  const reports = comparison.reports.filter(r => r.sourceMainKey === subject.sourceMainKey && r.sourceLandKey === subject.sourceLandKey && r.contextId === subject.contextId && r.status === 'SCOPED_RUNTIME_CAPTURE');
  const observations = validated.records.filter(r => r.observation.sourceMainKey === subject.sourceMainKey && r.observation.sourceLandKey === subject.sourceLandKey && r.observation.contextId === subject.contextId);
  if (!reports.length || observations.some(r => r.observation.staticSnapshotId !== index.snapshotId || r.observation.gameVersion !== manifest.gameVersion)) throw new Error('Runtime scope drift.');
  const entityPaths = source?.views.AllEntitySources ?? subject.entity?.paths ?? [];
  const missilePaths = source?.views.AllMissileSources ?? subject.missile.paths;
  const summarizePath = (path, field) => [...new Set(reports.flatMap(r => r[field].filter(p => p.pathId === path.pathId).map(p => field === 'entities' ? p.status : p.weaponActivationStatus)))];
  const precedence = observations.find(r => r.observation.id === manifest.precedence?.observation);
  return {
    id: subject.catalogEntryId, name: subject.displayName, factionId: subject.factionId,
    sourceMainKey: subject.sourceMainKey, sourceLandKey: subject.sourceLandKey, contextId: subject.contextId,
    productionEligible: false,
    entityReviewStatus: reports[0].entityReviewStatus,
    entities: entityPaths.map(p => ({ pathId: p.pathId, role: p.role, entityKey: p.entityKey,
      rawCount: p.rawCardinality?.fact?.value ?? null, statuses: summarizePath(p, 'entities') })),
    missiles: missilePaths.map(p => ({ pathId: p.pathId, role: p.role, weaponKey: p.weaponKey,
      projectileKeys: (p.ProjectileContextList ?? p.projectilePaths).map(p => p.key),
      placement: p.activation.placement ?? 'RUNTIME_UNRESOLVED', activationStatuses: summarizePath(p, 'missileSources') })),
    cases: cases.map(c => ({ id: c.id, modifiers: c.modifiers, fields: c.firstUnitFields,
      views: Object.entries(c.firstComponentViews).map(([list, v]) => ({ list, size: v.size.status === 'VALUE' ? v.size.value : null,
        records: v.recordCounts.map(r => ({ key: r.recordKey, entries: r.entries })) })),
      projectileKeys: c.projectileKeys, projectileReferences: c.projectileReferences, interpretation: c.interpretation,
      entityIndexContinuity: c.entityIndexContinuity, simultaneousSources: c.simultaneousSources,
      scopedCaptures: c.scopedCaptures, completeCaptures: c.completeCaptures, heldCaptures: c.heldCaptures,
      problems: [...new Set(c.problems.map(p => p.reason))],
      unitSizes: [...new Set(reports.filter(r => r.declaredCaseId === c.id).map(r => r.unitSize))],
      confidenceStatuses: [...new Set(observations.filter(r => reports.some(p => p.declaredCaseId === c.id && p.runId === r.observation.provenance.captureId)).map(r => r.observation.confidence))],
      validationStatuses: [...new Set(observations.filter(r => reports.some(p => p.declaredCaseId === c.id && p.runId === r.observation.provenance.captureId)).map(r => r.status))],
      samplePoints: [...new Set(observations.filter(r => reports.some(p => p.declaredCaseId === c.id && p.runId === r.observation.provenance.captureId)).map(r => r.observation.samplePoint))],
      references: [...new Set(reports.filter(r => r.declaredCaseId === c.id).flatMap(r => r.frames.slice(0, 1).map(f => f.reference)))],
    })),
    precedence: precedence ? { ...manifest.precedence, relationship: precedence.observation.observation.relationship,
      kind: precedence.observation.provenance.kind, validationStatus: precedence.status,
      subjectLabel: precedence.observation.subjectLabel, samplePoint: precedence.observation.samplePoint } : null,
  };
});
const result = { batchId: manifest.batchId, gameVersion: manifest.gameVersion,
  staticSnapshotId: manifest.staticSnapshotId, snapshot: manifest.snapshot, inputs, entries };
const output = new URL('../src/data/unitDiagnostics.json', import.meta.url);
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Projected ${entries.length} diagnostic-only entries to ${fileURLToPath(output)}`);
