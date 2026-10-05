import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {openRawSource,resolveOptions} from '../tools/wh3-importer/extract.mjs';
import {isReviewedSource} from '../tools/wh3-importer/reviewed-snapshots.mjs';
import {inspectTables} from '../tools/wh3-importer/inspect.mjs';
import {traceUnitByMainKey} from '../tools/wh3-importer/trace-unit.mjs';
import {portable} from '../tools/wh3-importer/expansion-batch-01/projection.mjs';
import {encodeSource,serializeSource} from '../tools/wh3-importer/expansion-batch-01/compact.mjs';
export const races=[
 ['empire','wh_main_emp_empire','wh_main_group_empire'],
 ['vampire_counts','wh_main_vmp_vampire_counts','wh_main_group_vampire_counts'],
 ['greenskins','wh_main_grn_greenskins','wh_main_group_greenskins'],
 ['bretonnia','wh_main_brt_bretonnia','wh_main_group_bretonnia'],
 ['tomb_kings','wh2_dlc09_tmb_tomb_kings','wh2_dlc09_group_tomb_kings'],
 ['vampire_coast','wh2_dlc11_cst_vampire_coast','wh2_dlc11_group_vampire_coast'],
 ['skaven','wh2_main_skv_skaven','wh2_main_group_skaven'],
 ['lizardmen','wh2_main_lzd_lizardmen','wh2_main_group_lizardmen'],
 ['kislev','wh3_main_ksl_kislev'],
];
const unique=xs=>[...new Set(xs)].sort();
const s=await openRawSource(await resolveOptions());
const records=new Map(),schemas=new Map(),coverage=[];
async function q(table,field,values){
 const rows=[];
 for(let i=0;i<values.length;i+=24){
  const result=await inspectTables(s.reader,s.schema,[{table,where:[{field,op:'oneOf',value:values.slice(i,i+24)}]}],1000);
  result.rows.forEach(r=>records.set(r.id,r));result.schemas.forEach(d=>schemas.set(`${d.table}:${d.version}`,d));
  coverage.push(...result.coverage);rows.push(...result.rows);
 }
 return rows;
}
try{
 assert(isReviewedSource(s.metadata,''),'Requires reviewed WH3 9.0.2/schema/pack snapshot');
 const inventories=[];
 for(const [factionId,cultureKey] of races){
  await q('cultures_tables','key',[cultureKey]);
  const subs=await q('cultures_subcultures_tables','culture',[cultureKey]);
  const factions=await q('factions_tables','subculture',subs.map(r=>r.row.subculture));
  const militaryGroup=factions.find(f=>f.row.key===cultureKey)?.row.military_group;assert(militaryGroup,'Missing race faction military group');
  const permissions=await q('faction_agent_permitted_subtypes_tables','faction',factions.map(r=>r.row.key));
  const groups=unique(factions.map(r=>r.row.military_group));
  const unitPermissions=await q('units_to_groupings_military_permissions_tables','military_group',groups);
  const customs=await q('units_custom_battle_permissions_tables','faction',factions.map(r=>r.row.key));
  const leaders=await q('frontend_faction_leaders_tables','faction',factions.map(r=>r.row.key));
  const subtypes=await q('agent_subtypes_tables','key',unique([...permissions.map(r=>r.row.subtype),...leaders.map(r=>r.row.agent_subtype_record)]));
  const uniques=await q('unique_agents_tables','agent_subtype',subtypes.map(r=>r.row.key));
  await q('names_tables','id',unique(uniques.flatMap(r=>['forename','surname','other_name','clan_name'].map(k=>r.row[k])).filter(Boolean)));
  await q('agents_tables','key',unique(permissions.map(r=>r.row.agent)));
  await q('agent_recruitment_categories_tables','key',unique(subtypes.map(r=>r.row.recruitment_category).filter(Boolean)));
  const mainKeys=unique([...unitPermissions.map(r=>r.row.unit),...customs.map(r=>r.row.unit),...subtypes.map(r=>r.row.associated_unit_override).filter(Boolean)]);
  await q('units_to_groupings_military_permissions_tables','unit',mainKeys);
  const mains=await q('main_units_tables','unit',mainKeys);const lands=await q('land_units_tables','key',unique(mains.map(r=>r.row.land_unit).filter(Boolean)));
  const frontend=await q('frontend_factions_tables','faction',factions.map(r=>r.row.key));
  const nativeSubculture=factions.find(f=>f.row.key===cultureKey)?.row.subculture;
  const allowedFactions=factions.filter(f=>f.row.subculture===nativeSubculture&&!f.row.is_quest_faction&&!f.row.is_rebel&&(f.row.military_group===militaryGroup||frontend.some(p=>p.row.faction===f.row.key))).map(f=>f.row.key);
  inventories.push({factionId,cultureKey,militaryGroup,factionKeys:factions.map(f=>f.row.key),allowedFactionKeys:allowedFactions,subtypeKeys:subtypes.map(r=>r.row.key),mainKeys:mains.map(r=>r.row.unit)});
  console.log(factionId,'universe',mains.length,'mains /',subtypes.length,'subtypes');
 }
 // Actual unit and subtype localisation, with schema identities retained.
 const locTables=['land_units','agent_subtypes','cultures','names'];
 for(const table of locTables){
  const path=`text/db/${table}__.loc`;const file=s.local.files.find(f=>f.path===path);if(!file)continue;
  const decoded=await s.reader.decode(s.local,path);schemas.set(`Loc:${decoded.tableVersion}`,{table:'Loc',version:decoded.tableVersion,fields:decoded.fields,localisedFields:[]});
  const keys=new Set([...records.values()].filter(r=>r.table===`${table}_tables`).flatMap(r=>{
   const d=s.schema.definitions[r.table].find(d=>d.version===r.tableVersion);return (d.localised_fields??[]).map(f=>`${table}_${f.name}_${r.row.key??r.row.id}`);
  }));
  if(table==='names')for(const unique of [...records.values()].filter(r=>r.table==='unique_agents_tables'))for(const field of ['forename','surname','other_name','clan_name'])if(unique.row[field])keys.add(`names_name_${unique.row[field]}`);
  // Unit onscreen names are already validated by discoverExactRoot.
  for(const row of decoded.rows.filter(r=>keys.has(r.key))){const id=`Loc:${row.key}`;records.set(id,{id,table:'Loc',key:{key:row.key},sourcePack:decoded.sourcePack,sourcePackPath:decoded.sourcePackPath,path,tableVersion:decoded.tableVersion,row});}
 }
 // Source-level membership selection is performed by the small offline reviewer.
 const source={format:'warhammer-vault-expansion-01-source-v1',gameExecuted:false,provenance:portable(s.metadata),catalog:inventories,preflight:{sourceKind:'ca-pack',provenance:portable(s.metadata),rows:[...records.values()],relationships:[],coverage},candidates:[],schemas:[...schemas.values()]};
 const {discoverRoster}=await import('../tools/wh3-importer/production-growth/roster.mjs');
 const roster=discoverRoster(source);
 const baseline=spawnSync('git',['show','0205595380d4dcb95a9df83a2e3b405b518160c9:src/data/units.json']);assert.equal(baseline.status,0);
 const existing=new Set(JSON.parse(baseline.stdout).map(u=>u.id));
 const candidates=[...new Map(roster.flatMap(r=>r.units).filter(u=>!existing.has(u.id)).map(u=>[u.id,u])).values()];
 for(let i=0;i<candidates.length;i++){
  const entry=candidates[i];
  try{
   const trace=await traceUnitByMainKey(s.reader,s.schema,s.localisation,s.metadata,{mainKey:entry.mainKey,landKey:entry.landKey,localisationKey:entry.localisationKey,displayName:entry.name});
   const permission=await inspectTables(s.reader,s.schema,[{table:'main_units_tables',where:[{field:'unit',op:'eq',value:entry.mainKey}]},{table:'units_to_groupings_military_permissions_tables',where:[{field:'unit',op:'eq',value:entry.mainKey}]},{table:'units_custom_battle_permissions_tables',where:[{field:'unit',op:'eq',value:entry.mainKey}]}],100);
   source.candidates.push({id:entry.id,trace:portable(trace),permission:{sourceKind:'ca-pack',provenance:portable(s.metadata),...portable(permission)}});
   console.log(`${i+1}/${candidates.length}`,entry.name,'traced');
  }catch(error){source.candidates.push({id:entry.id,hold:error.message});console.log('HOLD',entry.mainKey,error.message);}
 }
 // Reuse the existing lossless shared-row/schema dictionary, without a new storage format.
 const definitions=new Map(source.schemas.map(d=>[`${d.table}:${d.version}`,d]));
 for(const c of source.candidates)for(const t of [c.trace,c.permission].filter(Boolean)){t.schemas.forEach(d=>definitions.set(`${d.table}:${d.version}`,d));t.schemaRefs=t.schemas.map(d=>`${d.table}:${d.version}`);delete t.schemas;}
 source.schemas=[...definitions.values()];source.preflight.schemaRefs=source.schemas.map(d=>`${d.table}:${d.version}`);
 const compact=encodeSource(portable(source));fs.mkdirSync('tools/wh3-importer/faction-rosters',{recursive:true});
 fs.writeFileSync('tools/wh3-importer/faction-rosters/source.json',serializeSource(compact));
 console.log('Saved exact roster source',candidates.length,'missing units');
}finally{await s.client.close();}
