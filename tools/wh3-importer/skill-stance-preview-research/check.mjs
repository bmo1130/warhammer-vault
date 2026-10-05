import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {digest,SKILLS,STAT_KEYS} from '../skill-rank-runtime-resolution/experiment.mjs';
import {parseLogs as rankLogs} from '../skill-rank-runtime-resolution/resolve.mjs';
import {verifyCanonicalUnit} from '../skill-rank-runtime-parent-stats/probe.mjs';
import {FORMAT,PREFIX,REVISION,plan} from './probe.mjs';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const scalar=(c,type)=>{assert.equal(c?.status,'VALUE','Unavailable diagnostic cell');assert.equal(typeof c.value,type);if(type==='number')assert(Number.isFinite(c.value));return c.value;};
const num=c=>scalar(c,'number'),str=c=>scalar(c,'string'),bool=c=>scalar(c,'boolean');
export function baseline(){
 const b=readFileSync(new URL('./evidence/script_log_051026_1319.txt',import.meta.url));
 const p=rankLogs([{name:'script_log_051026_1319.txt',text:b.toString('utf8'),sha256:sha(b)}]);
 assert.equal(p.problems.length,0);assert.equal(p.frames.length,1);return p.frames[0];
}
export function verifySetup(s){
 const b=baseline();assert.equal(s.format,'wh3-stance-preview-setup-v1');
 assert.equal(s.baselineCaptureSha256,b.captureSha256);
 for(const k of ['gameVersion','snapshotId','unitSize','context','channel'])assert.equal(s[k],b.frame[k]);
 assert.equal(s.ownerCQI,num(b.frame.owner.CQI));assert.equal(s.forceCQI,num(b.frame.force.CQI));
 assert.equal(s.ownerSubtype,str(b.frame.owner.AgentSubtypeRecordContextKey));
 assert(typeof s.trialId==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(s.trialId));
 assert.equal(typeof s.unitsPanel,'boolean');assert.deepEqual(s.steps,plan(s.unitsPanel));return s;
}
export function parseLogs(inputs){
 const frames=[],problems=[],seen=new Map();let duplicates=0;
 for(const input of inputs){assert(Buffer.byteLength(input.text)<=50_000_000);for(const [i,line] of input.text.split(/\r?\n/).entries()){
  const offset=line.indexOf(PREFIX);if(offset<0)continue;
  const reference={file:input.name,line:i+1,inputSha256:input.sha256??sha(input.text)};
  try{const raw=line.slice(offset+PREFIX.length);assert(raw.length<500_000);const frame=JSON.parse(raw);assert.equal(frame.format,FORMAT);assert(typeof frame.captureId==='string'&&frame.captureId.length>0);
   const captureSha256=digest(frame);if(seen.has(frame.captureId)){assert.equal(seen.get(frame.captureId),captureSha256,'Conflicting capture ID');duplicates++;continue;}
   seen.set(frame.captureId,captureSha256);frames.push({frame,reference,captureSha256});
  }catch(error){problems.push({reference,reason:error.message});}
 }}return {frames,problems,duplicates};
}
const forceFields={CQI:'CQI',CommandingCharacterCQI:'CommandingCharacterContext.CQI',IsSelected:'IsSelected',IsPreviewingStance:'IsPreviewingStance',StanceKey:'ActiveStanceContext.Key',StancePreviewPercentCost:'StancePreviewPercentCost',CanSwitchToPreviewStance:'CanSwitchToPreviewStance'};
function route(row,prefix,source){
 assert.equal(row.source,source);assert.deepEqual(row.queries,Object.fromEntries(Object.entries(forceFields).map(([k,v])=>[k,prefix+v])));
 assert.equal(num(row.cells.CQI),949);assert.equal(num(row.cells.CommandingCharacterCQI),1065);
 bool(row.cells.IsSelected);bool(row.cells.IsPreviewingStance);str(row.cells.StanceKey);
 // Supplementary cost/eligibility are retained as raw cells, never defaulted.
 assert(row.cells.StancePreviewPercentCost?.status);assert(row.cells.CanSwitchToPreviewStance?.status);
 return row.cells;
}
export function inspect(entry,setup){
 verifySetup(setup);const f=entry.frame,b=baseline().frame;
 assert.equal(f.format,FORMAT);assert.equal(f.stanceDiagnosticRevision,REVISION);assert.equal(f.status,'DIAGNOSTIC_CAPTURED');
 assert.equal(f.rankTrialEligible,false);assert.equal(f.productionEligible,false);assert.equal(f.synthetic,false);
 assert.equal(f.uiStateSource,'PLANNED_USER_ACTION_NOT_API_VERIFIED');assert.equal(f.metadataSource,b.metadataSource);assert(num(f.timestamp)>0);
 for(const k of ['gameVersion','snapshotId','unitSize','context','channel','trialId'])assert.equal(f[k],setup[k]);
 for(const k of ['probeRevision','statDiagnosticRevision','statExtractionRevision'])assert.equal(f[k],b[k],'Changed canonical/diagnostic source revision');
 assert(Number.isInteger(f.stepOrdinal)&&f.stepOrdinal>=1&&f.stepOrdinal<=setup.steps.length);assert.equal(f.declaredStep,setup.steps[f.stepOrdinal-1]);
 for(const k of ['owner','root','skills','traits','ancillaries','activeBundles','armyRoster'])assert.deepEqual(f[k],b[k],`Changed baseline ${k}`);
 for(const skill of SKILLS){const rows=f.skills.rows.filter(r=>str(r.Key)===skill.key);assert.equal(rows.length,1);assert.equal(num(rows[0].Level),0,'Skill points must not be used');}
 assert.equal(f.force.CQI.value,setup.forceCQI);assert.equal(f.force.CommandingCharacterCQI.value,setup.ownerCQI);bool(f.force.IsPreviewingStance);
 assert.equal(f.units.status,'COMPLETE');assert.equal(f.units.rows.length,2);const statChanges=[];
 for(const u of f.units.rows){
  verifyCanonicalUnit(u);const before=b.units.rows.find(x=>str(x.MainKey)===str(u.MainKey));assert(before,'Wrong Unit');
  for(const k of ['MainKey','LandKey','UniqueUiId','DetailsUnitId','DetailsMainKey','ForceCQI','IsCampaign','ExperienceLevel','ExperienceScore','NumEntities','HealthValue','purchasedEffects'])assert.deepEqual(u[k],before[k],`Changed Unit ${k}`);
  for(const k of STAT_KEYS)if(num(u.stats[k].Value)!==num(before.stats[k].Value))statChanges.push({mainKey:str(u.MainKey),statKey:k,before:num(before.stats[k].Value),observed:num(u.stats[k].Value)});
 }
 assert.equal(new Set(f.units.rows.map(u=>str(u.MainKey))).size,2,'Duplicate Unit');
 const d=f.stanceDiagnostic;assert.equal(d.routes.length,2);
 const materialized=route(d.routes[0],'','MATERIALIZED_OWNER_FORCE'),parent=route(d.routes[1],'MilitaryForceContext.','PARENT_OWNER_FORCE');
 assert.deepEqual(materialized.IsPreviewingStance,f.force.IsPreviewingStance);
 assert.deepEqual(d.originalFlagBefore,f.force.IsPreviewingStance);assert.deepEqual(d.originalFlagAfter,f.force.IsPreviewingStance,'Flag changed within F9');
 assert.equal(d.unitRoutes.status,'COMPLETE');assert.equal(d.unitRoutes.rows.length,2);
 for(const row of d.unitRoutes.rows){const unit=f.units.rows.find(u=>str(u.MainKey)===str(row.MainKey));assert(unit);assert.deepEqual(row.UniqueUiId,unit.UniqueUiId);route(row,'MilitaryForceContext.','PARENT_UNIT_FORCE');}
 assert.equal(new Set(d.unitRoutes.rows.map(u=>str(u.MainKey))).size,2);
 const selected=f.declaredStep!=='UNSELECTED_MAP';assert.equal(bool(d.owner.IsSelected),selected,'Wrong Lord selection state');
 assert.equal(f.selectionDiagnostic.pinnedOwnerCount,1);assert.equal(f.selectionDiagnostic.selectedPlayerCount,selected?1:0);
 assert.equal(bool(d.owner.IsPreviewingMove),false,'Movement preview');assert.equal(bool(d.owner.IsDetailsOnly),false,'Details-only character');assert.equal(bool(d.owner.IsOnMap),true);
 const m=d.model;assert.equal(m.source,'cm:get_military_force_by_cqi');assert.equal(m.queryCQI,setup.forceCQI);assert.equal(m.access.status,'CONTEXT');assert.equal(bool(m.IsNull),false);
 assert.equal(num(m.CQI),setup.forceCQI);assert.equal(num(m.CommandingCharacterCQI),setup.ownerCQI);
 assert.equal(str(m.StanceKey),str(b.force.StanceKey),'Committed model stance must remain DEFAULT');
 assert.deepEqual(m.queries,{IsNull:'is_null_interface()',CQI:'command_queue_index()',StanceKey:'active_stance()',CommandingCharacterCQI:'general_character():command_queue_index()',ActionPointsRemainingPercent:'general_character():action_points_remaining_percent()'});
 const ap=num(m.ActionPointsRemainingPercent),ccoAp=num(d.owner.ActionPointPercent);assert(Number.isInteger(ap)&&ap>=0&&ap<=100);assert(ccoAp>=0&&ccoAp<=1);
 // No conversion between these independent AP units is inferred.
 const flags=[materialized.IsPreviewingStance,parent.IsPreviewingStance,...d.unitRoutes.rows.map(r=>r.cells.IsPreviewingStance)].map(bool);
 const keys=[materialized.StanceKey,parent.StanceKey,...d.unitRoutes.rows.map(r=>r.cells.StanceKey)].map(str);
 assert(statChanges.length===0||f.declaredStep==='STANCE_OPEN_ALTERNATIVE_HOVER_ONLY','Baseline stat changed outside the UI preview diagnostic');
 return {captureSha256:entry.captureSha256,reference:entry.reference,stepOrdinal:f.stepOrdinal,declaredStep:f.declaredStep,flags,keys,modelStance:str(m.StanceKey),modelAP:ap,ccoAP:ccoAp,ownerSelected:selected,forceSelected:bool(materialized.IsSelected),pathConflict:flags.some(x=>x!==flags[0]),canonicalStatus:'COMPLETE',statChanges};
}
export function compare(parsed,setup){
 const report={format:'wh3-stance-preview-comparison-v1',status:'REJECTED',errors:[...parsed.problems],observations:[],patterns:[],uiStateVerified:false,
  flagMeaning:'UNKNOWN',gateDecision:'KEEP_EXISTING_FALSE_GATE',trialReady:false,rankTrialEligible:false,semantics:'UNKNOWN',productionEligible:false};
 try{
  verifySetup(setup);assert.equal(parsed.problems.length,0);assert(parsed.frames.length>0);assert(parsed.frames.length<=setup.steps.length);
  const rows=parsed.frames.map(e=>inspect(e,setup));
  rows.forEach((r,i)=>{assert.equal(r.stepOrdinal,i+1,'Missing/reordered/restarted step');assert.equal(r.modelAP,rows[0].modelAP,'Changed committed AP');assert.equal(r.ccoAP,rows[0].ccoAP,'Changed remaining CCO AP');});
  report.observations=rows;report.status=rows.length===setup.steps.length?'BOUNDED_DIAGNOSTIC_COMPLETE_REVIEW_REQUIRED':'BOUNDED_DIAGNOSTIC_PARTIAL';
  if(rows.some(r=>r.pathConflict))report.patterns.push('SAME_FORCE_SCALAR_ROUTE_DISAGREEMENT');
  if(rows.every(r=>r.flags.every(Boolean)))report.patterns.push('ALL_OBSERVED_ROUTES_TRUE');
  if(rows.some(r=>r.flags.some(Boolean))&&rows.some(r=>r.flags.some(x=>!x)))report.patterns.push('FLAG_CHANGED_ACROSS_DECLARED_UI_STATES');
  if(rows.some(r=>r.keys.some(k=>k!==r.modelStance)))report.patterns.push('CCO_STANCE_KEY_DIFFERS_FROM_COMMITTED_MODEL');
  if(rows.some(r=>r.statChanges.length))report.patterns.push('STAT_CHANNEL_CHANGED_DURING_ALTERNATIVE_UI_HOVER');
  else report.patterns.push('BASELINE_STATS_UNCHANGED');
  report.patterns.push('MODEL_DEFAULT_UNCHANGED');
 }catch(error){report.errors.push({reason:error.message});}
 return report;
}
