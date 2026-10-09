import data from '../data/unitRecruitmentAdmissions.json';
import type { Unit, UnitRecruitmentRequirement, UnitRecruitmentSource, UnitRecruitmentReview } from '../domain/unit';

const byId=new Map(data.admissions.map(a=>[a.id,a]));
const canonical=(v: unknown): string=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':
  v!==null&&typeof v==='object'?'{'+Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>JSON.stringify(k)+':'+canonical(x)).join(',')+'}':JSON.stringify(v);
type Admission=typeof data.admissions[number];
function project(unit: Unit,a: Admission): Unit {
  return {...unit,campaign:{...unit.campaign,
    ...(a.requirements.length?{recruitmentRequirements:a.requirements as UnitRecruitmentRequirement[]}:{}),
    ...(a.sources.length?{recruitmentSources:a.sources as UnitRecruitmentSource[]}:{}),
    recruitmentReview:{status:a.status,directBuildingStatus:a.directBuildingStatus,effectiveStatus:a.sources.length?'PARTIAL_SOURCE':'UNKNOWN',
      permissionContext:a.permissionContext,unitConditions:a.unitConditions} as UnitRecruitmentReview}};
}
export function applyUnitRecruitment(unit: Unit): Unit {
  const a=byId.get(unit.id);if(!a)return unit;
  if(unit.gameVersion!==data.gameVersion||canonical(unit.campaign??null)!==canonical(a.originalCampaign))throw new Error(`Unit recruitment identity drift: ${unit.id}`);
  return project(unit,a);
}
export function unitRecruitmentAdmission(unit: Unit){
  const a=byId.get(unit.id);if(!a||unit.gameVersion!==data.gameVersion)return undefined;
  const expected=project({...unit,campaign:a.originalCampaign as Unit['campaign']??undefined},a).campaign;
  return canonical(unit.campaign)===canonical(expected)?{...a,sourceHash:data.sourceHash,snapshotId:data.snapshotId}:undefined;
}
export function withoutUnitRecruitment(unit: Unit): Unit {
  const a=unitRecruitmentAdmission(unit);if(!a)return unit;
  const result={...unit};if(a.originalCampaign===null)delete result.campaign;else result.campaign=a.originalCampaign as Unit['campaign'];return result;
}
// Building restrictions are shared by exact CA key, never deduced from a name.
export type RecruitmentBuilding={key:string;chainKey:string;stage:number;requiredPrimaryBuildingLevel:number;onlyInCapital:boolean;factionUnique:boolean;
  variants:{name:string|null;cultureKey:string;subcultureKey:string;factionKey:string;disables:boolean;reference:{rowId:string}}[];
  requiredBuildings:{key:string;reference:{rowId:string}}[];
  availabilitySets:{key:string;rules:unknown[];reference:{rowId:string}}[]};
const buildings=data.buildings as Record<string,RecruitmentBuilding>;
export function recruitmentBuilding(key: string): RecruitmentBuilding|undefined{return buildings[key];}
