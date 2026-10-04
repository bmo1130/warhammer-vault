import assert from 'node:assert/strict';
import {sha256} from '../research-classifier/classify.mjs';
import {pins} from '../research-classifier/policy.mjs';
import {sourceGraph} from '../research-scan-bretonnia/source.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
export const serialize=v=>JSON.stringify(v,null,2)+'\n';
export const keys=[
 'wh_dlc07_skill_brt_alberic_battle_champions_of_bordeleaux',
 'wh_dlc07_skill_brt_alberic_battle_aspiring_knights',
 'wh2_dlc11_skill_brt_army_buff_low_born_militia',
 'wh_main_skill_brt_lord_battle_basic_training',
 'wh_main_skill_brt_all_unique_ladys_mantle',
 'wh_main_skill_brt_champion_unique_paladin_pegasus',
 'wh2_dlc07_skill_brt_louen_special_0',
];
export const batchPins={sourceSha256:"10deb6dc2af0dde5de24d92716ffec4cf3ce880c0cac93ffd17fe507410d8e4e",originalExtractionSha256:"95b0d7ddff4b89e6cbb67602ddd8d3249bc95cab115c235c803c970bf913fe21",processedSchemasSha256:"2656907c264b9d5a43ad959100ac3f16990adc674eb7daad0ab78c8721906f1a"};
const ownForce={key:'general_to_force_own',location:'forcewide_when_commanding',ownership:'yours',source:'character',target:'force',territory:'any'};
const self={key:'character_to_character_own',location:'character',ownership:'yours',source:'character',target:'character',territory:'any'};
const mapped=(bonus,stat,operation='add')=>({bonus,stat,operation});
// Exact reviewed effect identities only; no prefix/category family inference.
const effectReview={
 wh_dlc07_effect_force_stat_bonus_vs_large_kotr:{status:'DIRECT_SUPPORTED',reason:'EXACT_FLAT_UNIT_BONUS',mappings:[mapped('damage_vs_large_entities','melee.damage.bonusVsLarge')]},
 wh_dlc07_effect_force_stat_leadership_kotr:{status:'DIRECT_SUPPORTED',reason:'EXACT_FLAT_UNIT_BONUS',mappings:[mapped('morale','defense.leadership')]},
 wh_dlc07_effect_force_stat_leadership_foot_squires:{status:'DIRECT_SUPPORTED',reason:'EXACT_FLAT_UNIT_BONUS',mappings:[mapped('morale','defense.leadership')]},
 wh_dlc07_effect_force_stat_melee_attack_foot_squires:{status:'DIRECT_SUPPORTED',reason:'EXACT_FLAT_UNIT_BONUS',mappings:[mapped('melee_attack_mod','melee.meleeAttack')]},
 wh_dlc07_effect_force_stat_weapon_strength_increase_foot_squires:{status:'DIRECT_SUPPORTED',reason:'EXACT_BASE_AND_AP_PERCENT_RELATIONS',mappings:[mapped('melee_damage_ap_mod_mult','melee.damage.armorPiercing','multiply'),mapped('melee_damage_mod_mult','melee.damage.base','multiply')]},
 wh2_dlc11_effect_force_stat_leadership_peasant_mob_men_at_arms_spear_at_arms:{status:'REVIEW_REQUIRED',reason:'MULTI_RANK_APPLICATION_SEMANTICS_UNPROVEN',mappings:[mapped('morale','defense.leadership')]},
 wh2_dlc11_effect_force_stat_melee_defence_brt_peasant_mob_men_at_arms_spear_at_arms:{status:'REVIEW_REQUIRED',reason:'MULTI_RANK_APPLICATION_SEMANTICS_UNPROVEN',mappings:[mapped('melee_defence_mod','defense.meleeDefense')]},
 wh2_main_effect_skill_upkeep_cost_reduction_brt_knights_realm_questing_knights:{status:'DIRECT_SUPPORTED',reason:'EXACT_UNIT_UPKEEP_PERCENT_RELATIONS',mappings:[mapped('upkeep_mod','campaign.upkeep','multiply')]},
 wh2_main_effect_force_army_campaign_experience_base_brt_knights_realm_questing_knights:{status:'NON_UNIT_STAT',reason:'RECRUIT_RANK_HAS_NO_UNIT_STAT_PATH',mappings:[]},
 wh_main_effect_force_stat_vigour_loss_reduction:{status:'UNSUPPORTED',reason:'VIGOUR_PATH_ABSENT_AND_CLASS_SELECTOR_UNRESOLVED',mappings:[]},
 wh_main_effect_character_stat_missile_resistance:{status:'REVIEW_REQUIRED',reason:'CHARACTER_SELF_NOT_PRODUCTION_UNIT_AND_CLASS_SELECTOR',mappings:[]},
 wh_main_effect_enable_mount_pegasus:{status:'NON_UNIT_STAT',reason:'MOUNT_UNLOCK_NOT_NUMERIC_UNIT_STAT_TYPED_ROUTE_UNRESOLVED',mappings:[]},
};
export function projectExtraction(bytes){
 const r=JSON.parse(bytes);assert.equal(r.format,'wh3-skill-batch-extraction-v1');assert.deepEqual(r.skillKeys,keys);
 return {format:'wh3-skill-batch-source-v1',skillKeys:keys,originalExtraction:{path:'generated/wh3/skill-batch-01/raw.json',sha256:sha256(bytes),extractedAt:r.extractedAt},
  provenance:r.provenance,relationTables:r.relationTables,
  schemas:r.schemas.map(s=>({table:s.table,version:s.version,fields:s.fields.map(({name,field_type,is_key,is_reference,description})=>({name,field_type,is_key,is_reference,description})),localisedFields:s.localisedFields.map(f=>f.name)})),
  rows:r.rows,relationships:r.relationships,coverage:r.coverage};
}
export function reviewBatch(source){
 assert.equal(source.format,'wh3-skill-batch-source-v1');assert.deepEqual(source.skillKeys,keys);
 assert.equal(source.originalExtraction.sha256,batchPins.originalExtractionSha256);
 assert.equal(digest(snapshotIdentity(source.provenance)),pins.snapshotId,'Snapshot drift');
 for(const k of ['gameVersion','schemaSha256','rpfmVersion','schemaFormatVersion'])assert.equal(source.provenance[k],pins[k]);
 const g=sourceGraph(source),ids=new Map();
 for(const r of source.rows){assert(!ids.has(r.id),'Duplicate/conflicting source row');ids.set(r.id,r);
  assert.equal(r.id,`${r.table}:${sha256(JSON.stringify([r.sourcePack,r.path,r.key,r.row])).slice(0,20)}`,'Source row payload drift');
  assert.equal(r.sourcePack,r.table==='Loc'?'local_en.pack':'db.pack');assert.equal(source.provenance.packs.find(p=>p.file_name===r.sourcePack)?.file_path,r.sourcePackPath);
 }
 for(const c of source.coverage){const loc=c.query.table.startsWith('Loc:'),rows=g.rows(loc?'Loc':c.query.table).filter(r=>(!loc||r.path===c.query.table.slice(4))&&c.query.where.every(q=>q.op==='eq'?r.row[q.field]===q.value:q.op==='oneOf'&&q.value.includes(r.row[q.field])));assert.equal(rows.length,c.matchedRows,'Coverage drift');assert(c.tableFiles>0);}
 for(const j of source.relationships){const from=ids.get(j.from),to=ids.get(j.to);assert(from&&to,'Missing row reference');
  if(to.table==='Loc'){assert(g.definition(from).localisedFields.includes(j.field));assert.equal(j.value,`${from.table.replace(/_tables$/,'')}_${j.field}_${Object.values(from.key)[0]}`);assert.equal(to.row.key,j.value);}
  else g.join(from,j.field,to,j.targetField);
 }
 const scopes=g.rows('campaign_effect_scopes_tables');assert.deepEqual(scopes.map(r=>r.row),[self,ownForce]);
 const loc=(table,field,key)=>g.one('Loc','key',`${table}_${field}_${key}`);
 const target=(link)=>{
  const set=g.one('unit_sets_tables','key',link.row.unit_set),members=g.rows('unit_set_to_unit_junctions_tables','unit_set',set.row.key);
  g.covered('unit_sets_tables','key',set.row.key,1);g.covered('unit_set_to_unit_junctions_tables','unit_set',set.row.key,members.length);
  const selectors=members.filter(m=>!m.row.unit_record||m.row.exclude||m.row.unit_caste||m.row.unit_category||m.row.unit_class);
  return {setKey:set.row.key,setRowId:set.id,definition:set.row,kind:selectors.length?'CLASS_SELECTOR':'EXPLICIT_MAIN_MEMBERSHIP',
   relationJoin:g.join(link,'unit_set',set,'key'),selectors:selectors.map(m=>({rowId:m.id,...m.row})),
   members:members.filter(m=>m.row.unit_record).map(m=>{const main=g.one('main_units_tables','unit',m.row.unit_record),land=g.one('land_units_tables','key',main.row.land_unit);
    return {mainKey:main.row.unit,landKey:land.row.key,excluded:m.row.exclude,rowId:m.id,joins:[g.join(m,'unit_set',set,'key'),g.join(m,'unit_record',main,'unit'),g.join(main,'land_unit',land,'key')]};})};
 };
 const skills=keys.map(key=>{
  const skill=g.one('character_skills_tables','key',key),name=loc('character_skills','localised_name',key),description=loc('character_skills','localised_description',key);
  assert.equal(skill.row.is_background_skill,false);
  const nodes=g.rows('character_skill_nodes_tables','character_skill_key',key);g.covered('character_skill_nodes_tables','character_skill_key',key,nodes.length);assert(nodes.length);
  const owners=nodes.flatMap(node=>g.rows('character_skill_node_set_items_tables','item',node.row.key).map(item=>{
   const set=g.one('character_skill_node_sets_tables','key',item.row.set),owner=g.one('agent_subtypes_tables','key',set.row.agent_subtype_key),agent=g.one('agents_tables','key',set.row.agent_key);
   const main=g.one('main_units_tables','unit',owner.row.associated_unit_override),land=g.one('land_units_tables','key',main.row.land_unit),ownerName=loc('land_units','onscreen_name',land.row.key);
   assert(['lord','hero'].includes(main.row.caste));
   return {key:owner.row.key,name:ownerName.row.text,agentType:agent.row.key,characterType:main.row.caste==='hero'?(owner.row.auto_generate?'generic_hero':'exact_hero_subtype'):(owner.row.recruitment_category==='legendary_lords'?'legendary_lord':'generic_lord'),
    mainKey:main.row.unit,landKey:land.row.key,skillNodeKey:node.row.key,skillNodeSet:set.row.key,enabled:!item.row.mod_disabled&&node.row.visible_in_ui,
    selectors:{set:{campaign:set.row.campaign_key,faction:set.row.faction_key,subculture:set.row.subculture},node:{campaign:node.row.campaign_key,faction:node.row.faction_key,subculture:node.row.subculture}},
    sourceRows:[node.id,item.id,set.id,owner.id,agent.id,main.id,land.id,ownerName.id],
    joins:[g.join(node,'character_skill_key',skill,'key'),g.join(item,'item',node,'key'),g.join(item,'set',set,'key'),g.join(set,'agent_subtype_key',owner,'key'),g.join(set,'agent_key',agent,'key'),g.join(owner,'associated_unit_override',main,'unit'),g.join(main,'land_unit',land,'key')]};
  }));assert(owners.length);
  const junctions=g.rows('character_skill_level_to_effects_junctions_tables','character_skill_key',key);g.covered('character_skill_level_to_effects_junctions_tables','character_skill_key',key,junctions.length);
  const levels=[...new Set(junctions.map(j=>j.row.level))].sort((a,b)=>a-b);assert.deepEqual(levels,Array.from({length:levels.at(-1)},(_,i)=>i+1));
  const effects=junctions.map(j=>{
   const e=g.one('effects_tables','effect',j.row.effect_key),scope=g.one('campaign_effect_scopes_tables','key',j.row.effect_scope),label=loc('effects','description',e.row.effect),rule=effectReview[e.row.effect];assert(rule,'Unreviewed exact effect');assert(Number.isFinite(j.row.value));
   const relations=source.rows.filter(r=>source.relationTables.includes(r.table)&&r.row.effect===e.row.effect);
   for(const table of source.relationTables)assert(source.coverage.some(c=>c.query.table===table&&c.query.where[0].field==='effect'&&c.query.where[0].op==='oneOf'&&c.query.where[0].value.includes(e.row.effect)),'Incomplete competing relation query');
   assert(relations.every(r=>r.table==='effect_bonus_value_ids_unit_sets_tables'),'New typed route requires review');
   const targets=relations.map(target),mappings=rule.mappings.map(m=>{assert(relations.some(r=>r.row.bonus_value_id===m.bonus),'Bonus route mismatch');return {...m,value:j.row.value};});
   return {effectKey:e.row.effect,rank:j.row.level,rawValue:j.row.value,description:label.row.text,scope:scope.row,status:rule.status,reason:rule.reason,
    sourceRows:[j.id,e.id,scope.id,label.id],joins:[g.join(j,'character_skill_key',skill,'key'),g.join(j,'effect_key',e,'effect'),g.join(j,'effect_scope',scope,'key')],
    relations:relations.map(r=>({rowId:r.id,table:r.table,bonus:r.row.bonus_value_id,join:g.join(r,'effect',e,'effect')})),targets,mappingCandidates:mappings};
  });
  const levelDetails=g.rows('character_skill_level_details_tables','skill_key',key);
  g.covered('character_skill_level_details_tables','skill_key',key,levelDetails.length);
  for(const [t,f] of [['character_skill_level_to_ancillaries_junctions_tables','skill'],['character_skill_level_to_dilemmas_junctions_tables','character_skill_key'],['character_skills_to_level_reached_criterias_tables','character_skill']])g.covered(t,f,key,g.rows(t,f,key).length);
  const status=key===keys[6]?'SUPPORTED_WITH_LIMITATION':effects[0].status;
  return {skillKey:key,name:name.row.text,description:description.row.text,sourceRowId:skill.id,localisationRows:[name.id,description.id],owners,
   maxRank:levels.at(-1),ranks:levels.map(rank=>({rank,effectRowIds:effects.filter(e=>e.rank===rank).map(e=>e.sourceRows[0])})),
   rankSemantics:levels.length===1?'SINGLE_LEVEL_EXACT_VALUE_NO_ACCUMULATION':'UNKNOWN_REPLACEMENT_VS_INCREMENTAL',
   rankSetShape:levels.length===1?'SINGLE':'MIXED_EFFECT_SET',unlockedAtModelRank:skill.row.unlocked_at_rank,
   levelDetails:levelDetails.map(r=>({rowId:r.id,...r.row,join:g.join(r,'skill_key',skill,'key')})),status,effects};
 });
 const count=items=>Object.fromEntries([...new Set(items)].sort().map(k=>[k,items.filter(x=>x===k).length]));
 const low=skills[2];const hypotheses=low.ranks.map(({rank})=>({rank,
  replacement:Object.fromEntries(low.effects.filter(e=>e.rank===rank).map(e=>[e.effectKey,e.rawValue])),
  incremental:Object.fromEntries([...new Set(low.effects.filter(e=>e.rank<=rank).map(e=>e.effectKey))].map(k=>[k,low.effects.filter(e=>e.rank<=rank&&e.effectKey===k).reduce((sum,e)=>sum+e.rawValue,0)]))}));
 return {format:'wh3-reviewed-skill-batch-v1',skills,
  scopeInventory:scopes.map(s=>({record:s.row,rowId:s.id,occurrences:skills.flatMap(s=>s.effects).filter(e=>e.scope.key===s.row.key).length,
   representativeSkills:skills.filter(x=>x.effects.some(e=>e.scope.key===s.row.key)).map(x=>x.skillKey),sameAsFirstSlice:s.row.key===ownForce.key,currentModel:s.row.key===ownForce.key?'COMMANDING_OWN_FORCE':'NO_CHARACTER_SELF_UNIT_PROJECTION'})),
  summary:{skills:skills.length,rankEffectRows:skills.flatMap(s=>s.effects).length,skillStatuses:count(skills.map(s=>s.status)),effectStatuses:count(skills.flatMap(s=>s.effects).map(e=>e.status))},
  multiRankComparison:{skillKey:low.skillKey,applicationSemantics:'UNKNOWN',hypotheses,reason:'Exact level rows and changed effect set are proven. Processed schema and level-detail rows do not specify whether lower levels remain active; neither numeric alternative is admitted.'},
  modelAssessment:{conclusion:'B',repeatable:'Exact single-level owner → effect → commanding-own-force → explicit main membership → existing numeric Modifier paths',
   limitations:['Shared exact owners need an owner list, not a generic permission','Multi-rank raw storage does not prove rank application','Self and class-selector contexts cannot use the current explicit Unit contract','Partial admission needs explicit omitted effects','Multiple commanding owners cannot be assumed simultaneously'],
   implemented:'Registry of two separately reviewed single-rank projections only; no multi-owner/multi-rank/selector engine'}};
}
export function admitBatch(sourceBytes,unitsBytes,manifest){
 assert.equal(manifest.format,'wh3-skill-batch-admission-v1');assert.equal(manifest.baselineCommit,'183b425497ed9db2c82b57297321090699f704f9');
 for(const [k,v] of Object.entries({...batchPins,unitsSha256:pins.unitsSha256,snapshotId:pins.snapshotId}))assert.equal(manifest[k],v,`${k} drift`);
 assert.equal(sha256(sourceBytes),batchPins.sourceSha256);assert.equal(sha256(unitsBytes),pins.unitsSha256);
 const source=JSON.parse(sourceBytes);assert.equal(sha256(JSON.stringify(source.schemas)),batchPins.processedSchemasSha256);
 assert.deepEqual(manifest.admittedSkills,[keys[1]]);
 const review=reviewBatch(source),skill=review.skills[1];assert.equal(skill.status,'DIRECT_SUPPORTED');assert.equal(skill.maxRank,1);
 assert.equal(skill.owners.length,1);const owner=skill.owners[0];assert.equal(owner.key,'wh_dlc07_brt_alberic');assert(owner.enabled);
 assert.equal(owner.skillNodeKey,'wh_dlc07_skill_node_brt_alberic_unique_11');assert.equal(owner.skillNodeSet,'wh_dlc07_skill_node_set_brt_alberic');
 assert(Object.values(owner.selectors).every(s=>Object.values(s).every(v=>v==='')));assert.equal(skill.levelDetails.length,0);
 const expected=[['wh_dlc07_effect_force_stat_leadership_foot_squires',5,['morale']],['wh_dlc07_effect_force_stat_melee_attack_foot_squires',8,['melee_attack_mod']],['wh_dlc07_effect_force_stat_weapon_strength_increase_foot_squires',12,['melee_damage_ap_mod_mult','melee_damage_mod_mult']]];
 assert.deepEqual(skill.effects.map(e=>[e.effectKey,e.rawValue,e.relations.map(r=>r.bonus)]),expected);
 for(const e of skill.effects){assert.equal(e.status,'DIRECT_SUPPORTED');assert.deepEqual(e.scope,ownForce);assert.equal(e.rank,1);
  for(const t of e.targets){assert.equal(t.setKey,'dlc07_brt_foot_squires');assert.deepEqual(t.definition,{key:t.setKey,use_unit_exp_level_range:false,min_unit_exp_level_inclusive:-1,max_unit_exp_level_inclusive:-1,special_category:''});
   assert.equal(t.kind,'EXPLICIT_MAIN_MEMBERSHIP');assert.deepEqual(t.members.map(m=>[m.mainKey,m.landKey,m.excluded]),[['wh_dlc07_brt_inf_foot_squires_0','wh_dlc07_brt_inf_foot_squires_0',false],['wh_pro04_brt_inf_foot_squires_ror_0','wh_pro04_brt_inf_foot_squires_ror_0',false]]);
  }
 }
 const units=JSON.parse(unitsBytes),unit=units.find(u=>u.id==='ca_unit_wh_dlc07_brt_inf_foot_squires_0'&&u.gameVersion===pins.gameVersion);assert(unit);
 const target={unitId:unit.id,mainKey:'wh_dlc07_brt_inf_foot_squires_0',landKey:'wh_dlc07_brt_inf_foot_squires_0'};
 assert.deepEqual(manifest.admittedTargets,[target]);
 const modifiers=skill.effects.flatMap(e=>e.mappingCandidates.map(m=>({id:`ca-skill:${skill.skillKey}:${owner.key}:1:${e.effectKey}:${target.mainKey}:${m.stat}`,rank:1,unitId:unit.id,effectKey:e.effectKey,stat:m.stat,operation:m.operation,value:m.value})));
 const projection={sourceKind:'CA_SKILL',skillKey:skill.skillKey,name:skill.name,owner:{key:owner.key,name:owner.name,agentType:owner.agentType,characterType:owner.characterType,mainKey:owner.mainKey,landKey:owner.landKey,skillNodeSet:owner.skillNodeSet,skillNodeKey:owner.skillNodeKey},
  maxRank:1,rankSemantics:skill.rankSemantics,scope:ownForce,gameVersion:pins.gameVersion,
  provenance:{sourceSha256:batchPins.sourceSha256,originalExtractionSha256:batchPins.originalExtractionSha256,snapshotId:pins.snapshotId,static:source.provenance,reviewRef:'tools/wh3-importer/skill-batch-01/review.json'},
  ranks:[{rank:1,effects:skill.effects.flatMap(e=>e.mappingCandidates.map(m=>({effectKey:e.effectKey,rawValue:e.rawValue,stat:m.stat,operation:m.operation,value:m.value,junctionRowId:e.sourceRows[0],targetRowId:e.relations.find(r=>r.bonus===m.bonus).rowId})))}],targets:[target],modifiers};
 const admission={sourceKind:'CA_SKILL',admittedSkills:[skill.skillKey],admittedTargets:[target],effects:3,modifiers:4,
  omittedTargets:[{mainKey:'wh_pro04_brt_inf_foot_squires_ror_0',reason:'TARGET_NOT_IN_PRODUCTION'}],
  deferredSkills:review.skills.filter(s=>s.skillKey!==skill.skillKey&&s.skillKey!==keys[0]).map(s=>({skillKey:s.skillKey,status:s.status,reason:s.status==='SUPPORTED_WITH_LIMITATION'?'MIXED_SKILL_NOT_ADMITTED_IN_BOUNDED_SUBSET':s.effects.find(e=>e.status!=='DIRECT_SUPPORTED').reason})),
  existingSlice:{skillKey:keys[0],action:'PRESERVE_SEPARATE_ORIGINAL_PROJECTION'},reviewSha256:sha256(serialize(review)),projectionSha256:sha256(serialize(projection))};
 const result={review,admission,projection};
 for(const [name,value] of Object.entries(result))assert.equal(sha256(serialize(value)),manifest.outputs[`${name}.json`],`Reviewed ${name} drift`);
 return result;
}
