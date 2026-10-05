const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const modules=Promise.all([import('../tools/wh3-importer/skill-stance-preview-research/probe.mjs'),import('../tools/wh3-importer/skill-stance-preview-research/check.mjs'),import('../tools/wh3-importer/skill-rank-runtime-resolution/resolve.mjs')]);
const list=(o,k,rows)=>{o[k+'.Size']=rows.length;rows.forEach((r,i)=>o[`${k}.At(${i})`]=r);};
const fields=(o,m)=>Object.fromEntries(Object.entries(m).map(([k,q])=>[q,o[k].value]));
function graph(c,selected=false,flag=true){
 const b=c.baseline().frame;
 const owner=fields(b.owner,{CQI:'CQI',Rank:'Rank',CurrentXp:'CurrentXp',AgentSubtypeRecordContextKey:'AgentSubtypeRecordContext.Key',IsPlayerCharacter:'IsPlayerCharacter',HasUncommitedSkills:'HasUncommitedSkills'});
 Object.assign(owner,{IsSelected:selected,IsDetailsOnly:false,IsOnMap:true,IsPreviewingMove:false,ActionPointPercent:1,ActionPointPreviewPercent:1});
 list(owner,'SkillList',b.skills.rows.map(s=>({Key:s.Key.value,Level:s.Level.value,'CharacterContext.CQI':s.OwnerCQI.value})));
 for(const [k,v,expr] of [['TraitsList','traits','Key'],['AncillaryList','ancillaries','AncillaryRecordContext.Key'],['EffectBundleUnfilteredList','activeBundles','Key']])list(owner,k,b[v].rows.map(r=>({[expr]:r.Key.value})));
 const force={CQI:949,'CommandingCharacterContext.CQI':1065,IsSelected:selected,IsPreviewingStance:flag,'ActiveStanceContext.Key':b.force.StanceKey.value,StancePreviewPercentCost:0,CanSwitchToPreviewStance:true};
 const units=b.armyRoster.rows.map(r=>{
  const u={'UnitRecordContext.Key':r.MainKey.value,UniqueUiId:r.Key.value};const before=b.units.rows.find(x=>x.MainKey.value===r.MainKey.value);
  if(before){Object.assign(u,fields(before,{LandKey:'UnitRecordContext.UnitLandRecordContext.Key',ForceCQI:'MilitaryForceContext.CQI',ExperienceLevel:'ExperienceLevel',NumEntities:'NumEntities',HealthValue:'HealthValue'}));
   const details=fields(before,{DetailsUnitId:'CampaignUnitContext.UniqueUiId',DetailsMainKey:'UnitRecordContext.Key',IsCampaign:'IsCampaign',ExperienceScore:'ExperienceScore'});
   details['StatList.Size']=before.statItems.rows.length;for(const row of before.statItems.rows){details[`StatList.At(${row.index})`]='MOCK_NULL';details[`StatList.At(${row.index}).Key`]=row.viaDetails.Key.value;details[`StatList.At(${row.index}).Value`]=row.viaDetails.Value.value;}
   for(const k of Object.keys(before.directLookup))details[`StatContextFromKey("${k}")`]='MOCK_NULL';
   u['UnitDetailsContext.PreBonusUnitDetailsContext']=details;list(u,'PurchasedEffectsList',before.purchasedEffects.rows.map(r=>({Key:r.Key.value})));
  }
  for(const [key,v] of Object.entries(force))u['MilitaryForceContext.'+key]=v;return u;
 });
 list(force,'UnitList',units);owner.MilitaryForceContext=force;
 for(const [key,v] of Object.entries(force))if(!key.startsWith('UnitList'))owner['MilitaryForceContext.'+key]=v;
 const root=fields(b.root,{CampaignKey:'CampaignKey',TurnNumber:'TurnNumber',IsPlayersTurn:'IsPlayersTurn',IsMultiplayer:'IsMultiplayer',IsLocomotionComplete:'IsLocomotionComplete'});list(root,'CharacterList',[owner]);return {root,owner,force,units};
}
const literal=v=>typeof v==='object'?`ctx({${Object.entries(v).map(([k,x])=>`[${JSON.stringify(k)}]=${literal(x)}`).join(',')}})`:JSON.stringify(v);
function run(p,c,g,ordinal=1,modelFailure=false,steps=p.plan()){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 const code=`WV_SKILL_RANK_CONFIG={sessionId='mock',gameVersion='9.0.2.0',snapshotId='${c.baseline().frame.snapshotId}',unitSize='ULTRA',trialId='mock',ownerCQI=1065,forceCQI=949,steps={${steps.map(x=>JSON.stringify(x)).join(',')}}}
 WV_STANCE_PREVIEW_PROBE={serial=${ordinal-1},anchor={},token='mock'}
 function out(s) captured=s end
 function ctx(t) return {Call=function(self,k) local v=t[k] if v=='MOCK_NULL' then return nil end if v==nil then error('Unavailable:'..k) end return v end} end
 local root=${literal(g.root)}
 function cco(name,key) assert(name=='CcoCampaignRoot' and key=='') return root end
 local char={command_queue_index=function() return 1065 end,action_points_remaining_percent=function() return 100 end}
 local force={is_null_interface=function() return false end,command_queue_index=function() return 949 end,active_stance=function() return 'MILITARY_FORCE_ACTIVE_STANCE_TYPE_DEFAULT' end,general_character=function() return char end}
 cm={get_military_force_by_cqi=function(self,id) assert(id==949) ${modelFailure?'error("API inaccessible")':'return force'} end}
 ${p.buildProbe()}`;
 try{if(lauxlib.luaL_dostring(L,to_luastring(code))!==lua.LUA_OK)throw Error(to_jsstring(lua.lua_tostring(L,-1)));lua.lua_getglobal(L,to_luastring('captured'));const s=to_jsstring(lua.lua_tostring(L,-1));assert(s.startsWith(p.PREFIX));return JSON.parse(s.slice(p.PREFIX.length));}finally{lua.lua_close(L);}
}
function setup(p,c){const entry=c.baseline(),b=entry.frame;return {format:'wh3-stance-preview-setup-v1',gameVersion:b.gameVersion,snapshotId:b.snapshotId,unitSize:b.unitSize,context:b.context,channel:b.channel,ownerSubtype:b.owner.AgentSubtypeRecordContextKey.value,ownerCQI:1065,forceCQI:949,baselineCaptureSha256:entry.captureSha256,trialId:'mock',unitsPanel:false,steps:p.plan()};}
const parse=(p,c,frames)=>c.parseLogs([{name:'MOCK-ONLY',text:frames.map(f=>p.PREFIX+JSON.stringify(f)).join('\n')}]);
test('actual 1319 raw/checker bytes reproduce COMPLETE and preserve the false gate',async()=>{
 const [,c]=await modules;const p=await import('../tools/wh3-importer/skill-rank-runtime-parent-stats/probe.mjs');
 const dir='tools/wh3-importer/skill-stance-preview-research/evidence/';
 const s=JSON.parse(fs.readFileSync(dir+'setup-1319.json')),expected=JSON.parse(fs.readFileSync(dir+'baseline-check-1319.json'));
 assert.deepEqual(p.checkBaseline(c.baseline(),s),expected);assert.equal(expected.canonicalStatus,'COMPLETE');assert.equal(expected.trialReady,false);
 assert.throws(()=>p.inspectFrame(c.baseline(),s),/Stance preview/);
});
test('read-only Lua pins unselected Lord, retains all canonical/diagnostic evidence, isolated from rank parsing',async()=>{
 const [p,c,r]=await modules,f=run(p,c,graph(c));
 assert.equal(f.status,'DIAGNOSTIC_CAPTURED');assert.equal(f.stanceDiagnostic.owner.IsSelected.value,false);
 for(const k of ['owner','root','skills','traits','ancillaries','armyRoster','activeBundles','force'])assert.deepEqual(f[k],c.baseline().frame[k]);
 // Fengari and game Lua have different error text/line numbers. All diagnostic
 // statuses, queries and values must match; raw errors remain in each frame.
 const omitError=x=>JSON.parse(JSON.stringify(x,(k,v)=>k==='error'?undefined:v));
 assert.deepEqual(omitError(f.units),omitError(c.baseline().frame.units));
 const report=c.compare(parse(p,c,[f]),setup(p,c));assert.deepEqual(report.errors,[]);assert.equal(report.status,'BOUNDED_DIAGNOSTIC_PARTIAL');assert.equal(report.trialReady,false);
 assert.equal(r.parseLogs([{name:'MOCK',text:p.PREFIX+JSON.stringify(f)}]).frames.length,0);
 const wrong=r.parseLogs([{name:'MOCK',text:'WH3_SKILL_RANK_PROBE|'+JSON.stringify(f)}]);assert.equal(wrong.frames.length,0);assert.equal(wrong.problems.length,1);
 assert.doesNotMatch(p.buildProbe(),/:(?:EnablePreview|DisablePreview|Activate|Dev\w+)\(/);
});
test('bounded sticky/changed/path-different observations never relax a gate',async()=>{
 const [p,c]=await modules,s=setup(p,c),frames=p.plan().map((_,i)=>run(p,c,graph(c,i>0),i+1));
 let result=c.compare(parse(p,c,frames),s);assert.deepEqual(result.errors,[]);assert(result.patterns.includes('ALL_OBSERVED_ROUTES_TRUE'));assert.equal(result.flagMeaning,'UNKNOWN');assert.equal(result.gateDecision,'KEEP_EXISTING_FALSE_GATE');assert.equal(result.productionEligible,false);
 const g=graph(c,true,false);g.owner['MilitaryForceContext.IsPreviewingStance']=true;
 const changed=[frames[0],run(p,c,g,2)];result=c.compare(parse(p,c,changed),s);assert.deepEqual(result.errors,[]);assert(result.patterns.includes('SAME_FORCE_SCALAR_ROUTE_DISAGREEMENT'));assert(result.patterns.includes('FLAG_CHANGED_ACROSS_DECLARED_UI_STATES'));
 const extra=run(p,c,graph(c,true),6);assert.equal(extra.status,'UNAVAILABLE');assert.match(extra.error,/Bounded diagnostic complete/);
 const steps=p.plan(true),seven=steps.map((_,i)=>run(p,c,graph(c,i>0),i+1,false,steps));
 const optional=c.compare(parse(p,c,seven),{...s,unitsPanel:true,steps});assert.deepEqual(optional.errors,[]);assert.equal(optional.observations.length,7);assert.equal(optional.uiStateVerified,false);
});
for(const fault of ['wrong Lord','wrong force','rank point','wrong Unit','missing canonical','model unavailable','movement','committed stance','AP changed','wrong selection','reordered steps','changed baseline stat','preview scalar NULL'])test(`diagnostic fails closed and retains raw: ${fault}`,async()=>{
 const [p,c]=await modules,frames=[run(p,c,graph(c)),run(p,c,graph(c,true),2)],f=frames[1];
 if(fault==='wrong Lord')f.owner.CQI.value++;
 if(fault==='wrong force')f.stanceDiagnostic.routes[1].cells.CQI.value++;
 if(fault==='rank point')f.skills.rows.find(x=>x.Key.value.includes('low_born')).Level.value=1;
 if(fault==='wrong Unit')f.units.rows[0].LandKey.value='wrong';
 if(fault==='missing canonical')delete f.units.rows[0].stats.stat_armour;
 if(fault==='model unavailable')f.stanceDiagnostic.model.access={status:'NULL'};
 if(fault==='movement')f.stanceDiagnostic.owner.IsPreviewingMove.value=true;
 if(fault==='committed stance')f.stanceDiagnostic.model.StanceKey.value='MILITARY_FORCE_ACTIVE_STANCE_TYPE_MARCH';
 if(fault==='AP changed')f.stanceDiagnostic.model.ActionPointsRemainingPercent.value=90;
 if(fault==='wrong selection')f.stanceDiagnostic.owner.IsSelected.value=false;
 if(fault==='reordered steps')frames.reverse();
 if(fault==='changed baseline stat'){f.units.rows[0].stats.stat_armour.Value.value++;f.units.rows[0].statItems.rows[0].viaDetails.Value.value++;}
 if(fault==='preview scalar NULL')f.stanceDiagnostic.routes[1].cells.IsPreviewingStance={status:'NULL'};
 const parsed=parse(p,c,frames),before=JSON.stringify(parsed),result=c.compare(parsed,setup(p,c));assert(result.errors.length>0);assert.equal(result.status,'REJECTED');assert.equal(result.trialReady,false);assert.equal(JSON.stringify(parsed),before);
});
test('model API failure records UNSUPPORTED without guessed stance or false flag',async()=>{
 const [p,c]=await modules,f=run(p,c,graph(c),1,true);assert.equal(f.status,'DIAGNOSTIC_CAPTURED');assert.equal(f.force.IsPreviewingStance.value,true);assert.equal(f.stanceDiagnostic.model.access.status,'UNSUPPORTED');assert.equal(f.stanceDiagnostic.model.StanceKey,undefined);
});
test('alternative UI hover can expose preview-channel stat change, never qualifies for rank evidence',async()=>{
 const [p,c]=await modules,frames=p.plan().map((_,i)=>run(p,c,graph(c,i>0),i+1));const f=frames[3];
 f.units.rows[0].stats.stat_armour.Value.value++;f.units.rows[0].statItems.rows[0].viaDetails.Value.value++;
 const result=c.compare(parse(p,c,frames),setup(p,c));assert.deepEqual(result.errors,[]);assert(result.patterns.includes('STAT_CHANNEL_CHANGED_DURING_ALTERNATIVE_UI_HOVER'));assert.equal(result.trialReady,false);
});
test('CLI prepares finite plan and archives full logs; no output overwrite or auto UI attestation',async()=>{
 const [p,c]=await modules,dir=fs.mkdtempSync(path.join(os.tmpdir(),'wv-stance-'));try{
  const cli=path.resolve('tools/wh3-importer/skill-stance-preview-research/cli.mjs'),invoke=(...a)=>spawnSync(process.execPath,[cli,...a],{encoding:'utf8'}),bundle=path.join(dir,'bundle');
  let result=invoke('prepare','--units-panel','no','--out',bundle);assert.equal(result.status,0,result.stderr);assert.notEqual(invoke('prepare','--units-panel','no','--out',bundle).status,0);
  const s=JSON.parse(fs.readFileSync(path.join(bundle,'setup.json'))),f=run(p,c,graph(c));f.trialId=s.trialId;
  const log=path.join(dir,'MOCK-ONLY.log');fs.writeFileSync(log,'unrelated\r\n'+p.PREFIX+JSON.stringify(f)+'\r\n');
  const output=path.join(dir,'parsed');result=invoke('inspect','--setup',path.join(bundle,'setup.json'),'--log',log,'--out',output);assert.equal(result.status,0,result.stderr);
  assert.deepEqual(fs.readFileSync(path.join(output,'raw','0-MOCK-ONLY.log')),fs.readFileSync(log));assert.equal(JSON.parse(fs.readFileSync(path.join(output,'ui-action-attestation-template.json'))).verifiedByUser,false);
  assert.equal(JSON.parse(fs.readFileSync(path.join(output,'comparison.json'))).flagMeaning,'UNKNOWN');
 }finally{assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});}
});
