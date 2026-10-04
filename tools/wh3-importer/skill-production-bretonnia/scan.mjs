import assert from 'node:assert/strict';
import {graph,materialize} from '../skill-class-selector-research/research.mjs';
import {unique} from './source.mjs';
const ownForce='general_to_force_own',levelTable='character_skill_level_to_effects_junctions_tables';
const src=r=>({rowId:r.id,raw:r.row});
export function scan(source,units){
 const g=graph(source),root=g.one('cultures_tables','key',source.cultureKey);g.covered('cultures_subcultures_tables','culture',source.cultureKey);
 const subcultures=g.rows('cultures_subcultures_tables','culture',source.cultureKey),factions=g.rows('factions_tables').filter(f=>subcultures.some(s=>s.row.subculture===f.row.subculture));
 for(const s of subcultures){g.join(s,'culture',root,'key');g.covered('factions_tables','subculture',s.row.subculture);}
 for(const f of factions){g.join(f,'subculture',g.one('cultures_subcultures_tables','subculture',f.row.subculture),'subculture');g.covered('faction_agent_permitted_subtypes_tables','faction',f.row.key);}
 const permissionRows=g.rows('faction_agent_permitted_subtypes_tables').filter(p=>factions.some(f=>f.row.key===p.row.faction));
 assert.deepEqual(unique(permissionRows.map(p=>p.row.subtype)),source.subtypeKeys,'Bretonnia subtype universe drift');
 const ownSets=g.rows('character_skill_node_sets_tables').filter(s=>source.subtypeKeys.includes(s.row.agent_subtype_key));assert.deepEqual(unique(ownSets.map(s=>s.row.key)),source.treeSetKeys);
 assert(source.contextualSetKeys.every(k=>source.treeSetKeys.includes(k)),'Affiliation-only tree needs separate source closure before a full-universe claim');
 const memberItems=g.rows('character_skill_node_set_items_tables').filter(i=>source.treeSetKeys.includes(i.row.set));
 const universeNodes=memberItems.map(i=>g.one('character_skill_nodes_tables','key',i.row.item));
 assert.deepEqual(unique(universeNodes.map(n=>n.row.character_skill_key)),source.skillKeys,'Skill universe closure drift');
 const ownerFacts=source.subtypeKeys.map(key=>{
  const subtype=g.one('agent_subtypes_tables','key',key),main=g.one('main_units_tables','unit',subtype.row.associated_unit_override),land=g.one('land_units_tables','key',main.row.land_unit);
  const sets=ownSets.filter(s=>s.row.agent_subtype_key===key);g.covered('character_skill_node_sets_tables','agent_subtype_key',key);
  const permissions=permissionRows.filter(p=>p.row.subtype===key),agentKeys=unique(sets.map(s=>s.row.agent_key));
  for(const s of sets)g.join(s,'agent_subtype_key',subtype,'key');for(const p of permissions){g.join(p,'subtype',subtype,'key');g.join(p,'faction',g.one('factions_tables','key',p.row.faction),'key');}
  return {key,name:g.one('Loc','key',`land_units_onscreen_name_${land.row.key}`).row.text,mainKey:main.row.unit,landKey:land.row.key,caste:main.row.caste,recruitmentCategory:subtype.row.recruitment_category,
   characterType:main.row.caste==='hero'?(subtype.row.show_in_ui?'generic_hero':'special_hero'):(subtype.row.recruitment_category==='legendary_lords'?'legendary_lord':'generic_lord'),
   treeSetKeys:sets.map(s=>s.row.key),permissionRowIds:permissions.map(p=>p.id),agentKeys,flags:{showInUi:subtype.row.show_in_ui,canGainXp:subtype.row.can_gain_xp,recruitable:subtype.row.recruitable},
   availability:subtype.row.show_in_ui&&subtype.row.can_gain_xp?'STATIC_TREE_RUNTIME_UNLOCK_NOT_OBSERVED':'SPECIAL_RUNTIME_AVAILABILITY_UNKNOWN',joins:[g.join(subtype,'associated_unit_override',main,'unit'),g.join(main,'land_unit',land,'key')]};
 });
 const byOwner=new Map(ownerFacts.map(o=>[o.key,o]));
 const memberships=source.selectorKeys.map(key=>{
  const set=g.one('unit_sets_tables','key',key),branches=g.rows('unit_set_to_unit_junctions_tables','unit_set',key);g.covered('unit_set_to_unit_junctions_tables','unit_set',key);
  const structuralBlockers=unique([...(set.row.use_unit_exp_level_range||set.row.special_category?['CONDITIONAL_SELECTOR']:[]),...branches.flatMap(b=>[...(b.row.exclude?['SELECTOR_EXCLUSION']:[]),...(['unit_record','unit_caste','unit_class','unit_category'].filter(f=>b.row[f]).length!==1?['COMPOSITE_OR_EMPTY_SELECTOR']:[]),...(b.row.unit_category?['UNREVIEWED_UNIT_CATEGORY_SELECTOR']:[])])]);
  if(structuralBlockers.length){
   // Preserve identifiable source records separately from unresolved effect
   // applicability. Experience predicates never become Production allowlists.
   const candidates=new Map();for(const branch of branches){if(branch.row.unit_record&&!branch.row.exclude&&!branch.row.unit_caste&&!branch.row.unit_class&&!branch.row.unit_category){const main=g.one('main_units_tables','unit',branch.row.unit_record),land=g.one('land_units_tables','key',main.row.land_unit);g.join(branch,'unit_record',main,'unit');g.join(main,'land_unit',land,'key');candidates.set(main.row.unit,{mainKey:main.row.unit,landKey:land.row.key,mainRowId:main.id,landRowId:land.id,isRenown:main.row.is_renown,productionUnitIds:units.filter(u=>u.id===`ca_unit_${main.row.unit}`&&u.gameVersion===source.provenance.gameVersion).map(u=>u.id)});}}
   return {key,status:'UNRESOLVED_SELECTOR',taxonomy:'DYNAMIC/CONDITIONAL_OR_COMPLEX',definitionRowId:set.id,definition:set.row,sourceBranches:branches.map(src),blockers:structuralBlockers,sourceIdentityCandidates:[...candidates.values()],candidateIdentityIsEffectApplicability:false,identityUnresolvedCount:branches.length-candidates.size,exactMembers:[],productionMembers:[],omittedNonProduction:[],ambiguous:[],unresolvedCount:branches.length,duplicateCount:0,branchOverlapCount:0};
  }
  const result=materialize(source,key,units);return {...result,sourceBranches:branches.map(src),unresolvedCount:result.ambiguous.length,duplicateCount:0,branchOverlapCount:result.unionCollisions.length};
 });
 const membershipMap=new Map(memberships.map(s=>[s.key,s]));
 const skills=source.skillKeys.map(key=>{
  const skill=g.one('character_skills_tables','key',key),allNodes=g.rows('character_skill_nodes_tables','character_skill_key',key);g.covered('character_skill_nodes_tables','character_skill_key',key);
  const owners=[],foreignOwners=[],unresolvedOwners=[];
  for(const node of allNodes){g.covered('character_skill_node_set_items_tables','item',node.row.key);
   for(const item of g.rows('character_skill_node_set_items_tables','item',node.row.key)){
    const set=g.one('character_skill_node_sets_tables','key',item.row.set),brt=source.treeSetKeys.includes(set.row.key),subtypeKey=set.row.agent_subtype_key;
    const base={subtypeKey,nodeKey:node.row.key,setKey:set.row.key,nodeRowId:node.id,itemRowId:item.id,setRowId:set.id,enabled:node.row.visible_in_ui&&!item.row.mod_disabled,joins:[g.join(node,'character_skill_key',skill,'key'),g.join(item,'item',node,'key'),g.join(item,'set',set,'key')],
     restrictions:{node:[node.row.campaign_key,node.row.faction_key,node.row.subculture],set:[set.row.campaign_key,set.row.faction_key,set.row.subculture]}};
    if(!brt){foreignOwners.push(base);continue;}
    if(!subtypeKey||!byOwner.has(subtypeKey)){unresolvedOwners.push(base);continue;}
    const fact=byOwner.get(subtypeKey),subtype=g.one('agent_subtypes_tables','key',subtypeKey),agent=g.one('agents_tables','key',set.row.agent_key);base.joins.push(g.join(set,'agent_subtype_key',subtype,'key'),g.join(set,'agent_key',agent,'key'));
    const incoming=g.rows('character_skill_node_links_tables','child_key',node.row.key);g.covered('character_skill_node_links_tables','child_key',node.row.key);
    const parentProof=incoming.map(link=>{const parent=g.one('character_skill_nodes_tables','key',link.row.parent_key);return {rowId:link.id,raw:link.row,parentInThisTree:g.rows('character_skill_node_set_items_tables','item',parent.row.key).some(p=>p.row.set===set.row.key&&!p.row.mod_disabled),joins:[g.join(link,'child_key',node,'key'),g.join(link,'parent_key',parent,'key')]};});
    const locks=g.rows('character_skill_nodes_skill_locks_tables','character_skill_node',node.row.key),ancillaryLocks=g.rows('character_skill_node_ancillary_locks_tables','character_skill_node',node.row.key);g.covered('character_skill_nodes_skill_locks_tables','character_skill_node',node.row.key);g.covered('character_skill_node_ancillary_locks_tables','character_skill_node',node.row.key);
    const permission=permissionRows.filter(p=>p.row.subtype===subtypeKey&&p.row.agent===set.row.agent_key&&!p.row.mod_disabled),overrides=g.rows('agent_subtype_subculture_overrides_tables','subtype',subtypeKey);
    const blockers=unique([...(!base.enabled?['DISABLED_OWNER_NODE']:[]),...(fact.flags.showInUi&&fact.flags.canGainXp&&agent.row.playable?[]:['SPECIAL_OWNER_RUNTIME_AVAILABILITY']),...(permission.length?[]:['NO_ENABLED_EXACT_FACTION_PERMISSION']),...(Object.values(base.restrictions).flat().some(Boolean)||overrides.length?['CONDITIONAL_OWNER_TREE']:[]),...(parentProof.every(p=>p.parentInThisTree)?[]:['PREREQUISITE_OUTSIDE_OWNER_TREE']),...(locks.length||ancillaryLocks.length?['OWNER_LOCK_REQUIRES_RUNTIME']:[])]);
    owners.push({...base,ownerName:fact.name,characterType:fact.characterType,availability:fact.availability,prerequisites:parentProof,lockRowIds:locks.map(l=>l.id),ancillaryLockRowIds:ancillaryLocks.map(l=>l.id),blockers,safeStaticOwner:blockers.length===0});
   }
  }
  const levels=g.rows(levelTable,'character_skill_key',key);g.covered(levelTable,'character_skill_key',key);
  const rankLevels=[...new Set(levels.map(l=>l.row.level))].sort((a,b)=>a-b);
  const effects=levels.map(level=>{
   assert(Number.isFinite(level.row.value)&&Number.isInteger(level.row.level));const effect=g.one('effects_tables','effect',level.row.effect_key),scope=g.one('campaign_effect_scopes_tables','key',level.row.effect_scope);
   const routes=source.relationTables.flatMap(t=>{g.covered(t,'effect',effect.row.effect);return g.rows(t,'effect',effect.row.effect);});
   return {junctionRowId:level.id,effectKey:effect.row.effect,effectRowId:effect.id,rank:level.row.level,rawValue:level.row.value,scope:scope.row,scopeRowId:scope.id,category:effect.row.category,description:g.one('Loc','key',`effects_description_${effect.row.effect}`).row.text,
    routes:routes.map(r=>({rowId:r.id,table:r.table,raw:r.row,join:g.join(r,'effect',effect,'effect'),...(r.row.unit_set?{selectorKey:r.row.unit_set,selectorType:membershipMap.get(r.row.unit_set).taxonomy,materialization:membershipMap.get(r.row.unit_set).status,selectorJoin:g.join(r,'unit_set',g.one('unit_sets_tables','key',r.row.unit_set),'key')}:{})})),joins:[g.join(level,'character_skill_key',skill,'key'),g.join(level,'effect_key',effect,'effect'),g.join(level,'effect_scope',scope,'key')]};
  }).sort((a,b)=>a.junctionRowId<b.junctionRowId?-1:1);
  const details=g.rows('character_skill_level_details_tables','skill_key',key),ancillaries=g.rows('character_skill_level_to_ancillaries_junctions_tables','skill',key),dilemmas=g.rows('character_skill_level_to_dilemmas_junctions_tables','character_skill_key',key),criterias=g.rows('character_skills_to_level_reached_criterias_tables','character_skill',key);
  return {key,name:g.one('Loc','key',`character_skills_localised_name_${key}`).row.text,sourceRowId:skill.id,isBackgroundSkill:skill.row.is_background_skill,unlockedAtModelRank:skill.row.unlocked_at_rank,maxRank:rankLevels.at(-1)??null,rankLevels,rankRows:levels.map(src),ownerKeys:unique(owners.map(o=>o.subtypeKey)),safeOwnerKeys:unique(owners.filter(o=>o.safeStaticOwner).map(o=>o.subtypeKey)),ownerTaxonomy:unique(owners.map(o=>o.subtypeKey)).length===1?'EXACT_SINGLE_OWNER':'EXACT_OWNER_SET',owners,foreignOwners,unresolvedOwners,effects,
   levelDetails:details.map(src),ancillaryRows:ancillaries.map(src),dilemmaRows:dilemmas.map(src),criteriaRows:criterias.map(src),hasSupportedOwnForce:effects.some(e=>e.scope.key===ownForce)};
 });
 return {inventory:{format:'wh3-bretonnia-skill-inventory-v1',cultureKey:source.cultureKey,rootRowId:root.id,factionKeys:factions.map(f=>f.row.key),subtypes:ownerFacts,contextualSetKeys:source.contextualSetKeys,skills},memberships};
}
// Store common exact members once; selector references carry their own branch proofs.
export function compactMembership(memberships,sourceHash){
 const members={},selectors=memberships.map(s=>{
  const refs=s.exactMembers.map(m=>{const id=m.mainRowId;const {branchRowIds,joins,productionUnitIds,...shared}=m;if(members[id])assert.deepEqual(members[id],{...shared,productionUnitIds});else members[id]={...shared,productionUnitIds};return {member:id,branchRowIds,joins};});
  const {exactMembers,productionMembers,omittedNonProduction,...details}=s;
  return {...details,memberRefs:refs,productionMemberRefs:productionMembers.map(m=>m.mainRowId),omittedMemberRefs:omittedNonProduction.map(m=>refs.find(r=>members[r.member].mainKey===m.mainKey).member),counts:{sourceMembers:s.sourceIdentityCandidates?.length??exactMembers.length,productionMembers:productionMembers.length,nonProductionMembers:omittedNonProduction.length,sourceIdentityProductionCandidates:s.sourceIdentityCandidates?.filter(m=>m.productionUnitIds.length).length??productionMembers.length,sourceIdentityNonProductionCandidates:s.sourceIdentityCandidates?.filter(m=>!m.productionUnitIds.length).length??omittedNonProduction.length,unresolved:s.unresolvedCount,unresolvedIdentity:s.identityUnresolvedCount??s.ambiguous.length,duplicate:s.duplicateCount,ambiguous:s.ambiguous.length,branchOverlap:s.branchOverlapCount}};
 });return {format:'wh3-bretonnia-selector-membership-dictionary-v1',sourceSha256:sourceHash,members,selectors};
}
