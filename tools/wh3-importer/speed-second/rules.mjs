import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
import {decodeSource} from '../missile-rules/source.mjs';
export const folder='tools/wh3-importer/speed-second/';
export const read=p=>JSON.parse(fs.readFileSync(p));
export const serialize=v=>JSON.stringify(v,null,2)+'\n';
const load=p=>decodeSource(read(folder+p));
const movementFields=['walk_speed','run_speed','charge_speed','fly_speed','flying_charge_speed','acceleration','deceleration','turn_speed','locomotion_constants'];
// Selection is topology-driven. No unit name/key participates in the formula.
export function predictSecond(t){
  const hold=reason=>({value:null,rule:null,role:null,field:null,reasons:[reason]});
  const articulatedMount=t.profile==='ARTICULATED'&&t.roles.man&&t.roles.mount&&t.refs.mount&&t.refs.engine&&t.refs.articulation&&
    ['Generic_No_Crew_Rotate','Generic_No_Crew_Fixed','Generic_3_Crew'].includes(t.flags.engine_type);
  // A missing non-selected component cannot invalidate a proven mount card
  // source. Keep all missing engine/articulation rows in the audit separately.
  if(t.missing.length&&!(articulatedMount&&t.missing.every(m=>/^(engine|articulation)\./.test(m))))return hold('MISSING_EXACT_9_0_2_SOURCE');
  if(t.extraSources.length)return hold('ADDITIONAL_MOVEMENT_SOURCE');
  if(t.flags.mounted_draughts!==false)return hold('MOUNTED_DRAUGHT_SEMANTICS_UNVALIDATED');
  let role,rule;
  const keys=Object.keys(t.roles).sort().join(',');
  if(t.profile==='MAN_ONLY'&&keys==='man'){role='man';rule=t.flags.sync_locomotion?'SYNCHRONIZED_MAN_RUN':'SINGLE_ENTITY_CARD';}
  else if(t.profile==='MOUNTED'&&keys==='man,mount'){role='mount';rule='MOUNT_CARD';}
  else if(t.profile==='ENGINE'&&keys==='engine,man'&&(
    /^Generic_[235]_Crew$/.test(t.flags.engine_type)&&t.classification.category==='artillery'||
    t.flags.engine_type==='Generic_No_Crew_Rotate'&&['articulated_entity','large_entity'].includes(t.roles.engine.locomotion_constants))){role='engine';rule='ENGINE_CARD';}
  else if(articulatedMount){role='mount';rule='ARTICULATED_MOUNT_CARD';}
  else return hold('UNVALIDATED_COMPONENT_TOPOLOGY');
  const r=t.roles[role];
  if(![r.run_speed,r.fly_speed,r.flying_charge_speed].every(v=>Number.isFinite(v)&&v>=0))return hold('INVALID_MOVEMENT_VALUE');
  if(t.flags.sync_locomotion&&role!=='man')return hold('SYNCHRONIZED_MULTI_COMPONENT');
  // The observed cohort has fly >= run. Independent references do not resolve
  // positive-fly-below-run (fly-or-run vs max) or any rounding policy.
  if(r.fly_speed>0&&r.fly_speed<r.run_speed)return hold('FLY_BELOW_RUN_DISPLAY_UNVALIDATED');
  const field=r.fly_speed>0?'fly_speed':'run_speed',value=r[field]*10;
  if(!Number.isSafeInteger(value)||value<=0)return hold('NONINTEGER_OR_NONPOSITIVE_DISPLAY');
  if(field==='fly_speed')rule=role==='mount'?'FLIGHT_MOUNT_FLY':'FLIGHT_MAN_FLY';
  return {value,rule,role,field,reasons:[]};
}
export function buildSecond(manifest=read(folder+'manifest.json')){
  assert.equal(manifest.format,'unit-base-card-speed-second-manifest-v1');assert.equal(manifest.gameVersion,'9.0.2.0');
  for(const pin of manifest.inputs)assert.equal(digest(read(pin.file)),pin.hash,'Speed second source drift: '+pin.file);
  const old=read('tools/wh3-importer/speed-rules/report.json'),legacy=read('src/data/unitSpeedRuleAdmissions.json');
  const stored=load('stored.source.json'),fresh=load('movement.source.json'),reference=load('reference.source.json'),independent=load('independent.source.json');
  assert.equal(stored.snapshotId,old.snapshotId);assert.equal(manifest.snapshotId,old.snapshotId);
  assert.equal(digest(snapshotIdentity(fresh.provenance)),fresh.snapshotId);
  for(const pin of stored.inputs)assert.equal(digest(read(pin.file)),pin.hash,'Stored 9.0.2 input drift');
  for(const r of stored.rows)assert.equal(digest(snapshotIdentity(r.provenance)),old.snapshotId);
  const cardMap=new Map(reference.cards.map(c=>[c.mainKey,c]));assert.equal(cardMap.size,1110);
  const catalog=stored.chains.map(c=>{
    const previous=old.catalog.find(t=>t.id===c.id);assert(previous&&previous.prediction.value===null);
    const t={id:c.id,name:previous.name,mainKey:c.mainKey,landKey:c.landKey,profile:previous.profile,
      classification:previous.classification,flags:{...previous.flags,engine_type:stored.rows.find(r=>r.row.table==='battlefield_engines_tables'&&r.row.row.key===c.refs.engine)?.row.row.engine_type??previous.flags.engine_type},refs:c.refs,extraSources:previous.extraSources,missing:c.missing,
      roles:Object.fromEntries(Object.entries(c.roles).map(([k,r])=>[k,{key:r.key,...Object.fromEntries(movementFields.map(f=>[f,r[f]??null]))}])),
      originalStatus:previous.status,originalReasons:previous.prediction.reasons};
    // Every previously captured component/field must agree with the recovered row.
    for(const [role,r]of Object.entries(previous.roles))for(const [f,v]of Object.entries(r))assert.equal(t.roles[role][f],v,t.id+'.'+role+'.'+f);
    t.prediction=predictSecond(t);
    t.reference={...cardMap.get(t.mainKey),kind:'PUBLISHER_DERIVED_CARD',directMeasurement:false};
    t.referenceMatches=t.prediction.value===t.reference.speed;
    // Reference mismatch blocks admission, never silently changes the formula.
    if(t.prediction.value!==null&&!t.referenceMatches)t.prediction={value:null,rule:null,role:null,field:null,reasons:['INDEPENDENT_CARD_CONFLICT']};
    t.status=t.prediction.value!==null?'COMPLETE':t.missing.length?'UNKNOWN':'PARTIAL';
    t.freshComparison=Object.fromEntries(Object.entries(t.roles).map(([role,r])=>{
      const row=fresh.rows.find(x=>x.table==='battle_entities_tables'&&x.row.key===r.key);
      return [role,{key:r.key,result:row&&movementFields.every(f=>row.row[f]===r[f])?'MATCH_MOVEMENT_FIELDS':'DIFFERENT_OR_MISSING',version:fresh.provenance.gameVersion}];}));
    t.independentRaw=Object.fromEntries(Object.entries(t.roles).map(([role,r])=>{
      const row=independent.rows.find(x=>x.table==='battle_entities_tables'&&x.row.key===r.key);
      return [role,{key:r.key,result:row&&movementFields.every(f=>typeof r[f]==='number'?Number(row.row[f])===r[f]:row.row[f]===r[f])?'MATCH_MOVEMENT_FIELDS':'DIFFERENT_OR_MISSING',version:independent.patch}];}));
    t.independentLandRefsMatch=Object.entries(c.refs).every(([role,value])=>{
      const row=independent.rows.find(r=>r.table==='land_units_tables'&&r.row.key===c.landKey)?.row;
      return row?.[{man:'man_entity',mount:'mount',engine:'engine',articulation:'articulated_record'}[role]]===value;
    });
    if(t.prediction.value!==null){assert(t.independentLandRefsMatch,'Independent component-reference drift '+t.id);
      assert.equal(t.independentRaw[t.prediction.role].result,'MATCH_MOVEMENT_FIELDS','Independent selected movement drift '+t.id);}
    return t;
  });
  assert.equal(catalog.length,202);
  const regression=legacy.admissions.map(a=>{
    const t=old.catalog.find(t=>t.id===a.id);assert.equal(t.prediction.value,a.value);
    assert.equal(cardMap.get(a.mainKey).speed,a.value,'Existing 908/reference conflict');
    return {id:a.id,expected:a.value,actual:t.prediction.value,reference:cardMap.get(a.mainKey).speed,result:'MATCH'};
  });assert.equal(regression.length,908);
  const complete=catalog.filter(t=>t.status==='COMPLETE');
  const browser=read(folder+'browser-card-evidence.json');assert.equal(browser.gameExecuted,false);assert.equal(browser.kind,'WEBSITE_DERIVED_CARD_NOT_GAME_UI');
  const browserValidation=browser.cards.map(card=>{const t=catalog.find(t=>t.mainKey===card.mainKey);assert(t&&t.prediction.value!==null);
    assert.equal(t.prediction.value,card.speed,'Independent website card conflict '+card.mainKey);
    assert.equal(t.independentRaw[t.prediction.role].result,'MATCH_MOVEMENT_FIELDS','9.0.0 card requires matching raw movement fields');
    return {...card,expected:t.prediction.value,actual:card.speed,result:'MATCH',version:browser.gameVersion,reference:browser.url};});
  const groups=[['FLIGHT','UNVALIDATED_FLIGHT_DISPLAY'],['MISSING','MISSING_EXACT_SOURCE:'],['SYNC','UNVALIDATED_SYNC_OR_DRAUGHT'],['ENGINE','UNVALIDATED_ENGINE_STRUCTURE'],['ARTICULATED','ARTICULATION_PRECEDENCE_UNVALIDATED']].map(([type,reason])=>{
    const units=catalog.filter(t=>t.originalReasons.some(r=>r.startsWith(reason)));
    return {type,before:units.length,recovered:units.filter(t=>!t.missing.length).length,promoted:units.filter(t=>t.status==='COMPLETE').length,held:units.filter(t=>t.status!=='COMPLETE').length};});
  const summary={production:1110,before:908,after:908+complete.length,promoted:complete.length,
    COMPLETE:908+complete.length,PARTIAL:catalog.filter(t=>t.status==='PARTIAL').length,UNKNOWN:catalog.filter(t=>t.status==='UNKNOWN').length,
    regressionMatches:regression.length,flightPromoted:groups.find(g=>g.type==='FLIGHT').promoted,
    missingRecovered:groups.find(g=>g.type==='MISSING').recovered,missingPromoted:groups.find(g=>g.type==='MISSING').promoted,specialPromoted:groups.filter(g=>!['FLIGHT','MISSING'].includes(g.type)).reduce((n,g)=>n+g.promoted,0),
    newDirectGameMeasurements:0,referenceComparisons:1110,referenceMatches:908+complete.filter(t=>t.referenceMatches).length};
  const report={format:'unit-base-card-speed-second-report-v1',gameVersion:manifest.gameVersion,snapshotId:manifest.snapshotId,
    baselineCommit:manifest.baselineCommit,inputs:manifest.inputs,summary,groups,regression,browserValidation,catalog,
    confidence:{rawSource:'STORED_CA_9_0_2_ONLY',freshSourceVersion:fresh.provenance.gameVersion,freshSourceAdmitted:false,
      directGameMeasurements:0,publisherCommitResolved:false,independentSourceVersion:independent.patch,
      distinction:'Independent derived card comparisons and historical raw export; no new game UI measurement.'}};
  const sourceHash=digest(report);
  const projection={format:'unit-base-card-speed-second-admissions-v1',gameVersion:manifest.gameVersion,snapshotId:manifest.snapshotId,sourceHash,
    reportReference:folder+'report.json',admissions:complete.map(t=>{const p=t.prediction,r=t.roles[p.role];return {id:t.id,mainKey:t.mainKey,landKey:t.landKey,
      originalSpeed:null,value:p.value,kind:'EMPIRICAL_STRUCTURE_SPEED',rule:p.rule,selectedRole:p.role,entityKey:r.key,
      rawRunSpeed:r.run_speed,rawDisplaySpeed:r[p.field],rawField:p.field,rounding:'NONE',directCardReference:null,
      independentCardReference:t.reference.page};})};
  return {report,projection};
}
