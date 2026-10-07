import projection from '../data/unitEntityAdmissions.json';
import type { Unit } from '../domain/unit';

const byId = new Map(projection.admissions.map(a => [a.id, a]));
export function applyUnitEntities(unit: Unit): Unit {
  const a = byId.get(unit.id);
  if (!a) return unit;
  if (unit.gameVersion !== projection.gameVersion || unit.entities.count !== (a.originalCount ?? undefined) || unit.entities.totalHealth !== a.totalHealth) {
    throw new Error(`Unit entity identity drift: ${unit.id}`);
  }
  return { ...unit, entities: { ...unit.entities, count: a.count } };
}

export function unitEntityAdmission(unit: Unit) {
  const a = byId.get(unit.id);
  return a && unit.gameVersion === projection.gameVersion && unit.entities.count === a.count && unit.entities.totalHealth === a.totalHealth
    ? { ...a, unitSize: projection.unitSize, sourceHash: projection.sourceHash } : undefined;
}

// Remove only the exact new count, preserving the original reviewed HP field.
export function withoutUnitEntities(unit: Unit): Unit {
  if (!unitEntityAdmission(unit)) return unit;
  const original = { ...unit, entities: { ...unit.entities } };
  delete original.entities.count;
  return original;
}
