import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openRawSource,resolveOptions} from '../tools/wh3-importer/extract.mjs';
import {resolveReferenceTable} from '../tools/wh3-importer/trace-unit.mjs';
const selection=JSON.parse(fs.readFileSync(new URL('../tools/wh3-importer/skill-production-bretonnia/selection.json',import.meta.url)));
const s=await openRawSource(await resolveOptions()),records=new Map(),schemas=new Map(),coverage=[];
const unique=xs=>[...new Set(xs)].sort(),hash=x=>createHash('sha256').update(x).digest('hex');
// Bounded named-field inverse queries over actual RPFM decoded CA tables.
async function q(table,field,value,op='oneOf'){
 assert(s.schema.definitions[table],`Missing schema ${table}`);const tables=await s.reader.tables(table),found=[];
 for(const t of tables){assert(t.fields.some(f=>f.name===field));const definition=s.schema.definitions[table].find(d=>d.version===t.tableVersion);
  schemas.set(`${t.table}:${t.tableVersion}`,{table:t.table,version:t.tableVersion,fields:t.fields,localisedFields:definition?.localised_fields??[]});
  for(const row of t.rows.filter(r=>op==='eq'?r[field]===value:value.includes(r[field]))){
   const key=Object.fromEntries(t.fields.filter(f=>f.is_key).map(f=>[f.name,row[f.name]])),id=`${t.table}:${hash(JSON.stringify([t.sourcePack,t.path,key,row])).slice(0,20)}`;
   records.set(id,{id,table:t.table,key,sourcePack:t.sourcePack,sourcePackPath:t.sourcePackPath,path:t.path,tableVersion:t.tableVersion,row});found.push(row);
  }
 }
 assert(records.size<=selection.maxSourceRows,'Full tree source closure exceeded explicit bound');coverage.push({query:{table,where:[{field,op,value}]},matchedRows:found.length,tableFiles:tables.length});return found;
}
try{
 await q('cultures_tables','key',selection.cultureKey,'eq');
 const subcultures=await q('cultures_subcultures_tables','culture',selection.cultureKey,'eq');
 const factions=await q('factions_tables','subculture',unique(subcultures.map(x=>x.subculture)));
 const permissions=await q('faction_agent_permitted_subtypes_tables','faction',unique(factions.map(x=>x.key)));
 const subtypeKeys=unique(permissions.map(x=>x.subtype)),subtypes=await q('agent_subtypes_tables','key',subtypeKeys);
 const sets=await q('character_skill_node_sets_tables','agent_subtype_key',subtypeKeys);
 // Preserve any affiliation-only sets as a distinct unresolved discovery arm.
 const contextualSets=[...await q('character_skill_node_sets_tables','subculture',unique(subcultures.map(x=>x.subculture))),...await q('character_skill_node_sets_tables','faction_key',unique(factions.map(x=>x.key)))];
 const treeSetKeys=unique(sets.map(x=>x.key)),items=await q('character_skill_node_set_items_tables','set',treeSetKeys);
 const nodes=await q('character_skill_nodes_tables','key',unique(items.map(x=>x.item)));
 const skillKeys=unique(nodes.map(x=>x.character_skill_key));await q('character_skills_tables','key',skillKeys);
 const levels=await q('character_skill_level_to_effects_junctions_tables','character_skill_key',skillKeys);
 for(const [t,f] of [['character_skill_level_details_tables','skill_key'],['character_skill_level_to_ancillaries_junctions_tables','skill'],['character_skill_level_to_dilemmas_junctions_tables','character_skill_key'],['character_skills_to_level_reached_criterias_tables','character_skill']])await q(t,f,skillKeys);
 // Complete direct reverse ownership, including owners outside Bretonnia.
 const reverseNodes=await q('character_skill_nodes_tables','character_skill_key',skillKeys);
 const reverseItems=await q('character_skill_node_set_items_tables','item',unique(reverseNodes.map(x=>x.key)));
 const reverseSets=await q('character_skill_node_sets_tables','key',unique(reverseItems.map(x=>x.set)));
 const ownerSubtypeKeys=unique(reverseSets.map(x=>x.agent_subtype_key).filter(Boolean));
 const ownerSubtypes=await q('agent_subtypes_tables','key',ownerSubtypeKeys);await q('agents_tables','key',unique(reverseSets.map(x=>x.agent_key).filter(Boolean)));
 // Foreign direct tree ownership is preserved, but their faction permission
 // universe is outside this Bretonnia scan and cannot enlarge admission owners.
 const allPermissions=await q('faction_agent_permitted_subtypes_tables','subtype',subtypeKeys);
 await q('agent_subtype_subculture_overrides_tables','subtype',ownerSubtypeKeys);
 await q('agent_subtype_ownership_content_pack_junctions_tables','agent_subtype',ownerSubtypeKeys);
 await q('agent_recruitment_categories_tables','key',unique(ownerSubtypes.map(x=>x.recruitment_category).filter(Boolean)));
 const allFactions=await q('factions_tables','key',unique([...allPermissions.map(x=>x.faction),...reverseSets.map(x=>x.faction_key),...reverseNodes.map(x=>x.faction_key)].filter(Boolean)));
 const allSubs=await q('cultures_subcultures_tables','subculture',unique([...allFactions.map(x=>x.subculture),...reverseSets.map(x=>x.subculture),...reverseNodes.map(x=>x.subculture)].filter(Boolean)));await q('cultures_tables','key',unique(allSubs.map(x=>x.culture)));
 const nodeKeys=unique(nodes.map(x=>x.key));const links=await q('character_skill_node_links_tables','child_key',nodeKeys);
 await q('character_skill_nodes_tables','key',unique(links.map(x=>x.parent_key)));await q('character_skill_node_set_items_tables','item',unique(links.map(x=>x.parent_key)));
 await q('character_skill_node_link_types_tables','link_type',unique(links.map(x=>x.link_type)));
 await q('character_skill_nodes_skill_locks_tables','character_skill_node',nodeKeys);await q('character_skill_node_ancillary_locks_tables','character_skill_node',nodeKeys);
 const effectKeys=unique(levels.map(x=>x.effect_key));await q('effects_tables','effect',effectKeys);await q('campaign_effect_scopes_tables','key',unique(levels.map(x=>x.effect_scope)));
 const present=new Set(s.reader.packs.flatMap(p=>p.files.filter(f=>f.file_type==='DB').map(f=>f.path.split('/')[1])));
 const relationTables=Object.keys(s.schema.definitions).filter(t=>t.startsWith('effect_bonus_value_')&&present.has(t)&&s.schema.definitions[t].some(d=>d.fields.some(f=>f.name==='effect'&&JSON.stringify(f.is_reference)===JSON.stringify(['effects','effect'])))).sort();
 const routes=[];for(const table of relationTables)routes.push(...await q(table,'effect',effectKeys));
 const selectorKeys=unique(routes.map(x=>x.unit_set).filter(Boolean));await q('unit_sets_tables','key',selectorKeys);
 const membership=await q('unit_set_to_unit_junctions_tables','unit_set',selectorKeys);
 const classes=unique(membership.map(x=>x.unit_class).filter(Boolean)),castes=unique(membership.map(x=>x.unit_caste).filter(Boolean));
 await q('unit_class_tables','key',classes);await q('unit_castes_tables','caste',castes);
 for(const caste of castes)await q('main_units_tables','caste',caste,'eq');
 for(const cls of classes){const land=await q('land_units_tables','class',cls,'eq');await q('main_units_tables','land_unit',unique(land.map(x=>x.key)));await q('naval_units_tables','class',cls,'eq');}
 const units=JSON.parse(fs.readFileSync('src/data/units.json')).filter(u=>u.gameVersion!=='sample');
 await q('main_units_tables','unit',unique([...ownerSubtypes.map(x=>x.associated_unit_override),...membership.map(x=>x.unit_record),...units.map(u=>u.id.replace(/^ca_unit_/,''))].filter(Boolean)));
 const main=[...records.values()].filter(r=>r.table==='main_units_tables');await q('land_units_tables','key',unique(main.map(x=>x.row.land_unit).filter(Boolean)));
 const original=s.reader.tables.bind(s.reader);s.reader.tables=async name=>name.startsWith('Loc:')?[await s.reader.decode(s.local,name.slice(4))]:original(name);
 for(const [table,field,keys] of [['character_skills','localised_name',skillKeys],['effects','description',effectKeys],['land_units','onscreen_name',unique(ownerSubtypes.map(o=>main.find(m=>m.row.unit===o.associated_unit_override)?.row.land_unit).filter(Boolean))]]){
  const path=`Loc:text/db/${table}__.loc`,decoded=(await s.reader.tables(path))[0];s.schema.definitions[path]=[{version:decoded.tableVersion,fields:decoded.fields}];await q(path,'key',keys.map(k=>`${table}_${field}_${k}`));
 }
 const rows=[...records.values()],index=new Map(),relationships=[];
 for(const r of rows)for(const [field,value] of Object.entries(r.row)){const key=JSON.stringify([r.table,field,value]);if(!index.has(key))index.set(key,[]);index.get(key).push(r);}
 for(const from of rows){const d=schemas.get(`${from.table}:${from.tableVersion}`);
  for(const f of d.fields.filter(f=>f.is_reference)){const target=resolveReferenceTable(f.is_reference[0],s.schema);for(const to of index.get(JSON.stringify([target,f.is_reference[1],from.row[f.name]]))??[])relationships.push({from:from.id,field:f.name,to:to.id,targetField:f.is_reference[1],value:from.row[f.name],evidence:'RPFM processed schema is_reference'});}
  if(Object.keys(from.key).length===1)for(const f of d.localisedFields){const value=`${from.table.replace(/_tables$/,'')}_${f.name}_${Object.values(from.key)[0]}`;for(const to of index.get(JSON.stringify(['Loc','key',value]))??[])relationships.push({from:from.id,field:f.name,to:to.id,targetField:'key',value,evidence:'RPFM localised_fields + verified single-key convention'});}
 }
 const raw={format:'wh3-full-skill-extraction-v1',cultureKey:selection.cultureKey,subtypeKeys,treeSetKeys,contextualSetKeys:unique(contextualSets.map(x=>x.key)),skillKeys,selectorKeys,relationTables,extractedAt:new Date().toISOString(),provenance:s.metadata,schemas:[...schemas.values()],rows,relationships,coverage};
 fs.mkdirSync('generated/wh3/skill-production-bretonnia',{recursive:true});fs.writeFileSync('generated/wh3/skill-production-bretonnia/raw.json',JSON.stringify(raw,null,2)+'\n');
 console.log(JSON.stringify({subtypes:subtypes.length,trees:sets.length,skills:skillKeys.length,levels:levels.length,selectors:selectorKeys.length,rows:rows.length,foreignSubtypes:ownerSubtypeKeys.length-subtypeKeys.length,contextualSets:raw.contextualSetKeys}));
}finally{await s.client.close();}
