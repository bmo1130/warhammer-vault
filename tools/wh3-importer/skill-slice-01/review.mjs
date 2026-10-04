import assert from 'node:assert/strict';
import {sha256} from '../research-classifier/classify.mjs';
import {pins} from '../research-classifier/policy.mjs';
import {sourceGraph} from '../research-scan-bretonnia/source.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
export const sourceSha256='11f0e4088f6d3cbe3d46e7bbd4a240f3e21bc7250c6e0b8f0894f3393c2d4f27';
export const originalSha256='40d23b49310b7fb0ac8bd105d857caaee9269aa0fad918d3bccb967d0c52b9bb';
export const schemaSha256='1780491e25d087e78c81d484354e6571619c93f62ba2eefb5d694984931d087e';
export const skillKey='wh_dlc07_skill_brt_alberic_battle_champions_of_bordeleaux';
export const ownerKey='wh_dlc07_brt_alberic';
export const serialize=v=>JSON.stringify(v,null,2)+'\n';
const scope={key:'general_to_force_own',location:'forcewide_when_commanding',ownership:'yours',source:'character',target:'force',territory:'any'};
const unitSet='dlc07_brt_knights_realm';
const mainKey='wh_main_brt_cav_knights_of_the_realm';
const mappings=[
 {effectKey:'wh_dlc07_effect_force_stat_bonus_vs_large_kotr',bonus:'damage_vs_large_entities',stat:'melee.damage.bonusVsLarge',operation:'add',value:15,description:'Bonus vs Large: %+n for Knights of the Realm units'},
 {effectKey:'wh_dlc07_effect_force_stat_leadership_kotr',bonus:'morale',stat:'defense.leadership',operation:'add',value:5,description:'Leadership: %+n for Knight of the Realm units'},
];

