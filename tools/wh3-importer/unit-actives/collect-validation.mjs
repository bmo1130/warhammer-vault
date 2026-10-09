import fs from 'node:fs';
import assert from 'node:assert/strict';
import {openRawSource,resolveOptions} from '../extract.mjs';
import {inspectTables} from '../inspect.mjs';
import {portable} from '../expansion-batch-01/projection.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const source=read('tools/wh3-importer/unit-actives/source.json'),review=read('tools/wh3-importer/unit-actives/admission.json');
const cases=[
 ['ACTIVE','ca_unit_wh2_main_hef_mon_sun_dragon'],
 ['TOGGLE','ca_unit_wh_main_brt_cav_grail_knights'],
 ['CONDITIONAL','ca_unit_wh_dlc06_grn_inf_da_eight_peaks_loonies_0'],
 ['BOUND_MOUNT','ca_unit_wh3_main_cth_veh_war_compass_0'],
 ['MULTIPLE','ca_unit_wh_pro04_wef_inf_wardancers_ror_0'],
 ['EMPTY','ca_unit_wh_main_emp_inf_spearmen_0'],
 ['PASSIVE_ONLY','ca_unit_wh_dlc04_vmp_inf_sternsmen_0'],
 ['ACQUIRED_UNLOCK','ca_unit_wh3_dlc29_emp_inf_hunting_hounds_ror'],
 ['HIDDEN_INTERNAL','ca_unit_wh2_dlc11_cst_mon_bloated_corpse_0'],
 ['TYPE_CONFLICT','ca_unit_wh3_dlc26_grn_mon_colossal_squig'],
 ['SPELL_BOUND_AMBIGUITY','ca_unit_wh3_twa08_ksl_mon_elemental_bear_0_ror'],
 ['CULTURE_ASSIGNMENT','ca_unit_wh3_dlc29_skv_mon_stormfiend_grinderfists'],
 ['PERSISTENT_CONTROL','ca_unit_wh3_dlc25_dwf_veh_thunderbarge'],
 ['MULTIPLE_BOUND','ca_unit_wh2_dlc09_tmb_mon_heirotitan_0'],
];
const s=await openRawSource(await resolveOptions([]));
try{
 assert.deepEqual(portable(s.metadata),source.provenance);
 const rows=new Map(),schemas=new Map(),coverage=[],comparisons=[];
 const query=async(table,field,key)=>{const result=await inspectTables(s.reader,s.schema,[{table,where:[{field,op:'eq',value:key}]}],1000);result.rows.forEach(r=>rows.set(r.id,portable(r)));result.schemas.forEach(r=>schemas.set(r.table+':'+r.version,r));coverage.push(...result.coverage);return result.rows;};
 for(const [category,id]of cases){
   const a=review.admissions.find(a=>a.id===id);assert(a,id);
   const main=await query('main_units_tables','unit',a.mainKey),land=await query('land_units_tables','key',a.landKey),links=await query('land_units_to_unit_abilites_junctions_tables','land_unit',a.landKey);
   assert.equal(main.length,1);assert.equal(land.length,1);assert.equal(main[0].row.land_unit,land[0].row.key);
   const actual=[...new Set(links.map(r=>r.row.ability))].sort(),expected=[...new Set([...a.facts,...a.withheld,...a.excluded].map(f=>f.rawKey))].sort();assert.deepEqual(actual,expected,id);
   comparisons.push({category,id,mainKey:a.mainKey,landKey:a.landKey,expected,actual,match:true,status:a.status,abilities:a.abilities??null,boundAbilities:a.boundAbilities??null,method:'Fresh independent per-unit eq query of installed CA pack; not game-card UI measurement'});
 }
 const keys=[...new Set([...rows.values()].filter(r=>r.table==='land_units_to_unit_abilites_junctions_tables').map(r=>r.row.ability))].sort();
 for(const key of keys){await query('unit_abilities_tables','key',key);await query('unit_special_abilities_tables','key',key);}
 fs.writeFileSync('tools/wh3-importer/unit-actives/validation.source.json',JSON.stringify({gameExecuted:false,provenance:portable(s.metadata),rows:[...rows.values()],schemas:[...schemas.values()],coverage,comparisons},null,2)+'\n');
 console.log(`${comparisons.length} independent CA representative inventories PASS`);
}finally{await s.client.close();}
