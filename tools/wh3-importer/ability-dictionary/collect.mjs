import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {openRawSource,resolveOptions} from '../extract.mjs';
import {inspectTables} from '../inspect.mjs';
import {portable} from '../expansion-batch-01/projection.mjs';
import {sha256File} from '../hash.mjs';
import {evidenceHash} from '../promotion/first-batch.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const prior=['unit-attributes','unit-passives','unit-actives'].map(d=>read(`tools/wh3-importer/${d}/source.json`));
const all=prior.flatMap(s=>s.rows),unique=xs=>[...new Set(xs.filter(Boolean))].sort();
const options=await resolveOptions([]),s=await openRawSource(options);
try {
 assert.deepEqual(portable(s.metadata),prior[0].provenance);
 const records=new Map(),schemas=new Map(),coverage=[];
 async function q(table,field,keys){for(let i=0;i<keys.length;i+=12){const r=await inspectTables(s.reader,s.schema,[{table,where:[{field,op:'oneOf',value:keys.slice(i,i+12)}]}],1000);r.rows.forEach(v=>records.set(v.id,portable(v)));r.schemas.forEach(v=>schemas.set(v.table,v));coverage.push(...r.coverage);}console.log(table,[...records.values()].filter(r=>r.table===table).length);}
 const effects=all.filter(r=>r.table==='special_ability_phase_stat_effects_tables');
 await q('modifiable_unit_stats_tables','stat_key',unique(effects.map(r=>r.row.stat)));
 const statLocField=schemas.get('modifiable_unit_stats_tables').fields.find(f=>f.name==='localisation');
 console.log('stat localisation reference',statLocField.is_reference);
 const statLocTable=statLocField.is_reference?.[0]+'_tables';
 if(s.schema.definitions[statLocTable])await q(statLocTable,statLocField.is_reference[1],unique([...records.values()].filter(r=>r.table==='modifiable_unit_stats_tables').map(r=>r.row.localisation)));
 await q('ui_text_replacements_tables','key',unique(prior.flatMap(p=>p.localisations.flatMap(r=>[...r.row.text.matchAll(/\{\{tr:([^}]+)\}\}/g)].map(m=>m[1])))));
 // Fresh bounded validation samples; these keys never select Production rules.
 await q('unit_attributes_tables','key',['causes_fear','charge_defense','hide_forest','undead']);
 const sampleKeys=['wh_main_unit_passive_regeneration','wh_main_unit_passive_unstable','wh_main_unit_passive_unstable_mark_ii'];
 await q('unit_special_abilities_tables','key',sampleKeys);
 await q('special_ability_to_special_ability_phase_junctions_tables','special_ability',sampleKeys);
 await q('special_ability_phases_tables','id',sampleKeys);
 await q('special_ability_phase_stat_effects_tables','phase',sampleKeys);
 await q('special_ability_to_auto_deactivate_flags_tables','special_ability',sampleKeys);
 const unresolvedTables=[];
 if(s.schema.definitions.unit_stat_modifiers_how_enums_tables)await q('unit_stat_modifiers_how_enums_tables','key',unique(effects.map(r=>r.row.how)));else unresolvedTables.push('unit_stat_modifiers_how_enums');
 const kr=await s.reader.open(path.join(options.gamePath,'data','local_kr.pack'));
 assert.equal(await sha256File(kr.info.file_path),prior[0].koreanPackHash);
 const localisations=[],missingKeys=[];
 const locKeys=unique([
  ...prior.flatMap(p=>p.localisations.map(r=>r.row.key)),
  ...unique(all.filter(r=>r.table==='special_ability_invalid_usage_flags_tables').map(r=>r.row.flag_key)).flatMap(k=>['flag_description','alt_description'].map(f=>`special_ability_invalid_usage_flags_${f}_${k}`)),
  ...unique(all.filter(r=>r.table==='special_ability_phases_tables').map(r=>r.row.id)).map(k=>`special_ability_phases_onscreen_name_${k}`),
  ...[...records.values()].flatMap(r=> (schemas.get(r.table)?.localisedFields??[]).map(f=>`${r.table.replace('_tables','')}_${f.name}_${Object.values(r.key)[0]}`)),
 ]);
 for(const pack of [s.local,kr]){
  const index=new Map();for(const file of pack.files.filter(f=>f.file_type==='Loc')){const decoded=await s.reader.decode(pack,file.path);for(const row of decoded.rows){const rs=index.get(row.key)??[];rs.push({id:`${pack.info.file_name}:${file.path}:${row.key}`,table:'Loc',key:{key:row.key},sourcePack:pack.info.file_name,path:file.path,tableVersion:decoded.tableVersion,row});index.set(row.key,rs);}}
  const selected=new Map();const visit=(key,stack=[])=>{if(stack.includes(key))return;const rs=index.get(key)??index.get(`ui_text_replacements_localised_text_${key}`)??index.get(`random_localisation_strings_string_${key}`)??[];if(!rs.length){missingKeys.push({pack:pack.info.file_name,key});return;}for(const r of rs){selected.set(r.id,r);for(const m of r.row.text.matchAll(/\{\{tr:([^}]+)\}\}/g))visit(m[1],[...stack,key]);}};
  locKeys.forEach(k=>visit(k));
  const unresolvedTokens=unique(prior.flatMap(p=>p.localisations.flatMap(r=>[...r.row.text.matchAll(/\{\{tr:([^}]+)\}\}/g)].map(m=>m[1]))));
  for(const token of unresolvedTokens)if(!index.has(token)&&!index.has(`random_localisation_strings_string_${token}`)){const candidates=[...index.keys()].filter(k=>k.includes(token));if(candidates.length)console.log('Loc candidate',pack.info.file_name,token,candidates);candidates.forEach(k=>visit(k));}
  // Official game-facing templates corroborate heal units; retain exact text,
  // never substitute unidentified runtime values into an official quotation.
  for(const [key,rs]of index)if(/heal|regenerat|damage_amount|ability_duration|ability_range/.test(key)&&rs.some(r=>/\%|second|초|생명력|hit point/i.test(r.row.text)))visit(key);
  localisations.push(...selected.values());
 }
 const source={format:'ca-ability-dictionary-supplement-v1',gameExecuted:false,provenance:portable(s.metadata),koreanPackHash:prior[0].koreanPackHash,schemas:[...schemas.values()],rows:[...records.values()],coverage,localisations,missingKeys,unresolvedTables};
 fs.writeFileSync('tools/wh3-importer/ability-dictionary/source.json',JSON.stringify(source,null,2)+'\n');console.log({hash:evidenceHash(source),rows:source.rows.length,loc:localisations.length});
}finally{await s.client.close();}
