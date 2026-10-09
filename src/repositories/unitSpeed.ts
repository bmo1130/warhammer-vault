import projection from '../data/unitSpeedRuleAdmissions.json';
import second from '../data/unitSpeedSecondAdmissions.json';
import type { Unit } from '../domain/unit';

type SpeedAdmission=(typeof projection.admissions[number] | typeof second.admissions[number]) & {rawField:string;rawDisplaySpeed:number;sourceHash:string;snapshotId:string};
const byId=new Map<string,SpeedAdmission>([...projection.admissions.map(a=>[a.id,{...a,rawField:'run_speed',rawDisplaySpeed:a.rawRunSpeed,sourceHash:projection.sourceHash,snapshotId:projection.snapshotId}] as const),
  ...second.admissions.map(a=>[a.id,{...a,sourceHash:second.sourceHash,snapshotId:second.snapshotId}] as const)]);
export function applyUnitSpeed(unit: Unit): Unit {
  const a=byId.get(unit.id);
  if(!a)return unit;
  if(unit.gameVersion!==projection.gameVersion||unit.movement.speed!==(a.originalSpeed??undefined)) {
    throw new Error(`Unit speed identity drift: ${unit.id}`);
  }
  return {...unit,movement:{...unit.movement,speed:a.value}};
}

export function unitSpeedAdmission(unit: Unit) {
  const a=byId.get(unit.id);
  return a&&unit.gameVersion===projection.gameVersion&&unit.movement.speed===a.value
    ? a:undefined;
}

// Restore only the exact admitted value; preserve an altered value so the
// shared identity guard still detects unintended movement changes.
export function withoutUnitSpeed(unit: Unit): Unit {
  const a=unitSpeedAdmission(unit);if(!a)return unit;
  const original={...unit,movement:{...unit.movement}};
  if(a.originalSpeed===null)delete original.movement.speed;
  else original.movement.speed=a.originalSpeed;
  return original;
}
