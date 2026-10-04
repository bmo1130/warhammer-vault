import assert from 'node:assert/strict';
import {sha256} from '../research-classifier/classify.mjs';
import {pins} from '../research-classifier/policy.mjs';
import {sourceGraph,compare,sortRows} from '../research-scan-bretonnia/source.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';

export const serialize=v=>JSON.stringify(v,null,2)+'\n';
export const keys=[
 'wh_main_skill_brt_lord_battle_lionhearted',
 'wh_main_skill_brt_lord_battle_virtue_of_empathy',
 'wh_main_skill_brt_lord_battle_basic_training',
 'wh_main_skill_brt_all_unique_ladys_mantle',
 'wh_dlc07_skill_brt_alberic_battle_champions_of_bordeleaux',
 'wh2_dlc11_skill_brt_army_buff_low_born_militia'
];
const unique=xs=>[...new Set(xs)].sort(compare);
const levelTable='character_skill_level_to_effects_junctions_tables';
export function projectExtraction(bytes){
 const raw=JSON.parse(bytes);assert.equal(raw.format,'wh3-skill-owner-extraction-v1');assert.deepEqual(raw.skillKeys,keys);
 assert.equal(digest(snapshotIdentity(raw.provenance)),pins.snapshotId,'Snapshot drift');
 return {format:'wh3-skill-owner-source-v1',skillKeys:keys,selectedNodeKeys:raw.selectedNodeKeys,ancestorNodeKeys:raw.ancestorNodeKeys,
  ownerTreeSetKeys:raw.ownerTreeSetKeys,sameNameSkillKeys:raw.sameNameSkillKeys,sameNameNodeKeys:raw.sameNameNodeKeys,
  originalExtraction:{path:'generated/wh3/skill-owner-research/raw.json',sha256:sha256(bytes),extractedAt:raw.extractedAt},
  provenance:raw.provenance,relationTables:unique(raw.relationTables),schemaInventory:raw.schemaInventory,
  schemas:raw.schemas.map(s=>({table:s.table,version:s.version,fields:s.fields.map(({name,field_type,is_key,is_reference,description,ca_order})=>({name,field_type,is_key,is_reference,description,ca_order})),localisedFields:s.localisedFields.map(f=>f.name)})).sort((a,b)=>compare(`${a.table}:${a.version}`,`${b.table}:${b.version}`)),
  rows:sortRows(raw.rows),relationships:[...raw.relationships].sort((a,b)=>compare(JSON.stringify(a),JSON.stringify(b))),
  coverage:[...raw.coverage].sort((a,b)=>compare(JSON.stringify(a.query),JSON.stringify(b.query)))};
}
export function verifySource(bytes,manifest){
 assert.equal(sha256(bytes),manifest.sourceSha256,'Owner source hash drift');
 const source=JSON.parse(bytes);assert.equal(source.format,'wh3-skill-owner-source-v1');assert.deepEqual(source.skillKeys,keys);
 assert.equal(source.originalExtraction.sha256,manifest.originalExtractionSha256,'Original extraction drift');
 assert.equal(digest(snapshotIdentity(source.provenance)),pins.snapshotId,'Snapshot drift');assert.equal(manifest.snapshotId,pins.snapshotId);
 assert.equal(sha256(JSON.stringify(source.schemas)),manifest.processedSchemasSha256,'Schema drift');
 for(const k of ['gameVersion','schemaSha256','rpfmVersion','schemaFormatVersion'])assert.equal(source.provenance[k],pins[k]);
 const g=sourceGraph(source),ids=new Map();
 for(const row of source.rows){
  assert(!ids.has(row.id),'Duplicate row ID');ids.set(row.id,row);
  assert.equal(row.id,`${row.table}:${sha256(JSON.stringify([row.sourcePack,row.path,row.key,row.row])).slice(0,20)}`,'Conflicting row payload');
  assert.equal(row.sourcePack,row.table==='Loc'?'local_en.pack':'db.pack');assert.equal(source.provenance.packs.find(p=>p.file_name===row.sourcePack)?.file_path,row.sourcePackPath);
  assert.deepEqual(row.key,Object.fromEntries(g.definition(row).fields.filter(f=>f.is_key).map(f=>[f.name,row.row[f.name]])));
 }
 for(const c of source.coverage){const loc=c.query.table.startsWith('Loc:');
  const found=g.rows(loc?'Loc':c.query.table).filter(r=>(!loc||r.path===c.query.table.slice(4))&&c.query.where.every(q=>q.op==='eq'?r.row[q.field]===q.value:q.op==='oneOf'&&q.value.includes(r.row[q.field])));
  assert.equal(found.length,c.matchedRows,'Coverage drift');assert(c.tableFiles>0);
 }
 for(const r of source.relationships){const from=ids.get(r.from),to=ids.get(r.to);assert(from&&to,'Missing referenced row');
  if(to.table==='Loc'){assert(g.definition(from).localisedFields.includes(r.field));assert.equal(r.value,`${from.table.replace(/_tables$/,'')}_${r.field}_${Object.values(from.key)[0]}`);assert.equal(to.row.key,r.value);}
  else g.join(from,r.field,to,r.targetField);
 }
 return source;
}

