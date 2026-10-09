import fs from 'node:fs';
import assert from 'node:assert/strict';
import {resolveOptions,openRawSource} from '../extract.mjs';
import {traceUnitByMainKey} from '../trace-unit.mjs';
import {inspectTables} from '../inspect.mjs';
import {loadSource,encodeSource,folder} from './source.mjs';
import {recruitmentGraph,inspectRecruitment} from './predict.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
const catalog=loadSource(),g=recruitmentGraph(catalog),units=catalog.seeds.map(s=>({...s,result:inspectRecruitment(g,s)}));
const pick=(category,predicate)=>{const seed=units.find(predicate);assert(seed,'No actual representative '+category);return {category,id:seed.id,mainKey:seed.mainKey,landKey:seed.landKey};};
const representatives=[
  pick('BASIC_INFANTRY',u=>u.mainKey==='wh_main_emp_inf_spearmen_0'),pick('ELITE_INFANTRY',u=>u.mainKey==='wh_main_emp_inf_greatswords'),
  pick('CAVALRY',u=>u.mainKey==='wh_main_brt_cav_grail_knights'),pick('MONSTER',u=>u.mainKey==='wh3_main_kho_mon_bloodthirster_0'),
  pick('ARTILLERY',u=>u.mainKey==='wh_main_emp_art_helstorm_rocket_battery'),
  pick('REGIMENT_OF_RENOWN',u=>u.result.sources.some(s=>s.type==='REGIMENT_OF_RENOWN')),
  pick('FACTION_PERMISSION_CONTEXT',u=>u.result.requirements.some(r=>r.factionKey)),
  pick('MULTIPLE_BUILDING_CHAINS',u=>u.mainKey==='wh_main_emp_inf_swordsmen'),
  pick('RITUAL_PAYLOAD',u=>u.result.sources.some(s=>s.type==='RITUAL_MERCENARY_SPAWN')),
  pick('UNIT_UPGRADE',u=>u.result.sources.some(s=>s.type==='UNIT_UPGRADE')),
  pick('TECHNOLOGY_UPGRADE_CONDITION',u=>u.result.sources.some(s=>s.type==='UNIT_UPGRADE'&&s.technologyKeys.length)),
  pick('UNKNOWN',u=>u.result.status==='UNKNOWN')
];
const s=await openRawSource(await resolveOptions([]));
try{
  assert.equal(digest(snapshotIdentity(s.metadata)),catalog.snapshotId);const captures=[];
  for(const rep of representatives){
    const dump=await traceUnitByMainKey(s.reader,s.schema,s.localisation,s.metadata,{...rep,localisationKey:'land_units_onscreen_name_'+rep.landKey});
    // The preexisting independent tracer follows ordinary building permissions.
    // Additional finite probes compare special records without calling the new predictor.
    const queries=[['units_to_exclusive_faction_permissions','key'],['mercenary_unit_groups','unit_record'],['ritual_payload_spawn_mercenaries','spawnable_unit'],['unit_to_unit_group_junctions','unit']].map(([t,f])=>({table:t+'_tables',where:[{field:f,op:'eq',value:rep.mainKey}]}));
    const extra=await inspectTables(s.reader,s.schema,queries,1000);
    captures.push({...rep,dump,extra});console.log(rep.category+' '+rep.mainKey+' '+dump.rows.length+' trace rows / '+extra.rows.length+' special rows');
  }
  fs.writeFileSync(folder+'validation.source.json',JSON.stringify(encodeSource({format:'independent-recruitment-extractor-replay-v1',snapshotId:catalog.snapshotId,provenance:s.metadata,captures}))+'\n');
  fs.writeFileSync(folder+'representatives.json',JSON.stringify({liveGameReadings:0,limit:'Existing trace implementation plus separate exact-key probes, same CA snapshot. No independent live campaign or building browser measurement. No Legendary Lord exclusivity asserted from a faction permission.',representatives},null,2)+'\n');
}finally{await s.client.close();}
