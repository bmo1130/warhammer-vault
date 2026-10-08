import projection from '../data/unitResistanceAdmissions.json';
import type { Unit } from '../domain/unit';

const byId=new Map(projection.admissions.map(a=>[a.id,a]));
const equal=(a: Unit['defense']['resistances'], b: Unit['defense']['resistances'])=>
  a===undefined||b===undefined ? a===b : Object.keys(a).length===Object.keys(b).length&&
    Object.entries(a).every(([k,v])=>b[k as keyof typeof b]===v);

export function applyUnitResistances(unit: Unit): Unit {
  const a=byId.get(unit.id);if(!a)return unit;
  const original=a.originalResistances??undefined;
  if(unit.gameVersion!==projection.gameVersion||!equal(unit.defense.resistances,original)) {
    throw new Error(`Unit resistance identity drift: ${unit.id}`);
  }
  return {...unit,defense:{...unit.defense,resistances:{...unit.defense.resistances,...a.values}}};
}
export function unitResistanceAdmission(unit: Unit) {
  const a=byId.get(unit.id);
  return a&&unit.gameVersion===projection.gameVersion&&equal(unit.defense.resistances,{...(a.originalResistances??{}),...a.values})
    ? {...a,sourceHash:projection.sourceHash,snapshotId:projection.snapshotId}:undefined;
}
// Restore only a completely matching admission; a modified resistance remains
// visible to the shared identity guard, including extra/missing fields.
export function withoutUnitResistances(unit: Unit): Unit {
  const a=unitResistanceAdmission(unit);if(!a)return unit;
  const original={...unit,defense:{...unit.defense}};
  if(a.originalResistances===null)delete original.defense.resistances;
  else original.defense.resistances=a.originalResistances;
  return original;
}
