import fs from 'node:fs';
import assert from 'node:assert/strict';
import {resolveOptions,openRawSource} from '../extract.mjs';
import {inspectTables} from '../inspect.mjs';
import {resolveReferenceTable} from '../trace-unit.mjs';
import {loadSource as loadMissiles} from '../missile-rules/source.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';

export async function collectRecruitment(output='generated/wh3/recruitment/catalog.source.json') {
  const previous=loadMissiles(),seeds=previous.seeds;
  const source=await openRawSource(await resolveOptions([])),rows=new Map(),schemas=new Map(),coverage=[],unavailable=[];
  try {
    const snapshotId=digest(snapshotIdentity(source.metadata));assert.equal(snapshotId,previous.snapshotId);assert.equal(source.metadata.gameVersion,'9.0.2.0');
    const selected=table=>[...rows.values()].filter(r=>r.table===table);
    const select=async(table,field,values)=>{
      const keys=[...new Set(values.filter(v=>v!==''&&v!==null&&v!==undefined))];
      const actual=await source.reader.tables(table);
      if(!actual.length){
        const definitions=source.schema.definitions[table];assert(definitions?.some(d=>d.fields.some(f=>f.name===field)),'Absent-table field must still exist in schema: '+table+'.'+field);
        unavailable.push({table,field,keys,reason:'No DB table files in installed pack; no closed-world absence claim',
          schemaDefinitions:definitions.map(d=>({version:d.version,fields:d.fields.map(f=>({name:f.name,is_reference:f.is_reference}))}))});return;
      }
      for(let i=0;i<keys.length;i+=50){
        const result=await inspectTables(source.reader,source.schema,[{table,where:[{field,op:'oneOf',value:keys.slice(i,i+50)}]}],1000);
        result.rows.forEach(r=>rows.set(r.id,r));result.schemas.forEach(s=>schemas.set(s.table+':'+s.version,s));coverage.push(...result.coverage);
      }
      console.log(table+' '+selected(table).length+' rows / '+keys.length+' exact keys');
    };
    const forward=async(table,field)=>{
      if(!selected(table).length)return;
      const refs=(await source.reader.tables(table)).map(t=>t.fields.find(f=>f.name===field)?.is_reference);
      assert(refs.length&&refs.every(r=>Array.isArray(r)&&JSON.stringify(r)===JSON.stringify(refs[0])),table+'.'+field);
      await select(resolveReferenceTable(refs[0][0],source.schema),refs[0][1],selected(table).map(r=>r.row[field]));
    };
    const mainKeys=seeds.map(s=>s.mainKey);
    await select('main_units_tables','unit',mainKeys);
    for(const s of seeds)assert.equal(digest(selected('main_units_tables').find(r=>r.row.unit===s.mainKey)?.row),s.mainRowHash,s.mainKey);
    for(const [table,field] of [
      ['building_units_allowed','unit'],['units_to_groupings_military_permissions','unit'],['units_to_exclusive_faction_permissions','key'],
      ['unit_recruitment_source_overrides','unit'],['unit_to_unit_group_junctions','unit'],['mercenary_unit_groups','unit_record'],
      ['campaign_mercenary_unit_character_level_restrictions','unit'],['core_mercenary_units','unit'],['ritual_payload_spawn_mercenaries','spawnable_unit'],
      ['ritual_payload_change_unit_capacities','unit_record'],['unit_required_technology_junctions','unit_key']
    ])await select(table+'_tables',field,mainKeys);
    await forward('building_units_allowed_tables','building');await forward('main_units_tables','additional_building_requirement');
    // Finite transitive required-building closure, with exact-key selections.
    let last=-1;
    while(last!==selected('building_levels_tables').length){last=selected('building_levels_tables').length;
      await select('building_level_required_buildings_tables','building_level',selected('building_levels_tables').map(r=>r.row.level_name));
      await forward('building_level_required_buildings_tables','required');
      assert(selected('building_levels_tables').length<10000,'Unexpected prerequisite closure');
    }
    await forward('building_levels_tables','chain');
    const buildingKeys=selected('building_levels_tables').map(r=>r.row.level_name),chains=selected('building_chains_tables').map(r=>r.row.key);
    await select('building_culture_variants_tables','building',buildingKeys);
    await select('building_level_required_technology_junctions_tables','building_level_key',buildingKeys);
    await select('building_chain_availability_sets_tables','building_chain',chains);
    await forward('building_chain_availability_sets_tables','id');
    await select('building_chain_availabilities_tables','set_id',selected('building_chain_availability_sets_tables').map(r=>r.row.id));
    await select('settlement_type_to_building_chains_junctions_tables','building_chain',chains);
    await select('building_chain_climate_restrictions_tables','building_chain',chains);
    await select('building_chain_ownership_content_pack_junctions_tables','building_chain',chains);
    await select('building_level_ownership_content_pack_junctions_tables','building_level',buildingKeys);
    await select('factions_tables','military_group',selected('units_to_groupings_military_permissions_tables').map(r=>r.row.military_group));
    await forward('units_to_groupings_military_permissions_tables','military_group');
    for(const [t,f] of [['building_units_allowed','faction'],['units_to_exclusive_faction_permissions','faction'],['building_culture_variants','faction'],['building_chain_availabilities','faction']])await forward(t+'_tables',f);
    await forward('factions_tables','subculture');
    await forward('unit_recruitment_source_overrides_tables','source');
    await select('unit_recruitment_type_recruitment_sources_tables','recruitment_source',selected('recruitment_sources_tables').map(r=>r.row.key));
    await select('unit_upgrade_to_unit_groups_tables','target_unit_group',selected('unit_to_unit_group_junctions_tables').map(r=>r.row.unit_group));
    await forward('unit_to_unit_group_junctions_tables','unit_group');
    await forward('unit_upgrade_to_unit_groups_tables','base_unit_group');
    await forward('unit_upgrade_to_unit_groups_tables','target_unit_group');
    const upgrades=selected('unit_upgrade_to_unit_groups_tables').map(r=>r.row.upgrade_key);
    await select('unit_upgrade_to_building_level_requirements_tables','unit_upgrade',upgrades);
    await select('unit_upgrade_to_tech_requirements_tables','unit_upgrade',upgrades);
    await select('mercenary_pool_to_groups_junctions_tables','group',selected('mercenary_unit_groups_tables').map(r=>r.row.key));
    await forward('mercenary_pool_to_groups_junctions_tables','pool');
    await forward('mercenary_pool_to_groups_junctions_tables','faction_requirement');
    await forward('mercenary_pool_to_groups_junctions_tables','subculture_requirement');
    await forward('mercenary_pools_tables','recruitment_source');
    await select('unit_recruitment_type_recruitment_sources_tables','recruitment_source',selected('recruitment_sources_tables').map(r=>r.row.key));
    // Names are optional display evidence; permissions never come from names.
    const names=await source.reader.decode(source.local,'text/db/building_culture_variants__.loc');
    const nameKeys=selected('building_culture_variants_tables').map(r=>'building_culture_variants_name_'+['building','culture','subculture','faction'].map(f=>r.row[f]).join(''));
    const displayNames=names.rows.filter(r=>nameKeys.includes(r.key));
    const relationships=[],index=new Map();
    for(const r of rows.values())for(const [f,v] of Object.entries(r.row)){
      const k=JSON.stringify([r.table,f,v]);if(!index.has(k))index.set(k,[]);index.get(k).push(r);
    }
    for(const r of rows.values())for(const f of schemas.get(r.table+':'+r.tableVersion).fields.filter(f=>f.is_reference&&r.row[f.name]!=='')){
      const t=resolveReferenceTable(f.is_reference[0],source.schema);
      for(const target of index.get(JSON.stringify([t,f.is_reference[1],r.row[f.name]]))??[])relationships.push({from:r.id,to:target.id,field:f.name,targetField:f.is_reference[1],value:r.row[f.name],evidence:'RPFM processed schema is_reference'});
    }
    const result={format:'ca-exact-production-recruitment-source-v1',sourceKind:'ca-pack',gameExecuted:false,extractedAt:new Date().toISOString(),provenance:source.metadata,snapshotId,
      scope:{units:seeds.length,seedKeysPerQuery:50,maxRowsPerQuery:1000,fullImport:false},seeds,schemas:[...schemas.values()],rows:[...rows.values()],relationships,coverage,unavailable,
      displayNames:{sourcePack:'local_en.pack',path:'text/db/building_culture_variants__.loc',keyFields:['building','culture','subculture','faction'],rows:displayNames}};
    fs.mkdirSync('generated/wh3/recruitment',{recursive:true});fs.writeFileSync(output,JSON.stringify(result));console.log('Saved '+rows.size+' rows');return result;
  }finally{await source.client.close();}
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/recruitment/collect.mjs'))await collectRecruitment(process.argv[2]);
