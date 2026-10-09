import {digest} from '../runtime-evidence/contract.mjs';

export function recruitmentGraph(source){
  const index=new Map(),byId=new Map(source.rows.map(r=>[r.id,r])),schema=new Map(source.schemas.map(s=>[s.table+':'+s.version,s]));
  for(const r of source.rows)for(const [f,v] of Object.entries(r.row)){
    const k=JSON.stringify([r.table,f,v]);if(!index.has(k))index.set(k,[]);index.get(k).push(r);
  }
  const tableName=t=>t.endsWith('_tables')?t:t+'_tables';
  const get=(t,f,v)=>index.get(JSON.stringify([tableName(t),f,v]))??[];
  const field=(r,f)=>schema.get(r.table+':'+r.tableVersion)?.fields.find(x=>x.name===f);
  const edges=new Set(source.relationships.map(e=>JSON.stringify([e.from,e.field,e.to,e.targetField,e.value])));
  const links=(r,f)=>{
    const ref=field(r,f)?.is_reference;if(!ref||!Object.hasOwn(r.row,f)||r.row[f]==='')return [];
    return get(ref[0],ref[1],r.row[f]).filter(t=>edges.has(JSON.stringify([r.id,f,t.id,ref[1],r.row[f]])));
  };
  const reverse=(t,f,target)=>get(t,f,Object.values(target.key)[0]).filter(r=>links(r,f).some(x=>x.id===target.id));
  const covered=(t,f,v)=>source.coverage.some(c=>c.tableFiles>0&&c.query.table===tableName(t)&&c.query.where.some(w=>w.field===f&&(w.op==='oneOf'?w.value.includes(v):w.value===v)));
  return {source,get,field,links,reverse,covered,byId};
}
export const reference=r=>({table:r.table,key:r.key,rowId:r.id});
// Empty-faction baseline false is not a disable switch. Never use this rule to
// extend the permission to every faction: building/unit contexts stay separate.
export function buildingPermission(row,all){
  if(typeof row.enabled!=='boolean'||typeof row.faction!=='string')return 'HELD_INVALID_PERMISSION';
  if(!row.faction)return 'BASE_PERMISSION';
  if(all.some(r=>r.building===row.building&&r.unit===row.unit&&r.faction===row.faction&&r.enabled!==row.enabled))return 'HELD_CONFLICTING_FACTION_PERMISSION';
  if(row.enabled)return 'FACTION_PERMISSION';
  const baseline=all.some(r=>r.building===row.building&&r.unit===row.unit&&!r.faction);
  return baseline?'FACTION_EXCLUSION':'HELD_STANDALONE_FACTION_FALSE';
}
export function inspectRecruitment(g,seed){
  const mains=g.get('main_units','unit',seed.mainKey),main=mains.length===1?mains[0]:undefined;
  if(!main||!g.field(main,'unit')?.is_key||digest(main.row)!==seed.mainRowHash)return {id:seed.id,mainKey:seed.mainKey,requirements:[],sources:[],holds:['MAIN_IDENTITY_OR_ROW_DRIFT'],status:'UNKNOWN',directBuildingStatus:'UNKNOWN',permissionContext:{militaryGroups:[],factionOverrides:[]}};
  const holds=[],requirements=[],sources=[],buildingRows=g.get('building_units_allowed','unit',seed.mainKey);
  const closed=g.covered('building_units_allowed','unit',seed.mainKey);
  if(!closed)holds.push('BUILDING_SELECTION_NOT_CLOSED');
  const permissions=g.get('units_to_groupings_military_permissions','unit',seed.mainKey).filter(r=>g.links(r,'unit').some(x=>x.id===main.id));
  const exclusive=g.get('units_to_exclusive_faction_permissions','key',seed.mainKey).filter(r=>g.links(r,'key').some(x=>x.id===main.id));
  const permissionContext={militaryGroups:[...new Set(permissions.map(r=>r.row.military_group))].sort(),factionOverrides:exclusive.map(r=>({factionKey:r.row.faction,allowed:r.row.allowed,reference:reference(r)}))};
  const exclusions=[];
  for(const r of buildingRows){
    const permission=buildingPermission(r.row,buildingRows.map(x=>x.row));
    if(permission==='FACTION_EXCLUSION'){exclusions.push(reference(r));continue;}
    const levels=g.links(r,'building'),root=g.links(r,'unit');
    if(!closed||!root.some(x=>x.id===main.id)||levels.length!==1||permission.startsWith('HELD')||g.field(r,'enabled')?.field_type!=='Boolean'||
      g.field(r,'conditions')?.field_type!=='I32'||g.field(r,'faction')?.is_reference?.[0]!=='factions'||
      (r.row.faction&&g.links(r,'faction').length!==1)){holds.push('BUILDING_PERMISSION_OR_REFERENCE_HELD:'+r.id);continue;}
    const b=levels[0],chains=g.links(b,'chain');
    if(chains.length!==1||!Number.isInteger(b.row.level)||b.row.level<0||!Number.isInteger(b.row.primary_slot_building_building_level_requirement)||
      !Number.isInteger(r.row.conditions)||r.row.conditions!==0){holds.push('BUILDING_STAGE_CHAIN_OR_CONDITION_HELD:'+r.id);continue;}
    const req={buildingId:b.row.level_name,buildingChainId:chains[0].row.key,buildingStage:b.row.level,
      requiredPrimaryBuildingLevel:b.row.primary_slot_building_building_level_requirement,sourceKey:String(r.row.key),sourceStatus:'VERIFIED_DIRECT_SOURCE',
      factionKey:r.row.faction,rawConditions:r.row.conditions,rawEnabled:r.row.enabled};
    requirements.push(req);sources.push({type:'BUILDING',key:b.row.level_name,requirementKey:req.sourceKey,status:'VERIFIED_DIRECT_SOURCE',effectiveStatus:'PARTIAL_SOURCE',reference:reference(r)});
  }
  const add=(type,key,r,details={})=>sources.push({type,key,status:'PARTIAL_SOURCE',effectiveStatus:'PARTIAL_SOURCE',reference:reference(r),...details});
  if(g.field(main,'is_renown')?.field_type==='Boolean'&&main.row.is_renown===true)add('REGIMENT_OF_RENOWN',seed.mainKey,main);
  for(const r of g.get('unit_recruitment_source_overrides','unit',seed.mainKey)){
    if(!g.links(r,'unit').some(x=>x.id===main.id)||g.links(r,'source').length!==1){holds.push('RECRUITMENT_OVERRIDE_REFERENCE_HELD:'+r.id);continue;}
    add('RECRUITMENT_SOURCE_OVERRIDE',r.row.source,r,{costKey:r.row.cost});
  }
  for(const r of g.get('mercenary_unit_groups','unit_record',seed.mainKey)){
    if(!g.links(r,'unit_record').some(x=>x.id===main.id))continue;
    const pools=g.get('mercenary_pool_to_groups_junctions','group',r.row.key).filter(p=>g.links(p,'group').some(x=>x.id===r.id));
    if(!pools.length)add('MERCENARY_GROUP',r.row.key,r,{reason:'POOL_MEMBERSHIP_UNRESOLVED'});
    for(const p of pools){
      if(g.links(p,'pool').length!==1){holds.push('MERCENARY_POOL_REFERENCE_HELD:'+p.id);continue;}
      const pool=g.links(p,'pool')[0];
      add('MERCENARY_POOL',p.row.pool,p,{groupKey:r.row.key,recruitmentSourceKey:pool.row.recruitment_source,
        factionKey:p.row.faction_requirement,subcultureKey:p.row.subculture_requirement,technologyKey:p.row.tech_requirement,initialCount:p.row.initial_unit_count});
    }
  }
  for(const r of g.get('unit_to_unit_group_junctions','unit',seed.mainKey))for(const upgrade of g.get('unit_upgrade_to_unit_groups','target_unit_group',r.row.unit_group)){
    // The processed schema points both group fields at the same explicit group.
    if(!g.links(r,'unit').some(x=>x.id===main.id))continue;
    const target=g.field(upgrade,'target_unit_group')?.is_reference,member=g.field(r,'unit_group')?.is_reference;
    if(!target||JSON.stringify(target)!==JSON.stringify(member)||g.links(r,'unit_group').length!==1||g.links(upgrade,'target_unit_group').length!==1||
      g.links(r,'unit_group')[0].id!==g.links(upgrade,'target_unit_group')[0].id){holds.push('UPGRADE_GROUP_SCHEMA_HELD:'+upgrade.id);continue;}
    add('UNIT_UPGRADE',upgrade.row.upgrade_key,upgrade,{baseGroupKey:upgrade.row.base_unit_group,targetGroupKey:upgrade.row.target_unit_group,
      requiredRank:upgrade.row.required_rank,resourceCostKey:upgrade.row.resource_cost,
      requiredBuildingKeys:g.get('unit_upgrade_to_building_level_requirements','unit_upgrade',upgrade.row.upgrade_key).map(x=>x.row.building_level),
      technologyKeys:g.get('unit_upgrade_to_tech_requirements','unit_upgrade',upgrade.row.upgrade_key).map(x=>x.row.technology)});
  }
  for(const r of g.get('ritual_payload_spawn_mercenaries','spawnable_unit',seed.mainKey))if(g.links(r,'spawnable_unit').some(x=>x.id===main.id))add('RITUAL_MERCENARY_SPAWN',r.row.payload,r,{performingFaction:r.row.add_mercenaries_to_performing_faction});
  // Capacity changes are unlock conditions, not an independent recruiting pool.
  const capacityConditions=g.get('ritual_payload_change_unit_capacities','unit_record',seed.mainKey).filter(r=>g.links(r,'unit_record').some(x=>x.id===main.id)).map(r=>({payloadKey:r.row.payload,capacity:r.row.capacity,reference:reference(r)}));
  const characterLevelConditions=g.get('campaign_mercenary_unit_character_level_restrictions','unit',seed.mainKey).filter(r=>g.links(r,'unit').some(x=>x.id===main.id)).map(r=>({level:r.row.character_level,factionKey:r.row.faction_override,reference:reference(r)}));
  const coreMercenary=g.get('core_mercenary_units','unit',seed.mainKey).filter(r=>g.links(r,'unit').some(x=>x.id===main.id)).map(reference);
  if(coreMercenary.length)add('CORE_MERCENARY_PERMISSION',seed.mainKey,g.byId.get(coreMercenary[0].rowId));
  if(main.row.additional_building_requirement&&g.links(main,'additional_building_requirement').length!==1)holds.push('ADDITIONAL_BUILDING_REFERENCE_HELD');
  const unitConditions={additionalBuildingKey:main.row.additional_building_requirement,resourceKey:main.row.resource_requirement,
    rawCampaignCap:main.row.campaign_cap,characterLevelConditions,capacityConditions};
  holds.push(sources.length?'CAMPAIGN_EFFECTIVE_ELIGIBILITY_NOT_CLOSED':'NO_CONFIRMED_SOURCE_NOT_PROOF_OF_NON_RECRUITABILITY');
  return {id:seed.id,mainKey:seed.mainKey,requirements,sources,permissionContext,unitConditions,exclusions,
    directBuildingStatus:requirements.length?(holds.some(h=>h!=='CAMPAIGN_EFFECTIVE_ELIGIBILITY_NOT_CLOSED')?'PARTIAL':'COMPLETE'):'UNKNOWN',
    status:sources.length?'PARTIAL':'UNKNOWN',holds:[...new Set(holds)]};
}

