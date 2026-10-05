import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SKILLS,STAT_KEYS,verifySetup} from '../skill-rank-runtime-resolution/experiment.mjs';
import {parseLogs} from '../skill-rank-runtime-resolution/resolve.mjs';
import {REVISION,DIAGNOSTIC_REVISION} from './probe.mjs';
const scalar=(cell,type)=>{assert.equal(cell?.status,'VALUE');assert.equal(typeof cell.value,type);if(type==='number')assert(Number.isFinite(cell.value));return cell.value;};
const number=cell=>scalar(cell,'number'),string=cell=>scalar(cell,'string');
export function originalBaseline(){
 const bytes=readFileSync(new URL('./stat-items-original-capture.jsonl',import.meta.url));
 const parsed=parseLogs([{name:'stat-items-original-capture.jsonl',text:bytes.toString('utf8')}]);
 assert.equal(parsed.problems.length,0);assert.equal(parsed.frames.length,1);return parsed.frames[0].frame;
}
// A diagnostic report is never a qualifying rank/stat observation.
export function diagnose(entry,setup,baseline=originalBaseline()){
 verifySetup(setup);
 const f=entry.frame,report={format:'wh3-campaign-stat-items-diagnostic-v1',captureSha256:entry.captureSha256,reference:entry.reference,
  status:'REJECTED',errors:[],controlIssues:[],units:[],semantics:'UNKNOWN',productionEligible:false,rankTrialEligible:false};
 try{
  for(const key of ['gameVersion','snapshotId','unitSize','context','channel'])assert.equal(f[key],setup[key]);
  assert.equal(f.trialId,setup.trialId);assert.equal(f.probeRevision,REVISION);assert.equal(f.statDiagnosticRevision,DIAGNOSTIC_REVISION);
  assert.equal(f.synthetic,false);assert(number(f.timestamp)>0);assert.equal(f.metadataSource,'INSTALLER_VERSION_AND_DECLARED_SETUP');
  assert(['UNAVAILABLE','CAPTURED'].includes(f.status));
  if(f.status==='UNAVAILABLE')assert.match(f.error,/Exact stat lookup unavailable/);
  assert.equal(string(f.owner.AgentSubtypeRecordContextKey),setup.ownerSubtype);assert.deepEqual(f.owner,baseline.owner,'Changed Lord identity/XP/rank');
  assert.deepEqual(f.root,baseline.root,'Changed campaign/turn/context');assert.deepEqual(f.skills,baseline.skills,'Expected unchanged baseline Skills (0/0)');
  for(const key of ['traits','ancillaries','armyRoster'])assert.deepEqual(f[key],baseline[key],`Changed ${key}`);
  for(const key of ['CQI','CommandingCharacterCQI','StanceKey'])assert.deepEqual(f.force[key],baseline.force[key]);
  assert.equal(f.units.status,'COMPLETE');assert.equal(f.units.rows.length,2);
  assert.equal(f.skills.status,'COMPLETE');
  for(const skill of SKILLS){
   const learned=f.skills.rows.filter(r=>string(r.Key)===skill.key);assert.equal(learned.length,1);assert.equal(number(learned[0].Level),0);
   const found=f.units.rows.filter(u=>string(u.MainKey)===skill.mainKey);assert.equal(found.length,1);
   const u=found[0],before=baseline.units.rows.find(x=>string(x.MainKey)===skill.mainKey);
   for(const key of ['MainKey','LandKey','UniqueUiId','DetailsUnitId','DetailsMainKey','ForceCQI','IsCampaign','ExperienceLevel','ExperienceScore','NumEntities','HealthValue','purchasedEffects'])assert.deepEqual(u[key],before[key],`Changed Unit ${key}`);
   assert.equal(u.detailsAccess.status,'CONTEXT');assert.equal(u.detailsAccess.query,'UnitDetailsContext.PreBonusUnitDetailsContext');
   assert.equal(number(u.statScan.size),7,'Collection size differs from supplied baseline');assert.equal(u.statScan.status,'DIAGNOSTIC_ONLY');
   assert.equal(u.statItems.query,'CcoCampaignUnit.UnitDetailsContext.PreBonusUnitDetailsContext.StatList');assert.equal(u.statItems.rows.length,7);
   const unit={mainKey:skill.mainKey,landKey:skill.landKey,unitId:string(u.UniqueUiId),status:'COMPLETE',items:[],directLookup:u.stats};
   for(const [index,row] of u.statItems.rows.entries()){
    assert.equal(row.index,index);assert.equal(row.access.query,`StatList.At(${index})`);
    assert.equal(row.keyQuery,`${u.statItems.query}.At(${index}).Key`);assert.equal(row.valueQuery,`${u.statItems.query}.At(${index}).Value`);
    const valid=cell=>cell?.status==='VALUE';let comparison='UNAVAILABLE';
    if(valid(row.Key)&&valid(row.Value)&&valid(row.viaDetails?.Key)&&valid(row.viaDetails?.Value))comparison=row.Key.value===row.viaDetails.Key.value&&row.Value.value===row.viaDetails.Value.value?'MATCH':'CONFLICT';
    if(row.access.status!=='CONTEXT'||!valid(row.Key)||typeof row.Key.value!=='string'||!row.Key.value||!valid(row.Value)||typeof row.Value.value!=='number'||!Number.isFinite(row.Value.value)||comparison==='CONFLICT')unit.status='PARTIAL';
    unit.items.push({...row,pathComparison:comparison});
   }
   assert.equal(u.statItems.status,unit.items.every(r=>r.access.status==='CONTEXT'&&r.Key.status==='VALUE'&&typeof r.Key.value==='string'&&r.Key.value&&r.Value.status==='VALUE'&&typeof r.Value.value==='number'&&Number.isFinite(r.Value.value))?'COMPLETE':'PARTIAL');
   // Retain all four previous direct lookups; do not infer their replacements.
   for(const key of STAT_KEYS)assert.equal(u.stats[key].access.query,`StatContextFromKey("${key}")`);
   report.units.push(unit);
  }
  if(f.force.IsPreviewingStance?.status!=='VALUE'||f.force.IsPreviewingStance.value!==false)report.controlIssues.push('Stance preview active/unavailable: rank-trial validator will reject this capture');
  report.status=report.units.every(u=>u.status==='COMPLETE')?'COMPLETE':'PARTIAL';
 }catch(error){report.errors.push(error.message);}
 return report;
}
