import assert from 'node:assert/strict';
import {sha256} from '../research-classifier/classify.mjs';
import {pins} from '../research-classifier/policy.mjs';
import {sourceGraph} from '../research-scan-bretonnia/source.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
export const serialize=v=>JSON.stringify(v,null,2)+'\n';
export const keys=[
 "wh2_dlc07_skill_brt_alberic_special_0",
 "wh2_dlc07_skill_brt_alberic_special_1",
 "wh2_dlc07_skill_brt_alberic_special_2",
 "wh2_dlc07_skill_brt_alberic_special_3",
 "wh_dlc07_skill_brt_fay_battle_blessed_water",
 "wh_dlc07_skill_brt_fay_battle_secrets_of_the_grail",
 "wh_main_skill_brt_lord_unique_louen_the_army_of_the_king",
 "wh_main_skill_brt_lord_unique_louen_beloved_son_of_bretonnia",
 "wh2_dlc14_skill_brt_repanse_the_peoples_hero",
 "wh2_dlc14_skill_brt_repanse_eternal_errantry_war",
 "wh_main_skill_brt_lord_battle_lionhearted",
 "wh_main_skill_brt_lord_battle_virtue_of_empathy"
];
export const batchPins={"sourceSha256":"b4829eb640ef94deef53f105fdd1da47697b41ebacabb4954b80b609d9ade0de","originalExtractionSha256":"a86ce636f8232f085d44e3e5482c8984cfa4c3bb4e3bbce9266f3acf08b85085","processedSchemasSha256":"2656907c264b9d5a43ad959100ac3f16990adc674eb7daad0ab78c8721906f1a"};
const ownForce={key:'general_to_force_own',location:'forcewide_when_commanding',ownership:'yours',source:'character',target:'force',territory:'any'};
const self={key:'character_to_character_own',location:'character',ownership:'yours',source:'character',target:'character',territory:'any'};
// Exact reviewed effect identities only; no prefix/category family inference.
const effectReview={
 "wh_dlc07_effect_force_stat_charge_bonus_pct_battle_pilgrims": {
  "status": "DIRECT_SUPPORTED",
  "reason": "REUSES_REVIEWED_CHARGE_PERCENT_BONUS_AND_EXACT_LOC",
  "mappings": [
   {
    "bonus": "charge_bonus",
    "stat": "melee.chargeBonus",
    "operation": "multiply"
   }
  ]
 },
 "wh_dlc07_effect_force_stat_magic_resistance_battle_pilgrims": {
  "status": "REVIEW_REQUIRED",
  "reason": "SPELL_PERCENTAGE_LABEL_AND_PATH_EXIST_BUT_OPERATION_NOT_PREVIOUSLY_VALIDATED",
  "mappings": [],
  "candidateStat": "defense.resistances.spell"
 },
 "wh_main_effect_character_stat_aura_leadership_effect": {
  "status": "REVIEW_REQUIRED",
  "reason": "SELF_AURA_NOT_DIRECT_UNIT_LEADERSHIP",
  "mappings": []
 },
 "wh_main_effect_character_stat_unit_health": {
  "status": "REVIEW_REQUIRED",
  "reason": "SELF_BODYGUARD_MODIFIER_NOT_UNIT_HP_ADMISSION",
  "mappings": []
 },
 "wh_main_effect_character_stat_leadership_aura_size": {
  "status": "REVIEW_REQUIRED",
  "reason": "SHARED_OWNER_AND_SELF_AURA_CLASS_SELECTOR_NOT_UNIT_STAT",
  "mappings": []
 },
 "wh2_dlc14_effect_armour_piercing_damage_infantry": {
  "status": "REVIEW_REQUIRED",
  "reason": "CLASS_SELECTOR_NOT_EXPLICIT_MEMBERSHIP",
  "mappings": []
 },
 "wh2_dlc14_effect_force_army_battle_all_infantry_attack": {
  "status": "REVIEW_REQUIRED",
  "reason": "CLASS_SELECTOR_NOT_EXPLICIT_MEMBERSHIP",
  "mappings": []
 },
 "wh_main_effect_force_knights_campaign_replenishment_rate": {
  "status": "UNSUPPORTED",
  "reason": "REPLENISHMENT_NO_UNIT_STAT_PATH",
  "mappings": []
 },
 "wh_main_effect_ability_enable_hold_the_line": {
  "status": "NON_UNIT_STAT",
  "reason": "ACTUAL_TYPED_NON_UNIT_ROUTE_NO_NUMERIC_UNIT_PROJECTION",
  "mappings": []
 },
 "wh2_main_effect_building_construction_cost_mod_ports": {
  "status": "NON_UNIT_STAT",
  "reason": "ACTUAL_TYPED_NON_UNIT_ROUTE_NO_NUMERIC_UNIT_PROJECTION",
  "mappings": []
 },
 "wh2_main_effect_building_construction_time_mod_ports": {
  "status": "NON_UNIT_STAT",
  "reason": "ACTUAL_TYPED_NON_UNIT_ROUTE_NO_NUMERIC_UNIT_PROJECTION",
  "mappings": []
 },
 "wh2_main_effect_building_construction_cost_mod_resource_buildings": {
  "status": "NON_UNIT_STAT",
  "reason": "ACTUAL_TYPED_NON_UNIT_ROUTE_NO_NUMERIC_UNIT_PROJECTION",
  "mappings": []
 },
 "wh2_main_effect_building_construction_time_mod_lzd_resource_buildings": {
  "status": "NON_UNIT_STAT",
  "reason": "ACTUAL_TYPED_NON_UNIT_ROUTE_NO_NUMERIC_UNIT_PROJECTION",
  "mappings": []
 },
 "wh_main_effect_economy_trade_good_commodity_mod": {
  "status": "NON_UNIT_STAT",
  "reason": "ACTUAL_TYPED_NON_UNIT_ROUTE_NO_NUMERIC_UNIT_PROJECTION",
  "mappings": []
 },
 "wh2_dlc09_edict_brt_peasants_duty_growth_mod": {
  "status": "NON_UNIT_STAT",
  "reason": "ACTUAL_TYPED_NON_UNIT_ROUTE_NO_NUMERIC_UNIT_PROJECTION",
  "mappings": []
 },
 "wh2_dlc09_edict_brt_peasants_duty_public_order_mod": {
  "status": "NON_UNIT_STAT",
  "reason": "ACTUAL_TYPED_NON_UNIT_ROUTE_NO_NUMERIC_UNIT_PROJECTION",
  "mappings": []
 },
 "wh2_dlc09_edict_brt_peasants_duty_tax_mod": {
  "status": "NON_UNIT_STAT",
  "reason": "ACTUAL_TYPED_NON_UNIT_ROUTE_NO_NUMERIC_UNIT_PROJECTION",
  "mappings": []
 },
 "wh_main_effect_ability_enable_beloved_son_of_bretonnia": {
  "status": "NON_UNIT_STAT",
  "reason": "ACTUAL_TYPED_NON_UNIT_ROUTE_NO_NUMERIC_UNIT_PROJECTION",
  "mappings": []
 },
 "wh_main_effect_force_all_campaign_replenishment_rate": {
  "status": "NON_UNIT_STAT",
  "reason": "ACTUAL_TYPED_NON_UNIT_ROUTE_NO_NUMERIC_UNIT_PROJECTION",
  "mappings": []
 },
 "wh_dlc08_effect_ability_enable_frenzy": {
  "status": "NON_UNIT_STAT",
  "reason": "ACTUAL_TYPED_NON_UNIT_ROUTE_NO_NUMERIC_UNIT_PROJECTION",
  "mappings": []
 },
 "wh_main_effect_attribute_enable_unbreakable": {
  "status": "NON_UNIT_STAT",
  "reason": "ACTUAL_TYPED_NON_UNIT_ROUTE_NO_NUMERIC_UNIT_PROJECTION",
  "mappings": []
 },
 "wh_dlc07_effect_ability_cooldown_rally_stand_your_ground": {
  "status": "NON_UNIT_STAT",
  "reason": "ACTUAL_TYPED_NON_UNIT_ROUTE_NO_NUMERIC_UNIT_PROJECTION",
  "mappings": []
 }
};
export function projectExtraction(bytes){
 const r=JSON.parse(bytes);assert.equal(r.format,'wh3-skill-batch-extraction-v1');assert.deepEqual(r.skillKeys,keys);
 return {format:'wh3-skill-batch-source-v1',skillKeys:keys,originalExtraction:{path:'generated/wh3/skill-batch-02/raw.json',sha256:sha256(bytes),extractedAt:r.extractedAt},
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
 const scopes=g.rows('campaign_effect_scopes_tables');assert.deepEqual(scopes.find(s=>s.row.key===ownForce.key)?.row,ownForce); assert.deepEqual(scopes.find(s=>s.row.key===self.key)?.row,self);
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
   // Other typed routes are retained as evidence only, never projected.

   const targets=relations.filter(r=>r.table==='effect_bonus_value_ids_unit_sets_tables').map(target),mappings=rule.mappings.map(m=>{assert(relations.some(r=>r.row.bonus_value_id===m.bonus),'Bonus route mismatch');return {...m,value:j.row.value};});
   return {effectKey:e.row.effect,rank:j.row.level,rawValue:j.row.value,description:label.row.text,scope:scope.row,status:rule.status,reason:rule.reason,...(rule.candidateStat?{candidateStat:rule.candidateStat}:{}),
    sourceRows:[j.id,e.id,scope.id,label.id],joins:[g.join(j,'character_skill_key',skill,'key'),g.join(j,'effect_key',e,'effect'),g.join(j,'effect_scope',scope,'key')],
    relations:relations.map(r=>({rowId:r.id,table:r.table,row:r.row,bonus:r.row.bonus_value_id,join:g.join(r,'effect',e,'effect')})),targets,mappingCandidates:mappings};
  });
  const levelDetails=g.rows('character_skill_level_details_tables','skill_key',key);
  g.covered('character_skill_level_details_tables','skill_key',key,levelDetails.length);
  for(const [t,f] of [['character_skill_level_to_ancillaries_junctions_tables','skill'],['character_skill_level_to_dilemmas_junctions_tables','character_skill_key'],['character_skills_to_level_reached_criterias_tables','character_skill']])g.covered(t,f,key,g.rows(t,f,key).length);
  const statuses=[...new Set(effects.map(e=>e.status))];
  const status=levels.length>1||owners.length!==1?'REVIEW_REQUIRED':statuses.length===1?statuses[0]:'SUPPORTED_WITH_LIMITATION';
  return {skillKey:key,name:name.row.text,description:description.row.text,sourceRowId:skill.id,localisationRows:[name.id,description.id],owners,
   maxRank:levels.at(-1),ranks:levels.map(rank=>({rank,effectRowIds:effects.filter(e=>e.rank===rank).map(e=>e.sourceRows[0])})),
   rankSemantics:levels.length===1?'SINGLE_LEVEL_EXACT_VALUE_NO_ACCUMULATION':'UNKNOWN_REPLACEMENT_VS_INCREMENTAL',
   rankSetShape:levels.length===1?'SINGLE':'MIXED_EFFECT_SET',unlockedAtModelRank:skill.row.unlocked_at_rank,
   levelDetails:levelDetails.map(r=>({rowId:r.id,...r.row,join:g.join(r,'skill_key',skill,'key')})),status,effects};
 });
 const count=items=>Object.fromEntries([...new Set(items)].sort().map(k=>[k,items.filter(x=>x===k).length]));
 return {format:'wh3-reviewed-skill-batch-v1',skills,
  scopeInventory:scopes.map(s=>({record:s.row,rowId:s.id,occurrences:skills.flatMap(s=>s.effects).filter(e=>e.scope.key===s.row.key).length,
   representativeSkills:skills.filter(x=>x.effects.some(e=>e.scope.key===s.row.key)).map(x=>x.skillKey),sameAsFirstSlice:s.row.key===ownForce.key,currentModel:s.row.key===ownForce.key?'COMMANDING_OWN_FORCE':s.row.key===self.key?'NO_CHARACTER_SELF_UNIT_PROJECTION':'NO_UNIT_SCOPE_PROJECTION'})),
  summary:{skills:skills.length,rankEffectRows:skills.flatMap(s=>s.effects).length,skillStatuses:count(skills.map(s=>s.status)),effectStatuses:count(skills.flatMap(s=>s.effects).map(e=>e.status))},
  rankPolicy:'Only one source level may be admitted; multi-rank application and shared-owner semantics remain unchanged/unproven.',
  overlap:{targetMainKey:'wh_dlc07_brt_inf_battle_pilgrims_0',skills:[keys[4],keys[5]],status:'NO VERIFIED MULTI-SKILL TARGET',reason:'Blessed Water is DIRECT; Secrets has an unreviewed resistance operation and is not admitted. Prior Alberic own-force skills cannot stack with a different commander.'},
  modelAssessment:{conclusion:'B',repeatable:'Exact single-rank owner / commanding own force / explicit membership / previously reviewed numeric bonus',limitations:['Unreviewed resistance operation prevents the observed target overlap from becoming an admitted stack','Shared owner/self/class/non-unit effects remain outside the model'],implemented:'One additional independent single-rank projection; no multiple-Skill UI or engine change'}};
}
// One exact admission repeats the existing charge-percent mapping. No resistance,
// shared-owner, self, partial-effect or multiple-Skill resolver is introduced.
export function buildAdmission(source,unitsBytes){
 assert.equal(sha256(unitsBytes),pins.unitsSha256,'Production registry drift');
 const review=reviewBatch(source),skill=review.skills[4];
 assert.equal(skill.skillKey,'wh_dlc07_skill_brt_fay_battle_blessed_water');
 assert.equal(skill.status,'DIRECT_SUPPORTED');assert.equal(skill.maxRank,1);
 assert.equal(skill.owners.length,1);const owner=skill.owners[0];
 assert.equal(owner.key,'wh_dlc07_brt_fay_enchantress');assert(owner.enabled);
 assert.equal(owner.skillNodeKey,'wh_dlc07_skill_node_brt_fay_enchantress_unique_09');
 assert.equal(owner.skillNodeSet,'wh_dlc07_skill_node_set_brt_fay_enchantress');
 assert(Object.values(owner.selectors).every(s=>Object.values(s).every(v=>v==='')));
 assert.equal(skill.levelDetails.length,0);
 const g=sourceGraph(source);
 for(const [t,f] of [['character_skill_level_to_ancillaries_junctions_tables','skill'],['character_skill_level_to_dilemmas_junctions_tables','character_skill_key'],['character_skills_to_level_reached_criterias_tables','character_skill']])assert.equal(g.rows(t,f,skill.skillKey).length,0);
 assert.equal(skill.effects.length,1);const effect=skill.effects[0];
 assert.equal(effect.effectKey,'wh_dlc07_effect_force_stat_charge_bonus_pct_battle_pilgrims');
 assert.equal(effect.rawValue,30);assert.equal(effect.rank,1);assert.deepEqual(effect.scope,ownForce);
 assert.equal(effect.description,'Charge bonus: %+n% for Battle Pilgrim and Grail Reliquae units');
 assert.equal(effect.relations.length,1);assert.equal(effect.relations[0].bonus,'charge_bonus');
 assert.equal(effect.targets.length,1);const set=effect.targets[0];
 assert.equal(set.kind,'EXPLICIT_MAIN_MEMBERSHIP');assert.equal(set.setKey,'dlc07_brt_inf_battle_pilgrims');
 assert.deepEqual(set.definition,{key:set.setKey,use_unit_exp_level_range:false,min_unit_exp_level_inclusive:-1,max_unit_exp_level_inclusive:-1,special_category:''});
 assert.deepEqual(set.members.map(m=>[m.mainKey,m.landKey,m.excluded]),[
  ['wh_dlc07_brt_inf_battle_pilgrims_0','wh_dlc07_brt_inf_battle_pilgrims_0',false],
  ['wh_dlc07_brt_inf_grail_reliquae_0','wh_dlc07_brt_inf_grail_reliquae_0',false],
  ['wh_pro04_brt_inf_battle_pilgrims_ror_0','wh_pro04_brt_inf_battle_pilgrims_ror_0',false],
 ]);
 const mainKey='wh_dlc07_brt_inf_battle_pilgrims_0',unitId=`ca_unit_${mainKey}`,units=JSON.parse(unitsBytes);
 assert.equal(units.filter(u=>u.id===unitId&&u.gameVersion===pins.gameVersion).length,1);
 for(const m of set.members.slice(1))assert(!units.some(u=>u.id===`ca_unit_${m.mainKey}`),'Target inventory changed; re-review required');
 const target={unitId,mainKey,landKey:mainKey},m=effect.mappingCandidates[0];
 assert.deepEqual(effect.mappingCandidates,[{bonus:'charge_bonus',stat:'melee.chargeBonus',operation:'multiply',value:30}]);
 const projection={sourceKind:'CA_SKILL',skillKey:skill.skillKey,name:skill.name,
  owner:{key:owner.key,name:owner.name,agentType:owner.agentType,characterType:owner.characterType,mainKey:owner.mainKey,landKey:owner.landKey,skillNodeSet:owner.skillNodeSet,skillNodeKey:owner.skillNodeKey},
  maxRank:1,rankSemantics:skill.rankSemantics,scope:ownForce,gameVersion:pins.gameVersion,
  provenance:{sourceSha256:batchPins.sourceSha256,originalExtractionSha256:batchPins.originalExtractionSha256,snapshotId:pins.snapshotId,static:source.provenance,reviewRef:'tools/wh3-importer/skill-batch-02/review.json',mappingBasis:'tools/wh3-importer/research-classifier/policy.mjs#wh2_main_effect_force_stat_charge_bonus_pct_brt_knights'},
  ranks:[{rank:1,effects:[{effectKey:effect.effectKey,rawValue:30,stat:m.stat,operation:m.operation,value:30,junctionRowId:effect.sourceRows[0],targetRowId:effect.relations[0].rowId}]}],targets:[target],
  modifiers:[{id:`ca-skill:${skill.skillKey}:${owner.key}:1:${effect.effectKey}:${mainKey}:${m.stat}`,rank:1,unitId,effectKey:effect.effectKey,stat:m.stat,operation:m.operation,value:30}]};
 const admission={sourceKind:'CA_SKILL',admittedSkills:[skill.skillKey],admittedTargets:[target],effects:1,modifiers:1,
  omittedTargets:set.members.slice(1).map(m=>({mainKey:m.mainKey,landKey:m.landKey,reason:'TARGET_NOT_IN_PRODUCTION'})),
  deferredSkills:review.skills.filter(s=>s.skillKey!==skill.skillKey).map(s=>({skillKey:s.skillKey,status:s.status,reason:s.owners.length>1?'SHARED_OWNER_NOT_ADMITTED':s.effects.find(e=>e.status!=='DIRECT_SUPPORTED').reason})),
  multipleSkillStatus:review.overlap.status,reviewSha256:sha256(serialize(review)),projectionSha256:sha256(serialize(projection))};
 return {review,admission,projection};
}
export function admitBatch(sourceBytes,unitsBytes,manifest){
 assert.equal(manifest.format,'wh3-skill-batch-02-admission-v1');assert.equal(manifest.baselineCommit,'bf61a1212ca454db3f971b473c4f83c23e61cf81');
 for(const [k,v] of Object.entries({...batchPins,unitsSha256:pins.unitsSha256,snapshotId:pins.snapshotId}))assert.equal(manifest[k],v,`${k} drift`);
 assert.equal(sha256(sourceBytes),batchPins.sourceSha256);assert.equal(sha256(unitsBytes),pins.unitsSha256);
 const source=JSON.parse(sourceBytes);assert.equal(sha256(JSON.stringify(source.schemas)),batchPins.processedSchemasSha256);
 const result=buildAdmission(source,unitsBytes);
 assert.deepEqual(manifest.admittedSkills,result.admission.admittedSkills);assert.deepEqual(manifest.admittedTargets,result.admission.admittedTargets);
 for(const [name,value] of Object.entries(result))assert.equal(sha256(serialize(value)),manifest.outputs[`${name}.json`],`Reviewed ${name} drift`);
 return result;
}
