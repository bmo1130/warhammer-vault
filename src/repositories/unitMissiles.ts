import projection from '../data/unitMissileAdmissions.json';
import damageProjection from '../data/unitMissileDamageAdmissions.json';
import type { Unit } from '../domain/unit';

const byId=new Map(projection.admissions.map(a=>[a.id,a]));
const damageById=new Map(damageProjection.admissions.map(a=>[a.id,a]));
if(damageProjection.gameVersion!==projection.gameVersion||damageProjection.snapshotId!==projection.snapshotId)throw new Error('Missile damage snapshot drift');
export type UnitMissileProfile=(typeof damageProjection.admissions)[number]['profiles'][number];
const effective=(a:(typeof projection.admissions)[number])=>{
  const damage=damageById.get(a.id);
  return {...a,...(damage?{values:damage.values,status:damage.status,reportPointer:damage.reportPointer}:{}),profiles:damage?.profiles??[],
    sourceHash:damage?damageProjection.sourceHash:projection.sourceHash,snapshotId:projection.snapshotId,
    reportReference:damage?damageProjection.reportReference:projection.reportReference};
};
const canonical=(v: unknown): string=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':
  v!==null&&typeof v==='object'?'{'+Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>JSON.stringify(k)+':'+canonical(x)).join(',')+'}':JSON.stringify(v);
const equal=(a: Unit['missile'],b: Unit['missile'])=>canonical(a)===canonical(b);
type Values={baseDamage?:number;armorPiercingDamage?:number;range?:number;baseTime?:number};
export function projectMissile(unit: Unit,values: Values): Unit {
  if(!Object.keys(values).length)return unit;
  const {baseDamage,armorPiercingDamage,range,baseTime}=values;
  return {...unit,missile:{...unit.missile,projectile:{...unit.missile?.projectile,
    ...(baseDamage!==undefined?{baseDamage}:{}),...(armorPiercingDamage!==undefined?{armorPiercingDamage}:{})},
    ...(range!==undefined?{range}:{}),...(baseTime!==undefined?{reload:{...unit.missile?.reload,baseTime}}:{})}};
}
export function applyUnitMissiles(unit: Unit): Unit {
  const a=byId.get(unit.id);if(!a)return unit;
  const original=a.originalMissile as Unit['missile']??undefined;
  if(unit.gameVersion!==projection.gameVersion||!equal(unit.missile,original))throw new Error(`Unit missile identity drift: ${unit.id}`);
  return projectMissile(unit,effective(a).values);
}
export function unitMissileAdmission(unit: Unit) {
  const a=byId.get(unit.id);if(!a||unit.gameVersion!==projection.gameVersion)return undefined;
  const admission=effective(a);
  const expected=projectMissile({...unit,missile:a.originalMissile as Unit['missile']??undefined},admission.values).missile;
  return equal(unit.missile,expected)?admission:undefined;
}
// Exact inverse only: additional or modified missile data still reaches the
// shared identity collision guard. N/A does not create an empty missile object.
export function withoutUnitMissiles(unit: Unit): Unit {
  const a=unitMissileAdmission(unit);if(!a)return unit;
  const original={...unit};
  if(a.originalMissile===null)delete original.missile;
  else original.missile=a.originalMissile as Unit['missile'];
  return original;
}
