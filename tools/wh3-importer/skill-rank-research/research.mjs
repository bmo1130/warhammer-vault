import assert from 'node:assert/strict';
import {sha256} from '../research-classifier/classify.mjs';
import {pins} from '../research-classifier/policy.mjs';
import {sourceGraph,compare,sortRows} from '../research-scan-bretonnia/source.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';

export const serialize=value=>JSON.stringify(value,null,2)+'\n';
export const keys=[
 'wh2_dlc11_skill_brt_army_buff_low_born_militia',
 'wh2_dlc11_skill_brt_army_buff_proficiency_of_peasants',
 'wh2_dlc11_skill_brt_army_buff_worshippers_of_the_grail',
 'wh2_dlc11_skill_emp_army_buff_emperors_finest'
];
const unique=xs=>[...new Set(xs)].sort(compare);
const levelTable='character_skill_level_to_effects_junctions_tables';

// Same row/schema/reference source representation as the existing Skill batches.
// Keep schema descriptions and CA column order here for the semantic audit.
export function projectExtraction(bytes){
 const raw=JSON.parse(bytes);assert.equal(raw.format,'wh3-skill-rank-extraction-v1');assert.deepEqual(raw.skillKeys,keys);
 assert.equal(digest(snapshotIdentity(raw.provenance)),pins.snapshotId,'Snapshot drift');
 return {format:'wh3-skill-rank-source-v1',skillKeys:keys,
  originalExtraction:{path:'generated/wh3/skill-rank-research/raw.json',sha256:sha256(bytes),extractedAt:raw.extractedAt},
  provenance:raw.provenance,relationTables:unique(raw.relationTables),schemaInventory:raw.schemaInventory,
  schemas:raw.schemas.map(s=>({table:s.table,version:s.version,
   fields:s.fields.map(({name,field_type,is_key,is_reference,description,ca_order})=>({name,field_type,is_key,is_reference,description,ca_order})),
   localisedFields:s.localisedFields.map(f=>f.name)})).sort((a,b)=>compare(`${a.table}:${a.version}`,`${b.table}:${b.version}`)),
  rows:sortRows(raw.rows),relationships:[...raw.relationships].sort((a,b)=>compare(JSON.stringify(a),JSON.stringify(b))),
  coverage:[...raw.coverage].sort((a,b)=>compare(JSON.stringify(a.query),JSON.stringify(b.query)))};
}

export function verifySource(bytes,manifest){
 assert.equal(sha256(bytes),manifest.sourceSha256,'Source hash drift');
 const source=JSON.parse(bytes);assert.equal(source.format,'wh3-skill-rank-source-v1');assert.deepEqual(source.skillKeys,keys);
 assert.equal(source.originalExtraction.sha256,manifest.originalExtractionSha256,'Original extraction drift');
 assert.equal(digest(snapshotIdentity(source.provenance)),pins.snapshotId,'Snapshot drift');
 assert.equal(manifest.snapshotId,pins.snapshotId);
 for(const key of ['gameVersion','schemaSha256','rpfmVersion','schemaFormatVersion'])assert.equal(source.provenance[key],pins[key]);
 assert.equal(sha256(JSON.stringify(source.schemas)),manifest.processedSchemasSha256,'Processed schema drift');
 const g=sourceGraph(source),ids=new Map();
 for(const row of source.rows){
  assert(!ids.has(row.id),'Duplicate row ID');ids.set(row.id,row);
  assert.equal(row.id,`${row.table}:${sha256(JSON.stringify([row.sourcePack,row.path,row.key,row.row])).slice(0,20)}`,'Conflicting row payload');
  assert.equal(row.sourcePack,row.table==='Loc'?'local_en.pack':'db.pack');
  assert.equal(source.provenance.packs.find(p=>p.file_name===row.sourcePack)?.file_path,row.sourcePackPath);
  assert.deepEqual(Object.keys(row.key),g.definition(row).fields.filter(f=>f.is_key).map(f=>f.name));
  for(const [k,v] of Object.entries(row.key))assert.equal(row.row[k],v,'Composite key mismatch');
 }
 for(const c of source.coverage){
  const loc=c.query.table.startsWith('Loc:');
  const found=g.rows(loc?'Loc':c.query.table).filter(r=>(!loc||r.path===c.query.table.slice(4))&&c.query.where.every(q=>q.op==='eq'?r.row[q.field]===q.value:q.op==='oneOf'&&q.value.includes(r.row[q.field])));
  assert.equal(found.length,c.matchedRows,'Query coverage drift');assert(c.tableFiles>0,'Missing source table');
 }
 for(const relation of source.relationships){
  const from=ids.get(relation.from),to=ids.get(relation.to);assert(from&&to,'Missing referenced row');
  if(to.table==='Loc'){
   assert(g.definition(from).localisedFields.includes(relation.field));
   assert.equal(relation.value,`${from.table.replace(/_tables$/,'')}_${relation.field}_${Object.values(from.key)[0]}`);
   assert.equal(to.row.key,relation.value);
  }else g.join(from,relation.field,to,relation.targetField);
 }
 return source;
}

