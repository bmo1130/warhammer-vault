import projection from '../data/unitLocalisations.json';
import type { Unit } from '../domain/unit';

const byId = new Map(projection.admissions.map(a => [a.id, a]));

export function localiseUnit(unit: Unit): Unit {
  const admission = byId.get(unit.id);
  if (!admission) return unit;
  if (unit.gameVersion !== projection.gameVersion || unit.name !== admission.englishName) {
    throw new Error(`Unit localisation identity drift: ${unit.id}`);
  }
  return { ...unit, name: admission.name };
}

// Strip only an exact admitted display name before the existing full-record
// collision gate. All source identity, stats and other fields still compare.
export function withoutUnitLocalisation(unit: Unit): Unit {
  const admission = byId.get(unit.id);
  return admission && unit.gameVersion === projection.gameVersion && unit.name === admission.name
    ? { ...unit, name: admission.englishName } : unit;
}

export function unitLocalisation(unit: Unit) {
  const admission = byId.get(unit.id);
  return admission && unit.gameVersion === projection.gameVersion && unit.name === admission.name
    ? { ...admission, sourcePack: projection.koreanPack.file_name, sourceHash: projection.sourceHash,
      packHash: projection.koreanPack.sha256 } : undefined;
}

export function originalUnitName(unit: Unit): string | undefined {
  return unitLocalisation(unit)?.englishName;
}
