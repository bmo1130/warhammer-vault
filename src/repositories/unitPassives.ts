import projection from '../data/unitPassiveAdmissions.json';
import type { Unit } from '../domain/unit';

const byId = new Map(projection.admissions.map(a => [a.id, a]));
const same = (left: readonly string[] | undefined, right: readonly string[] | undefined) =>
  JSON.stringify(left) === JSON.stringify(right);

export function applyUnitPassives(unit: Unit): Unit {
  const admission = byId.get(unit.id);
  if (!admission) return unit;
  if (unit.gameVersion !== projection.gameVersion || !same(unit.passiveAbilities, admission.originalPassiveAbilities ?? undefined)) {
    throw new Error(`Unit passive identity drift: ${unit.id}`);
  }
  return admission.passiveAbilities === undefined ? unit : { ...unit, passiveAbilities: admission.passiveAbilities };
}

export function unitPassiveAdmission(unit: Unit) {
  const admission = byId.get(unit.id);
  return admission && unit.gameVersion === projection.gameVersion && same(unit.passiveAbilities, admission.passiveAbilities)
    ? { ...admission, sourceHash: projection.sourceHash } : undefined;
}

// Undo only the exact admitted list before full-record collision checks.
export function withoutUnitPassives(unit: Unit): Unit {
  const admission = unitPassiveAdmission(unit);
  if (!admission) return unit;
  const original = { ...unit };
  if (admission.originalPassiveAbilities === null) delete original.passiveAbilities;
  else original.passiveAbilities = admission.originalPassiveAbilities;
  return original;
}
