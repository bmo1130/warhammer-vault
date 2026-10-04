import fs from 'node:fs';
import assert from 'node:assert/strict';
import {openRawSource,resolveOptions} from '../tools/wh3-importer/extract.mjs';
import {inspectTables} from '../tools/wh3-importer/inspect.mjs';
import {resolveReferenceTable} from '../tools/wh3-importer/trace-unit.mjs';
const selection=JSON.parse(fs.readFileSync(new URL('../tools/wh3-importer/skill-class-selector-research/selection.json',import.meta.url)));
const s=await openRawSource(await resolveOptions()),rows=new Map(),schemas=new Map(),coverage=[];
const unique=xs=>[...new Set(xs)].sort();
// Each inspector call remains bounded. A large exact inverse class query is
// partitioned by its actual primary keys; its complete parent coverage is kept.
async function q(table,field,value,op='oneOf'){
 const query={table,where:[{field,op,value}]},tables=await s.reader.tables(table);
 const matches=tables.flatMap(t=>t.rows.filter(r=>op==='eq'?r[field]===value:value.includes(r[field])));
 const queries=matches.length<=1000?[query]:(()=>{
  const key=table==='main_units_tables'?'unit':'key',keys=unique(matches.map(r=>r[key]));
  assert(keys.every(Boolean));return Array.from({length:Math.ceil(keys.length/500)},(_,i)=>({table,where:[{field:key,op:'oneOf',value:keys.slice(i*500,i*500+500)}]}));
 })();
 for(const queryPart of queries){const result=await inspectTables(s.reader,s.schema,[queryPart],1000);
  for(const r of result.rows)rows.set(r.id,r);for(const d of result.schemas)schemas.set(`${d.table}:${d.version}`,d);coverage.push(...result.coverage);
 }
 if(matches.length>1000)coverage.push({query,matchedRows:matches.length,tableFiles:tables.length,partitionedByExactPrimaryKey:true});
 assert(rows.size<=12000,'Selected selector closure exceeded 12000 rows');return matches;
}
try{
 const skillKeys=selection.skills.map(x=>x.key);await q('character_skills_tables','key',skillKeys);
 const nodes=[],levels=[];
 for(const key of skillKeys){nodes.push(...await q('character_skill_nodes_tables','character_skill_key',key,'eq'));levels.push(...await q('character_skill_level_to_effects_junctions_tables','character_skill_key',key,'eq'));
  await q('character_skill_level_details_tables','skill_key',key,'eq');}
 const items=await q('character_skill_node_set_items_tables','item',unique(nodes.map(n=>n.key)));
 const sets=await q('character_skill_node_sets_tables','key',unique(items.map(i=>i.set)));
 const subtypes=await q('agent_subtypes_tables','key',unique(sets.map(x=>x.agent_subtype_key).filter(Boolean)));
 await q('agents_tables','key',unique(sets.map(x=>x.agent_key).filter(Boolean)));
 await q('main_units_tables','unit',unique(subtypes.map(x=>x.associated_unit_override).filter(Boolean)));
 const effectKeys=unique(levels.map(x=>x.effect_key));await q('effects_tables','effect',effectKeys);
 await q('campaign_effect_scopes_tables','key',unique(levels.map(x=>x.effect_scope)));
 const present=new Set(s.reader.packs.flatMap(p=>p.files.filter(f=>f.file_type==='DB').map(f=>f.path.split('/')[1])));
 const relationTables=Object.keys(s.schema.definitions).filter(t=>t.startsWith('effect_bonus_value_')&&present.has(t)&&s.schema.definitions[t].some(d=>d.fields.some(f=>f.name==='effect'&&JSON.stringify(f.is_reference)===JSON.stringify(['effects','effect'])))).sort();
 const links=[];for(const table of relationTables)links.push(...await q(table,'effect',effectKeys));
 const selectorKeys=unique([...links.map(x=>x.unit_set).filter(Boolean),...selection.comparisonSets]);
 const membership=[];for(const key of selectorKeys){await q('unit_sets_tables','key',key,'eq');membership.push(...await q('unit_set_to_unit_junctions_tables','unit_set',key,'eq'));}
 const classes=unique(membership.map(m=>m.unit_class).filter(Boolean)),castes=unique(membership.map(m=>m.unit_caste).filter(Boolean)),categories=unique(membership.map(m=>m.unit_category).filter(Boolean));
 for(const c of classes){await q('unit_class_tables','key',c,'eq');const land=await q('land_units_tables','class',c,'eq');await q('main_units_tables','land_unit',unique(land.map(l=>l.key)));await q('naval_units_tables','class',c,'eq');}
 for(const c of castes){await q('unit_castes_tables','caste',c,'eq');await q('main_units_tables','caste',c,'eq');}
 for(const c of categories){await q('unit_category_tables','key',c,'eq');const land=await q('land_units_tables','category',c,'eq');await q('main_units_tables','land_unit',unique(land.map(l=>l.key)));}
 const units=JSON.parse(fs.readFileSync('src/data/units.json')).filter(u=>u.gameVersion!=='sample');
 await q('main_units_tables','unit',unique([...membership.map(m=>m.unit_record).filter(Boolean),...selection.negativeMainKeys,...units.map(u=>u.id.replace(/^ca_unit_/,''))]));
 const allMain=[...rows.values()].filter(r=>r.table==='main_units_tables');await q('land_units_tables','key',unique(allMain.map(r=>r.row.land_unit).filter(Boolean)));
 const spawnLandKeys=allMain.filter(m=>selection.spawnContextMainKeys.includes(m.row.unit)).map(m=>m.row.land_unit);
 await q('unit_special_abilities_tables','spawned_unit',unique(spawnLandKeys));
 // Preserve complete reverse reuse for the primary set, not only Bretonnia.
 await q('effect_bonus_value_ids_unit_sets_tables','unit_set','infantry_units','eq');
 const reuse=[...rows.values()].filter(r=>r.table==='effect_bonus_value_ids_unit_sets_tables'&&r.row.unit_set==='infantry_units');
 await q('effects_tables','effect',unique(reuse.map(r=>r.row.effect)));
 const bonuses=unique(links.map(x=>x.bonus_value_id).filter(Boolean));
 const bonusTable=resolveReferenceTable('campaign_bonus_value_ids_unit_sets',s.schema);
 if(bonusTable)await q(bonusTable,'key',bonuses);
 const original=s.reader.tables.bind(s.reader);
 s.reader.tables=async name=>name.startsWith('Loc:')?[await s.reader.decode(s.local,name.slice(4))]:original(name);
 for(const [table,field,keys] of [['character_skills','localised_name',skillKeys],['effects','description',unique([...effectKeys,...reuse.map(r=>r.row.effect)])]]){
  const path=`Loc:text/db/${table}__.loc`,decoded=(await s.reader.tables(path))[0];s.schema.definitions[path]=[{version:decoded.tableVersion,fields:decoded.fields}];await q(path,'key',keys.map(k=>`${table}_${field}_${k}`));
 }
 const allRows=[...rows.values()],relationships=[],index=new Map();
 for(const r of allRows)for(const [field,value] of Object.entries(r.row)){const k=JSON.stringify([r.table,field,value]);if(!index.has(k))index.set(k,[]);index.get(k).push(r);}
 for(const from of allRows){const d=schemas.get(`${from.table}:${from.tableVersion}`);
  for(const f of d.fields.filter(f=>f.is_reference)){const table=resolveReferenceTable(f.is_reference[0],s.schema);
   for(const to of index.get(JSON.stringify([table,f.is_reference[1],from.row[f.name]]))??[])relationships.push({from:from.id,field:f.name,to:to.id,targetField:f.is_reference[1],value:from.row[f.name],evidence:'RPFM processed schema is_reference'});}
  if(Object.keys(from.key).length===1)for(const f of d.localisedFields){const value=`${from.table.replace(/_tables$/,'')}_${f.name}_${Object.values(from.key)[0]}`;
   for(const to of index.get(JSON.stringify(['Loc','key',value]))??[])relationships.push({from:from.id,field:f.name,to:to.id,targetField:'key',value,evidence:'RPFM schema localised_fields + verified single-key Loc convention'});}
 }
 const identityReferenceInventory=Object.entries(s.schema.definitions).flatMap(([table,ds])=>ds.map(d=>({table,version:d.version,presentInPack:present.has(table),fields:d.fields.filter(f=>['unit_class','unit_castes','unit_category','unit_sets'].includes(f.is_reference?.[0])).map(({name,is_reference,description})=>({name,is_reference,description}))}))).filter(x=>x.fields.length);
 const raw={format:'wh3-skill-class-selector-extraction-v1',skillKeys,selectorKeys,extractedAt:new Date().toISOString(),provenance:s.metadata,relationTables,identityReferenceInventory,bonusReference:{name:'campaign_bonus_value_ids_unit_sets',schemaTable:bonusTable??null,keys:bonuses},schemas:[...schemas.values()],rows:allRows,relationships,coverage};
 fs.mkdirSync('generated/wh3/skill-class-selector-research',{recursive:true});fs.writeFileSync('generated/wh3/skill-class-selector-research/raw.json',JSON.stringify(raw,null,2)+'\n');
 console.log(JSON.stringify({skills:skillKeys.length,selectorKeys,rows:rows.size,classes,castes,navalRows:allRows.filter(r=>r.table==='naval_units_tables').length,sourceBytes:JSON.stringify(raw).length}));
}finally{await s.client.close();}