// Research only: explicit node ownership and source signatures, never modifiers.
export function research(source,priorReviews){
 const g=sourceGraph(source),loc=(table,field,key)=>g.one('Loc','key',`${table}_${field}_${key}`);
 const checkedArm=(table,field,values)=>assert(source.coverage.some(c=>c.query.table===table&&c.query.where.length===1&&c.query.where[0].field===field&&c.query.where[0].op==='oneOf'&&JSON.stringify(c.query.where[0].value)===JSON.stringify(unique(values))),'Incomplete reverse discovery');
 const selectedNodes=g.rows('character_skill_nodes_tables').filter(n=>keys.includes(n.row.character_skill_key));
 assert.deepEqual(unique(selectedNodes.map(n=>n.row.key)),source.selectedNodeKeys);
 checkedArm('character_skill_node_set_items_tables','item',source.selectedNodeKeys);
 const subtypeKeys=g.rows('agent_subtypes_tables').map(r=>r.row.key);
 for(const [table,field] of [['faction_agent_permitted_subtypes_tables','subtype'],['agent_subtype_subculture_overrides_tables','subtype'],['character_skill_node_sets_tables','agent_subtype_key'],['agent_subtype_ownership_content_pack_junctions_tables','agent_subtype']])checkedArm(table,field,subtypeKeys);
 // A permission proof is shared by several Skills; store it once and reference its row ID.
 const matchingPermissions=g.rows('faction_agent_permitted_subtypes_tables').filter(p=>g.rows('character_skill_node_sets_tables','agent_subtype_key',p.row.subtype).some(set=>set.row.agent_key===p.row.agent));
 const factionPermissionProofs=sortRows(matchingPermissions).map(p=>{
  const subtype=g.one('agent_subtypes_tables','key',p.row.subtype),agent=g.one('agents_tables','key',p.row.agent),faction=g.one('factions_tables','key',p.row.faction);
  const subculture=g.one('cultures_subcultures_tables','subculture',faction.row.subculture),culture=g.one('cultures_tables','key',subculture.row.culture);
  return {rowId:p.id,subtypeKey:subtype.row.key,agentKey:agent.row.key,factionKey:faction.row.key,subcultureKey:subculture.row.subculture,cultureKey:culture.row.key,modDisabled:p.row.mod_disabled,
   joins:[g.join(p,'subtype',subtype,'key'),g.join(p,'agent',agent,'key'),g.join(p,'faction',faction,'key'),g.join(faction,'subculture',subculture,'subculture'),g.join(subculture,'culture',culture,'key')]};
 });
 const permissionById=new Map(factionPermissionProofs.map(p=>[p.rowId,p]));
 const prerequisiteNodes=source.ancestorNodeKeys.map(key=>{
  const node=g.one('character_skill_nodes_tables','key',key),skill=g.one('character_skills_tables','key',node.row.character_skill_key);
  const incoming=g.rows('character_skill_node_links_tables','child_key',key),locks=g.rows('character_skill_nodes_skill_locks_tables','character_skill_node',key),ancillaryLocks=g.rows('character_skill_node_ancillary_locks_tables','character_skill_node',key);
  for(const [table,rows] of [['character_skill_node_links_tables',incoming],['character_skill_nodes_skill_locks_tables',locks],['character_skill_node_ancillary_locks_tables',ancillaryLocks]])g.covered(table,table.includes('links')?'child_key':'character_skill_node',key,rows.length);
  return {key,skillKey:skill.row.key,rowId:node.id,requiredNumParents:node.row.required_num_parents,
   incoming:sortRows(incoming).map(link=>({rowId:link.id,raw:link.row,joins:[g.join(link,'child_key',node,'key'),g.join(link,'parent_key',g.one('character_skill_nodes_tables','key',link.row.parent_key),'key'),g.join(link,'link_type',g.one('character_skill_node_link_types_tables','link_type',link.row.link_type),'link_type')]})),
   skillLockRowIds:locks.map(r=>r.id),ancillaryLockRowIds:ancillaryLocks.map(r=>r.id)};
 });
 const targetSets=g.rows('unit_sets_tables').map(set=>{
  const members=g.rows('unit_set_to_unit_junctions_tables','unit_set',set.row.key);g.covered('unit_set_to_unit_junctions_tables','unit_set',set.row.key,members.length);
  return {key:set.row.key,rowId:set.id,raw:set.row,members:sortRows(members).map(m=>({rowId:m.id,raw:m.row,
   joins:[g.join(m,'unit_set',set,'key'),...(m.row.unit_record?(()=>{const main=g.one('main_units_tables','unit',m.row.unit_record),land=g.one('land_units_tables','key',main.row.land_unit);return [g.join(m,'unit_record',main,'unit'),g.join(main,'land_unit',land,'key')];})():[])]}))};
 });
 const skills=keys.map(key=>{
  const skill=g.one('character_skills_tables','key',key),nodes=g.rows('character_skill_nodes_tables','character_skill_key',key),levelRows=g.rows(levelTable,'character_skill_key',key);
  g.covered('character_skill_nodes_tables','character_skill_key',key,nodes.length);g.covered(levelTable,'character_skill_key',key,levelRows.length);
  const prior=priorReviews.flatMap(r=>r.skills).find(s=>s.skillKey===key);assert(prior,'Missing historical effect assessment');
  const details=g.rows('character_skill_level_details_tables','skill_key',key);g.covered('character_skill_level_details_tables','skill_key',key,details.length);
  assert(details.every(d=>!d.row.campaign_key&&!d.row.faction_key&&!d.row.subculture_key),'Conditional level details require owner-specific review');
  const effectChains=sortRows(levelRows).map(level=>{
   const effect=g.one('effects_tables','effect',level.row.effect_key),scope=g.one('campaign_effect_scopes_tables','key',level.row.effect_scope);
   const review=prior.effects.find(e=>e.effectKey===effect.row.effect&&e.rank===level.row.level&&e.rawValue===level.row.value);assert(review,'Historical raw effect/value/rank mismatch');
   assert.deepEqual(scope.row,review.scope,'Historical scope mismatch');
   const routes=source.rows.filter(r=>source.relationTables.includes(r.table)&&r.row.effect===effect.row.effect);
   for(const table of source.relationTables)assert(source.coverage.some(c=>c.query.table===table&&c.query.where[0].field==='effect'&&c.query.where[0].value.includes(effect.row.effect)),'Incomplete typed effect discovery');
   return {rowId:level.id,rank:level.row.level,effectKey:effect.row.effect,value:level.row.value,scope:scope.row,
    joins:[g.join(level,'character_skill_key',skill,'key'),g.join(level,'effect_key',effect,'effect'),g.join(level,'effect_scope',scope,'key')],
    routes:sortRows(routes).map(r=>({rowId:r.id,table:r.table,raw:r.row,join:g.join(r,'effect',effect,'effect'),
     ...(r.row.unit_set?{targetSetKey:r.row.unit_set,targetJoin:g.join(r,'unit_set',g.one('unit_sets_tables','key',r.row.unit_set),'key')}:{})})),
    operationAssessment:{status:review.status,reason:review.reason,mappingCandidates:review.mappingCandidates??[]}};
  });
  const owners=nodes.flatMap(node=>g.rows('character_skill_node_set_items_tables','item',node.row.key).map(item=>{
   const set=g.one('character_skill_node_sets_tables','key',item.row.set);
   assert(set.row.agent_subtype_key,'Character-class node set needs separate review');
   const subtype=g.one('agent_subtypes_tables','key',set.row.agent_subtype_key),agent=g.one('agents_tables','key',set.row.agent_key);
   const main=g.one('main_units_tables','unit',subtype.row.associated_unit_override),land=g.one('land_units_tables','key',main.row.land_unit);
   const permissions=g.rows('faction_agent_permitted_subtypes_tables','subtype',subtype.row.key).filter(p=>p.row.agent===agent.row.key);
   const treeSets=g.rows('character_skill_node_sets_tables','agent_subtype_key',subtype.row.key);
   const prerequisite=prerequisiteNodes.find(p=>p.key===node.row.key);assert(prerequisite);
   const dependenciesInThisTree=prerequisite.incoming.every(link=>g.rows('character_skill_node_set_items_tables','item',link.raw.parent_key).some(m=>m.row.set===set.row.key&&!m.row.mod_disabled));
   const treeEnabled=node.row.visible_in_ui&&!item.row.mod_disabled&&!skill.row.is_background_skill;
   // Re-follow each owner's node->skill->rank/effect/scope/target chain; no name/class lookup.
   g.join(node,'character_skill_key',skill,'key');
   const reached=sortRows(g.rows(levelTable,'character_skill_key',node.row.character_skill_key));
   const meaning={levels:reached.map(r=>{g.join(r,'character_skill_key',skill,'key');const e=effectChains.find(e=>e.rowId===r.id);assert(e);return {rank:e.rank,effectKey:e.effectKey,value:e.value,scope:e.scope,routes:e.routes.map(route=>({table:route.table,raw:route.raw})),operation:e.operationAssessment};}),
    targetMemberships:targetSets.filter(t=>effectChains.some(e=>e.routes.some(r=>r.targetSetKey===t.key))).map(t=>({key:t.key,raw:t.raw,members:t.members.map(m=>m.raw)}))};
   return {key:subtype.row.key,nodeKey:node.row.key,nodeSetKey:set.row.key,agentKey:agent.row.key,
    characterType:main.row.caste==='hero'?(subtype.row.auto_generate?'generic_hero':'exact_hero_subtype'):(subtype.row.recruitment_category==='legendary_lords'?'legendary_lord':'generic_lord'),
    mainKey:main.row.unit,landKey:land.row.key,
    joins:[g.join(node,'character_skill_key',skill,'key'),g.join(item,'item',node,'key'),g.join(item,'set',set,'key'),g.join(set,'agent_subtype_key',subtype,'key'),g.join(set,'agent_key',agent,'key'),g.join(subtype,'associated_unit_override',main,'unit'),g.join(main,'land_unit',land,'key')],
    sourceMeaningSha256:sha256(JSON.stringify(meaning)),treeEnabled,dependenciesInThisTree,
    flags:{node:{visibleInUi:node.row.visible_in_ui,pointsOnCreation:node.row.points_on_creation,requiredNumParents:node.row.required_num_parents},item:{modDisabled:item.row.mod_disabled},set:{forArmy:set.row.for_army,forNavy:set.row.for_navy},
     subtype:{showInUi:subtype.row.show_in_ui,canGainXp:subtype.row.can_gain_xp,autoGenerate:subtype.row.auto_generate,recruitable:subtype.row.recruitable,recruitmentCategory:subtype.row.recruitment_category},agent:{playable:agent.row.playable}},
    selectors:{node:{campaign:node.row.campaign_key,faction:node.row.faction_key,subculture:node.row.subculture},set:{campaign:set.row.campaign_key,faction:set.row.faction_key,subculture:set.row.subculture}},
    prerequisiteRef:node.row.key,unlock:{modelRank:skill.row.unlocked_at_rank,levelDetails:details.map(d=>({rowId:d.id,raw:d.row,join:g.join(d,'skill_key',skill,'key')}))},
    alternateTreeSets:treeSets.filter(s=>s.row.key!==set.row.key).map(s=>({key:s.row.key,raw:s.row})),
    factionPermissionRowIds:sortRows(permissions).map(p=>p.id),
    contentPackRowIds:g.rows('agent_subtype_ownership_content_pack_junctions_tables','agent_subtype',subtype.row.key).map(r=>r.id),
    subtypeOverrideRowIds:g.rows('agent_subtype_subculture_overrides_tables','subtype',subtype.row.key).map(r=>r.id),
    selectionAvailability:subtype.row.show_in_ui?'STATIC_ENABLED_TREE_WITH_CONTEXT_REQUIREMENTS':'SPECIAL_CHARACTER_ACQUISITION_NOT_OBSERVED',runtimeAvailability:'NOT_OBSERVED'};
  })).sort((a,b)=>compare(a.key,b.key));
  assert(owners.every(o=>o.treeEnabled&&o.dependenciesInThisTree&&o.flags.agent.playable&&o.flags.subtype.canGainXp&&o.factionPermissionRowIds.some(id=>!permissionById.get(id).modDisabled)),'Owner tree/permission/character flags need separate review');
  assert(owners.every(o=>Object.values(o.selectors).every(s=>Object.values(s).every(v=>v===''))&&o.alternateTreeSets.length===0&&o.subtypeOverrideRowIds.length===0),'Conditional/alternate owner trees require separate review');
  const meaningSame=unique(owners.map(o=>o.sourceMeaningSha256)).length===1;assert(meaningSame,'Owner-specific source meanings differ');
  return {key,name:loc('character_skills','localised_name',key).row.text,ownerKeys:unique(owners.map(o=>o.key)),owners,
   ownerTaxonomy:owners.length===1?'EXACT_SINGLE_OWNER':'EXACT_OWNER_SET',sourceMeaningIdenticalAcrossOwners:meaningSame,
   sourceRankLevels:unique(levelRows.map(r=>r.row.level)),effectChains,rankSemantics:levelRows.some(r=>r.row.level>1)?'UNKNOWN':'SINGLE_SOURCE_RANK',
   availabilityIsSeparateFromOwnership:true,admission:prior.skillKey===keys[4]?'EXISTING_SINGLE_OWNER_ONLY':'NOT_ADMITTED',
   blockers:unique(effectChains.filter(e=>e.operationAssessment.status!=='DIRECT_SUPPORTED').map(e=>e.operationAssessment.reason)).concat(levelRows.some(r=>r.row.level>1)?['MULTI_RANK_SEMANTICS_UNKNOWN']:[])};
 });
 const sameNameGroups=skills.map(skill=>{
  const matchingLoc=g.rows('Loc').filter(r=>r.path==='text/db/character_skills__.loc'&&r.row.text===skill.name&&r.row.key.startsWith('character_skills_localised_name_'));
  return {selectedSkillKey:skill.key,name:skill.name,keys:matchingLoc.map(r=>r.row.key.slice('character_skills_localised_name_'.length)).sort(),
   alternatives:matchingLoc.map(r=>r.row.key.slice('character_skills_localised_name_'.length)).filter(k=>k!==skill.key).map(key=>({key,nodeRowIds:g.rows('character_skill_nodes_tables','character_skill_key',key).map(n=>n.id)}))};
 });
 return {format:'wh3-skill-owner-research-v1',snapshotId:pins.snapshotId,finalVerdict:'B',
  conclusion:'Exact direct owner-set relations and common source effect chains are proved in this snapshot; owner membership is not unconditional selection/applicability. Special acquisition and runtime availability are NOT_OBSERVED. No eligible new single-rank own-force numeric explicit-target Skill in the selected shared samples.',
  newAdmissions:[],modelChanged:false,skills,factionPermissionProofs,
  nonMatchingAgentPermissionRowIds:g.rows('faction_agent_permitted_subtypes_tables').filter(p=>!permissionById.has(p.id)).map(p=>p.id),prerequisiteNodes,targetSets,sameNameGroups,
  taxonomyCounts:{EXACT_SINGLE_OWNER:skills.filter(s=>s.ownerTaxonomy==='EXACT_SINGLE_OWNER').length,EXACT_OWNER_SET:skills.filter(s=>s.ownerTaxonomy==='EXACT_OWNER_SET').length,CHARACTER_CLASS_OWNER:0,NODE_SET_MEMBER_ONLY:0,'INHERITED/INDIRECT_OWNER':0,AMBIGUOUS:0,'NOT_PLAYABLE/APPLICABLE':0},
  limits:{taxonomyCountsDescribeSourceRelationsOnly:true,operationBlockersPreserved:true,multiRankSemantics:'UNKNOWN',runtimeAvailability:'NOT_OBSERVED',
   noWildcardOrClassInheritance:true,factionPermissionIsContextNotOwnerDefinition:true,campaignSubtypeTableIsNotPlayabilityProof:true}};
}
export function replay(bytes,manifest,priorReviews){return research(verifySource(bytes,manifest),priorReviews);}
