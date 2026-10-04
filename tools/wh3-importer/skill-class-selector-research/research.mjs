import assert from 'node:assert/strict';
import {sha256} from '../research-classifier/classify.mjs';
import {pins} from '../research-classifier/policy.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
export const serialize=v=>JSON.stringify(v,null,2)+'\n';
export const unique=xs=>[...new Set(xs)].sort();
const sorted=xs=>[...xs].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
const memberTable='unit_set_to_unit_junctions_tables';
const routeTable='effect_bonus_value_ids_unit_sets_tables';
const levelTable='character_skill_level_to_effects_junctions_tables';
export function projectExtraction(bytes){
 const r=JSON.parse(bytes);assert.equal(r.format,'wh3-skill-class-selector-extraction-v1');
 return {format:'wh3-skill-class-selector-source-v1',skillKeys:r.skillKeys,selectorKeys:r.selectorKeys,
  originalExtraction:{path:'generated/wh3/skill-class-selector-research/raw.json',sha256:sha256(bytes),extractedAt:r.extractedAt},
  provenance:r.provenance,relationTables:r.relationTables,identityReferenceInventory:r.identityReferenceInventory,bonusReference:r.bonusReference,
  schemas:r.schemas.map(s=>({table:s.table,version:s.version,fields:s.fields.map(({name,field_type,is_key,is_reference,description})=>({name,field_type,is_key,is_reference,description})),localisedFields:s.localisedFields.map(f=>f.name)})).sort((a,b)=>`${a.table}:${a.version}`<`${b.table}:${b.version}`?-1:1),
  rows:sorted(r.rows),relationships:[...r.relationships].sort((a,b)=>JSON.stringify(a)<JSON.stringify(b)?-1:1),
  coverage:[...r.coverage].sort((a,b)=>JSON.stringify(a.query)<JSON.stringify(b.query)?-1:1)};
}
// Indexed proof graph: enumeration and joins use source identities exclusively.
export function graph(source){
 const tables=new Map(),definitions=new Map(source.schemas.map(s=>[`${s.table}:${s.version}`,s]));
 for(const row of source.rows){if(!tables.has(row.table))tables.set(row.table,[]);tables.get(row.table).push(row);}
 const cache=new Map(),edges=new Set(source.relationships.map(r=>JSON.stringify([r.from,r.field,r.to,r.targetField,r.value])));
 const rows=(table,field,value)=>{
  if(field===undefined)return tables.get(table)??[];const k=JSON.stringify([table,field,value]);
  if(!cache.has(k))cache.set(k,(tables.get(table)??[]).filter(r=>r.row[field]===value));return cache.get(k);
 };
 const one=(table,field,value)=>{const found=rows(table,field,value);assert.equal(found.length,1,`Identity collision/missing ${table}.${field}=${value}`);return found[0];};
 const definition=r=>{const d=definitions.get(`${r.table}:${r.tableVersion}`);assert(d,'Missing processed schema');return d;};
 const join=(from,field,to,targetField)=>{
  assert.deepEqual(definition(from).fields.find(f=>f.name===field)?.is_reference,[to.table.replace(/_tables$/,''),targetField],'Reference schema drift');
  assert.equal(from.row[field],to.row[targetField],'Exact join mismatch');
  assert(edges.has(JSON.stringify([from.id,field,to.id,targetField,from.row[field]])),'Missing source join');return [from.id,field,to.id,targetField];
 };
 const covered=(table,field,value)=>assert(source.coverage.some(c=>c.query.table===table&&c.query.where.length===1&&c.query.where[0].field===field&&
  (c.query.where[0].op==='eq'?c.query.where[0].value===value:c.query.where[0].op==='oneOf'&&c.query.where[0].value.includes(value))),'Incomplete inverse membership coverage');
 return {rows,one,definition,join,covered};
}
export function validateSource(source){
 assert.equal(source.format,'wh3-skill-class-selector-source-v1');assert.equal(digest(snapshotIdentity(source.provenance)),pins.snapshotId,'Snapshot drift');
 for(const key of ['gameVersion','rpfmVersion','schemaFormatVersion','schemaSha256'])assert.equal(source.provenance[key],pins[key]);
 const ids=new Map(),keys=new Set(),g=graph(source);
 for(const r of source.rows){
  assert(!ids.has(r.id),'Duplicate membership/source row');ids.set(r.id,r);
  assert.equal(r.id,`${r.table}:${sha256(JSON.stringify([r.sourcePack,r.path,r.key,r.row])).slice(0,20)}`,'Source payload drift');
  assert.equal(r.sourcePack,r.table==='Loc'?'local_en.pack':'db.pack');assert.equal(source.provenance.packs.find(p=>p.file_name===r.sourcePack)?.file_path,r.sourcePackPath);
  assert.deepEqual(r.key,Object.fromEntries(g.definition(r).fields.filter(f=>f.is_key).map(f=>[f.name,r.row[f.name]])),'Primary key drift');
  if(Object.keys(r.key).length){const k=JSON.stringify([r.table,r.key]);assert(!keys.has(k),'Membership/identity collision');keys.add(k);}
 }
 for(const c of source.coverage){const loc=c.query.table.startsWith('Loc:');assert.equal(c.query.where.length,1);
  const found=g.rows(loc?'Loc':c.query.table).filter(r=>(!loc||r.path===c.query.table.slice(4))&&c.query.where.every(q=>q.op==='eq'?r.row[q.field]===q.value:q.op==='oneOf'&&q.value.includes(r.row[q.field])));
  assert.equal(found.length,c.matchedRows,'Incomplete query coverage');assert(Number.isInteger(c.tableFiles)&&c.tableFiles>=0);
 }
 for(const r of source.relationships){const from=ids.get(r.from),to=ids.get(r.to);assert(from&&to,'Missing referenced row');
  if(to.table==='Loc'){assert(g.definition(from).localisedFields.includes(r.field));assert.equal(to.row.key,`${from.table.replace(/_tables$/,'')}_${r.field}_${Object.values(from.key)[0]}`);assert.equal(r.value,to.row.key);}
  else g.join(from,r.field,to,r.targetField);
 }
 return source;
}
const selectorFields=['unit_record','unit_caste','unit_class','unit_category'];
export function materialize(source,setKey,units){
 const g=graph(source),set=g.one('unit_sets_tables','key',setKey),junctions=sorted(g.rows(memberTable,'unit_set',setKey));
 g.covered(memberTable,'unit_set',setKey);assert(junctions.length,'Empty selector requires separate review');
 const blockers=[],members=new Map(),landOnly=[],naval=[];
 if(set.row.use_unit_exp_level_range||set.row.special_category)blockers.push('DYNAMIC/CONDITIONAL_SELECTOR');
 const branches=junctions.map(j=>{
  const fields=selectorFields.filter(f=>j.row[f]);const branch={rowId:j.id,raw:j.row,kind:fields.length===1?({unit_record:'EXPLICIT_UNIT_SET',unit_caste:'MAIN_UNIT_CASTE',unit_class:'LAND_UNIT_CLASS',unit_category:'LAND_UNIT_CATEGORY'})[fields[0]]:'AMBIGUOUS',joins:[g.join(j,'unit_set',set,'key')],mainKeys:[]};
  if(fields.length!==1||j.row.exclude){blockers.push(j.row.exclude?'EXCLUSION_REQUIRES_SEPARATE_REVIEW':'COMBINED_OR_EMPTY_SELECTOR_REQUIRES_SEPARATE_REVIEW');return branch;}
  const field=fields[0],value=j.row[field];let candidates=[];
  if(field==='unit_category'){blockers.push('UNSAMPLED_UNIT_CATEGORY_SELECTOR');return branch;}
  if(field==='unit_record'){const main=g.one('main_units_tables','unit',value);branch.joins.push(g.join(j,field,main,'unit'));candidates=[main];}
  else if(field==='unit_caste'){
   const caste=g.one('unit_castes_tables','caste',value);branch.joins.push(g.join(j,field,caste,'caste'));g.covered('main_units_tables','caste',value);candidates=g.rows('main_units_tables','caste',value);
  }else{
   const classField=field==='unit_class'?'class':'category',table=field==='unit_class'?'unit_class_tables':'unit_category_tables';
   const entity=g.one(table,'key',value);branch.joins.push(g.join(j,field,entity,'key'));g.covered('land_units_tables',classField,value);
   for(const land of g.rows('land_units_tables',classField,value)){
    g.join(land,classField,entity,'key');g.covered('main_units_tables','land_unit',land.row.key);
    const inverse=g.rows('main_units_tables','land_unit',land.row.key);candidates.push(...inverse);
    if(!inverse.length)landOnly.push({landKey:land.row.key,landRowId:land.id,branchRowId:j.id,reason:'NO_MAIN_IDENTITY'});
   }
   if(field==='unit_class'){g.covered('naval_units_tables','class',value);naval.push(...g.rows('naval_units_tables','class',value).map(n=>({key:n.row.key,rowId:n.id,branchRowId:j.id,reason:'NAVAL_NOT_LAND_PRODUCTION'})));}
  }
  for(const main of sorted(candidates)){
   const landMatches=g.rows('land_units_tables','key',main.row.land_unit);assert.equal(landMatches.length,1,'Main/land alias mismatch or missing identity');const land=landMatches[0];
   const joins=[g.join(main,'land_unit',land,'key')];
   if(field==='unit_caste')joins.push(g.join(main,'caste',g.one('unit_castes_tables','caste',value),'caste'));
   if(field==='unit_class'||field==='unit_category')joins.push(g.join(land,field==='unit_class'?'class':'category',g.one(field==='unit_class'?'unit_class_tables':'unit_category_tables','key',value),'key'));
   branch.mainKeys.push(main.row.unit);
   if(!members.has(main.row.unit))members.set(main.row.unit,{mainKey:main.row.unit,landKey:land.row.key,mainRowId:main.id,landRowId:land.id,caste:main.row.caste,landClass:land.row.class,landCategory:land.row.category,isRenown:main.row.is_renown,branchRowIds:[],joins,
    productionUnitIds:units.filter(u=>u.gameVersion===pins.gameVersion&&u.id===`ca_unit_${main.row.unit}`).map(u=>u.id)});
   members.get(main.row.unit).branchRowIds.push(j.id);
  }
  branch.mainKeys=unique(branch.mainKeys);return branch;
 });
 const exactMembers=[...members.values()].sort((a,b)=>a.mainKey<b.mainKey?-1:1);
 const productionMembers=exactMembers.filter(m=>m.productionUnitIds.length),omittedNonProduction=exactMembers.filter(m=>!m.productionUnitIds.length).map(m=>({mainKey:m.mainKey,landKey:m.landKey,reason:'TARGET_NOT_IN_PRODUCTION'}));
 const kinds=unique(branches.map(b=>b.kind)),status=blockers.length?'UNSUPPORTED_SELECTOR_SHAPE':'STATIC_EXACT_MEMBERSHIP';
 return {key:setKey,definitionRowId:set.id,definition:set.row,status,taxonomy:kinds.length===1?kinds[0]:'MIXED_STATIC_UNION',branchKinds:kinds,blockers:unique(blockers),branches,
  exactMembers:status==='STATIC_EXACT_MEMBERSHIP'?exactMembers:[],productionMembers:status==='STATIC_EXACT_MEMBERSHIP'?productionMembers:[],
  omittedNonProduction:status==='STATIC_EXACT_MEMBERSHIP'?omittedNonProduction:[],landWithoutMain:landOnly,navalOmissions:naval,ambiguous:status==='STATIC_EXACT_MEMBERSHIP'?[]:[{reason:blockers.join(';')}],
  unionCollisions:exactMembers.filter(m=>m.branchRowIds.length>1).map(m=>({mainKey:m.mainKey,branchRowIds:m.branchRowIds})),
  mainLandAliases:exactMembers.filter(m=>m.mainKey!==m.landKey).map(m=>({mainKey:m.mainKey,landKey:m.landKey})),
  membershipIsEffectApplicability:false,runtimeMembership:'NOT_OBSERVED',runtimeAdditionalFilterEvidence:'NONE_IN_TRACED_SELECTOR_ROWS'};
}
function operation(effectKey,routes){
 if(effectKey==='wh2_dlc14_effect_force_army_battle_all_infantry_attack')return {status:'VERIFIED_EXISTING_MAPPING',stat:'melee.meleeAttack',operation:'add',basis:'research-classifier/policy.mjs#wh2_main_effect_force_stat_melee_attack_brt_knights',bonus:'melee_attack_mod'};
 if(effectKey==='wh2_dlc14_effect_armour_piercing_damage_infantry')return {status:'UNKNOWN',candidateStat:'melee.damage.armorPiercing',candidateOperation:'add',bonus:'melee_damage_ap_mod_add',reason:'Exact add-named engine bonus and numeric Loc; no prior reviewed flat AP operation. Not admitted in this membership-only research.'};
 if(effectKey==='wh_dlc07_effect_force_stat_charge_bonus_pct_battle_pilgrims')return {status:'EXISTING_ADMISSION',stat:'melee.chargeBonus',operation:'multiply',bonus:'charge_bonus',basis:'skill-batch-02/admission.json'};
 if(routes.some(r=>/replenishment/.test(r.row.bonus_value_id??'')))return {status:'UNSUPPORTED',reason:'REPLENISHMENT_NO_UNIT_STAT_PATH'};
 if(effectKey==='wh_main_effect_force_stat_vigour_loss_reduction')return {status:'UNSUPPORTED',reason:'VIGOUR_NO_UNIT_STAT_PATH'};
 return {status:'NOT_REVIEWED',reason:'Other effect scope/operation remains outside selector research'};
}
export function research(source,units,selection){
 validateSource(source);assert.deepEqual(source.skillKeys,selection.skills.map(s=>s.key));
 const g=graph(source),memberships=source.selectorKeys.map(key=>materialize(source,key,units)),bySet=new Map(memberships.map(m=>[m.key,m]));
 const skills=source.skillKeys.map(key=>{
  const skill=g.one('character_skills_tables','key',key),nodes=g.rows('character_skill_nodes_tables','character_skill_key',key),levels=g.rows(levelTable,'character_skill_key',key);
  g.covered('character_skill_nodes_tables','character_skill_key',key);g.covered(levelTable,'character_skill_key',key);
  const owners=nodes.flatMap(node=>{g.covered('character_skill_node_set_items_tables','item',node.row.key);return g.rows('character_skill_node_set_items_tables','item',node.row.key).map(item=>{
   const set=g.one('character_skill_node_sets_tables','key',item.row.set),owner=g.one('agent_subtypes_tables','key',set.row.agent_subtype_key),agent=g.one('agents_tables','key',set.row.agent_key),main=g.one('main_units_tables','unit',owner.row.associated_unit_override),land=g.one('land_units_tables','key',main.row.land_unit);
   return {key:owner.row.key,nodeKey:node.row.key,nodeSetKey:set.row.key,mainKey:main.row.unit,landKey:land.row.key,enabled:node.row.visible_in_ui&&!item.row.mod_disabled,
    context:{node:{campaign:node.row.campaign_key,faction:node.row.faction_key,subculture:node.row.subculture},set:{campaign:set.row.campaign_key,faction:set.row.faction_key,subculture:set.row.subculture}},
    joins:[g.join(node,'character_skill_key',skill,'key'),g.join(item,'item',node,'key'),g.join(item,'set',set,'key'),g.join(set,'agent_subtype_key',owner,'key'),g.join(set,'agent_key',agent,'key'),g.join(owner,'associated_unit_override',main,'unit'),g.join(main,'land_unit',land,'key')]};
  });});
  const effects=sorted(levels).map(level=>{
   const effect=g.one('effects_tables','effect',level.row.effect_key),scope=g.one('campaign_effect_scopes_tables','key',level.row.effect_scope);
   const routes=source.relationTables.flatMap(table=>{g.covered(table,'effect',effect.row.effect);return g.rows(table,'effect',effect.row.effect);});
   return {rank:level.row.level,effectKey:effect.row.effect,rawValue:level.row.value,scope:scope.row,description:g.one('Loc','key',`effects_description_${effect.row.effect}`).row.text,
    joins:[g.join(level,'character_skill_key',skill,'key'),g.join(level,'effect_key',effect,'effect'),g.join(level,'effect_scope',scope,'key')],operation:operation(effect.row.effect,routes),
    routes:sorted(routes).map(route=>({rowId:route.id,table:route.table,raw:route.row,join:g.join(route,'effect',effect,'effect'),
     ...(route.row.unit_set?{selectorKey:route.row.unit_set,selectorJoin:g.join(route,'unit_set',g.one('unit_sets_tables','key',route.row.unit_set),'key'),membershipRef:`membership.json#${route.row.unit_set}`,productionUnitIds:bySet.get(route.row.unit_set).productionMembers.flatMap(m=>m.productionUnitIds)}:{})}))};
  });
  const blockers=unique(effects.flatMap(e=>[...(e.scope.key==='general_to_force_own'?[]:['SCOPE_NOT_EXISTING_OWN_FORCE_ADMISSION']),...(e.operation.status==='VERIFIED_EXISTING_MAPPING'||e.operation.status==='EXISTING_ADMISSION'?[]:[e.operation.reason??e.operation.status])]).concat(owners.length===1?[]:['SHARED_OWNER_RUNTIME_AVAILABILITY_UNCHANGED'],skill.row.is_background_skill?['BACKGROUND_RUNTIME_AVAILABILITY_NOT_OBSERVED']:[],levels.some(l=>l.row.level>1)?['MULTI_RANK_SEMANTICS_UNKNOWN']:[]));
  return {key,name:g.one('Loc','key',`character_skills_localised_name_${key}`).row.text,ownerKeys:unique(owners.map(o=>o.key)),owners,sourceRanks:unique(levels.map(l=>l.row.level)),isBackgroundSkill:skill.row.is_background_skill,
   selectors:unique(effects.flatMap(e=>e.routes.map(r=>r.selectorKey).filter(Boolean))),effects,blockers,admission:key==='wh_dlc07_skill_brt_fay_battle_blessed_water'?'EXISTING_UNCHANGED':'NOT_ADMITTED'};
 });
 const infantry=bySet.get('infantry_units'),explicit=bySet.get('dlc07_brt_inf_battle_pilgrims'),infKeys=new Set(infantry.exactMembers.map(m=>m.mainKey));
 g.covered(routeTable,'unit_set','infantry_units');
 const reused=g.rows(routeTable,'unit_set','infantry_units').map(r=>({rowId:r.id,raw:r.row,join:g.join(r,'unit_set',g.one('unit_sets_tables','key','infantry_units'),'key'),effectJoin:g.join(r,'effect',g.one('effects_tables','effect',r.row.effect),'effect')}));
 const negatives=selection.negativeMainKeys.map(key=>{const main=g.one('main_units_tables','unit',key),land=g.one('land_units_tables','key',main.row.land_unit);return {mainKey:key,landKey:land.row.key,caste:main.row.caste,landClass:land.row.class,isRenown:main.row.is_renown,infantryMember:infKeys.has(key),production:units.some(u=>u.id===`ca_unit_${key}`),join:g.join(main,'land_unit',land,'key')};});
 const spawnContexts=selection.spawnContextMainKeys.map(key=>{const main=g.one('main_units_tables','unit',key),land=g.one('land_units_tables','key',main.row.land_unit);g.covered('unit_special_abilities_tables','spawned_unit',land.row.key);
  return {mainKey:key,landKey:land.row.key,infantryMember:infKeys.has(key),production:units.some(u=>u.id===`ca_unit_${key}`),runtimeApplicability:'NOT_OBSERVED',abilities:g.rows('unit_special_abilities_tables','spawned_unit',land.row.key).map(a=>({rowId:a.id,abilityKey:a.row.key,spawnType:a.row.spawn_type,transformation:a.row.spawn_is_transformation,decoy:a.row.spawn_is_decoy,join:g.join(a,'spawned_unit',land,'key')}))};});
 const report={format:'wh3-skill-class-selector-research-v1',snapshotId:pins.snapshotId,finalVerdict:'B',
  conclusion:'Simple positive unit-set branches using exact main caste, land class and explicit main records can be statically materialized. Mixed-field, exclusion, experience/special-category and engine applicability semantics are not generalized.',
  counts:{skills:skills.length,classOrCasteSkills:skills.filter(s=>s.key!==explicitControl).length,selectors:memberships.length,sourceRows:source.rows.length},skills,
  selectors:memberships.map(m=>({key:m.key,taxonomy:m.taxonomy,status:m.status,branchKinds:m.branchKinds,branches:m.branches.length,mainMembers:m.exactMembers.length,landMembers:unique(m.exactMembers.map(x=>x.landKey)).length,
   productionUnitIds:m.productionMembers.flatMap(x=>x.productionUnitIds),omittedNonProduction:m.omittedNonProduction.length,renownMembers:m.exactMembers.filter(x=>x.isRenown).length,landWithoutMain:m.landWithoutMain.length,navalOmissions:m.navalOmissions.length,ambiguous:m.ambiguous,unionCollisions:m.unionCollisions.length,mainLandAliases:m.mainLandAliases.length,membershipRef:`membership.json#${m.key}`})),
  primarySelectorReuse:reused,explicitComparison:{classDerived:'infantry_units',explicit:'dlc07_brt_inf_battle_pilgrims',sharedMainKeys:explicit.exactMembers.filter(m=>infKeys.has(m.mainKey)).map(m=>m.mainKey),explicitOnly:explicit.exactMembers.filter(m=>!infKeys.has(m.mainKey)).map(m=>m.mainKey),identicalWholeSet:false,
   conclusion:'Shared exact main/land identities, including independently sourced RoR; explicit set is a subset, not an equivalent complete selector.'},negativeCases:negatives,spawnContexts,
  newAdmissions:[],modelChanged:false,schemaChanged:false,peoplesHeroSelectorBlocker:'RESOLVED_STATIC_MAIN_CASTE_UNION',peoplesHeroRemainingBlockers:skills[0].blockers,
  runtime:{gameExecution:'NOT_OBSERVED',membership:'STATIC_SOURCE_PROVED',additionalFilterEvidence:'NONE_IN_TRACED_SELECTOR_ROWS',effectApplicability:'SCOPE_OWNER_OPERATION_AND_RUNTIME_CONTEXT_ARE_SEPARATE',summonTemporaryApplicability:'NOT_OBSERVED'},
  unknown:['multi-rank','shared owner runtime availability/unlock','character self scope','vigour','replenishment','resistance operation','mount unlock','other non-unit stats','flat AP operation not previously reviewed','combined/exclusion/dynamic selector semantics','engine filtering outside traced static rows'],
  preservation:{production:101,sample:5,hp:13,speed:81,researchTechnologies:10,researchEffects:15,researchCandidates:96,admittedSkills:3}};
 return {report,membership:{format:'wh3-skill-selector-membership-v1',snapshotId:pins.snapshotId,sourceSha256:null,selectors:memberships}};
}
const explicitControl='wh_dlc07_skill_brt_fay_battle_blessed_water';
export function replay(bytes,unitsBytes,selection,manifest){
 assert.equal(sha256(bytes),manifest.sourceSha256,'Source hash drift');assert.equal(sha256(unitsBytes),pins.unitsSha256,'Production identity drift');
 const source=JSON.parse(bytes);assert.equal(source.originalExtraction.sha256,manifest.originalExtractionSha256);assert.equal(sha256(JSON.stringify(source.schemas)),manifest.processedSchemasSha256);
 const result=research(source,JSON.parse(unitsBytes),selection);result.membership.sourceSha256=manifest.sourceSha256;return result;
}
