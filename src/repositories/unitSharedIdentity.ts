import registry from '../data/unitSharedIdentities.json';
import hpAdmissions from '../data/unitHpAdmissions.json';
import speedAdmissions from '../data/unitSpeedAdmissions.json';
import type { Unit } from '../domain/unit';
import { withoutUnitLocalisation } from './unitLocalisation';
import { withoutUnitAttributes } from './unitAttributes';
import { withoutUnitPassives } from './unitPassives';
import { withoutUnitEntities } from './unitEntities';
import { withoutUnitSpeed } from './unitSpeed';
import { withoutUnitResistances } from './unitResistances';
import { withoutUnitMissiles } from './unitMissiles';
import { withoutUnitRecruitment } from './unitRecruitment';
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
  // Keep the exact static identity anchor; strip only explicit field admissions.
  const hp=hpAdmissions.admissions.find(admission=>admission.id===unit.id);
  let staticUnit: Unit=withoutUnitRecruitment(withoutUnitMissiles(withoutUnitResistances(withoutUnitSpeed(withoutUnitEntities(withoutUnitPassives(withoutUnitAttributes(withoutUnitLocalisation(unit))))))));
  if (hp && unit.entities.totalHealth!==undefined && hpAdmissions.unitSize==='ULTRA' &&
    hpAdmissions.unitSizeSource==='DECLARED_SETUP' && hp.kind==='DIRECT_ULTRA_RUNTIME' &&
    hp.field==='entities.totalHealth' && hp.mainKey===link?.mainKey && hp.landKey===link?.landKey &&
    hp.staticSnapshotId===snapshot.staticSnapshotId && unit.entities.totalHealth===hp.value) {
    staticUnit={...staticUnit,entities:{...staticUnit.entities}};
    delete staticUnit.entities.totalHealth;
  }
  const speed=speedAdmissions.admissions.find(admission=>admission.id===unit.id);
  if (speed && unit.movement.speed!==undefined && speed.kind==='STATIC_DERIVED_SPEED' &&
    speed.field==='movement.speed' && speed.mainKey===link?.mainKey && speed.landKey===link?.landKey &&
    speed.staticSnapshotId===snapshot.staticSnapshotId && speed.value===unit.movement.speed) {
    staticUnit={...staticUnit,movement:{...staticUnit.movement}};
    delete staticUnit.movement.speed;
  }
  if (!link || link.diagnosticId!==diagnostic.id || link.productionId!==diagnostic.id ||
    link.mainKey!==diagnostic.sourceMainKey || link.landKey!==diagnostic.sourceLandKey ||
    link.diagnosticSourceMainKey!==diagnostic.sourceMainKey || link.diagnosticSourceLandKey!==diagnostic.sourceLandKey ||
    identity?.internalId!==unit.id || identity.caMainUnitKey!==link.mainKey || identity.caLandUnitKey!==link.landKey ||
    diagnostic.contextId!==null || diagnostic.productionEligible!==false ||
    unit.gameVersion!==link.gameVersion || snapshot.gameVersion!==link.gameVersion ||
    snapshot.batchId!==registry.diagnosticBatchId || snapshot.staticSnapshotId!==registry.staticSnapshotId ||
    canonical(snapshot.snapshot)!==canonical(registry.snapshot) || canonical(staticUnit)!==canonical(link.productionRecord)) {
    throw new Error(`Unit catalog ID collision: ${unit.id}. Explicit reviewed shared identity required.`);
  }
}
