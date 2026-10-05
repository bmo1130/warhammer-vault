const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const modules=Promise.all([
 import('../tools/wh3-importer/skill-rank-runtime-parent-stats/probe.mjs'),
 import('../tools/wh3-importer/skill-rank-runtime-resolution/experiment.mjs'),
 import('../tools/wh3-importer/skill-rank-runtime-resolution/resolve.mjs'),
]);
// Simulated CCO graphs are in memory/temporary test folders ONLY. The actual
// 1150 baseline supplies observed identities/values, not evidence for new ranks.
const list=(o,key,rows)=>{o[`${key}.Size`]=rows.length;rows.forEach((r,i)=>o[`${key}.At(${i})`]=r);};
const fields=(o,map)=>Object.fromEntries(Object.entries(map).map(([k,expr])=>[expr,o[k].value]));
function graph(p,e,ranks=[0,0],model='CURRENT_RANK_ONLY',rotate=0){
 const base=p.originalBaseline(),owner=fields(base.owner,{CQI:'CQI',Rank:'Rank',CurrentXp:'CurrentXp',AgentSubtypeRecordContextKey:'AgentSubtypeRecordContext.Key',IsPlayerCharacter:'IsPlayerCharacter',HasUncommitedSkills:'HasUncommitedSkills'});
 owner.IsSelected=true;
 list(owner,'SkillList',base.skills.rows.map(s=>({Key:s.Key.value,Level:e.SKILLS.some(k=>k.key===s.Key.value)?ranks[e.SKILLS.findIndex(k=>k.key===s.Key.value)]:s.Level.value,'CharacterContext.CQI':s.OwnerCQI.value})));
 for(const k of ['TraitsList','EffectBundleUnfilteredList'])list(owner,k,base[k==='TraitsList'?'traits':'activeBundles'].rows.map(r=>({Key:r.Key.value})));
 list(owner,'AncillaryList',base.ancillaries.rows.map(r=>({'AncillaryRecordContext.Key':r.Key.value})));
 const units=base.armyRoster.rows.map(roster=>{
  const u={'UnitRecordContext.Key':roster.MainKey.value,UniqueUiId:roster.Key.value};
  const before=base.units.rows.find(u=>u.MainKey.value===roster.MainKey.value);if(!before)return u;
  Object.assign(u,fields(before,{LandKey:'UnitRecordContext.UnitLandRecordContext.Key',ForceCQI:'MilitaryForceContext.CQI',ExperienceLevel:'ExperienceLevel',NumEntities:'NumEntities',HealthValue:'HealthValue'}));
  const details=fields(before,{DetailsUnitId:'CampaignUnitContext.UniqueUiId',DetailsMainKey:'UnitRecordContext.Key',IsCampaign:'IsCampaign',ExperienceScore:'ExperienceScore'});
  const si=e.SKILLS.findIndex(s=>s.mainKey===before.MainKey.value),skill=e.SKILLS[si];
  const rows=before.statItems.rows.map(row=>{
   const key=row.viaDetails.Key.value,j=skill.stats.indexOf(key);
   return {key,value:row.viaDetails.Value.value+(j>=0?e.deltas(skill,model,ranks[si])[j]:0)};
  });
  const shift=(rotate+si)%rows.length,ordered=rows.slice(shift).concat(rows.slice(0,shift));details['StatList.Size']=rows.length;
  ordered.forEach((r,i)=>{details[`StatList.At(${i})`]='MOCK_NULL';details[`StatList.At(${i}).Key`]=r.key;details[`StatList.At(${i}).Value`]=r.value;});
  e.STAT_KEYS.forEach(k=>details[`StatContextFromKey("${k}")`]='MOCK_NULL');
  u['UnitDetailsContext.PreBonusUnitDetailsContext']=details;list(u,'PurchasedEffectsList',before.purchasedEffects.rows.map(r=>({Key:r.Key.value})));return u;
 });
 const force=fields(base.force,{CQI:'CQI',CommandingCharacterCQI:'CommandingCharacterContext.CQI',IsPreviewingStance:'IsPreviewingStance',StanceKey:'ActiveStanceContext.Key'});
 list(force,'UnitList',units);owner.MilitaryForceContext=force;
 const root=fields(base.root,{CampaignKey:'CampaignKey',TurnNumber:'TurnNumber',IsPlayersTurn:'IsPlayersTurn',IsMultiplayer:'IsMultiplayer',IsLocomotionComplete:'IsLocomotionComplete'});
 list(root,'CharacterList',[owner]);return {root,owner,force,units:units.filter(u=>u['UnitDetailsContext.PreBonusUnitDetailsContext'])};
}
const literal=v=>typeof v==='object'?`ctx({${Object.entries(v).map(([k,x])=>`[${JSON.stringify(k)}]=${literal(x)}`).join(',')}})`:JSON.stringify(v);
function run(p,e,g,serial=1){
 const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);
 const source=`WV_SKILL_RANK_CONFIG={sessionId='mock',gameVersion='${e.VERSION}',snapshotId='${e.SNAPSHOT}',unitSize='ULTRA',trialId='mock'}
 WV_SKILL_RANK_PROBE={serial=${serial-1},anchor={},token='mock'}
 function out(s) captured=s end
 function ctx(t) return {Call=function(self,k) local v=t[k] if v=='MOCK_NULL' then return nil end if v=='MOCK_NAN' then return 0/0 end if v==nil then error('API inaccessible:'..k) end return v end} end
 local root=${literal(g.root)}
 function cco(name,key) assert(name=='CcoCampaignRoot' and key=='') return root end
 ${p.buildProbe()}`;
 try{if(lauxlib.luaL_dostring(L,to_luastring(source))!==lua.LUA_OK)throw Error(to_jsstring(lua.lua_tostring(L,-1)));lua.lua_getglobal(L,to_luastring('captured'));const out=to_jsstring(lua.lua_tostring(L,-1));return JSON.parse(out.slice(out.indexOf('|')+1));}finally{lua.lua_close(L);}
}
const setup=e=>({format:'wh3-skill-rank-setup-v1',gameVersion:e.VERSION,snapshotId:e.SNAPSHOT,ownerSubtype:'wh_main_brt_lord',unitSize:'ULTRA',trialId:'mock',context:'CAMPAIGN',channel:'CCO_CAMPAIGN_PREBONUS_VALUE'});
const parse=(r,e,frames)=>r.parseLogs([{name:'IN-MEMORY-MOCK-ONLY',text:frames.map(f=>e.PREFIX+JSON.stringify(f)).join('\n')}]);
test('Lua canonical parent path works with NULL materialization, preserves diagnostics and observed baseline',async()=>{
 const [p,e,r]=await modules,g=graph(p,e),frame=run(p,e,g),before=p.originalBaseline();
 assert.equal(frame.status,'CAPTURED');assert.equal(frame.statExtractionRevision,p.REVISION);
 for(const key of ['owner','skills','armyRoster','force','root','traits','ancillaries'])assert.deepEqual(frame[key],before[key]);
 for(const u of frame.units.rows){
  assert.equal(u.statStatus,'COMPLETE');assert.equal(u.statItems.status,'PARTIAL');assert(u.statItems.rows.every(r=>r.access.status==='NULL'&&r.luaType==='nil'));
  const expected=before.units.rows.find(b=>b.MainKey.value===u.MainKey.value);
  for(const key of e.STAT_KEYS){assert.equal(u.directLookup[key].access.status,'NULL');assert.equal(u.directLookup[key].Value.status,'UNSUPPORTED');assert.deepEqual(u.stats[key].Value,expected.statItems.rows.find(r=>r.viaDetails.Key.value===key).viaDetails.Value);}
 }
 const result=p.checkBaseline(parse(r,e,[frame]).frames[0],setup(e));
 assert.equal(result.canonicalStatus,'COMPLETE');assert.equal(result.status,'CANONICAL_COMPLETE_CONTROL_BLOCKED');assert.equal(result.trialReady,false);assert.match(result.trialBlockers[0],/Stance preview/);assert.equal(result.semantics,'UNKNOWN');
 g.force.IsPreviewingStance=false;
 const ready=p.checkBaseline(parse(r,e,[run(p,e,g)]).frames[0],setup(e));assert.equal(ready.status,'READY_FOR_EIGHT_CAPTURE');assert.equal(ready.productionEligible,false);
});
test('key match is independent of every row index; real numeric zero is preserved',async()=>{
 const [p,e,r]=await modules;
 for(let shift=0;shift<7;shift++){
  const g=graph(p,e,[0,0],'CURRENT_RANK_ONLY',shift);g.force.IsPreviewingStance=false;
  const f=run(p,e,g);p.inspectFrame(parse(r,e,[f]).frames[0],setup(e));
  assert.equal(f.units.rows[0].stats.stat_armour.Value.value,30);assert.equal(f.units.rows[1].stats.stat_armour.Value.value,70);
 }
 const g=graph(p,e),d=g.units[0]['UnitDetailsContext.PreBonusUnitDetailsContext'];
 const expr=Object.keys(d).find(k=>k.endsWith('.Key')&&d[k]==='stat_armour');d[expr.replace(/Key$/,'Value')]=0;
 const f=run(p,e,g);assert.equal(f.status,'CAPTURED');assert.deepEqual(f.units.rows[0].stats.stat_armour.Value,{status:'VALUE',value:0});
});
for(const fault of ['duplicate required key','duplicate unrelated key','missing key','NULL key','NULL Value','UNSUPPORTED Value','nonfinite Value','bad size'])test(`Lua extraction fails closed: ${fault}`,async()=>{
 const [p,e,r]=await modules,g=graph(p,e),d=g.units[0]['UnitDetailsContext.PreBonusUnitDetailsContext'];
 const find=key=>Object.keys(d).find(k=>k.endsWith('.Key')&&d[k]===key);
 if(fault==='duplicate required key')d[find('stat_weapon_damage')]='stat_morale';
 if(fault==='duplicate unrelated key')d[find('stat_weapon_damage')]='scalar_speed';
 if(fault==='missing key')d[find('stat_morale')]='MOCK_OTHER_KEY';
 if(fault==='NULL key')d[find('stat_morale')]='MOCK_NULL';
 const value=find('stat_armour').replace(/Key$/,'Value');
 if(fault==='NULL Value')d[value]='MOCK_NULL';
 if(fault==='UNSUPPORTED Value')delete d[value];
 if(fault==='nonfinite Value')d[value]='MOCK_NAN';
 if(fault==='bad size')d['StatList.Size']=129;
 const f=run(p,e,g);assert.equal(f.status,'UNAVAILABLE');assert.equal(f.units.rows.length,2);assert.equal(f.owner.CQI.value,1065);assert.equal(f.armyRoster.status,'COMPLETE');assert.equal(f.units.rows[0].statExtraction.status,'UNAVAILABLE');
 const result=p.resolve(parse(r,e,[f]),setup(e));assert.equal(result.verdict,'E');assert.equal(result.observations.length,0);assert.equal(result.productionEligible,false);
});
for(const model of ['CURRENT_RANK_ONLY','CUMULATIVE_RANKS'])test(`eight-frame simulated resolver ${model} with changing indexes and exact provenance`,async()=>{
 const [p,e,r]=await modules,frames=e.STATES.map((ranks,i)=>{const g=graph(p,e,ranks,model,i);g.force.IsPreviewingStance=false;return run(p,e,g,i+1);});
 const result=p.resolve(parse(r,e,frames),setup(e));assert.equal(result.verdict,'D');assert.equal(result.semantics,model);assert.equal(result.observations.length,32);assert.equal(result.productionEligible,false);
 for(const o of result.observations){const entry=parse(r,e,frames).frames.find(f=>f.captureSha256===o.provenance.captureSha256);const u=entry.frame.units.rows.find(u=>u.MainKey.value===o.unitMainKey);assert.equal(o.provenance.query,u.stats[o.statKey].query);assert.equal(o.provenance.keyQuery,u.stats[o.statKey].keyQuery);assert.equal(o.provenance.rowIndex,u.stats[o.statKey].index);}
 assert(result.skills.every(s=>s.observed.flat().every(o=>o.provenance.query.includes('.StatList.At('))));
 for(const mutate of [f=>f.units.rows[0].stats.stat_armour.Value.value++,f=>f.units.rows[0].stats.stat_armour.index=99,f=>f.units.rows[0].stats.stat_armour.query='ValueBase',f=>f.owner.AgentSubtypeRecordContextKey.value='wrong',f=>f.units.rows[0].LandKey.value='wrong',f=>f.skills.rows.find(s=>s.Key.value===e.SKILLS[0].key).Level.value=3]){
  const bad=structuredClone(frames);mutate(bad[0]);assert.equal(p.resolve(parse(r,e,bad),setup(e)).observations.length,0);
 }
});
test('baseline CLI preserves raw bytes, blocks preview/rank drift and allows only one baseline',async()=>{
 const [p,e]=await modules,dir=fs.mkdtempSync(path.join(os.tmpdir(),'wv-parent-stats-'));
 try{
  const cli=path.resolve('tools/wh3-importer/skill-rank-runtime-parent-stats/cli.mjs'),invoke=(...args)=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8'}),bundle=path.join(dir,'bundle');
  let result=invoke('prepare','--unit-size','ULTRA','--out',bundle);assert.equal(result.status,0,result.stderr);assert.notEqual(invoke('prepare','--unit-size','ULTRA','--out',bundle).status,0);
  const config=JSON.parse(fs.readFileSync(path.join(bundle,'setup.json'))),g=graph(p,e),frame=run(p,e,g);frame.trialId=config.trialId;
  const log=path.join(dir,'MOCK-ONLY.log'),write=()=>fs.writeFileSync(log,e.PREFIX+JSON.stringify(frame));write();
  result=invoke('check-baseline','--setup',path.join(bundle,'setup.json'),'--log',log,'--out',path.join(dir,'blocked'));assert.equal(result.status,2);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'blocked','baseline-check.json'))).canonicalStatus,'COMPLETE');assert.deepEqual(fs.readFileSync(path.join(dir,'blocked','raw','0-MOCK-ONLY.log')),fs.readFileSync(log));
  frame.force.IsPreviewingStance.value=false;write();result=invoke('check-baseline','--setup',path.join(bundle,'setup.json'),'--log',log,'--out',path.join(dir,'ready'));assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'ready','baseline-check.json'))).trialReady,true);
  const save=path.join(dir,'MOCK-ONLY.save');fs.writeFileSync(save,'NOT A GAME SAVE');
  result=invoke('bind','--setup',path.join(bundle,'setup.json'),'--log',log,'--save',save,'--out',path.join(dir,'bound'));assert.equal(result.status,0,result.stderr);
  result=invoke('ingest','--setup',path.join(dir,'bound','setup.json'),'--log',log,'--out',path.join(dir,'ingest'));assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'ingest','resolution.json'))).semantics,'UNKNOWN');
  frame.skills.rows.find(s=>s.Key.value===e.SKILLS[0].key).Level.value=1;write();result=invoke('check-baseline','--setup',path.join(bundle,'setup.json'),'--log',log,'--out',path.join(dir,'wrong-rank'));assert.equal(result.status,2);assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'wrong-rank','baseline-check.json'))).status,'REJECTED');
  fs.appendFileSync(log,'\n'+e.PREFIX+JSON.stringify({...frame,captureId:'MOCK-EXTRA'}));result=invoke('check-baseline','--setup',path.join(bundle,'setup.json'),'--log',log,'--out',path.join(dir,'extra'));assert.notEqual(result.status,0);
 }finally{assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});}
});
