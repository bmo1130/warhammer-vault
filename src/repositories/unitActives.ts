import projection from '../data/unitActiveAdmissions.json';
import type { Unit } from '../domain/unit';
const byId = new Map(projection.admissions.map(a => [a.id, a]));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const definitions: Record<string, {
  id: string; name: string; englishName: string; kind: string; type: string; typeLabel: string;
  sourceType: string; rawKeys: string[]; enemyHidden: boolean; toggleGroups: string[];
  conditionReferences: {table: string; field: string; rawFlag: string; sourceRowId: string}[];
  phaseKeys: string[]; parentAbility: string; activationStatus: string; sourceRowIds: string[];
}> = projection.definitions;
export function applyUnitActives(unit: Unit): Unit {
  const a = byId.get(unit.id);
  if (!a) return unit;
  if (unit.gameVersion !== projection.gameVersion || !same(unit.abilities, a.originalAbilities ?? undefined) || unit.boundAbilities !== undefined) throw new Error(`Unit active identity drift: ${unit.id}`);
  return a.abilities === undefined ? unit : { ...unit, abilities: a.abilities, boundAbilities: a.boundAbilities };
}
export function unitActiveAdmission(unit: Unit) {
  const a = byId.get(unit.id);
  return a && unit.gameVersion === projection.gameVersion && same(unit.abilities, a.abilities) && same(unit.boundAbilities, a.boundAbilities)
    ? { ...a, sourceHash: projection.sourceHash } : undefined;
}
export function withoutUnitActives(unit: Unit): Unit {
  const a = unitActiveAdmission(unit);
  if (!a || a.abilities === undefined) return unit;
  const original = { ...unit };
  if (a.originalAbilities === null) delete original.abilities;
  else original.abilities = a.originalAbilities;
  delete original.boundAbilities;
  return original;
}
export function unitActiveDefinition(id: string) {
  return definitions[id];
}
export function unitActiveSearchNames(unit: Unit) {
  return [...unit.abilities ?? [], ...unit.boundAbilities ?? []].flatMap(id => {
    const d = unitActiveDefinition(id);
    return d ? [d.name, d.englishName, ...d.rawKeys] : [];
  }).join(' ');
}
