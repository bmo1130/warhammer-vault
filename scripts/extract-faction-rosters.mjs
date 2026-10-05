import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {openRawSource,resolveOptions} from '../tools/wh3-importer/extract.mjs';
import {isReviewedSource} from '../tools/wh3-importer/reviewed-snapshots.mjs';
import {inspectTables} from '../tools/wh3-importer/inspect.mjs';
import {traceUnitByMainKey} from '../tools/wh3-importer/trace-unit.mjs';
import {portable} from '../tools/wh3-importer/expansion-batch-01/projection.mjs';
import {encodeSource,serializeSource} from '../tools/wh3-importer/expansion-batch-01/compact.mjs';
import {specialLordNotices,legendaryHeroNotices} from '../tools/wh3-importer/production-growth/characters.mjs';
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
 ['ogre_kingdoms','wh3_main_ogr_ogre_kingdoms'],
 ['khorne','wh3_main_kho_khorne'],
 ['chaos_dwarfs','wh3_dlc23_chd_chaos_dwarfs'],
 ['tzeentch','wh3_main_tze_tzeentch'],
 ['slaanesh','wh3_main_sla_slaanesh'],
 ['beastmen','wh_dlc03_bst_beastmen'],
 ['dark_elves','wh2_main_def_dark_elves'],
 ['wood_elves','wh_dlc05_wef_wood_elves'],
 ['dwarfs','wh_main_dwf_dwarfs'],
 ['nurgle','wh3_main_nur_nurgle'],
 ['norsca','wh_dlc08_nor_norsca'],
 ['high_elves','wh2_main_hef_high_elves'],
 ['cathay','wh3_main_cth_cathay',null,'wh3_main_cth_cathay_mp'],
 ['daemons_of_chaos','wh3_main_dae_daemons',null,'wh3_main_dae_daemon_prince'],
 ['warriors_of_chaos','wh_main_chs_chaos'],
];
const unique=xs=>[...new Set(xs)].sort();
const s=await openRawSource(await resolveOptions());
const records=new Map(),schemas=new Map(),coverage=[];
async function q(table,field,values){
 const rows=[];
 for(let i=0;i<values.length;i+=24){
  const selected=values.slice(i,i+24);let result;
  try{result=await inspectTables(s.reader,s.schema,[{table,where:[{field,op:'oneOf',value:selected}]}],1000);}
  catch(error){if(!error.message.includes('Inspection exceeded')||selected.length===1)throw error;const middle=Math.ceil(selected.length/2);rows.push(...await q(table,field,selected.slice(0,middle)),...await q(table,field,selected.slice(middle)));continue;}
  result.rows.forEach(r=>records.set(r.id,r));result.schemas.forEach(d=>schemas.set(`${d.table}:${d.version}`,d));
  coverage.push(...result.coverage);rows.push(...result.rows);
 }
 return rows;
}
try{
 assert(isReviewedSource(s.metadata,''),'Requires reviewed WH3 9.0.2/schema/pack snapshot');
 const inventories=[];
 for(const [factionId,cultureKey,,nativeFactionKey=cultureKey] of races){
  await q('cultures_tables','key',[cultureKey]);
  const subs=await q('cultures_subcultures_tables','culture',[cultureKey]);
  const factions=await q('factions_tables','subculture',subs.map(r=>r.row.subculture));
  const militaryGroup=factions.find(f=>f.row.key===nativeFactionKey)?.row.military_group;assert(militaryGroup,'Missing race faction military group');
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
  const nativeSubculture=factions.find(f=>f.row.key===nativeFactionKey)?.row.subculture;
  const allowedFactions=factions.filter(f=>f.row.subculture===nativeSubculture&&!f.row.is_quest_faction&&!f.row.is_rebel&&(f.row.military_group===militaryGroup||frontend.some(p=>p.row.faction===f.row.key))).map(f=>f.row.key);
  inventories.push({factionId,cultureKey,nativeFactionKey,militaryGroup,factionKeys:factions.map(f=>f.row.key),allowedFactionKeys:allowedFactions,subtypeKeys:subtypes.map(r=>r.row.key),mainKeys:mains.map(r=>r.row.unit)});
  console.log(factionId,'universe',mains.length,'mains /',subtypes.length,'subtypes');
 }
 // Exact Loc dependency closure: retain the raw referencing and referenced rows.
 const locIndex=new Map();
 for(const file of s.local.files.filter(f=>f.file_type==='Loc')){
  const decoded=await s.reader.decode(s.local,file.path);
  schemas.set(`Loc:${decoded.tableVersion}`,{table:'Loc',version:decoded.tableVersion,fields:decoded.fields,localisedFields:[]});
  for(const row of decoded.rows){const id=`Loc:${row.key}`;assert(!locIndex.has(row.key),`Ambiguous Loc ${row.key}`);locIndex.set(row.key,{id,table:'Loc',key:{key:row.key},sourcePack:decoded.sourcePack,sourcePackPath:decoded.sourcePackPath,path:file.path,tableVersion:decoded.tableVersion,row});}
 }
 const keys=new Set([...Object.values(specialLordNotices),...Object.values(legendaryHeroNotices)]);
 for(const r of records.values())if(r.table==='unique_agents_tables')for(const f of ['forename','surname','other_name','clan_name'])if(r.row[f])keys.add(`names_name_${r.row[f]}`);
 for(const r of records.values()){
  const d=s.schema.definitions[r.table].find(d=>d.version===r.tableVersion);
  for(const f of d.localised_fields??[])keys.add(`${r.table.replace('_tables','')}_${f.name}_${r.row.key??r.row.id}`);
 }
 for(const key of [...keys]){const record=locIndex.get(key);if(!record)continue;records.set(record.id,record);for(const match of record.row.text.matchAll(/\{\{tr:([^}]+)\}\}/g))keys.add(match[1]);}
 // Set iteration includes dependencies appended during traversal.
 for(const key of keys){const record=locIndex.get(key);if(!record)continue;records.set(record.id,record);for(const match of record.row.text.matchAll(/\{\{tr:([^}]+)\}\}/g))keys.add(match[1]);}
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
