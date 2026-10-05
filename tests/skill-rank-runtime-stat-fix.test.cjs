const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {lua,lauxlib,lualib,to_luastring,to_jsstring} = require('fengari');
const modules = Promise.all([
 import('../tools/wh3-importer/skill-rank-runtime-stat-fix/probe.mjs'),
 import('../tools/wh3-importer/skill-rank-runtime-resolution/experiment.mjs'),
 import('../tools/wh3-importer/skill-rank-runtime-resolution/resolve.mjs'),
]);
// These graphs exist only in memory: no mock is recorded as runtime evidence.
const list = (object, key, rows) => {
 object[`${key}.Size`] = rows.length;
 rows.forEach((row,i) => object[`${key}.At(${i})`] = row);
};
function graph(e, ranks = [0,0], model = 'CURRENT_RANK_ONLY') {
 const owner = {IsSelected:true,IsPlayerCharacter:true,CQI:11,Rank:20,CurrentXp:100,'AgentSubtypeRecordContext.Key':'wh_main_brt_lord',HasUncommitedSkills:false};
 list(owner,'SkillList',e.SKILLS.map((s,i)=>({Key:s.key,Level:ranks[i],'CharacterContext.CQI':11})));
 for (const key of ['TraitsList','AncillaryList','EffectBundleUnfilteredList']) list(owner,key,[]);
 const units = e.SKILLS.map((s,i) => {
  const details = {'CampaignUnitContext.UniqueUiId':`unit-${i}`,'UnitRecordContext.Key':s.mainKey,IsCampaign:true,ExperienceScore:0};
  // StatList.Size is intentionally absent: simulates ExpressionState access failure.
  for (const key of e.STAT_KEYS) {
   const j = s.stats.indexOf(key);
   details[`StatContextFromKey("${key}")`] = {Key:key,Value:j<0?0:e.deltas(s,model,ranks[i])[j]};
  }
  const unit = {'UnitRecordContext.Key':s.mainKey,'UnitRecordContext.UnitLandRecordContext.Key':s.landKey,UniqueUiId:`unit-${i}`,'MilitaryForceContext.CQI':22,ExperienceLevel:0,NumEntities:90,HealthValue:1000,'UnitDetailsContext.PreBonusUnitDetailsContext':details};
  list(unit,'PurchasedEffectsList',[]);
  return unit;
 });
 const force = {CQI:22,'CommandingCharacterContext.CQI':11,IsPreviewingStance:false,'ActiveStanceContext.Key':'normal'};
 list(force,'UnitList',units); owner.MilitaryForceContext = force;
 const root = {CampaignKey:'campaign',TurnNumber:1,IsPlayersTurn:true,IsMultiplayer:false,IsLocomotionComplete:true};
 list(root,'CharacterList',[owner]);
 return {root,units};
}
const literal = value => typeof value === 'object'
 ? `ctx({${Object.entries(value).map(([k,v])=>`[${JSON.stringify(k)}]=${literal(v)}`).join(',')}})`
 : JSON.stringify(value);