// One reviewed skill, one owner, one level. This is deliberately not a skill
// classifier or an inherited Research scope permission.
export function reviewSkill(source) {
 assert.equal(source.format,'wh3-skill-source-v1');assert.equal(source.skillKey,skillKey);
 assert.equal(source.originalExtraction.sha256,originalSha256);
 assert.equal(digest(snapshotIdentity(source.provenance)),pins.snapshotId,'Snapshot drift');
 for(const k of ['gameVersion','schemaSha256','rpfmVersion','schemaFormatVersion'])assert.equal(source.provenance[k],pins[k]);
 const g=sourceGraph(source),ids=new Map();
 for(const r of source.rows){assert(!ids.has(r.id),'Duplicate row');ids.set(r.id,r);
  assert.equal(r.id,`${r.table}:${sha256(JSON.stringify([r.sourcePack,r.path,r.key,r.row])).slice(0,20)}`,'Row payload drift');
  const pack=source.provenance.packs.find(p=>p.file_name===r.sourcePack);
  assert.equal(pack?.file_path,r.sourcePackPath);assert.equal(r.sourcePack,r.table==='Loc'?'local_en.pack':'db.pack');
 }
 for(const c of source.coverage){const loc=c.query.table.startsWith('Loc:');
  const rows=g.rows(loc?'Loc':c.query.table).filter(r=>(!loc||r.path===c.query.table.slice(4))&&c.query.where.every(q=>q.op==='eq'?r.row[q.field]===q.value:q.op==='oneOf'&&q.value.includes(r.row[q.field])));
  assert.equal(rows.length,c.matchedRows,'Incomplete source query');assert(c.tableFiles>0);
 }
 for(const ref of source.relationships){const a=ids.get(ref.from),b=ids.get(ref.to);assert(a&&b,'Missing reference');
  if(b.table==='Loc'){assert(g.definition(a).localisedFields.includes(ref.field));assert.equal(ref.value,`${a.table.replace(/_tables$/,'')}_${ref.field}_${Object.values(a.key)[0]}`);assert.equal(b.row.key,ref.value);}
  else g.join(a,ref.field,b,ref.targetField);
 }
 const join=(a,f,b,t)=>g.join(a,f,b,t),one=g.one;
 const skill=one('character_skills_tables','key',skillKey),node=one('character_skill_nodes_tables','character_skill_key',skillKey);
 g.covered('character_skill_nodes_tables','character_skill_key',skillKey,1);assert(node.row.visible_in_ui);
 assert.equal(skill.row.is_background_skill,false);
 const item=one('character_skill_node_set_items_tables','item',node.row.key);assert.equal(item.row.mod_disabled,false);
 const set=one('character_skill_node_sets_tables','key',item.row.set);
 assert.equal(set.row.agent_subtype_key,ownerKey);assert.equal(set.row.agent_key,'general');
 for(const k of ['campaign_key','faction_key','subculture']){assert.equal(set.row[k],'');assert.equal(node.row[k],'');}
 const owner=one('agent_subtypes_tables','key',ownerKey),agent=one('agents_tables','key','general');
 assert.equal(owner.row.recruitment_category,'legendary_lords');assert.equal(owner.row.recruitable,true);
 const category=one('agent_recruitment_categories_tables','key','legendary_lords');
 const ownerMain=one('main_units_tables','unit',owner.row.associated_unit_override),ownerLand=one('land_units_tables','key',ownerMain.row.land_unit);
 assert.equal(ownerMain.row.caste,'lord');
 const leader=one('frontend_faction_leaders_tables','agent_subtype_record',ownerKey);
 const faction=one('factions_tables','key',leader.row.faction),subculture=one('cultures_subcultures_tables','subculture',faction.row.subculture);
 const culture=one('cultures_tables','key',subculture.row.culture);assert.equal(culture.row.key,'wh_main_brt_bretonnia');
 const ownerTrace=[join(node,'character_skill_key',skill,'key'),join(item,'item',node,'key'),join(item,'set',set,'key'),
  join(set,'agent_subtype_key',owner,'key'),join(set,'agent_key',agent,'key'),join(owner,'recruitment_category',category,'key'),
  join(owner,'associated_unit_override',ownerMain,'unit'),join(ownerMain,'land_unit',ownerLand,'key'),
  join(leader,'agent_subtype_record',owner,'key'),join(leader,'faction',faction,'key'),join(faction,'subculture',subculture,'subculture'),join(subculture,'culture',culture,'key')];
 const effectRows=g.rows('character_skill_level_to_effects_junctions_tables','character_skill_key',skillKey);
 g.covered('character_skill_level_to_effects_junctions_tables','character_skill_key',skillKey,2);assert.equal(effectRows.length,2);
 assert(effectRows.every(r=>r.row.level===1),'Only exact CA level 1 is reviewed');
 for(const [table,field] of [['character_skill_level_details_tables','skill_key'],['character_skill_level_to_ancillaries_junctions_tables','skill'],
  ['character_skill_level_to_dilemmas_junctions_tables','character_skill_key'],['character_skills_to_level_reached_criterias_tables','character_skill']])g.covered(table,field,skillKey,0);
 const scopeRow=one('campaign_effect_scopes_tables','key',scope.key);assert.deepEqual(scopeRow.row,scope);
 const definition=one('unit_sets_tables','key',unitSet);
 assert.deepEqual(definition.row,{key:unitSet,use_unit_exp_level_range:false,min_unit_exp_level_inclusive:-1,max_unit_exp_level_inclusive:-1,special_category:''});
 const members=g.rows('unit_set_to_unit_junctions_tables','unit_set',unitSet);g.covered('unit_set_to_unit_junctions_tables','unit_set',unitSet,2);
 assert.equal(members.length,2);assert.deepEqual(members.map(m=>m.row.unit_record).sort(),[mainKey,'wh_pro04_brt_cav_knights_of_the_realm_ror_0'].sort());
 assert(members.every(m=>m.row.exclude===false&&!m.row.unit_caste&&!m.row.unit_category&&!m.row.unit_class),'Explicit membership only');
 const targetTrace=members.map(m=>{const main=one('main_units_tables','unit',m.row.unit_record),land=one('land_units_tables','key',main.row.land_unit);
  return {mainKey:main.row.unit,landKey:land.row.key,membershipRowId:m.id,mainRowId:main.id,landRowId:land.id,
    joins:[join(m,'unit_set',definition,'key'),join(m,'unit_record',main,'unit'),join(main,'land_unit',land,'key')]};});
 const effects=mappings.map(mapping=>{
  const row=effectRows.filter(r=>r.row.effect_key===mapping.effectKey);assert.equal(row.length,1);
  const junction=row[0];assert.equal(junction.row.value,mapping.value);assert.equal(junction.row.effect_scope,scope.key);
  const effect=one('effects_tables','effect',mapping.effectKey),loc=one('Loc','key',`effects_description_${mapping.effectKey}`);
  assert.equal(loc.row.text,mapping.description);assert.equal(effect.row.category,'battle');
  const links=source.rows.filter(r=>source.relationTables.includes(r.table)&&r.row.effect===mapping.effectKey);
  assert.equal(links.length,1,'Competing target relation');assert.equal(links[0].table,'effect_bonus_value_ids_unit_sets_tables');
  assert.equal(links[0].row.bonus_value_id,mapping.bonus);assert.equal(links[0].row.unit_set,unitSet);
  for(const table of source.relationTables)assert(source.coverage.some(c=>c.query.table===table&&c.query.where[0].field==='effect'&&c.query.where[0].value.includes(mapping.effectKey)),'Incomplete relation discovery');
  return {...mapping,level:1,junctionRowId:junction.id,effectRowId:effect.id,localisationRowId:loc.id,targetRowId:links[0].id,
   joins:[join(junction,'character_skill_key',skill,'key'),join(junction,'effect_key',effect,'effect'),join(junction,'effect_scope',scopeRow,'key'),join(links[0],'effect',effect,'effect'),join(links[0],'unit_set',definition,'key')]};
 });
 const name=one('Loc','key',`character_skills_localised_name_${skillKey}`),ownerName=one('Loc','key',`land_units_onscreen_name_${ownerLand.row.key}`);
 assert(source.relationships.some(r=>r.from===skill.id&&r.to===name.id&&r.field==='localised_name'));
 assert(source.relationships.some(r=>r.from===ownerLand.id&&r.to===ownerName.id&&r.field==='onscreen_name'));
 return {format:'wh3-reviewed-skill-slice-v1',sourceKind:'CA_SKILL',skillKey,name:name.row.text,
  owner:{key:ownerKey,name:ownerName.row.text,agentType:'general',characterType:'legendary_lord',mainKey:ownerMain.row.unit,landKey:ownerLand.row.key,
    factionKey:faction.row.key,cultureKey:culture.row.key,skillNodeSet:set.row.key,skillNodeKey:node.row.key},
  ownerTrace,rankTrace:{maxRank:1,levels:[1],junctionRowIds:effectRows.map(r=>r.id),semantics:'SINGLE_LEVEL_EXACT_VALUE_NO_ACCUMULATION',overrides:[],unlockedAtCharacterRank:skill.row.unlocked_at_rank},
  scopeTrace:{record:scope,rowId:scopeRow.id,condition:'Exact owner commanding the owning force; not factionwide or character-self'},
  effects,targetTrace};
}

