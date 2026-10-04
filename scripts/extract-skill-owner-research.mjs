import fs from 'node:fs';
import {openRawSource,resolveOptions} from '../tools/wh3-importer/extract.mjs';
import {inspectTables} from '../tools/wh3-importer/inspect.mjs';
const selection=JSON.parse(fs.readFileSync(new URL('../tools/wh3-importer/skill-owner-research/selection.json',import.meta.url)));
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
 const ownerTreeSets=await q('character_skill_node_sets_tables','agent_subtype_key',unique(subtypes.map(x=>x.key)));
 await q('agents_tables','key',unique(sets.map(x=>x.agent_key).filter(Boolean)));
 await q('agent_recruitment_categories_tables','key',unique(subtypes.map(x=>x.recruitment_category).filter(Boolean)));
 const ownerMain=await q('main_units_tables','unit',unique(subtypes.map(x=>x.associated_unit_override).filter(Boolean)));
 const ownerLand=await q('land_units_tables','key',unique(ownerMain.map(x=>x.land_unit)));
 await q('campaign_to_agent_subtypes_tables','agent_subtype',unique(subtypes.map(x=>x.key)));
 const permissions=await q('faction_agent_permitted_subtypes_tables','subtype',unique(subtypes.map(x=>x.key)));
 const overrides=await q('agent_subtype_subculture_overrides_tables','subtype',unique(subtypes.map(x=>x.key)));
 const content=await q('agent_subtype_ownership_content_pack_junctions_tables','agent_subtype',unique(subtypes.map(x=>x.key)));
 await q('ownership_content_packs_tables','key',unique(content.map(x=>x.ownership_content_pack)));
 const factions=await q('factions_tables','key',unique([...permissions.map(x=>x.faction),...nodes.map(x=>x.faction_key),...sets.map(x=>x.faction_key)].filter(Boolean)));
 const cultures=await q('cultures_subcultures_tables','subculture',unique([...factions.map(x=>x.subculture),...overrides.map(x=>x.subculture),...nodes.map(x=>x.subculture),...sets.map(x=>x.subculture)].filter(Boolean)));
 await q('cultures_tables','key',unique(cultures.map(x=>x.culture)));
 // Only ancestors/locks of the six selected skills, with an explicit closure limit.
 const selectedNodeKeys=unique(nodes.map(n=>n.key)),seen=new Set();let frontier=selectedNodeKeys,prerequisiteLinks=[],locks=[],ancillaryLocks=[];
 while(frontier.length){
  const current=frontier;frontier=[];
  for(const key of current){
   if(seen.has(key))continue;seen.add(key);if(seen.size>200)throw new Error('Owner prerequisite closure exceeds 200 nodes; narrow selection.');
   const incoming=await q('character_skill_node_links_tables','child_key',key,'eq');prerequisiteLinks.push(...incoming);
   locks.push(...await q('character_skill_nodes_skill_locks_tables','character_skill_node',key,'eq'));
   ancillaryLocks.push(...await q('character_skill_node_ancillary_locks_tables','character_skill_node',key,'eq'));
   const parents=unique(incoming.map(x=>x.parent_key));
   if(parents.length){await q('character_skill_nodes_tables','key',parents);await q('character_skill_node_set_items_tables','item',parents);frontier.push(...parents.filter(k=>!seen.has(k)));}
  }
 }
 const dependencyNodes=(await inspectTables(s.reader,s.schema,queries,1000)).rows.filter(r=>r.table==='character_skill_nodes_tables').map(r=>r.row);
 await q('character_skills_tables','key',unique([...dependencyNodes.map(x=>x.character_skill_key),...locks.map(x=>x.character_skill)]));
 await q('character_skill_node_link_types_tables','link_type',unique(prerequisiteLinks.map(x=>x.link_type)));
 await q('ancillaries_tables','key',unique(ancillaryLocks.map(x=>x.ancillary_lock)));
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
 // Compare equal display names only as a discovery arm, never as identity.
 const namePath='Loc:text/db/character_skills__.loc';
 const names=(await q(namePath,'key',skillKeys.map(k=>`character_skills_localised_name_${k}`))).map(x=>x.text);
 const sameNames=await q(namePath,'text',unique(names));
 const namedSkillKeys=unique(sameNames.filter(x=>x.key.startsWith('character_skills_localised_name_')).map(x=>x.key.slice('character_skills_localised_name_'.length)));
 const sameNameNodes=await q('character_skill_nodes_tables','character_skill_key',namedSkillKeys);
 await q('character_skills_tables','key',namedSkillKeys);
 const result=await inspectTables(s.reader,s.schema,queries,1000);
 // Metadata inventory only: all versions of the skill/bundle families, no unbounded DB row dump.
 const schemaInventory=Object.entries(s.schema.definitions).filter(([table])=>/^(character_skill|effect_bundle)/.test(table))
  .map(([table,definitions])=>({table,presentInPack:present.has(table),definitions:definitions.map(({version,fields})=>({version,fields:fields.map(({name,is_key,is_reference,description,ca_order})=>({name,is_key,is_reference,description,ca_order}))}))}));
 const raw={format:'wh3-skill-owner-extraction-v1',skillKeys,selectedNodeKeys,ancestorNodeKeys:unique([...seen]),ownerTreeSetKeys:unique(ownerTreeSets.map(x=>x.key)),sameNameSkillKeys:namedSkillKeys,sameNameNodeKeys:unique(sameNameNodes.map(x=>x.key)),extractedAt:new Date().toISOString(),provenance:s.metadata,relationTables,schemaInventory,...result};
 fs.mkdirSync('generated/wh3/skill-owner-research',{recursive:true});
 fs.writeFileSync('generated/wh3/skill-owner-research/raw.json',JSON.stringify(raw,null,2)+'\n');
 console.log(JSON.stringify({skills:skillKeys.length,rows:result.rows.length,ownerSets:sets,levels,relations:result.rows.filter(r=>relationTables.includes(r.table)).map(r=>({table:r.table,row:r.row}))},null,2));
}finally{await s.client.close();}
