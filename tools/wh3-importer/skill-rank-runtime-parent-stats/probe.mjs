import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildProbe as diagnosticProbe} from '../skill-rank-runtime-stat-fix/probe.mjs';
import {diagnose} from '../skill-rank-runtime-stat-fix/stat-items.mjs';
import {STAT_KEYS} from '../skill-rank-runtime-resolution/experiment.mjs';
import * as historical from '../skill-rank-runtime-resolution/resolve.mjs';
export const REVISION='campaign-parent-details-stats-v1';
export const BASE_QUERY='CcoCampaignUnit.UnitDetailsContext.PreBonusUnitDetailsContext.StatList';
export function buildProbe(){
 const source=diagnosticProbe(),anchor='        u.purchasedEffects =';
 assert.equal(source.split(anchor).length,2);
 const fragment=readFileSync(new URL('./canonical-stats.lua',import.meta.url),'utf8').replace(/\r\n/g,'\n');
 return source.replace(anchor,fragment+anchor).replace('local ok, err = pcall(function()',`f.statExtractionRevision = "${REVISION}"\nlocal ok, err = pcall(function()`);
}
export function verifyCanonicalUnit(u){
 assert.equal(u.detailsAccess?.status,'CONTEXT');assert.equal(u.detailsAccess.query,'UnitDetailsContext.PreBonusUnitDetailsContext');
 assert.equal(u.statExtraction?.source,'PARENT_DETAILS_STAT_LIST');assert.equal(u.statExtraction.status,'COMPLETE');assert.deepEqual(u.statExtraction.errors,[]);
 const size=u.statScan?.size;assert.equal(size?.status,'VALUE');assert(Number.isSafeInteger(size.value)&&size.value>=0&&size.value<=128);
 assert.equal(u.statItems.query,BASE_QUERY);assert.equal(u.statItems.rows.length,size.value);
 const seen=new Map();
 for(const [index,row] of u.statItems.rows.entries()){
  assert.equal(row.index,index);assert.equal(row.keyQuery,`${BASE_QUERY}.At(${index}).Key`);assert.equal(row.valueQuery,`${BASE_QUERY}.At(${index}).Value`);
  const {Key,Value}=row.viaDetails;assert.equal(Key?.status,'VALUE');assert.equal(typeof Key.value,'string');assert(Key.value.trim());
  assert.equal(Value?.status,'VALUE');assert.equal(typeof Value.value,'number');assert(Number.isFinite(Value.value));
  assert(!seen.has(Key.value),'Duplicate observed stat key');seen.set(Key.value,row);
 }
 assert.equal(u.statStatus,'COMPLETE');assert.deepEqual(Object.keys(u.stats).sort(),[...STAT_KEYS].sort());
 for(const key of STAT_KEYS){
  const row=seen.get(key);assert(row,`Missing required exact stat key: ${key}`);
  const stat=u.stats[key];assert.equal(stat.source,'PARENT_DETAILS_STAT_LIST');assert.equal(stat.index,row.index);
  assert.equal(stat.keyQuery,row.keyQuery);assert.equal(stat.query,row.valueQuery);
  assert.deepEqual(stat.Key,row.viaDetails.Key);assert.deepEqual(stat.Value,row.viaDetails.Value);
 }
 return seen;
}
function verifyFrameSource(entry){
 assert.equal(entry.frame.statExtractionRevision,REVISION);assert.equal(entry.frame.units?.status,'COMPLETE');assert.equal(entry.frame.units.rows.length,2);
 entry.frame.units.rows.forEach(verifyCanonicalUnit);
}
function provenance(observation,entry){
 const u=entry.frame.units.rows.find(u=>u.MainKey.value===observation.unitMainKey),stat=u.stats[observation.statKey];
 observation.provenance.query=stat.query;observation.provenance.keyQuery=stat.keyQuery;observation.provenance.rowIndex=stat.index;
 observation.provenance.statExtractionRevision=REVISION;
}
export function inspectFrame(entry,setup){
 verifyFrameSource(entry);const checked=historical.inspectFrame(entry,setup);
 checked.observations.forEach(o=>provenance(o,entry));return checked;
}
export function resolve(parsed,setup){
 const problems=[...parsed.problems];
 for(const e of parsed.frames){try{verifyFrameSource(e);}catch(error){problems.push({reference:e.reference,captureId:e.frame.captureId,reason:error.message});}}
 const result=historical.resolve({...parsed,problems},setup),byHash=new Map(parsed.frames.map(e=>[e.captureSha256,e]));
 for(const o of result.observations)provenance(o,byHash.get(o.provenance.captureSha256));
 for(const skill of result.skills)for(const series of skill.observed)for(const o of series)provenance(o,byHash.get(o.provenance.captureSha256));
 return {...result,statExtractionRevision:REVISION};
}
export function originalBaseline(){
 const text=readFileSync(new URL('./runtime-1150-original.jsonl',import.meta.url),'utf8');
 const p=historical.parseLogs([{name:'runtime-1150-original.jsonl',text}]);assert.equal(p.problems.length,0);assert.equal(p.frames.length,1);return p.frames[0].frame;
}
export function checkBaseline(entry,setup,baseline=originalBaseline()){
 const report={format:'wh3-parent-stats-baseline-check-v1',status:'REJECTED',canonicalStatus:'UNAVAILABLE',trialReady:false,errors:[],trialBlockers:[],
  captureSha256:entry.captureSha256,reference:entry.reference,semantics:'UNKNOWN',productionEligible:false,stats:[]};
 try{
  // Reuse the previous exact baseline identity/control guard with unchanged
  // direct diagnostics. The original raw frame and its hash remain untouched.
  const view=structuredClone(entry.frame);for(const u of view.units.rows)u.stats=u.directLookup;
  const identity=diagnose({...entry,frame:view},setup,baseline);assert.deepEqual(identity.errors,[],'Baseline identity/rank/controls mismatch');
  verifyFrameSource(entry);assert.equal(entry.frame.status,'CAPTURED');
  for(const u of entry.frame.units.rows){
   const before=baseline.units.rows.find(b=>b.MainKey.value===u.MainKey.value),previous=new Map(before.statItems.rows.map(r=>[r.viaDetails.Key.value,r.viaDetails.Value]));
   for(const key of STAT_KEYS){assert.deepEqual(u.stats[key].Value,previous.get(key),'Changed observed rank-0 baseline value');report.stats.push({unitMainKey:u.MainKey.value,key,value:u.stats[key].Value,query:u.stats[key].query,keyQuery:u.stats[key].keyQuery,rowIndex:u.stats[key].index});}
  }
  report.canonicalStatus='COMPLETE';
  try{const inspected=inspectFrame(entry,setup);assert.deepEqual(inspected.ranks,[0,0]);report.trialReady=true;report.status='READY_FOR_EIGHT_CAPTURE';}
  catch(error){report.status='CANONICAL_COMPLETE_CONTROL_BLOCKED';report.trialBlockers.push(error.message);}
 }catch(error){report.errors.push(error.message);}
 return report;
}