export function buildingDefinition(g,r){
  const chain=g.links(r,'chain')[0],variants=g.get('building_culture_variants','building',r.row.level_name);
  const availabilitySets=chain?g.get('building_chain_availability_sets','building_chain',chain.row.key).map(s=>({key:s.row.id,reference:reference(s),
    rules:g.get('building_chain_availabilities','set_id',s.row.id).map(a=>({...a.row,reference:reference(a)}))})):[];
  const names=new Map(g.source.displayNames.rows.map(r=>[r.key,r.text]));
  return {key:r.row.level_name,chainKey:r.row.chain,stage:r.row.level,requiredPrimaryBuildingLevel:r.row.primary_slot_building_building_level_requirement,
    onlyInCapital:r.row.only_in_capital,factionUnique:r.row.faction_unique,visibleInUi:r.row.visible_in_ui,resourceKey:r.row.resource_requirement,
    resourceCostKey:r.row.resource_cost,instanceKey:r.row.building_instance_key,requiredCommanderKey:chain?.row.optional_required_horde_commander??'',
    variants:variants.map(v=>({cultureKey:v.row.culture,subcultureKey:v.row.subculture,factionKey:v.row.faction,disables:v.row.disables,
      name:names.get('building_culture_variants_name_'+g.source.displayNames.keyFields.map(f=>v.row[f]).join(''))??null,reference:reference(v)})),availabilitySets,
    requiredBuildings:g.get('building_level_required_buildings','building_level',r.row.level_name).map(v=>({key:v.row.required,reference:reference(v)})),
    settlementTypes:chain?g.get('settlement_type_to_building_chains_junctions','building_chain',chain.row.key).map(v=>({key:v.row.settlement_type,exclude:v.row.exclude,reference:reference(v)})):[],
    contentPacks:[...g.get('building_level_ownership_content_pack_junctions','building_level',r.row.level_name),...(chain?g.get('building_chain_ownership_content_pack_junctions','building_chain',chain.row.key):[])].map(v=>({raw:v.row,reference:reference(v)})),reference:reference(r)};
}