function run(e, source, g, serial = 1) {
 const L = lauxlib.luaL_newstate(); lualib.luaL_openlibs(L);
 const script = `WV_SKILL_RANK_CONFIG={sessionId='mock',gameVersion='${e.VERSION}',snapshotId='${e.SNAPSHOT}',unitSize='ULTRA',trialId='mock'}
 WV_SKILL_RANK_PROBE={serial=${serial-1},anchor={},token='mock'}
 function out(s) captured=s end
 function ctx(t) return {Call=function(self,k) if t[k]==nil then error('API inaccessible:'..k) end return t[k] end} end
 local root=${literal(g.root)}
 function cco(name,key) assert(name=='CcoCampaignRoot' and key=='') return root end
 ${source}`;
 try {
  const status = lauxlib.luaL_dostring(L,to_luastring(script));
  if (status!==lua.LUA_OK) throw new Error(to_jsstring(lua.lua_tostring(L,-1)));
  lua.lua_getglobal(L,to_luastring('captured'));
  const output = to_jsstring(lua.lua_tostring(L,-1));
  return JSON.parse(output.slice(output.indexOf('|')+1));
 } finally { lua.lua_close(L); }
}
function setup(e) { return {format:'wh3-skill-rank-setup-v1',gameVersion:e.VERSION,snapshotId:e.SNAPSHOT,ownerSubtype:'wh_main_brt_lord',unitSize:'ULTRA',trialId:'mock',context:'CAMPAIGN',channel:'CCO_CAMPAIGN_PREBONUS_VALUE'}; }
const parse = (r,e,frames) => r.parseLogs([{name:'IN-MEMORY-MOCK',text:frames.map(f=>e.PREFIX+JSON.stringify(f)).join('\n')}]);
test('actual Lua patch bypasses inaccessible StatList while preserving owner/rank/roster and exact zero',async()=>{
 const [p,e,r] = await modules, g = graph(e);
 const old = run(e,fs.readFileSync('tools/wh3-importer/skill-rank-runtime-resolution/exec.lua','utf8'),g);
 assert.equal(old.status,'UNAVAILABLE'); assert.match(old.error,/Stat list incomplete/); assert.equal(old.units,undefined);
 const frame = run(e,p.buildProbe(),g);
 assert.equal(frame.status,'CAPTURED');
 for (const key of ['owner','skills','armyRoster','selectionScan','force','traits','ancillaries']) assert.deepEqual(frame[key],old[key]);
 assert.deepEqual(frame.selectionScan.rows,[]);
 assert.equal(frame.units.rows[0].statScan.size.status,'UNSUPPORTED');
 assert.equal(frame.units.rows[0].stats.stat_armour.Value.value,0);
 const checked = p.inspectFrame(parse(r,e,[frame]).frames[0],setup(e));
 assert.equal(checked.observations[0].provenance.query,p.query('stat_morale'));
});
for (const fault of ['missing details','missing stat','missing value','wrong key','wrong Unit']) test(`partial diagnostics retained and fail closed: ${fault}`,async()=>{
 const [p,e,r] = await modules, g = graph(e), u = g.units[0], d = u['UnitDetailsContext.PreBonusUnitDetailsContext'];
 if (fault==='missing details') delete u['UnitDetailsContext.PreBonusUnitDetailsContext'];
 if (fault==='missing stat') delete d['StatContextFromKey("stat_armour")'];
 if (fault==='missing value') delete d['StatContextFromKey("stat_armour")'].Value;
 if (fault==='wrong key') d['StatContextFromKey("stat_armour")'].Key='stat_morale';
 if (fault==='wrong Unit') d['CampaignUnitContext.UniqueUiId']='other';
 const frame = run(e,p.buildProbe(),g);
 assert.equal(frame.units.rows.length,2); assert.equal(frame.owner.CQI.value,11); assert.equal(frame.armyRoster.status,'COMPLETE');
 if (fault!=='wrong Unit') assert.equal(frame.status,'UNAVAILABLE');
 const result = p.resolve(parse(r,e,[frame]),setup(e));
 assert.equal(result.verdict,'E'); assert.equal(result.observations.length,0); assert(result.errors.length);
 if (fault==='missing details') assert.match(frame.units.rows[0].detailsAccess.error,/API inaccessible/);
 if (fault==='missing value') assert.equal(frame.units.rows[0].stats.stat_armour.Value.status,'UNSUPPORTED');
});
for (const model of ['CURRENT_RANK_ONLY','CUMULATIVE_RANKS']) test(`eight Lua mock captures reuse resolver with truthful direct provenance: ${model}`,async()=>{
 const [p,e,r] = await modules, frames = e.STATES.map((ranks,i)=>run(e,p.buildProbe(),graph(e,ranks,model),i+1));
 const result = p.resolve(parse(r,e,frames),setup(e));
 assert.equal(result.verdict,'D'); assert.equal(result.semantics,model); assert.equal(result.productionEligible,false);
 assert.equal(result.observations.length,32);
 assert(result.observations.every(o=>o.provenance.query===p.query(o.statKey)));
 assert(result.skills.every(s=>s.observed.flat().every(o=>o.provenance.query===p.query(o.statKey))));
 frames[3].units.rows[0].stats.stat_armour.query='ValueBase';
 assert.equal(p.resolve(parse(r,e,frames),setup(e)).observations.length,0);
});
test('prepared bundle and bind/ingest reuse old installer/validation without altering raw bytes',async()=>{
 const [p,e,r] = await modules, dir = fs.mkdtempSync(path.join(os.tmpdir(),'wv-stat-fix-'));
 try {
  const cli = path.resolve('tools/wh3-importer/skill-rank-runtime-stat-fix/cli.mjs');
  const invoke = (...args)=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
  const bundle = path.join(dir,'bundle'); let result = invoke('prepare','--unit-size','ULTRA','--out',bundle);
  assert.equal(result.status,0,result.stderr);
  const config = JSON.parse(fs.readFileSync(path.join(bundle,'setup.json')));
  assert(fs.readFileSync(path.join(bundle,'exec.lua'),'utf8').includes(p.REVISION));
  assert.notEqual(invoke('prepare','--unit-size','ULTRA','--out',bundle).status,0);
  const frames = e.STATES.map((ranks,i)=>run(e,p.buildProbe(),graph(e,ranks),i+1));
  frames.forEach(f=>f.trialId=config.trialId);
  const log = path.join(dir,'MOCK-ONLY.log'), save = path.join(dir,'MOCK-ONLY.save');
  fs.writeFileSync(log,frames.map(f=>e.PREFIX+JSON.stringify(f)).join('\r\n')); fs.writeFileSync(save,'NOT A GAME SAVE');
  const bound = path.join(dir,'bound'); result = invoke('bind','--setup',path.join(bundle,'setup.json'),'--log',log,'--save',save,'--out',bound);
  assert.equal(result.status,0,result.stderr);
  const capture = path.join(dir,'capture'); result = invoke('ingest','--setup',path.join(bound,'setup.json'),'--log',log,'--out',capture);
  assert.equal(result.status,0,result.stderr);
  assert.deepEqual(fs.readFileSync(path.join(capture,'raw','0-MOCK-ONLY.log')),fs.readFileSync(log));
  const resolution = JSON.parse(fs.readFileSync(path.join(capture,'resolution.json')));
  assert.equal(resolution.verdict,'D'); assert(resolution.observations.every(o=>o.provenance.query===p.query(o.statKey)));
  frames[0].probeRevision='old'; fs.writeFileSync(log,e.PREFIX+JSON.stringify(frames[0]));
  result = invoke('ingest','--setup',path.join(bundle,'setup.json'),'--log',log,'--out',path.join(dir,'invalid'));
  assert.equal(result.status,2); assert.equal(fs.readFileSync(path.join(dir,'invalid','observations.jsonl'),'utf8'),'');
 } finally { assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep)); fs.rmSync(dir,{recursive:true,force:true}); }
});
