import projection from '../data/caSkillEffect.json';
import type {Modifier} from './types';
import type {Unit} from './unit';
import type {DraftModifierRow} from './manualModifierProfile';
import {calculateResearchAndManual,researchModifiers,modifierSourceLabel} from './caResearchEffect';
import {applyModifiersWithBreakdown} from './unitModifiers';

export type SkillSelection = {skillKey:string; ownerKey:string; rank:number};
export function skillsForUnit(unit:Unit){
  return unit.gameVersion===projection.gameVersion&&projection.targets.some(t=>t.unitId===unit.id)?[projection]:[];
}
export function skillModifiers(unit:Unit,selected:readonly SkillSelection[]):Modifier[]{
  if(!selected.length)return [];
  if(selected.length!==1)throw new Error('이 slice는 검증된 스킬 하나만 지원합니다.');
  const choice=selected[0];
  if(!skillsForUnit(unit).length||choice.skillKey!==projection.skillKey||choice.ownerKey!==projection.owner.key||
    !Number.isInteger(choice.rank)||choice.rank!==1)throw new Error('검증된 스킬 owner / exact 유닛 / rank와 일치하지 않습니다.');
  return projection.modifiers.filter(m=>m.unitId===unit.id&&m.rank===choice.rank).map(m=>({
    id:m.id,sourceType:'lord_skill',sourceId:projection.skillKey,targetType:'unit',targetId:unit.id,
    stat:m.stat,operation:m.operation,value:m.value,scope:'lord_army',gameVersion:projection.gameVersion,
    source:`CA_SKILL · ${m.effectKey}`,tags:[],conditions:{ownerKey:projection.owner.key,rank:choice.rank,commandingOwnForce:true},
  } as Modifier));
}
export function calculateWithSkills(unit:Unit,rows:readonly DraftModifierRow[],research:readonly string[],skills:readonly SkillSelection[]):ReturnType<typeof calculateResearchAndManual>{
  const existing=calculateResearchAndManual(unit,rows,research);
  if(existing.error||!skills.length)return existing;
  try{
    return {...applyModifiersWithBreakdown(unit,[...existing.modifiers,...researchModifiers(unit,research),...skillModifiers(unit,skills)]),
      modifiers:existing.modifiers,error:''};
  }catch(error){return {modifiers:[],breakdown:[],error:error instanceof Error?error.message:'스킬을 적용하지 못했습니다.'};}
}
export function calculatorSourceLabel(id:string,research:readonly string[],skills:readonly SkillSelection[]){
  if(skills.some(s=>s.skillKey===projection.skillKey&&s.ownerKey===projection.owner.key&&s.rank===1)&&projection.modifiers.some(m=>m.id===id))
    return `${projection.name} · Rank 1 · CA_SKILL`;
  const label=modifierSourceLabel(id,research);
  return label==='Manual'?'Manual · MANUAL':`${label} · CA_RESEARCH`;
}
