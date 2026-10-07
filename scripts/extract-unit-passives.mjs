import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {openRawSource,resolveOptions} from '../tools/wh3-importer/extract.mjs';
import {inspectTables} from '../tools/wh3-importer/inspect.mjs';
import {resolveReferenceTable} from '../tools/wh3-importer/trace-unit.mjs';
import {portable} from '../tools/wh3-importer/expansion-batch-01/projection.mjs';
import {evidenceHash} from '../tools/wh3-importer/promotion/first-batch.mjs';
import {sourceHash as membershipSourceHash} from '../tools/wh3-importer/unit-attributes/review.mjs';
import {koreanPackHash} from '../tools/wh3-importer/unit-localisation/review.mjs';
import {sha256File} from '../tools/wh3-importer/hash.mjs';

const membership=JSON.parse(fs.readFileSync('tools/wh3-importer/unit-attributes/source.json'));
assert.equal(evidenceHash(membership),membershipSourceHash);
const options=await resolveOptions(process.argv.slice(2)),s=await openRawSource(options);
try {
  assert.deepEqual(portable(s.metadata),membership.provenance);
  const records=new Map(),schemas=new Map(),coverage=[],unresolvedReferences=[];
  const unique=xs=>[...new Set(xs.filter(v=>v!==''&&v!==undefined))].sort();
  async function q(table,field,values){
    const rows=[];
    for(let i=0;i<values.length;i+=12){
      const r=await inspectTables(s.reader,s.schema,[{table,where:[{field,op:'oneOf',value:values.slice(i,i+12)}]}],1000);
      r.rows.forEach(v=>records.set(v.id,portable(v)));r.schemas.forEach(v=>schemas.set(`${v.table}:${v.version}`,v));coverage.push(...r.coverage);rows.push(...r.rows);
    }
    return rows;
  }
  const abilities=membership.rows.filter(r=>r.table==='unit_abilities_tables');
  const keys=unique(abilities.map(r=>r.row.key));
  const specials=await q('unit_special_abilities_tables','key',keys);
  const passiveKeys=unique(abilities.filter(r=>r.row.source_type==='passive').map(r=>r.row.key));
  const phases=await q('special_ability_to_special_ability_phase_junctions_tables','special_ability',passiveKeys);
  let phaseKeys=unique(phases.map(r=>r.row.phase)),visited=new Set();
  // Bounded transitive imbue-contact graph. Parent/phase ownership stays raw;
  // parent abilities and effect-granted abilities never become unit membership.
  for(let depth=0;phaseKeys.length;depth++){
    assert(depth<8,'Unexpected phase reference depth');
    const rows=await q('special_ability_phases_tables','id',phaseKeys);
    phaseKeys.forEach(k=>visited.add(k));phaseKeys=unique(rows.map(r=>r.row.imbue_contact)).filter(k=>!visited.has(k));
  }
  const allPhases=[...visited].sort();
  await q('special_ability_phase_stat_effects_tables','phase',allPhases);
  await q('special_ability_phase_attribute_effects_tables','phase',allPhases);
  const flagTables=['special_ability_to_invalid_usage_flags_tables','special_ability_to_auto_deactivate_flags_tables','special_ability_to_invalid_target_flags_tables','special_ability_to_recharge_contexts_tables'];
  for(const table of flagTables)await q(table,'special_ability',passiveKeys);
  const flags=unique([...records.values()].filter(r=>flagTables.includes(r.table)).flatMap(r=>Object.entries(r.row).filter(([f])=>f!=='special_ability').map(([,v])=>v)));
  await q('special_ability_invalid_usage_flags_tables','flag_key',flags);
  const behaviourKeys=unique(specials.filter(r=>passiveKeys.includes(r.row.key)).map(r=>r.row.behaviour));
  await q('special_ability_behaviour_groups_tables','group',behaviourKeys);
  const behaviours=await q('special_ability_behaviour_groups_to_types_tables','group',behaviourKeys);
  await q('special_ability_behaviour_to_ability_junctions_tables','ability',passiveKeys);
  if(behaviours.length){
    const schema=schemas.get(`${behaviours[0].table}:${behaviours[0].tableVersion}`);
    const ref=schema.fields.find(f=>f.name==='behaviour').is_reference;
    const table=resolveReferenceTable(ref[0],s.schema);
    if(table)await q(table,ref[1],unique(behaviours.map(r=>r.row.behaviour)));
    else unresolvedReferences.push({table:behaviours[0].table,field:'behaviour',reference:ref,reason:'No corresponding definition in the reviewed RPFM schema; behaviour semantics remain raw.'});
  }
  const ui=await q('ability_to_ui_collection_junctions_tables','ability',passiveKeys);
  await q('ability_ui_collections_tables','ability_collection',unique(ui.map(r=>r.row.collection)));
  // These are campaign grants, explicitly negative ownership evidence. We do
  // not follow skills/items/research nor copy any granted ability onto a unit.
  await q('effect_bonus_value_unit_ability_junctions_tables','unit_ability',passiveKeys);
  const superseded=unique(abilities.filter(r=>passiveKeys.includes(r.row.key)).map(r=>r.row.superseded_abilities_set));
  if(superseded.length){
    await q('unit_ability_superseded_abilities_sets_tables','key',superseded);
    await q('unit_ability_superseded_abilities_set_elements_tables','set_key',superseded);
  }
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
    for(const key of passiveKeys)for(const field of ['onscreen_name','tooltip_text'])visit(`unit_abilities_${field}_${key}`);
    localisations.push(...selected.values());
  }
  const source={format:'warhammer-vault-unit-passive-source-v1',gameExecuted:false,membershipSourceHash,koreanPackHash,provenance:portable(s.metadata),schemas:[...schemas.values()],rows:[...records.values()],coverage,localisations,missingKeys,unresolvedReferences};
  fs.mkdirSync('tools/wh3-importer/unit-passives',{recursive:true});fs.writeFileSync('tools/wh3-importer/unit-passives/source.json',JSON.stringify(source,null,2)+'\n');
  console.log(JSON.stringify({sourceHash:evidenceHash(source),abilities:keys.length,passiveCandidates:passiveKeys.length,specials:specials.length,phases:visited.size,rows:source.rows.length,localisations:localisations.length},null,2));
} finally {await s.client.close();}
