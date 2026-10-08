import projection from '../data/unitHpEntityRuleAdmissions.json';
import type { Unit } from '../domain/unit';

const byId = new Map(projection.admissions.map(a => [a.id, a]));
export function applyUnitEntities(unit: Unit): Unit {
  const a = byId.get(unit.id);
  if (!a) return unit;
  if (unit.gameVersion !== projection.gameVersion || unit.entities.count !== (a.originalCount ?? undefined) || unit.entities.totalHealth !== (a.originalTotalHealth ?? undefined)) {
    throw new Error(`Unit entity identity drift: ${unit.id}`);
  }
  return { ...unit, entities: { ...unit.entities,
    ...(a.count !== null ? { count: a.count } : {}),
    ...(a.totalHealth !== null ? { totalHealth: a.totalHealth } : {}),
  } };
}

export function unitEntityAdmission(unit: Unit) {
  const a = byId.get(unit.id);
  return a && unit.gameVersion === projection.gameVersion && unit.entities.count === (a.count ?? undefined) && unit.entities.totalHealth === (a.totalHealth ?? undefined)
    ? { ...a, unitSize: projection.unitSize, sourceHash: projection.sourceHash } : undefined;
}

// Restore only exact admitted fields. A changed count or HP cannot be stripped
// to evade the shared identity collision guard. Existing measured HP survives.
export function withoutUnitEntities(unit: Unit): Unit {
  const a = unitEntityAdmission(unit);
  if (!a) return unit;
  const original = { ...unit, entities: { ...unit.entities } };
  if (a.originalCount === null) delete original.entities.count;
  else original.entities.count = a.originalCount;
  if (a.originalTotalHealth === null) delete original.entities.totalHealth;
  else original.entities.totalHealth = a.originalTotalHealth;
  return original;
}
