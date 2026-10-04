import fs from 'node:fs';
import {openRawSource,resolveOptions} from '../tools/wh3-importer/extract.mjs';
import {inspectTables} from '../tools/wh3-importer/inspect.mjs';
const selection=JSON.parse(fs.readFileSync(new URL('../tools/wh3-importer/skill-batch-01/selection.json',import.meta.url)));
const skillKeys=selection.skills.map(s=>s.key),queries=[],s=await openRawSource(await resolveOptions());
const unique=xs=>[...new Set(xs)].sort();
const q=async(table,field,value,op='oneOf')=>{
 const query={table,where:[{field,op,value}]};queries.push(query);
 return (await inspectTables(s.reader,s.schema,[query],1000)).rows.map(r=>r.row);
};
try{
 await q('character_skills_tables','key',skillKeys);
 let nodes=[],levels=[];
 for(const key of skillKeys){
  nodes.push(...await q('character_skill_nodes_tables','character_skill_key',key,'eq'));
  levels.push(...await q('character_skill_level_to_effects_junctions_tables','character_skill_key',key,'eq'));
  for(const [table,field] of [['character_skill_level_details_tables','skill_key'],['character_skill_level_to_ancillaries_junctions_tables','skill'],['character_skill_level_to_dilemmas_junctions_tables','character_skill_key'],['character_skills_to_level_reached_criterias_tables','character_skill']])await q(table,field,key,'eq');
 }
 const items=await q('character_skill_node_set_items_tables','item',unique(nodes.map(n=>n.key)));
 const sets=await q('character_skill_node_sets_tables','key',unique(items.map(i=>i.set)));
 const subtypes=await q('agent_subtypes_tables','key',unique(sets.map(x=>x.agent_subtype_key).filter(Boolean)));
 await q('agents_tables','key',unique(sets.map(x=>x.agent_key).filter(Boolean)));
 await q('agent_recruitment_categories_tables','key',unique(subtypes.map(x=>x.recruitment_category).filter(Boolean)));
 const ownerMain=await q('main_units_tables','unit',unique(subtypes.map(x=>x.associated_unit_override).filter(Boolean)));
 const ownerLand=await q('land_units_tables','key',unique(ownerMain.map(x=>x.land_unit)));
 await q('campaign_to_agent_subtypes_tables','agent_subtype',unique(subtypes.map(x=>x.key)));
 const effects=unique(levels.map(x=>x.effect_key));
 await q('effects_tables','effect',effects);
 await q('campaign_effect_scopes_tables','key',unique(levels.map(x=>x.effect_scope)));
 const present=new Set(s.reader.packs.flatMap(p=>p.files.filter(f=>f.file_type==='DB').map(f=>f.path.split('/')[1])));
 const relationTables=Object.keys(s.schema.definitions).filter(t=>t.startsWith('effect_bonus_value_')&&present.has(t)&&s.schema.definitions[t].some(d=>d.fields.some(f=>f.name==='effect'&&JSON.stringify(f.is_reference)===JSON.stringify(['effects','effect'])))).sort();
 let links=[];
 for(const table of relationTables)links.push(...await q(table,'effect',effects));
 for(const key of unique(links.map(x=>x.unit_set).filter(Boolean))){
  await q('unit_sets_tables','key',key,'eq');
  const members=await q('unit_set_to_unit_junctions_tables','unit_set',key,'eq');
  const main=await q('main_units_tables','unit',unique(members.map(x=>x.unit_record).filter(Boolean)));
  await q('land_units_tables','key',unique(main.map(x=>x.land_unit)));
 }
 const original=s.reader.tables.bind(s.reader);
 s.reader.tables=async name=>name.startsWith('Loc:')?[await s.reader.decode(s.local,name.slice(4))]:original(name);
 for(const [table,field,keys] of [['character_skills','localised_name',skillKeys],['character_skills','localised_description',skillKeys],['effects','description',effects],['land_units','onscreen_name',ownerLand.map(x=>x.key)]]){
  const path=`Loc:text/db/${table}__.loc`,decoded=(await s.reader.tables(path))[0];
  s.schema.definitions[path]=[{version:decoded.tableVersion,fields:decoded.fields}];
  await q(path,'key',keys.map(k=>`${table}_${field}_${k}`));
 }
 const result=await inspectTables(s.reader,s.schema,queries,1000);
 const raw={format:'wh3-skill-batch-extraction-v1',skillKeys,extractedAt:new Date().toISOString(),provenance:s.metadata,relationTables,...result};
 fs.mkdirSync('generated/wh3/skill-batch-01',{recursive:true});
 fs.writeFileSync('generated/wh3/skill-batch-01/raw.json',JSON.stringify(raw,null,2)+'\n');
 console.log(JSON.stringify({skills:skillKeys.length,rows:result.rows.length,ownerSets:sets,levels,relations:result.rows.filter(r=>relationTables.includes(r.table)).map(r=>({table:r.table,row:r.row}))},null,2));
}finally{await s.client.close();}
