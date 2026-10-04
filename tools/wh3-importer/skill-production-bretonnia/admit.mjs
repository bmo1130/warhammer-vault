import assert from 'node:assert/strict';
import {sha256} from '../research-classifier/classify.mjs';
import {unique} from './source.mjs';
export function directReviewRows(classification){return classification.skills.flatMap(s=>s.effects.filter(e=>e.classification==='DIRECT').map(e=>({skillKey:s.skillKey,junctionRowId:e.junctionRowId,effectKey:e.effectKey,rank:e.rank,scopeKey:e.scopeKey,classification:e.classification,blockers:e.blockers,rawValue:e.rawValue,ownerKeys:s.admissionOwnerKeys,mappings:e.mappings,targets:e.targets})));}
const approvedKeys=[
 'wh_dlc07_skill_brt_alberic_battle_aspiring_knights',
 'wh_dlc07_skill_brt_alberic_battle_champions_of_bordeleaux',
 'wh_dlc07_skill_brt_fay_battle_blessed_water',
];
export function admit(inventory,classification,review,existing){
 assert.equal(review.format,'wh3-bretonnia-skill-reviewed-gate-v1');assert.equal(review.partialAllowed,false);
 assert.deepEqual(review.approvedSkillKeys,approvedKeys,'Unreviewed Skill admission');
 assert.deepEqual(directReviewRows(classification),review.directCandidates,'DIRECT candidate drift/unreviewed effect');
 assert.deepEqual(classification.skills.filter(s=>s.eligible).map(s=>s.skillKey),approvedKeys,'All complete DIRECT candidates must be reviewed');
 assert.equal(classification.partialAdmission.allowed,false,'Partial policy drift');
 const keys=new Set(),modifierIds=new Set();
 const skills=approvedKeys.map(key=>{
  const c=classification.skills.find(s=>s.skillKey===key),s=inventory.skills.find(s=>s.key===key),p=existing.find(p=>p.skillKey===key);assert(p,'New projection requires separately reviewed integration');
  assert(c.eligible&&c.classification==='DIRECT'&&!c.blockers.length);assert.deepEqual(s.rankLevels,[1]);assert(!s.isBackgroundSkill);assert.equal(c.effects.length,s.effects.length);
  assert(c.effects.every(e=>e.classification==='DIRECT'&&e.eligible&&!e.blockers.length&&e.rank===1&&e.scopeKey==='general_to_force_own'),'Unreviewed effect eligibility/rank/scope');
  assert.deepEqual(c.admissionOwnerKeys,[p.owner.key],'Exact owner allowlist drift');assert.equal(p.maxRank,1);assert.deepEqual(p.ranks.map(r=>r.rank),[1]);assert.equal(p.scope.key,'general_to_force_own');
  const effectRows=c.effects.flatMap(e=>e.mappings.map(m=>({effectKey:e.effectKey,rawValue:e.rawValue,stat:m.stat,operation:m.operation,value:m.value,junctionRowId:e.junctionRowId,targetRowId:m.routeRowId}))).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.deepEqual(effectRows,[...p.ranks[0].effects].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),'Existing Skill effect semantics drift');
  const targets=[...new Map(c.effects.flatMap(e=>e.targets).map(t=>[t.unitId,t])).values()];assert.deepEqual(targets,p.targets,'Exact main/land/Production target drift');
  assert(!keys.has(key));keys.add(key);
  const modifiers=c.effects.flatMap(e=>e.targets.flatMap(t=>e.mappings.map(m=>({id:`ca-skill:${key}:${p.owner.key}:1:${e.effectKey}:${t.mainKey}:${m.stat}`,rank:1,unitId:t.unitId,effectKey:e.effectKey,stat:m.stat,operation:m.operation,value:m.value}))));
  for(const m of modifiers){assert(!modifierIds.has(m.id),'Modifier collision');modifierIds.add(m.id);}
  assert.deepEqual([...modifiers].sort((a,b)=>a.id.localeCompare(b.id)),[...p.modifiers].sort((a,b)=>a.id.localeCompare(b.id)),'Calculator modifier projection drift');
  return {skillKey:key,name:s.name,ownerKeys:c.admissionOwnerKeys,ownerProofs:s.owners.filter(o=>o.safeStaticOwner),rank:1,effects:c.effects,targets,modifiers,status:'EXISTING_ADMISSION_REVERIFIED',omittedEffectJunctions:[]};
 });
 assert.deepEqual(unique(existing.map(p=>p.skillKey)),approvedKeys,'Existing registry completeness drift');
 const overlaps=[];for(let i=0;i<skills.length;i++)for(let j=i+1;j<skills.length;j++){const a=skills[i],b=skills[j],owners=a.ownerKeys.filter(k=>b.ownerKeys.includes(k)),units=a.targets.filter(t=>b.targets.some(u=>u.unitId===t.unitId));if(owners.length&&units.length)overlaps.push({skillKeys:[a.skillKey,b.skillKey],ownerKeys:owners,unitIds:units.map(t=>t.unitId)});}
 return {format:'wh3-bretonnia-skill-admission-v1',reviewSha256:sha256(JSON.stringify(review)),policy:'Complete source rank-1 Skills only; every DIRECT junction reviewed; no partial admission',skills,modifierCount:modifierIds.size,newSkillKeys:[],newEffectCount:0,newModifierCount:0,newProductionUnitIds:[],overlaps,overlapVerdict:overlaps.length?'VERIFIED_MULTI_SKILL_TARGET':'NO VERIFIED MULTI-SKILL TARGET',heldDirectCandidates:classification.skills.filter(s=>s.directEffects&&!s.eligible).map(s=>({skillKey:s.skillKey,directJunctions:s.effects.filter(e=>e.classification==='DIRECT').map(e=>e.junctionRowId),omittedJunctions:s.effects.filter(e=>e.classification!=='DIRECT').map(e=>({junctionRowId:e.junctionRowId,effectKey:e.effectKey,classification:e.classification,blockers:e.blockers})),blockers:s.blockers}))};
}
