import registry from '../data/unitSharedIdentities.json';
import type { Unit } from '../domain/unit';
import { unitDiagnosticRepository, type UnitDiagnostic } from './unitDiagnosticRepository';

// Bounded admission projection, replay-checked against the pinned static review.
// Record equality binds a Unit without adding CA identity fields to the Unit schema.
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
};
export function assertSharedUnitIdentity(unit: Unit, diagnostic: UnitDiagnostic, snapshot = unitDiagnosticRepository.snapshot) {
  const link=registry.links.find(link=>link.productionId===unit.id);
  const identity=link?.partialReviewIdentity;
  if (!link || link.diagnosticId!==diagnostic.id || link.productionId!==diagnostic.id ||
    link.mainKey!==diagnostic.sourceMainKey || link.landKey!==diagnostic.sourceLandKey ||
    link.diagnosticSourceMainKey!==diagnostic.sourceMainKey || link.diagnosticSourceLandKey!==diagnostic.sourceLandKey ||
    identity?.internalId!==unit.id || identity.caMainUnitKey!==link.mainKey || identity.caLandUnitKey!==link.landKey ||
    diagnostic.contextId!==null || diagnostic.productionEligible!==false ||
    unit.gameVersion!==link.gameVersion || snapshot.gameVersion!==link.gameVersion ||
    snapshot.batchId!==registry.diagnosticBatchId || snapshot.staticSnapshotId!==registry.staticSnapshotId ||
    canonical(snapshot.snapshot)!==canonical(registry.snapshot) || canonical(unit)!==canonical(link.productionRecord)) {
    throw new Error(`Unit catalog ID collision: ${unit.id}. Explicit reviewed shared identity required.`);
  }
}
