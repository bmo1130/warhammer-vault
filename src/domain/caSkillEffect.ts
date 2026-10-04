import projection from '../data/caSkillEffect.json';
import batchProjection from '../data/caSkillBatch01.json';
import batch02Projection from '../data/caSkillBatch02.json';
import type {Modifier} from './types';
import type {Unit} from './unit';
import type {DraftModifierRow} from './manualModifierProfile';
import {calculateResearchAndManual,researchModifiers,modifierSourceLabel} from './caResearchEffect';
import {applyModifiersWithBreakdown} from './unitModifiers';

export type SkillSelection = {skillKey:string; ownerKey:string; rank:number};
const admittedSkills=[projection,batchProjection,batch02Projection];
export function skillsForUnit(unit:Unit){
  return admittedSkills.filter(skill=>unit.gameVersion===skill.gameVersion&&skill.targets.some(t=>t.unitId===unit.id));
}
export function skillModifiers(unit:Unit,selected:readonly SkillSelection[]):Modifier[]{
  if(!selected.length)return [];
  if(selected.length!==1)throw new Error('이 admission은 exact 유닛별 검증된 스킬 하나만 지원합니다.');
  const choice=selected[0];
  const skill=skillsForUnit(unit).find(skill=>skill.skillKey===choice.skillKey&&skill.owner.key===choice.ownerKey);
  if(!skill||!Number.isInteger(choice.rank)||!skill.ranks.some(r=>r.rank===choice.rank))throw new Error('검증된 스킬 owner / exact 유닛 / rank와 일치하지 않습니다.');
  return skill.modifiers.filter(m=>m.unitId===unit.id&&m.rank===choice.rank).map(m=>({
    id:m.id,sourceType:'lord_skill',sourceId:skill.skillKey,targetType:'unit',targetId:unit.id,
    stat:m.stat,operation:m.operation,value:m.value,scope:'lord_army',gameVersion:skill.gameVersion,
    source:`CA_SKILL · ${m.effectKey}`,tags:[],conditions:{ownerKey:skill.owner.key,rank:choice.rank,commandingOwnForce:true},
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
  const skill=admittedSkills.find(p=>skills.some(s=>s.skillKey===p.skillKey&&s.ownerKey===p.owner.key&&p.ranks.some(r=>r.rank===s.rank))&&p.modifiers.some(m=>m.id===id));
  if(skill)return `${skill.name} · Rank ${skills.find(s=>s.skillKey===skill.skillKey)!.rank} · CA_SKILL`;
  const label=modifierSourceLabel(id,research);
  return label==='Manual'?'Manual · MANUAL':`${label} · CA_RESEARCH`;
}
