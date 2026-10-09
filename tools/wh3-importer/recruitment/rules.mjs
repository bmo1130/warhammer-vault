import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
import {loadSource,decodeSource,folder} from './source.mjs';
import {recruitmentGraph,inspectRecruitment,buildingDefinition} from './predict.mjs';
export const serialize=v=>JSON.stringify(v,null,2)+'\n';
const read=p=>JSON.parse(fs.readFileSync(p));
export function verifyInputs(m){assert.equal(m.format,'ca-recruitment-admission-v1');for(const i of m.inputs)assert.equal(digest(read(i.file)),i.hash,'Recruitment source drift: '+i.file);}
export function projectRecruitment(unit,a){
  return {...unit,campaign:{...unit.campaign,...(a.requirements.length?{recruitmentRequirements:a.requirements}:{}),
    ...(a.sources.length?{recruitmentSources:a.sources}:{}),recruitmentReview:{status:a.status,directBuildingStatus:a.directBuildingStatus,
      effectiveStatus:a.sources.length?'PARTIAL_SOURCE':'UNKNOWN',permissionContext:a.permissionContext,unitConditions:a.unitConditions??null}}};
}
export function buildRecruitment(m=read(folder+'manifest.json')){
  verifyInputs(m);const source=loadSource();assert.equal(source.snapshotId,m.snapshotId);assert.equal(digest(snapshotIdentity(source.provenance)),m.snapshotId);
  assert.equal(source.provenance.gameVersion,m.gameVersion);assert.equal(source.scope.units,1110);assert.equal(source.scope.fullImport,false);
  const g=recruitmentGraph(source),raw=read('src/data/units.json'),byId=new Map(raw.map(u=>[u.id,u]));assert.equal(new Set(source.seeds.map(s=>s.id)).size,1110);
  const catalog=source.seeds.map(s=>{const u=byId.get(s.id);assert(u&&u.gameVersion===m.gameVersion);assert.equal(u.campaign?.recruitmentRequirements,undefined);assert.equal(u.campaign?.recruitmentSources,undefined);
    return {...inspectRecruitment(g,s),raceId:u.factionId,landKey:s.landKey};});
  const buildings=Object.fromEntries(source.rows.filter(r=>r.table==='building_levels_tables').map(r=>[r.row.level_name,buildingDefinition(g,r)]));
  assert.equal(Object.keys(buildings).length,source.rows.filter(r=>r.table==='building_levels_tables').length,'Ambiguous building keys require hold');
  const validation=decodeSource(read(folder+'validation.source.json'));assert.equal(validation.snapshotId,m.snapshotId);
  const representatives=read(folder+'representatives.json'),comparisons=[];
  for(const capture of validation.captures){
    const t=catalog.find(t=>t.id===capture.id);assert(t);assert.equal(digest(snapshotIdentity(capture.dump.provenance)),m.snapshotId);
    const expected=capture.dump.rows.filter(r=>r.table==='building_units_allowed_tables'&&r.row.unit===t.mainKey).map(r=>r.row).sort((a,b)=>a.key-b.key);
    const actual=g.get('building_units_allowed','unit',t.mainKey).map(r=>r.row).sort((a,b)=>a.key-b.key);assert.deepEqual(actual,expected,'Independent building trace '+t.id);
    const stages=t.requirements.map(req=>{
      const r=capture.dump.rows.find(r=>r.table==='building_levels_tables'&&r.row.level_name===req.buildingId);assert(r);
      assert.equal(req.buildingStage,r.row.level);assert.equal(req.requiredPrimaryBuildingLevel,r.row.primary_slot_building_building_level_requirement);
      return {buildingKey:req.buildingId,expectedStage:r.row.level,actualStage:req.buildingStage,requiredPrimaryBuildingLevel:req.requiredPrimaryBuildingLevel,factionKey:req.factionKey,matches:true};
    });
    for(const r of capture.extra.rows)assert(source.rows.some(x=>x.table===r.table&&digest(x.row)===digest(r.row)),'Independent special row '+r.id);
    comparisons.push({category:capture.category,id:t.id,mainKey:t.mainKey,kind:'INDEPENDENT_EXTRACTOR_REPLAY_SAME_CA_SNAPSHOT',uiReading:null,
      expectedDirectRows:expected.length,actualDirectRows:actual.length,matches:true,stages,specialTypes:[...new Set(t.sources.filter(s=>s.type!=='BUILDING').map(s=>s.type))],specialRawRows:capture.extra.rows.length,
      factionOverrides:t.permissionContext.factionOverrides,status:t.status});
  }
  assert.equal(comparisons.length,12);
  const statuses=Object.fromEntries(['COMPLETE','PARTIAL','UNKNOWN','N/A'].map(s=>[s,catalog.filter(t=>t.status===s).length]));
  const sourcesStored=catalog.filter(t=>t.sources.length).length,requirementsStored=catalog.filter(t=>t.requirements.length).length;
  const sourceTypes=Object.fromEntries([...new Set(catalog.flatMap(t=>t.sources.map(s=>s.type)))].sort().map(type=>[type,{units:catalog.filter(t=>t.sources.some(s=>s.type===type)).length,entries:catalog.reduce((n,t)=>n+t.sources.filter(s=>s.type===type).length,0)}]));
  const directStatuses=Object.fromEntries(['COMPLETE','PARTIAL','UNKNOWN','N/A'].map(s=>[s,catalog.filter(t=>t.directBuildingStatus===s).length]));
  const multipleBuildings=catalog.filter(t=>new Set(t.requirements.map(r=>r.buildingId)).size>1).length,multipleChains=catalog.filter(t=>new Set(t.requirements.map(r=>r.buildingChainId)).size>1).length;
  const byCatalog=new Map(catalog.map(t=>[t.id,t])),rosters=read('src/data/factionRosters.json').rosters;
  const rosterCoverage=read('src/data/factionRosters.json').coverage;
  const races=rosters.map(r=>{const us=r.units.map(u=>byCatalog.get(u.id)).filter(Boolean);return {raceId:r.factionId,rosterStatus:rosterCoverage.find(c=>c.factionId===r.factionId)?.status,total:us.length,building:us.filter(t=>t.requirements.length).length,special:us.filter(t=>t.sources.some(s=>s.type!=='BUILDING')).length,
    PARTIAL:us.filter(t=>t.status==='PARTIAL').length,UNKNOWN:us.filter(t=>t.status==='UNKNOWN').length,verifiedEffective:0};});
  const summary={production:1110,requirements:{before:0,after:requirementsStored,unknownBefore:1110,unknownAfter:1110-requirementsStored},
    sources:{before:0,after:sourcesStored,unknownBefore:1110,unknownAfter:1110-sourcesStored},verifiedEffectiveSources:{before:0,after:0,unknownOrPartial:1110},
    partialEffectiveSourceUnits:sourcesStored,buildingUnits:requirementsStored,specialClassifiedUnits:catalog.filter(t=>t.sources.some(s=>s.type!=='BUILDING')).length,
    notApplicable:0,statuses,directBuildingStatuses:directStatuses,sourceTypes,multipleBuildings,multipleChains,
    additionalUnlockConditionUnits:catalog.filter(t=>t.unitConditions?.characterLevelConditions.length||t.unitConditions?.capacityConditions.length||t.sources.some(s=>s.technologyKeys?.length||s.requiredBuildingKeys?.length)).length};
  const report={format:'ca-recruitment-review-v1',baselineCommit:m.baselineCommit,gameVersion:m.gameVersion,snapshotId:m.snapshotId,inputs:m.inputs,
    schemaVersions:source.schemas.map(s=>({table:s.table,version:s.version})),provenance:source.provenance,
    sourceReference:folder+'catalog.source.json',expandedSourceHash:digest(source),confidence:representatives.limit,
    effectiveScope:read(folder+'references.json').scope,summary,races,comparisons,unavailable:source.unavailable.map(u=>({table:u.table,field:u.field,keys:u.keys.length,reason:u.reason})),
    candidateRules:[{rule:'enabled=true globally',result:'REJECTED: would discard all 6745 empty-faction baseline rows'},
      {rule:'level equals Tier',result:'REJECTED by processed building_levels.level description'},
      {rule:'infer later chain levels',result:'REJECTED by building_units_allowed.unit description; only explicit rows retained'},
      {rule:'unit military permission proves campaign recruitment',result:'REJECTED: buildability/source/unlocks independently required'},
      {rule:'no source implies N/A',result:'REJECTED: three units remain UNKNOWN'}],
    catalog,held:catalog.map(t=>({id:t.id,mainKey:t.mainKey,status:t.status,holds:t.holds,permissionContext:t.permissionContext,
      sourceKeys:t.sources.map(s=>({type:s.type,key:s.key,reference:s.reference}))})),buildingDefinitions:buildings};
  const projection={format:'unit-recruitment-admissions-v1',gameVersion:m.gameVersion,snapshotId:m.snapshotId,sourceHash:digest(report),reportReference:folder+'report.json',
    buildings,factions:source.rows.filter(r=>r.table==='factions_tables').map(r=>({key:r.row.key,militaryGroup:r.row.military_group,subcultureKey:r.row.subculture,
      cultureKey:g.links(r,'subculture')[0]?.row.culture??null,reference:{table:r.table,key:r.key,rowId:r.id}})),
    admissions:catalog.map((t,i)=>({id:t.id,mainKey:t.mainKey,landKey:t.landKey,originalCampaign:byId.get(t.id).campaign??null,
      requirements:t.requirements,sources:t.sources,status:t.status,directBuildingStatus:t.directBuildingStatus,permissionContext:t.permissionContext,unitConditions:t.unitConditions??null,
      reportPointer:'/catalog/'+i,kind:'CA_DIRECT_REFERENCE_WITH_PARTIAL_EFFECTIVE_CONTEXT'}))};
  return {report,projection};
}
