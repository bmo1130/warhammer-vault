import projection from '../data/unitAttributeAdmissions.json';
import type { Unit } from '../domain/unit';

const byId = new Map(projection.admissions.map(a => [a.id, a]));
const same = (left: readonly string[] | undefined, right: readonly string[] | undefined) =>
  JSON.stringify(left) === JSON.stringify(right);

export function applyUnitAttributes(unit: Unit): Unit {
  const admission = byId.get(unit.id);
  if (!admission) return unit;
  if (unit.gameVersion !== projection.gameVersion || !same(unit.attributes, admission.originalAttributes ?? undefined)) {
    throw new Error(`Unit attribute identity drift: ${unit.id}`);
  }
  return admission.attributes === undefined ? unit : { ...unit, attributes: admission.attributes };
}

export function unitAttributeAdmission(unit: Unit) {
  const admission = byId.get(unit.id);
  return admission && unit.gameVersion === projection.gameVersion && same(unit.attributes, admission.attributes)
    ? { ...admission, sourceHash: projection.sourceHash } : undefined;
}

// Restore only the exact admitted collection before full-record identity checks.
// Extra, missing or reordered entries cannot bypass the original collision gate.
export function withoutUnitAttributes(unit: Unit): Unit {
  const admission = unitAttributeAdmission(unit);
  if (!admission) return unit;
  const original = { ...unit };
  if (admission.originalAttributes === null) delete original.attributes;
  else original.attributes = admission.originalAttributes;
  return original;
}
