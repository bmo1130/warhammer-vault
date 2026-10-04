const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=require('fengari');
const modules=Promise.all([import('../tools/wh3-importer/skill-rank-runtime-resolution/experiment.mjs'),import('../tools/wh3-importer/skill-rank-runtime-resolution/resolve.mjs')]);
const V=value=>({status:'VALUE',value});
// In-memory mock frames ONLY. These are never saved as runtime evidence.
async function fixture(model='CURRENT_RANK_ONLY'){
 const [e,r]=await modules,setup={format:'wh3-skill-rank-setup-v1',gameVersion:e.VERSION,snapshotId:e.SNAPSHOT,ownerSubtype:'wh_main_brt_lord',unitSize:'ULTRA',trialId:'test',context:'CAMPAIGN',channel:'CCO_CAMPAIGN_PREBONUS_VALUE'};
 const frames=e.STATES.map((ranks,index)=>({format:'wh3-skill-rank-capture-v1',captureId:`mock-${index}`,gameVersion:e.VERSION,snapshotId:e.SNAPSHOT,trialId:'test',unitSize:'ULTRA',metadataSource:'INSTALLER_VERSION_AND_DECLARED_SETUP',context:'CAMPAIGN',channel:setup.channel,synthetic:false,timestamp:V(100+index),status:'CAPTURED',
 root:{CampaignKey:V('campaign'),TurnNumber:V(1),IsPlayersTurn:V(true),IsMultiplayer:V(false),IsLocomotionComplete:V(true)},owner:{AgentSubtypeRecordContextKey:V(setup.ownerSubtype),IsPlayerCharacter:V(true),HasUncommitedSkills:V(false),CQI:V(11),Rank:V(20),CurrentXp:V(100)},force:{CQI:V(22),CommandingCharacterCQI:V(11),IsPreviewingStance:V(false),StanceKey:V('normal')},
 skills:{status:'COMPLETE',rows:e.SKILLS.map((s,i)=>({Key:V(s.key),Level:V(ranks[i]),OwnerCQI:V(11)}))},traits:{status:'COMPLETE',rows:[]},ancillaries:{status:'COMPLETE',rows:[]},armyRoster:{status:'COMPLETE',rows:e.SKILLS.map((s,i)=>({Key:V(`unit-${i}`),MainKey:V(s.mainKey)}))},
 units:{status:'COMPLETE',rows:e.SKILLS.map((s,i)=>({MainKey:V(s.mainKey),LandKey:V(s.landKey),ForceCQI:V(22),UniqueUiId:V(`unit-${i}`),DetailsUnitId:V(`unit-${i}`),DetailsMainKey:V(s.mainKey),IsCampaign:V(true),ExperienceLevel:V(0),ExperienceScore:V(0),NumEntities:V(90),HealthValue:V(1000),purchasedEffects:{status:'COMPLETE',rows:[]},stats:Object.fromEntries(e.STAT_KEYS.map(k=>{const j=s.stats.indexOf(k);return [k,{Key:V(k),Value:V(50+(j<0?0:e.deltas(s,model,ranks[i])[j]))}];}))}))}}));
 const parse=(rows=frames)=>r.parseLogs([{name:'SYNTHETIC-TEST-ONLY.log',text:rows.map(f=>e.PREFIX+JSON.stringify(f)).join('\n')}]);
 function reviewed(){const p=parse();setup.pinnedBaseline={captureSha256:p.frames[0].captureSha256};setup.expectedIdentity=r.inspectFrame(p.frames[0],setup).identity;setup.baselineSaveSha256='a'.repeat(64);setup.review={controlledSetup:true,loadedSaveAttested:true,baselineSaveSha256:setup.baselineSaveSha256,captureSha256s:p.frames.map(f=>f.captureSha256),channel:setup.channel,currentValuesNotTooltipOrPreview:true,reviewer:'TEST ONLY',evidenceNote:'TEST ONLY'};}
 return {e,r,setup,frames,parse,reviewed};
}
for(const [model,verdict] of [['CURRENT_RANK_ONLY','A'],['CUMULATIVE_RANKS','B']])test(`resolver exact eight-frame ${model} threshold`,async()=>{const f=await fixture(model);assert.equal(f.r.resolve(f.parse(),f.setup).verdict,'D');f.reviewed();const x=f.r.resolve(f.parse(),f.setup);assert.equal(x.verdict,verdict);assert.equal(x.productionEligible,false);assert.equal(x.observations.length,32);assert.equal(x.threshold.independent,true);});
test('empty evidence stays UNKNOWN; rank 1 ambiguous; one full Skill only provisional',async()=>{const f=await fixture();assert.equal(f.r.resolve(f.parse([]),f.setup).verdict,'E');assert.equal(f.r.resolve(f.parse(f.frames.slice(0,2)),f.setup).verdict,'E');assert.equal(f.r.resolve(f.parse(f.frames.slice(0,4)),f.setup).verdict,'D');assert(f.r.resolve(f.parse([f.frames[3]]),f.setup).errors.length);});
test('effect-specific/mixed behavior is OTHER, never inferred upgrade',async()=>{const f=await fixture();for(let n=0;n<8;n++){for(let i=0;i<2;i++){const s=f.e.SKILLS[i],rank=f.e.STATES[n][i];f.frames[n].units.rows[i].stats[s.stats[1]].Value=V(50+f.e.deltas(s,'CUMULATIVE_RANKS',rank)[1]);}}const x=f.r.resolve(f.parse(),f.setup);assert.equal(x.verdict,'E');assert.equal(x.semantics,'UNKNOWN');assert(x.skills.every(s=>s.matches.length===0));});
test('independent Skills disagree: provisional, no common rule',async()=>{const f=await fixture(),g=await fixture('CUMULATIVE_RANKS');for(let i=4;i<8;i++)f.frames[i]=g.frames[i];const x=f.r.resolve(f.parse(),f.setup);assert.equal(x.verdict,'D');assert.equal(x.threshold.independent,false);assert.equal(x.semantics,'UNKNOWN');});
const mutations={
 'wrong owner':f=>f.frames[1].owner.AgentSubtypeRecordContextKey=V('wrong'),
 'wrong lord instance':f=>f.frames[1].owner.CQI=V(99),
 'invalid CQI':f=>{f.frames[0].owner.CQI=V(0);f.frames[0].force.CommandingCharacterCQI=V(0);},
 'wrong skill':f=>f.frames[1].skills.rows[0].Key=V('wrong'),
 'wrong rank':f=>f.frames[1].skills.rows[0].Level=V(3),
 'wrong unit':f=>f.frames[1].units.rows[0].LandKey=V('wrong'),
 'wrong unit instance':f=>f.frames[1].units.rows[0].UniqueUiId=V('other'),
 'empty unit identity':f=>{f.frames[0].units.rows[0].UniqueUiId=V('');f.frames[0].units.rows[0].DetailsUnitId=V('');},
 'wrong stat identity':f=>f.frames[1].units.rows[0].stats.stat_morale.Key=V('wrong'),
 'unavailable not zero':f=>f.frames[1].units.rows[0].stats.stat_morale.Value={status:'UNSUPPORTED'},
 'preview':f=>f.frames[1].owner.HasUncommitedSkills=V(true),
 'experience changed':f=>f.frames[1].units.rows[0].ExperienceLevel=V(1),
 'army changed':f=>f.frames[1].armyRoster.rows.pop(),
 'negative control changed':f=>f.frames[1].units.rows[1].stats.stat_armour.Value=V(60),
 'baseline not restored':f=>f.frames[4].units.rows[1].stats.stat_armour.Value=V(60),
 'synthetic flag':f=>f.frames[0].synthetic=true,
 'wrong snapshot':f=>f.frames[0].snapshotId='wrong',
};
for(const [name,mutate] of Object.entries(mutations))test(`fail closed: ${name}`,async()=>{const f=await fixture();mutate(f);const x=f.r.resolve(f.parse(),f.setup);assert.equal(x.verdict,'E');assert(x.errors.length);assert.equal(x.observations.length,0);assert.equal(x.productionEligible,false);});
test('bound baseline/save and evidence review cannot drift',async()=>{const f=await fixture();f.reviewed();f.setup.pinnedBaseline.captureSha256='b'.repeat(64);assert(f.r.resolve(f.parse(),f.setup).errors.length);f.reviewed();f.setup.review.captureSha256s[7]='bad';assert.equal(f.r.resolve(f.parse(),f.setup).verdict,'D');});
test('duplicate logs collapse, conflicting captures and malformed frames quarantine',async()=>{const f=await fixture();assert.equal(f.parse([...f.frames,...f.frames]).duplicates,8);const changed=structuredClone(f.frames[0]);changed.timestamp=V(999);assert(f.parse([...f.frames,changed]).problems.length);assert(f.r.parseLogs([{name:'bad',text:f.e.PREFIX+'{bad'}]).problems.length);});
function runLua(script){const L=lauxlib.luaL_newstate();lualib.luaL_openlibs(L);const code=lauxlib.luaL_dostring(L,to_luastring(script));if(code!==lua.LUA_OK)throw new Error(to_jsstring(lua.lua_tostring(L,-1)));lua.lua_getglobal(L,to_luastring('captured'));const result=to_jsstring(lua.lua_tostring(L,-1));lua.lua_close(L);return JSON.parse(result.slice(result.indexOf('|')+1));}
test('actual Lua adapter executes read-only context graph and preserves committed ranks/stat identity',async()=>{
 const f=await fixture();const source=fs.readFileSync('tools/wh3-importer/skill-rank-runtime-resolution/exec.lua','utf8');
 const prelude=`WV_SKILL_RANK_CONFIG={sessionId='test',gameVersion='${f.e.VERSION}',snapshotId='${f.e.SNAPSHOT}',unitSize='ULTRA',trialId='test'}
 function out(s) captured=s end
 function ctx(t) return {Call=function(self,k) if t[k]==nil then error('unavailable:'..k) end return t[k] end} end
 function putlist(t,k,items) t[k..'.Size']=#items for i,v in ipairs(items) do t[k..'.At('..(i-1)..')']=v end end
 local owner={IsSelected=true,IsPlayerCharacter=true,CQI=11,Rank=20,CurrentXp=100,['AgentSubtypeRecordContext.Key']='wh_main_brt_lord',HasUncommitedSkills=false}
 local skills={ctx({Key='${f.e.SKILLS[0].key}',Level=0,['CharacterContext.CQI']=11}),ctx({Key='${f.e.SKILLS[1].key}',Level=0,['CharacterContext.CQI']=11})}
 putlist(owner,'SkillList',skills) putlist(owner,'TraitsList',{}) putlist(owner,'AncillaryList',{}) putlist(owner,'EffectBundleUnfilteredList',{})
 local units={}
 for i,key in ipairs({'${f.e.SKILLS[0].mainKey}','${f.e.SKILLS[1].mainKey}'}) do
 local d={['CampaignUnitContext.UniqueUiId']='unit-'..(i-1),['UnitRecordContext.Key']=key,IsCampaign=true,ExperienceScore=0}
 local stats={} for _,k in ipairs({'stat_morale','stat_melee_defence','stat_armour','stat_melee_attack'}) do stats[#stats+1]=ctx({Key=k,Value=50}) end putlist(d,'StatList',stats)
 local u={['UnitRecordContext.Key']=key,['UnitRecordContext.UnitLandRecordContext.Key']=key,UniqueUiId='unit-'..(i-1),['MilitaryForceContext.CQI']=22,ExperienceLevel=0,NumEntities=90,HealthValue=1000,['UnitDetailsContext.PreBonusUnitDetailsContext']=ctx(d)} putlist(u,'PurchasedEffectsList',{}) units[#units+1]=ctx(u)
 end
 local force={CQI=22,['CommandingCharacterContext.CQI']=11,IsPreviewingStance=false,['ActiveStanceContext.Key']='normal'} putlist(force,'UnitList',units) owner.MilitaryForceContext=ctx(force)
 local root={CampaignKey='campaign',TurnNumber=1,IsPlayersTurn=true,IsMultiplayer=false,IsLocomotionComplete=true} putlist(root,'CharacterList',{ctx(owner)})
 function cco(name,key) assert(name=='CcoCampaignRoot' and key=='') return ctx(root) end
 `;
 const frame=runLua(prelude+source);const entry=f.r.parseLogs([{name:'LUA-MOCK',text:f.e.PREFIX+JSON.stringify(frame)}]).frames[0];assert.deepEqual(f.r.inspectFrame(entry,f.setup).ranks,[0,0]);assert.equal(frame.units.rows[0].stats.stat_morale.Value.value,50);
 const failed=runLua(prelude+"\nfunction cco() error('API inaccessible') end\n"+source);assert.equal(failed.status,'UNAVAILABLE');assert.match(failed.error,/API inaccessible/);
});
test('CLI prepare/bind/ingest retains raw bytes, quarantines invalid input and refuses overwrite',async()=>{
 const f=await fixture(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'wv-rank-test-'));
 try{
  const cli=path.resolve('tools/wh3-importer/skill-rank-runtime-resolution/cli.mjs');
  const run=(...args)=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
  const bundle=path.join(dir,'bundle');let result=run('prepare','--unit-size','ULTRA','--out',bundle);assert.equal(result.status,0,result.stderr);
  assert.match(fs.readFileSync(path.join(bundle,'exec.lua'),'utf8'),/^WV_SKILL_RANK_CONFIG = /);
  assert.notEqual(run('prepare','--unit-size','ULTRA','--out',bundle).status,0);
  const setup=JSON.parse(fs.readFileSync(path.join(bundle,'setup.json'),'utf8'));f.frames.forEach(frame=>frame.trialId=setup.trialId);
  const raw=path.join(dir,'SYNTHETIC-TEST-ONLY.txt'),save=path.join(dir,'SYNTHETIC-TEST-ONLY.save');
  fs.writeFileSync(raw,f.frames.map(frame=>f.e.PREFIX+JSON.stringify(frame)).join('\r\n'));fs.writeFileSync(save,'NOT A REAL SAVE');
  const bound=path.join(dir,'bound');result=run('bind','--setup',path.join(bundle,'setup.json'),'--log',raw,'--save',save,'--out',bound);assert.equal(result.status,0,result.stderr);
  const out=path.join(dir,'capture');result=run('ingest','--setup',path.join(bound,'setup.json'),'--log',raw,'--out',out);assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(out,'resolution.json'),'utf8')).verdict,'D');
  assert.deepEqual(fs.readFileSync(path.join(out,'raw','0-SYNTHETIC-TEST-ONLY.txt')),fs.readFileSync(raw));
  fs.appendFileSync(raw,'\n'+f.e.PREFIX+'{bad');result=run('ingest','--setup',path.join(bound,'setup.json'),'--log',raw,'--out',path.join(dir,'bad'));assert.equal(result.status,2);assert.equal(fs.readFileSync(path.join(dir,'bad','observations.jsonl'),'utf8'),'');
 }finally{assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});}
});
test('Windows installer backs up and restores the existing script; changed probe fails closed',{skip:process.platform!=='win32'},()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wv-rank-install-test-'));
 try{
  const script=`$ErrorActionPreference='Stop'
  $game=Join-Path $env:WV_RANK_TEST_DIR 'game'; $bundle=Join-Path $env:WV_RANK_TEST_DIR 'bundle'
  New-Item -ItemType Directory -Path $game,$bundle | Out-Null
  Copy-Item -LiteralPath (Join-Path $env:SystemRoot 'System32\\where.exe') -Destination (Join-Path $game 'Warhammer3.exe')
  $version=(Get-Item -LiteralPath (Join-Path $game 'Warhammer3.exe')).VersionInfo.ProductVersion
  @{gameVersion=$version;trialId='TEST ONLY'} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $bundle 'setup.json')
  [IO.File]::WriteAllText((Join-Path $bundle 'exec.lua'), '-- mock collector')
  $original=[byte[]](0,1,2,13,10,255); [IO.File]::WriteAllBytes((Join-Path $game 'exec.lua'),$original)
  $installer=Join-Path $env:WV_RANK_REPO 'tools\\wh3-importer\\skill-rank-runtime-resolution\\install.ps1'
  $refused=$false; try { & $installer -GamePath $game -Bundle $bundle } catch { $refused=$true }; if (-not $refused) { throw 'Unowned overwrite allowed' }
  & $installer -GamePath $game -Bundle $bundle -BackupExistingCampaignScript
  if ([IO.File]::ReadAllText((Join-Path $game 'exec.lua')) -ne '-- mock collector') { throw 'Install failed' }
  [IO.File]::WriteAllText((Join-Path $game 'exec.lua'),'changed')
  $refused=$false; try { & $installer -GamePath $game -Bundle $bundle -Uninstall } catch { $refused=$true }; if (-not $refused) { throw 'Changed probe removed' }
  [IO.File]::WriteAllText((Join-Path $game 'exec.lua'),'-- mock collector')
  & $installer -GamePath $game -Bundle $bundle -Uninstall
  if ([Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $game 'exec.lua'))) -ne [Convert]::ToBase64String($original)) { throw 'Original bytes changed' }
  if (Test-Path -LiteralPath (Join-Path $game 'data\\script\\enable_console_logging')) { throw 'Owned marker not removed' }
  `;
  const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-Command',script],{encoding:'utf8',env:{...process.env,WV_RANK_TEST_DIR:dir,WV_RANK_REPO:process.cwd()}});
  assert.equal(result.status,0,result.stderr);
 }finally{assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});}
});
