import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {openRawSource,resolveOptions} from '../extract.mjs';
import {inspectTables} from '../inspect.mjs';
import {portable} from '../expansion-batch-01/projection.mjs';
import {evidenceHash} from '../promotion/first-batch.mjs';
import {sha256File} from '../hash.mjs';
import {koreanPackHash} from '../unit-localisation/review.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const membership=read('tools/wh3-importer/unit-attributes/source.json');
const previous=read('tools/wh3-importer/unit-passives/source.json');
const unique=xs=>[...new Set(xs.filter(v=>v!==''&&v!==undefined))].sort();
const options=await resolveOptions([]),s=await openRawSource(options);
try {
  assert.deepEqual(portable(s.metadata),membership.provenance);
  const records=new Map(),schemas=new Map(),coverage=[];
  const selected=t=>[...records.values()].filter(r=>r.table===t);
  async function q(table,field,values){
    const keys=unique(values);
    for(let i=0;i<keys.length;i+=12){
      const r=await inspectTables(s.reader,s.schema,[{table,where:[{field,op:'oneOf',value:keys.slice(i,i+12)}]}],1000);
      r.rows.forEach(v=>records.set(v.id,portable(v)));r.schemas.forEach(v=>schemas.set(`${v.table}:${v.version}`,v));coverage.push(...r.coverage);
    }
    console.log(`${table}: ${selected(table).length}`);
    return selected(table);
  }
  const abilities=membership.rows.filter(r=>r.table==='unit_abilities_tables'&&r.row.source_type!=='passive');
  const keys=unique(abilities.map(r=>r.row.key));
  await q('unit_ability_types_tables','key',abilities.map(r=>r.row.type));
  const specials=await q('unit_special_abilities_tables','key',keys);
  for(const r of specials)assert.deepEqual(r,previous.rows.find(x=>x.id===r.id),'Existing ability definition drift');
  const links=await q('special_ability_to_special_ability_phase_junctions_tables','special_ability',keys);
  let phaseKeys=unique(links.map(r=>r.row.phase)),visited=new Set();
  for(let depth=0;phaseKeys.length;depth++){
    assert(depth<8);await q('special_ability_phases_tables','id',phaseKeys);
    phaseKeys.forEach(k=>visited.add(k));phaseKeys=unique(selected('special_ability_phases_tables').map(r=>r.row.imbue_contact)).filter(k=>!visited.has(k));
  }
  for(const t of ['special_ability_phase_stat_effects_tables','special_ability_phase_attribute_effects_tables'])await q(t,'phase',[...visited]);
  const flagTables=['special_ability_to_invalid_usage_flags_tables','special_ability_to_auto_deactivate_flags_tables','special_ability_to_invalid_target_flags_tables','special_ability_to_recharge_contexts_tables'];
  for(const t of flagTables)await q(t,'special_ability',keys);
  await q('special_ability_invalid_usage_flags_tables','flag_key',selected('special_ability_to_invalid_usage_flags_tables').concat(...flagTables.slice(1).map(selected)).flatMap(r=>Object.entries(r.row).filter(([f])=>f!=='special_ability').map(([,v])=>v)));
  await q('unit_special_ability_to_special_ability_toggle_groups_junctions_tables','unit_special_ability',keys);
  await q('special_ability_exclusive_toggle_groups_tables','key',selected('unit_special_ability_to_special_ability_toggle_groups_junctions_tables').map(r=>r.row.special_ability_toggle_groups));
  const ui=await q('ability_to_ui_collection_junctions_tables','ability',keys);
  await q('ability_ui_collections_tables','ability_collection',ui.map(r=>r.row.collection));
  // Negative grant/scope evidence. These rows never create default ownership.
  await q('effect_bonus_value_unit_ability_junctions_tables','unit_ability',keys);
  await q('unit_set_unit_ability_junctions_tables','unit_ability',keys);
  await q('battle_context_unit_ability_junctions_tables','unit_ability',keys);
  await q('special_ability_behaviour_to_ability_junctions_tables','ability',keys);
  await q('special_ability_behaviour_groups_tables','group',specials.map(r=>r.row.behaviour));
  await q('special_ability_behaviour_groups_to_types_tables','group',specials.map(r=>r.row.behaviour));
  const kr=await s.reader.open(path.join(options.gamePath,'data','local_kr.pack'));
  assert.equal(await sha256File(kr.info.file_path),koreanPackHash);
  const localisations=[],missingKeys=[];
  for(const pack of [s.local,kr]){
    const index=new Map();
    for(const file of pack.files.filter(f=>f.file_type==='Loc')){
      const decoded=await s.reader.decode(pack,file.path);
      for(const row of decoded.rows){const rs=index.get(row.key)??[];rs.push({id:`${pack.info.file_name}:${file.path}:${row.key}`,table:'Loc',key:{key:row.key},sourcePack:pack.info.file_name,path:file.path,tableVersion:decoded.tableVersion,row});index.set(row.key,rs);}
    }
    const selected=new Map();
    const visit=(key,stack=[])=>{if(stack.includes(key))return;const rs=index.get(key)??[];if(!rs.length){missingKeys.push({pack:pack.info.file_name,key});return;}for(const r of rs){selected.set(r.id,r);for(const m of r.row.text.matchAll(/\{\{tr:([^}]+)\}\}/g))visit(m[1],[...stack,key]);}};
    for(const key of keys)for(const field of ['onscreen_name','tooltip_text'])visit(`unit_abilities_${field}_${key}`);
    for(const key of unique(abilities.map(r=>r.row.type)))visit(`unit_ability_types_onscreen_name_${key}`);
    localisations.push(...selected.values());
  }
  const inventory=read('generated/wh3/unit-actives/schema-inventory.json');
  const source={format:'ca-unit-active-source-v1',gameExecuted:false,membershipSourceHash:evidenceHash(membership),passiveSourceHash:evidenceHash(previous),koreanPackHash,provenance:portable(s.metadata),schemas:[...schemas.values()],rows:[...records.values()],coverage,localisations,missingKeys,
    ownershipInventory:inventory.filter(t=>['main_units_tables','land_units_tables','mounts_tables'].includes(t.table)||t.definitions.some(d=>d.fields.some(f=>['unit_abilities','unit_special_abilities'].includes(f.is_reference?.[0]))))};
  fs.writeFileSync('tools/wh3-importer/unit-actives/source.json',JSON.stringify(source,null,2)+'\n');
  console.log(JSON.stringify({sourceHash:evidenceHash(source),keys:keys.length,rows:source.rows.length,localisations:localisations.length,missingKeys},null,2));
}finally{await s.client.close();}