// This report deliberately has no rank-effect arithmetic or admission output.
export function research(source){
 const g=sourceGraph(source);
 const loc=(table,field,key)=>g.one('Loc','key',`${table}_${field}_${key}`);
 const unitSets=g.rows('unit_sets_tables').map(set=>{
  const members=g.rows('unit_set_to_unit_junctions_tables','unit_set',set.row.key);
  g.covered('unit_set_to_unit_junctions_tables','unit_set',set.row.key,members.length);
  return {key:set.row.key,rowId:set.id,definition:set.row,members:sortRows(members).map(member=>{
   const main=g.one('main_units_tables','unit',member.row.unit_record),land=g.one('land_units_tables','key',main.row.land_unit);
   return {rowId:member.id,mainKey:main.row.unit,landKey:land.row.key,selector:member.row,
    joins:[g.join(member,'unit_set',set,'key'),g.join(member,'unit_record',main,'unit'),g.join(main,'land_unit',land,'key')]};
  })};
 });
 const effects=g.rows('effects_tables').map(effect=>{
  for(const table of source.relationTables)assert(source.coverage.some(c=>c.query.table===table&&c.query.where[0].field==='effect'&&c.query.where[0].op==='oneOf'&&c.query.where[0].value.includes(effect.row.effect)),'Incomplete typed effect discovery');
  const relations=source.rows.filter(r=>source.relationTables.includes(r.table)&&r.row.effect===effect.row.effect);
  return {key:effect.row.effect,rowId:effect.id,localisation:loc('effects','description',effect.row.effect).row.text,
   displayPriority:effect.row.priority,category:effect.row.category,
   routes:relations.map(r=>({rowId:r.id,table:r.table,raw:r.row,join:g.join(r,'effect',effect,'effect'),
    ...(r.row.unit_set?{targetJoin:g.join(r,'unit_set',g.one('unit_sets_tables','key',r.row.unit_set),'key')}:{})}))};
 });
 const skills=keys.map(key=>{
  const skill=g.one('character_skills_tables','key',key),levels=g.rows(levelTable,'character_skill_key',key);
  g.covered(levelTable,'character_skill_key',key,levels.length);
  const nodes=g.rows('character_skill_nodes_tables','character_skill_key',key);
  g.covered('character_skill_nodes_tables','character_skill_key',key,nodes.length);
  const ownerChains=nodes.flatMap(node=>g.rows('character_skill_node_set_items_tables','item',node.row.key).map(item=>{
   const set=g.one('character_skill_node_sets_tables','key',item.row.set),owner=g.one('agent_subtypes_tables','key',set.row.agent_subtype_key);
   return {ownerKey:owner.row.key,nodeKey:node.row.key,nodeSetKey:set.row.key,enabled:!item.row.mod_disabled&&node.row.visible_in_ui,
    selectors:{set:{campaign:set.row.campaign_key,faction:set.row.faction_key,subculture:set.row.subculture},node:{campaign:node.row.campaign_key,faction:node.row.faction_key,subculture:node.row.subculture}},
    joins:[g.join(node,'character_skill_key',skill,'key'),g.join(item,'item',node,'key'),g.join(item,'set',set,'key'),g.join(set,'agent_subtype_key',owner,'key')]};
  }));
  const ranks=unique(levels.map(r=>r.row.level)).map(level=>({level,rows:sortRows(levels.filter(r=>r.row.level===level)).map(r=>{
   const effect=g.one('effects_tables','effect',r.row.effect_key),scope=g.one('campaign_effect_scopes_tables','key',r.row.effect_scope);
   assert(Number.isFinite(r.row.value));
   return {rowId:r.id,effectKey:effect.row.effect,rawValue:r.row.value,scope:scope.row,
    joins:[g.join(r,'character_skill_key',skill,'key'),g.join(r,'effect_key',effect,'effect'),g.join(r,'effect_scope',scope,'key')]};
  })}));
  assert.deepEqual(ranks.map(r=>r.level),[1,2,3]);
  const levelDetails=g.rows('character_skill_level_details_tables','skill_key',key);
  g.covered('character_skill_level_details_tables','skill_key',key,levelDetails.length);
  const otherRankRoutes=['character_skill_level_to_ancillaries_junctions_tables','character_skill_level_to_dilemmas_junctions_tables','character_skills_to_level_reached_criterias_tables'].map(table=>{
   const field=table.includes('ancillaries')?'skill':table.includes('criterias')?'character_skill':'character_skill_key';
   const rows=g.rows(table,field,key);g.covered(table,field,key,rows.length);return {table,rowIds:rows.map(r=>r.id)};
  });
  return {key,name:loc('character_skills','localised_name',key).row.text,skillRowId:skill.id,
   ownerKeys:unique(ownerChains.map(o=>o.ownerKey)),ownerChains,maxObservedEffectLevel:3,ranks,
   reusedEffects:unique(levels.map(r=>r.row.effect_key)).map(effectKey=>({effectKey,levels:unique(levels.filter(r=>r.row.effect_key===effectKey).map(r=>r.row.level))})),
   levelDetailRowIds:levelDetails.map(r=>r.id),otherRankRoutes,rankSemantics:'UNKNOWN',admission:'NOT_ADMITTED'};
 });
 const schema=source.schemas.find(s=>s.table===levelTable);
 assert.deepEqual(schema.fields.filter(f=>f.is_key).map(f=>f.name),['character_skill_key','effect_key','level']);
 const bundleRows=g.rows('effect_bundles_to_effects_junctions_tables');
 assert.equal(bundleRows.length,0,'New bundle evidence requires separate review');
 assert(source.coverage.some(c=>c.query.table==='effect_bundles_to_effects_junctions_tables'&&c.matchedRows===0&&c.query.where[0].value.length===effects.length));
 return {format:'wh3-skill-rank-research-v1',sourceSnapshotId:pins.snapshotId,
  semantics:'UNKNOWN',finalVerdict:'D',admittedSkills:[],skills,effects,unitSets,
  structure:{levelTable,compositeKey:schema.fields.filter(f=>f.is_key).map(f=>f.name),fields:schema.fields.map(f=>f.name),
   directSkillToBundleReference:false,selectedEffectsBundleJunctionCount:bundleRows.length,
   effectPriorityDescription:source.schemas.find(s=>s.table==='effects_tables').fields.find(f=>f.name==='priority').description,
   evidenceLimit:'Independent level rows and repeated effect keys do not specify which rows the engine activates at a learned rank. Schema column/display order is not execution precedence.'},
  runtime:{status:'NOT_OBSERVED',observations:[0,1,2,3].map(rank=>({rank,leadership:null,meleeDefence:null,status:'NOT_OBSERVED'})),
   existingProbeCanReadRequiredStats:false,tooltipRankMeaning:'UNKNOWN'}};
}

export function replay(sourceBytes,manifest){return research(verifySource(sourceBytes,manifest));}
