import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {SKILLS,STAT_KEYS,STATES,MODELS,SNAPSHOT,VERSION,PREFIX,digest,stable,deltas,verifySetup} from './experiment.mjs';
const scalar=(c,type)=>{assert(c&&c.status==='VALUE',`Unavailable cell: ${c?.status??'MISSING'}`);assert(typeof c.value===type&&(!(type==='number')||Number.isFinite(c.value)),'Invalid VALUE cell');return c.value;};
const val=c=>scalar(c,'number'),str=c=>{const value=scalar(c,'string');assert(value.trim().length>0,'Empty source identity');return value;},bool=c=>scalar(c,'boolean');
export function parseLogs(inputs){
 const frames=[],problems=[],seen=new Map();let duplicates=0;
 for(const input of inputs){assert(Buffer.byteLength(input.text)<=50_000_000,'Log too large');for(const [i,line] of input.text.split(/\r?\n/).entries()){const offset=line.indexOf(PREFIX);if(offset<0)continue;const reference={file:input.name,line:i+1,inputSha256:input.sha256??createHash('sha256').update(input.text).digest('hex')};
  try{const raw=line.slice(offset+PREFIX.length);assert(raw.length<500_000,'Overlong frame');const frame=JSON.parse(raw);assert.equal(frame.format,'wh3-skill-rank-capture-v1');assert(typeof frame.captureId==='string'&&frame.captureId.length>0);const key=frame.captureId,hash=digest(frame);
   if(seen.has(key)){assert.equal(seen.get(key),hash,'Conflicting capture ID');duplicates++;continue;}seen.set(key,hash);frames.push({frame,reference,captureSha256:hash});
  }catch(e){problems.push({reference,reason:e.message});}
 }}return {frames,problems,duplicates};
}
function listRows(list,fields){assert.equal(list?.status,'COMPLETE','Incomplete context list');assert(Array.isArray(list.rows));return list.rows.map(row=>Object.fromEntries(fields.map(f=>[f,str(row[f])]))).sort((a,b)=>stable(a).localeCompare(stable(b)));}
export function inspectFrame(entry,setup){
 const f=entry.frame;assert.equal(f.gameVersion,VERSION);assert.equal(f.snapshotId,SNAPSHOT);assert.equal(f.trialId,setup.trialId);assert.equal(f.unitSize,setup.unitSize);assert.equal(f.metadataSource,'INSTALLER_VERSION_AND_DECLARED_SETUP');assert.equal(f.context,'CAMPAIGN');assert.equal(f.channel,setup.channel);assert.equal(f.synthetic,false,'Synthetic data cannot qualify as runtime evidence');
 assert(Number.isFinite(val(f.timestamp))&&val(f.timestamp)>0,'Timestamp unavailable');assert.equal(f.status,'CAPTURED');
 assert.equal(bool(f.root.IsPlayersTurn),true);assert.equal(bool(f.root.IsMultiplayer),false);assert.equal(bool(f.root.IsLocomotionComplete),true);
 assert.equal(str(f.owner.AgentSubtypeRecordContextKey),setup.ownerSubtype);assert.equal(bool(f.owner.IsPlayerCharacter),true);assert.equal(bool(f.owner.HasUncommitedSkills),false,'Uncommitted Skill preview');assert.equal(bool(f.force.IsPreviewingStance),false,'Stance preview');
 const ownerCqi=val(f.owner.CQI),forceCqi=val(f.force.CQI);assert(Number.isSafeInteger(ownerCqi)&&ownerCqi>0&&Number.isSafeInteger(forceCqi)&&forceCqi>0,'Invalid exact CQI');assert.equal(val(f.force.CommandingCharacterCQI),ownerCqi);
 assert.equal(f.skills.status,'COMPLETE');assert.equal(new Set(f.skills.rows.map(s=>str(s.Key))).size,f.skills.rows.length,'Duplicate Skill identity');
 const ranks=SKILLS.map(s=>{const found=f.skills.rows.filter(r=>str(r.Key)===s.key);assert.equal(found.length,1,'Missing/ambiguous exact Skill');assert.equal(val(found[0].OwnerCQI),ownerCqi);const rank=val(found[0].Level);assert(Number.isInteger(rank)&&rank>=0&&rank<=3);return rank;});
 assert.equal(f.units.status,'COMPLETE');assert.equal(f.units.rows.length,2,'Exactly two target Units required');
 const observations=[],unitControls=[];
 for(const s of SKILLS){const found=f.units.rows.filter(u=>str(u.MainKey)===s.mainKey);assert.equal(found.length,1,'Missing/ambiguous target Unit');const u=found[0];assert.equal(str(u.LandKey),s.landKey);assert.equal(val(u.ForceCQI),forceCqi);assert.equal(str(u.DetailsUnitId),str(u.UniqueUiId));assert.equal(str(u.DetailsMainKey),s.mainKey);assert.equal(bool(u.IsCampaign),true);
  for(const key of STAT_KEYS){assert.equal(str(u.stats[key]?.Key),key,'Wrong stat identity');assert(Number.isFinite(val(u.stats[key].Value)));}
  unitControls.push({mainKey:s.mainKey,unitId:str(u.UniqueUiId),experienceLevel:val(u.ExperienceLevel),experienceScore:val(u.ExperienceScore),numEntities:val(u.NumEntities),health:val(u.HealthValue),purchasedEffects:listRows(u.purchasedEffects,['Key'])});
  s.stats.forEach((key,i)=>observations.push({gameVersion:f.gameVersion,snapshotId:f.snapshotId,timestamp:f.timestamp,context:f.context,lordSubtype:setup.ownerSubtype,lordCqi:ownerCqi,skillKey:s.key,observedRank:ranks[SKILLS.indexOf(s)],unitMainKey:s.mainKey,unitLandKey:s.landKey,unitInstanceId:str(u.UniqueUiId),statPath:s.paths[i],statKey:key,observedValue:val(u.stats[key].Value),status:'OBSERVED',provenance:{kind:'RUNTIME_CCO',channel:f.channel,query:`CcoCampaignUnit.UnitDetailsContext.PreBonusUnitDetailsContext.StatList[Key=${key}].Value`,captureSha256:entry.captureSha256,reference:entry.reference}}));
 }
 const otherSkills=f.skills.rows.filter(r=>!SKILLS.some(s=>s.key===str(r.Key))).map(r=>({key:str(r.Key),level:val(r.Level)})).sort((a,b)=>a.key.localeCompare(b.key));
 const controls={campaignKey:str(f.root.CampaignKey),turn:val(f.root.TurnNumber),ownerCqi,forceCqi,ownerRank:val(f.owner.Rank),ownerXp:val(f.owner.CurrentXp),otherSkills,units:unitControls,armyRoster:listRows(f.armyRoster,['Key','MainKey']),traits:listRows(f.traits,['Key']),ancillaries:listRows(f.ancillaries,['Key']),stance:str(f.force.StanceKey)};
 return {entry,ranks,observations,controls,identity:{campaignKey:controls.campaignKey,turn:controls.turn,ownerCqi,forceCqi,units:unitControls.map(u=>({mainKey:u.mainKey,unitId:u.unitId}))},allStats:f.units.rows.map(u=>Object.fromEntries(STAT_KEYS.map(k=>[k,val(u.stats[k].Value)])))};
}
export function resolve(parsed,setup){
 verifySetup(setup);const errors=[...parsed.problems],valid=[];
 for(const e of parsed.frames){try{valid.push(inspectFrame(e,setup));}catch(error){errors.push({reference:e.reference,reason:error.message,captureId:e.frame.captureId});}}
 const status={format:'wh3-skill-rank-resolution-v1',verdict:'E',semantics:'UNKNOWN',confidence:'NOT_OBSERVED',productionEligible:false,productionRule:null,observations:[],errors,skills:[],threshold:{primary:false,secondary:false,independent:false,baselineRestored:false,setupAttested:false,channelReviewed:false},reason:'No qualifying runtime observations'};
 if(errors.length){status.reason='QUARANTINED: invalid/conflicting capture; no candidate selected';return status;}
 if(!valid.length)return status;
 try{
  assert(valid.length<=8,'Unexpected extra capture; select one exact eight-frame trial');
  for(let i=0;i<valid.length;i++){assert.deepEqual(valid[i].ranks,STATES[i],`Wrong expected rank state at step ${i}`);assert.deepEqual(valid[i].controls,valid[0].controls,'Changed Lord/army/Unit/experience/other Skill/trait/ancillary/turn controls');}
  if(setup.pinnedBaseline){assert.equal(valid[0].entry.captureSha256,setup.pinnedBaseline.captureSha256,'Wrong baseline/save capture');assert.deepEqual(valid[0].identity,setup.expectedIdentity,'Wrong save/Lord/Unit identity');}
  const base=valid[0];
  // The other Unit is the negative control. Neither skill targets the other's
  // exact Unit; all four stats on that Unit must stay at the restored baseline.
  const byMain=v=>Object.fromEntries(v.entry.frame.units.rows.map(u=>[str(u.MainKey),Object.fromEntries(STAT_KEYS.map(k=>[k,val(u.stats[k].Value)]))]));
  const b=byMain(base);for(let i=0;i<valid.length;i++){const values=byMain(valid[i]);const inactive=i<=3?SKILLS[1]:SKILLS[0];assert.deepEqual(values[inactive.mainKey],b[inactive.mainKey],'Negative-control Unit changed');}
  if(valid.length>=5){assert.deepEqual(byMain(valid[4]),b,'Reload baseline did not restore all stats');status.threshold.baselineRestored=true;}
  status.observations=valid.flatMap(v=>v.observations);
  for(let si=0;si<2;si++){const s=SKILLS[si],offset=si===0?0:4,series=valid.slice(offset,offset+4);const baseValues=s.stats.map(k=>b[s.mainKey][k]);
   const perStat=s.stats.map((k,i)=>({statKey:k,matches:MODELS.filter(m=>series.length===4&&series.every((v,rank)=>byMain(v)[s.mainKey][k]===baseValues[i]+deltas(s,m,rank)[i]))}));
   const matches=MODELS.filter(m=>series.length===4&&perStat.every(p=>p.matches.includes(m)));
   const report={skillKey:s.key,complete:series.length===4,baselineValues:baseValues,predictions:MODELS.map(model=>({model,values:[0,1,2,3].map(rank=>baseValues.map((v,i)=>v+deltas(s,model,rank)[i]))})),observed:series.map(v=>v.observations.filter(o=>o.skillKey===s.key)),matches,perStat};status.skills.push(report);
  }
  status.threshold.primary=status.skills[0].matches.length===1;status.threshold.secondary=status.skills[1].matches.length===1;
  status.threshold.independent=status.threshold.primary&&status.threshold.secondary&&status.skills[0].matches[0]===status.skills[1].matches[0]&&status.threshold.baselineRestored;
  // A baseline capture pins observable state, not the binary currently loaded.
  // Save/difficulty/research/mod controls and CCO-channel validity require an
  // explicit reviewed attestation bound to these exact evidence hashes.
  const review=setup.review,hashes=valid.map(v=>v.entry.captureSha256);
  status.threshold.setupAttested=!!(setup.pinnedBaseline&&review?.controlledSetup===true&&review?.loadedSaveAttested===true&&review?.baselineSaveSha256===setup.baselineSaveSha256&&stable(review?.captureSha256s)===stable(hashes));
  status.threshold.channelReviewed=!!(review?.channel==='CCO_CAMPAIGN_PREBONUS_VALUE'&&review?.currentValuesNotTooltipOrPreview===true&&typeof review?.reviewer==='string'&&review.reviewer.trim()&&typeof review?.evidenceNote==='string'&&review.evidenceNote.trim());
  if(status.threshold.independent){status.semantics=status.skills[0].matches[0];status.verdict='D';status.confidence='PROVISIONAL';status.reason='Matching independent rank series; setup/channel evidence review still required';
   if(status.threshold.setupAttested&&status.threshold.channelReviewed){status.verdict=status.semantics==='CURRENT_RANK_ONLY'?'A':'B';status.confidence='BOUNDED_RUNTIME_SUPPORTED';status.reason='Threshold met for these two exact Skills and this snapshot/channel; separate production admission review required';}
  }else if(status.threshold.primary||status.threshold.secondary){status.verdict='D';status.confidence='PROVISIONAL';status.reason='Only one complete supported Skill series, or independent series disagree';}
  else{status.confidence=valid.length>=4?'INCONCLUSIVE':'INSUFFICIENT';status.reason='Incomplete/non-discriminating series or OTHER behavior; no invented delta/upgrade model';}
  return status;
 }catch(error){status.errors.push({reason:error.message});status.observations=[];status.reason='QUARANTINED: trial state/identity mismatch';return status;}
}