export function admitSkill(sourceBytes,unitsBytes,manifest){
 assert.equal(manifest.format,'wh3-skill-admission-v1');assert.equal(manifest.baselineCommit,'2284181f3542fed28111e2a0b86758c343c3ad34');
 for(const [k,v] of Object.entries({sourceSha256,originalExtractionSha256:originalSha256,processedSchemasSha256:schemaSha256,skillKey,ownerKey,snapshotId:pins.snapshotId,unitsSha256:pins.unitsSha256}))assert.equal(manifest[k],v,`${k} drift`);
 assert.equal(sha256(sourceBytes),sourceSha256,'Reviewed source digest drift');assert.equal(sha256(unitsBytes),pins.unitsSha256);
 const source=JSON.parse(sourceBytes);assert.equal(sha256(JSON.stringify(source.schemas)),schemaSha256);
 const review=reviewSkill(source),units=JSON.parse(unitsBytes);
 const target=review.targetTrace.find(t=>t.mainKey===mainKey),unit=units.find(u=>u.id===`ca_unit_${mainKey}`&&u.gameVersion===pins.gameVersion);assert(unit);
 const projection={sourceKind:'CA_SKILL',skillKey,name:review.name,owner:review.owner,maxRank:1,rankSemantics:review.rankTrace.semantics,
  scope:review.scopeTrace.record,gameVersion:pins.gameVersion,
  provenance:{sourceSha256,originalExtractionSha256:originalSha256,snapshotId:pins.snapshotId,static:source.provenance,
   reviewRef:'tools/wh3-importer/skill-slice-01/review.json'},
  ranks:[{rank:1,effects:review.effects.map(e=>({effectKey:e.effectKey,rawValue:e.value,stat:e.stat,operation:e.operation,value:e.value,junctionRowId:e.junctionRowId,targetRowId:e.targetRowId}))}],
  targets:[{unitId:unit.id,mainKey:target.mainKey,landKey:target.landKey}],
  modifiers:review.effects.map(e=>({id:`ca-skill:${skillKey}:${ownerKey}:1:${e.effectKey}:${mainKey}:${e.stat}`,rank:1,unitId:unit.id,effectKey:e.effectKey,
   stat:e.stat,operation:e.operation,value:e.value}))};
 const admission={sourceKind:'CA_SKILL',skillKey,ownerKey,ranks:[1],admittedEffects:review.effects.map(e=>e.effectKey),
  admittedTargets:projection.targets,omittedTargets:review.targetTrace.filter(t=>t.mainKey!==mainKey).map(t=>({...t,reason:'TARGET_NOT_IN_PRODUCTION'})),
  reviewSha256:sha256(serialize(review)),projectionSha256:sha256(serialize(projection))};
 for(const [name,value] of Object.entries({review,admission,projection}))
  assert.equal(sha256(serialize(value)),manifest.outputs[`${name}.json`],`Reviewed ${name} output drift`);
 return {review,admission,projection};
}
