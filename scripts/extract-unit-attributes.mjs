import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {openRawSource,resolveOptions} from '../tools/wh3-importer/extract.mjs';
import {inspectTables} from '../tools/wh3-importer/inspect.mjs';
import {decodeSource} from '../tools/wh3-importer/expansion-batch-01/compact.mjs';
import {rosterSourceHash,discoverRoster} from '../tools/wh3-importer/production-growth/roster.mjs';
import {portable} from '../tools/wh3-importer/expansion-batch-01/projection.mjs';
import {isReviewedSource} from '../tools/wh3-importer/reviewed-snapshots.mjs';
import {evidenceHash} from '../tools/wh3-importer/promotion/first-batch.mjs';
import {sha256File} from '../tools/wh3-importer/hash.mjs';
import {koreanPackHash} from '../tools/wh3-importer/unit-localisation/review.mjs';

const read=p=>JSON.parse(fs.readFileSync(p)),unique=xs=>[...new Set(xs)].sort();
const units=read('src/data/units.json'),roster=decodeSource(read('tools/wh3-importer/faction-rosters/source.json'),rosterSourceHash);
const entries=new Map(discoverRoster(roster).flatMap(r=>r.units).map(e=>[e.id,e]));
const requests=units.filter(u=>u.gameVersion!=='sample').map(u=>{const e=entries.get(u.id);assert(e&&e.name===u.name);const land=roster.preflight.rows.find(r=>r.table==='land_units_tables'&&r.row.key===e.landKey);return {id:u.id,mainKey:e.mainKey,landKey:e.landKey,group:land.row.attribute_group};});
const options=await resolveOptions(process.argv.slice(2)),s=await openRawSource(options);
try {
 assert(isReviewedSource(s.metadata,''));assert.deepEqual(portable(s.metadata),roster.provenance);
 const records=new Map(),schemas=new Map(),coverage=[];
 async function q(table,field,values){const rows=[];for(let i=0;i<values.length;i+=24){const r=await inspectTables(s.reader,s.schema,[{table,where:[{field,op:'oneOf',value:values.slice(i,i+24)}]}],1000);r.rows.forEach(v=>records.set(v.id,portable(v)));r.schemas.forEach(v=>schemas.set(`${v.table}:${v.version}`,v));coverage.push(...r.coverage);rows.push(...r.rows);}return rows;}
 const groups=unique(requests.map(r=>r.group).filter(Boolean));
 await q('unit_attributes_groups_tables','group_name',groups);
 const junctions=await q('unit_attributes_to_groups_junctions_tables','attribute_group',groups);
 const keys=unique([...junctions.map(r=>r.row.attribute),'can_siege']);
 await q('unit_attributes_tables','key',keys);
 const ui=await q('attribute_to_ui_collection_junctions_tables','unit_attribute',keys);
 await q('ability_ui_collections_tables','ability_collection',unique(ui.map(r=>r.row.collection)));
 const abilityJunctions=await q('land_units_to_unit_abilites_junctions_tables','land_unit',unique(requests.map(r=>r.landKey)));
 const abilities=await q('unit_abilities_tables','key',unique(abilityJunctions.map(r=>r.row.ability)));
 await q('unit_ability_source_types_tables','key',unique(abilities.map(r=>r.row.source_type)));
 const kr=await s.reader.open(path.join(options.gamePath,'data','local_kr.pack'));
 assert.equal(await sha256File(kr.info.file_path),koreanPackHash);
 const localisations=[],missingKeys=[];
 for(const pack of [s.local,kr]){
   const index=new Map();
   for(const file of pack.files.filter(f=>f.file_type==='Loc')){
     const d=await s.reader.decode(pack,file.path);
     schemas.set(`Loc:${d.tableVersion}`,{table:'Loc',version:d.tableVersion,fields:d.fields,localisedFields:[]});
     for(const row of d.rows){const rows=index.get(row.key)??[];rows.push({id:`${pack.info.file_name}:${file.path}:${row.key}`,table:'Loc',key:{key:row.key},sourcePack:pack.info.file_name,path:file.path,tableVersion:d.tableVersion,row});index.set(row.key,rows);}
   }
   const selected=new Map();
   const visit=(key,stack=[])=>{if(stack.includes(key))return;const rows=index.get(key)??[];if(!rows.length){missingKeys.push({pack:pack.info.file_name,key});return;}for(const r of rows){selected.set(r.id,r);for(const match of r.row.text.matchAll(/\{\{tr:([^}]+)\}\}/g))visit(match[1],[...stack,key]);}};
   for(const key of keys)for(const field of ['bullet_text','imued_effect_text'])visit(`unit_attributes_${field}_${key}`);
   for(const key of unique(abilities.map(r=>r.row.key)))visit(`unit_abilities_onscreen_name_${key}`);
   localisations.push(...selected.values());
 }
 const result={format:'warhammer-vault-unit-attributes-source-v1',gameExecuted:false,rosterSourceHash,unitsHash:evidenceHash(units),provenance:portable(s.metadata),koreanPackHash,requests,schemas:[...schemas.values()],rows:[...records.values()],coverage,localisations,missingKeys};
 fs.mkdirSync('tools/wh3-importer/unit-attributes',{recursive:true});
 fs.writeFileSync('tools/wh3-importer/unit-attributes/source.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({sourceHash:evidenceHash(result),requests:requests.length,groups:groups.length,rawKeys:keys.length,junctions:junctions.length,abilities:abilities.length,rows:result.rows.length,loc:localisations.length},null,2));
} finally {await s.client.close();}
