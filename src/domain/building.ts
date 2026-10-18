import type {RecruitmentReference} from './unit';

export type BuildingField<T> = {status:'VERIFIED';value:T;field:string;reference:RecruitmentReference} |
  {status:'UNKNOWN';value:null;reason:string};

// Values, scopes and conditions remain separate. No cross-effect total or
// current campaign income is calculated from this static building document.
export type BuildingEffect = {
  key:string;
  name:string|null;
  text:string|null;
  value:number|null;
  valueDamaged:number|null;
  valueRuined:number|null;
  unit:'gold'|'percent'|'turns'|'raw';
  scope:string|null;
  scopeKey:string;
  officialScope:string|null;
  condition:string|null;
  kind:'INCOME'|'OTHER';
  incomeKind:'BASE'|'MODIFIER'|null;
  hidden:boolean;
  reference:RecruitmentReference;
};
export type BuildingFacts = {
  key:string;chainKey:string;stage:number;
  koreanName:BuildingField<string>;
  constructionCost:BuildingField<number>;
  constructionTurns:BuildingField<number>;
  effects:{status:'COMPLETE'|'PARTIAL'|'UNKNOWN';items:BuildingEffect[];reason?:string};
  income:{status:'COMPLETE'|'UNKNOWN';effects:string[];baseGold:number|null;reason?:string};
};
