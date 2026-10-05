const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {spawnSync} = require('node:child_process');
const React = require('react');
const {renderToString} = require('react-dom/server');
const {MemoryRouter} = require('react-router-dom');
const App = require('../.test-build/src/App.js').default;
const {gameRepository: game} = require('../.test-build/src/repositories/gameRepository.js');
const {wikiRepository: wiki, parseBackup} = require('../.test-build/src/repositories/wikiRepository.js');
const {resolveSavedTargetName, searchArchive} = require('../.test-build/src/repositories/archivePresentation.js');
const {memoryIndexedDb} = require('./fixtures/memoryIndexedDb.cjs');
const json = path => JSON.parse(readFileSync(path));
const units=json('src/data/units.json'), lords=json('src/data/lords.json'), heroes=json('src/data/heroes.json');
const render = url => renderToString(React.createElement(MemoryRouter,{initialEntries:[url]},React.createElement(App)));
let evidence;
async function source(){
 if(!evidence){
  const roster=await import('../tools/wh3-importer/production-growth/roster.mjs');
  const {decodeSource}=await import('../tools/wh3-importer/expansion-batch-01/compact.mjs');
  const raw=decodeSource(json('tools/wh3-importer/faction-rosters/source.json'),roster.rosterSourceHash);
  evidence={...roster,raw,rosters:roster.discoverRoster(raw)};
 }
 return evidence;
}
test('all COMPLETE catalogs account for every source identity; removing or misclassifying any admitted member forces HOLD',async()=>{
 const {rosters,checkCoverage,categories}=await source();
 assert(rosters.length>=9);
 for(const r of rosters){
  const report=checkCoverage([r],units,lords,heroes)[0];
  assert.equal(report.status,r.holds.length?'HOLD':'ROSTER COMPLETE');if(!r.holds.length)assert.deepEqual(report.missing,[]);
  assert.deepEqual(game.getRosterCoverage(r.factionId).counts.map(c=>[c.admitted,c.expected]),Object.values(report.counts).map(c=>[c.admitted,c.expected]));
  assert.equal(report.sourceStatus,'SOURCE COMPLETE');
  for(const key of r.subtypeKeys)assert.equal(categories.filter(c=>c!=='units').flatMap(c=>r[c]).filter(e=>e.subtypeKey===key||e.subtypeAliases.includes(key)).length+r.explicitlyExcluded.filter(e=>e.kind==='character'&&e.key===key).length,1,key);
  for(const key of r.mainKeys)assert.equal(r.units.filter(e=>e.mainKey===key).length+r.explicitlyExcluded.filter(e=>e.kind==='unit'&&e.key===key).length,1,key);
  for(const category of categories){const collection=category==='units'?units:category.endsWith('Lords')?lords:heroes;
   for(const e of r[category]){
    const changed=collection.filter(item=>item.id!==e.id);
    const c=checkCoverage([r],category==='units'?changed:units,category.endsWith('Lords')?changed:lords,category.endsWith('Heroes')?changed:heroes)[0];
    assert.equal(c.status,'HOLD',e.id);assert(c.missing.includes(e.id));
   }
  }
 }
 const changed=structuredClone(lords);changed.find(c=>c.id==='heinrich_kemmler').characterKind='generic_lord';
 assert.equal(checkCoverage([rosters.find(r=>r.factionId==='vampire_counts')],units,changed,heroes)[0].status,'HOLD');
 assert.equal(game.getRosterCoverage('warriors_of_chaos')?.status,'ROSTER COMPLETE');
 assert(!render('/').includes('샘플 팩션'));
 const companion=heroes.find(h=>h.subtypeKey==='wh2_dlc11_cst_ghost_paladin');
 assert.equal(companion.characterKind,'special_hero');
});
test('source universe cannot silently lose a subtype, unit, faction or permission row',async()=>{
 const {raw,discoverRoster}=await source();
 for(const change of [s=>s.catalog[0].subtypeKeys.pop(),s=>s.catalog[0].mainKeys.pop(),s=>s.catalog[0].factionKeys.pop(),s=>s.preflight.rows.splice(s.preflight.rows.findIndex(r=>r.table==='units_custom_battle_permissions_tables'),1)]){
  const altered=structuredClone(raw);change(altered);assert.throws(()=>discoverRoster(altered));
 }
});
test('baseline 101 Production + 5 Samples retain exact facts; new units have core identity and no speculative HP/Speed',async()=>{
 const baseline=spawnSync('git',['show','0205595380d4dcb95a9df83a2e3b405b518160c9:src/data/units.json']);assert.equal(baseline.status,0);
 const original=JSON.parse(baseline.stdout);assert.deepEqual(units.slice(0,original.length),original);
 const {rosters}=await source();
 for(const u of units.slice(original.length)){
  assert(rosters.some(r=>r.units.some(e=>e.id===u.id&&e.name===u.name)));
  assert.equal(u.gameVersion,'9.0.2.0');assert.equal(u.entities.totalHealth,undefined);assert.equal(u.movement.speed,undefined);
  assert.equal(u.missile,undefined);assert.equal(u.abilities,undefined);
 }
 for(const r of rosters){
  for(const e of r.units.filter(e=>e.isRenown||e.campaignExclusive))assert(game.getFactionUnits(r.factionId).some(u=>u.id===e.id));
 }
});
test('RoR lacking military group requires the exact connected non-quest faction battle permission',async()=>{
 const {raw,rosters,reviewRosterUnits}=await source();
 const {loadUnitValidator}=await import('../tools/wh3-importer/normalization/validation.mjs');
 const validate=await loadUnitValidator();const factionIds=game.listFactions().map(f=>f.id);
 const entry=rosters.flatMap(r=>r.units).find(e=>e.customBattleFaction);
 const candidate=raw.candidates.find(c=>c.id===entry.id);assert(candidate);
 assert.equal(reviewRosterUnits({...raw,candidates:[candidate]},rosters,validate,factionIds).holds.length,0);
 const altered=structuredClone(candidate);
 altered.permission.rows.filter(r=>r.table==='units_custom_battle_permissions_tables').forEach(r=>r.row.faction='wrong');
 assert.equal(reviewRosterUnits({...raw,candidates:[altered]},rosters,validate,factionIds).reviewed.length,0);
 const disconnected=structuredClone(candidate);disconnected.permission.relationships=[];
 assert.equal(reviewRosterUnits({...raw,candidates:[disconnected]},rosters,validate,factionIds).reviewed.length,0);
});
test('production subtype identities preserve legacy wiki IDs and shared memberships; every character route/search resolves',()=>{
 assert.equal(game.getLord('heinrich_kemmler').subtypeKey,'wh_main_vmp_heinrich_kemmler');
 assert.equal(game.getLord('vlad_von_carstein').subtypeKey,'wh_dlc04_vmp_vlad_con_carstein');
 assert.equal(new Set([...lords,...heroes].map(c=>c.subtypeKey)).size,lords.length+heroes.length);
 for(const [type,collection]of [['lord',lords],['hero',heroes]])for(const c of collection){
  assert(!c.source.includes('sample'));assert(c.name&&c.mainKey&&c.landKey&&c.characterKind&&c.subtypeKey);
  assert(searchArchive(c.subtypeKey).some(e=>e.id===c.id&&e.type===type));
  assert.equal(resolveSavedTargetName({entityType:type,entityId:c.id}),c.name);
  const html=render(`/${type==='hero'?'heroes':'lords'}/${c.id}`);
  for(const text of ['내 기록으로','내 기록','즐겨찾기 추가'])assert(html.includes(text),c.id);
 }
 const ulrika=heroes.find(h=>h.subtypeKey==='wh3_dlc23_neu_ulrika');
 assert(ulrika.factionIds.includes('empire')&&ulrika.factionIds.includes('vampire_counts'));
 for(const f of ulrika.factionIds)assert(game.getFactionHeroes(f).some(h=>h.id===ulrika.id));
 assert(render('/heroes/missing').includes('항목을 찾을 수 없습니다'));
});
test('Hero personal article, bookmark, recent view and v1 backup use existing generic storage',async()=>{
 global.indexedDB=memoryIndexedDb();
 const hero=heroes.find(h=>h.subtypeKey==='wh3_dlc29_vmp_handmaiden_imentet');
 assert.equal(hero.name,'Imentet the First');const target={entityType:'hero',entityId:hero.id};
 const content={evaluation:'영웅 문서 검증',tactics:'내 조합',strengths:'',weaknesses:''};
 await wiki.saveArticle(target,content);await wiki.setBookmark(target,true);await wiki.recordView(target);
 const backup=await wiki.exportBackup();global.indexedDB=memoryIndexedDb();await wiki.importBackup(parseBackup(backup));
 assert.equal((await wiki.getArticle(target)).evaluation,content.evaluation);assert.equal(await wiki.hasBookmark(target),true);
 assert.equal(resolveSavedTargetName((await wiki.listRecent())[0]),hero.name);
 await wiki.saveArticle(target,{...content,evaluation:'수정 확인'});assert.equal((await wiki.getArticle(target)).evaluation,'수정 확인');
 await wiki.setBookmark(target,false);assert.equal(await wiki.hasBookmark(target),false);
});
test('all 478 previous Production Units and original nine unit admissions remain unchanged',async()=>{
 const fromBaseline=path=>{const p=spawnSync('git',['show',`68910e320d7759047cecf705b4c6e16b104831f4:${path}`],{maxBuffer:16*1024*1024});assert.equal(p.status,0);return JSON.parse(p.stdout);};
 const original=fromBaseline('src/data/units.json');assert.deepEqual(units.slice(0,original.length),original);
 const prior=fromBaseline('tools/wh3-importer/faction-rosters/admission.json'), current=json('tools/wh3-importer/faction-rosters/admission.json');
 for(const r of prior.rosters){const now=current.rosters.find(n=>n.factionId===r.factionId);assert.deepEqual(now.units,r.units);assert.deepEqual(now.explicitlyExcluded.filter(e=>e.kind==='unit'),r.explicitlyExcluded.filter(e=>e.kind==='unit'));assert.equal(game.getRosterCoverage(r.factionId).status,'ROSTER COMPLETE');}
 for(const e of prior.admitted)assert.deepEqual(current.admitted.find(n=>n.id===e.id),e);
});
test('exact nested Loc resolves completely; named special lords remain distinct from shared battle archetypes',async()=>{
 const {raw}=await source();const {resolveCharacterLoc,specialLordNotices}=await import('../tools/wh3-importer/production-growth/characters.mjs');
 assert([...lords,...heroes].every(c=>!c.name.includes('{{tr:')));
 const loc=raw.preflight.rows.find(r=>r.table==='Loc'&&r.row.text.includes('{{tr:land_units_onscreen_name_wh_dlc04_vmp_cha_master_necromancer_1}}'));
 assert(loc);const resolved=resolveCharacterLoc(raw.preflight.rows,loc.row.key);assert.equal(resolved.text,'Master Necromancer (Vampires)');assert(resolved.sourceRowIds.length>=2);
 assert.throws(()=>resolveCharacterLoc(raw.preflight.rows.filter(r=>r.id!==resolved.sourceRowIds[1]),loc.row.key));
 for(const subtypeKey of Object.keys(specialLordNotices)){const lord=lords.find(c=>c.subtypeKey===subtypeKey);assert(lord);assert.equal(lord.characterKind,'special_lord');assert.equal(lord.subtypeAliases.length,0);assert.notEqual(lord.name,'Tomb King');assert(!lord.name.startsWith('Vampire Fleet Admiral'));}
 assert.equal(lords.find(c=>c.subtypeKey==='wh2_dlc12_lzd_red_crested_skink_chief_legendary').characterKind,'special_lord');
 assert.equal(heroes.find(c=>c.subtypeKey==='wh2_dlc12_lzd_lord_kroak').characterKind,'legendary_hero');
 assert.equal(heroes.find(c=>c.subtypeKey==='wh2_dlc13_emp_hunter_kalara_of_wydrioth').characterKind,'special_hero');
});
test('old character IDs resolve deterministic aliases or preserved excluded records without orphaning personal documents',async()=>{
 const previous=path=>JSON.parse(spawnSync('git',['show',`68910e320d7759047cecf705b4c6e16b104831f4:${path}`]).stdout);
 for(const [type,path] of [['lord','src/data/lords.json'],['hero','src/data/heroes.json']])for(const old of previous(path)){
  const current=type==='lord'?game.getLord(old.id):game.getHero(old.id);assert(current,old.id);assert.equal(resolveSavedTargetName({entityType:type,entityId:old.id}),current.name);
  assert(render(`/${type==='lord'?'lords':'heroes'}/${old.id}`).includes('내 기록'));
 }
 const aliases=json('src/data/characterAliases.json');assert.equal(new Set(aliases.map(a=>a.id)).size,aliases.length);assert(aliases.length>=15);
 for(const a of aliases){const c=a.entityType==='lord'?game.getLord(a.id):game.getHero(a.id);assert.equal(c.id,a.canonicalId);assert(c.subtypeAliases.includes(a.subtypeKey));assert(!(a.entityType==='lord'?lords:heroes).some(c=>c.id===a.id));assert(game.search(a.subtypeKey).some(c=>c.id===a.canonicalId));}
 global.indexedDB=memoryIndexedDb();
 const a=aliases.find(a=>a.entityType==='hero'),old={entityType:a.entityType,entityId:a.id},canonical={entityType:a.entityType,entityId:a.canonicalId};
 const content={evaluation:'旧 subtype 기록',tactics:'',strengths:'',weaknesses:''};
 await wiki.saveArticle(old,content);await wiki.saveArticle(canonical,{...content,evaluation:'대표 항목의 다른 문서'});
 await wiki.setBookmark(old,true);await wiki.recordView(old);
 const backup=await wiki.exportBackup();global.indexedDB=memoryIndexedDb();await wiki.importBackup(parseBackup(backup));
 assert.equal((await wiki.getArticle(old)).evaluation,content.evaluation);assert.equal((await wiki.getArticle(canonical)).evaluation,'대표 항목의 다른 문서');assert(await wiki.hasBookmark(old));assert((await wiki.listRecent()).some(r=>r.entityId===a.id));
});
test('native character identity excludes unrelated common permissions and prologue actors; generic set-piece models do not imply uniqueness',async()=>{
 const {rosters,raw}=await source();
 const woc=rosters.find(r=>r.factionId==='warriors_of_chaos');
 assert(!game.getFactionLords('warriors_of_chaos').some(c=>c.subtypeKey==='wh3_main_kho_skarbrand'));
 assert(woc.explicitlyExcluded.some(e=>e.key==='wh3_main_kho_skarbrand'&&e.reason.startsWith('NO_NATIVE_PLAYER_CHARACTER_IDENTITY')));
 assert(game.getFactionLords('khorne').some(c=>c.subtypeKey==='wh3_main_kho_skarbrand'));
 for(const key of ['wh3_main_pro_ksl_sergi_0','wh3_main_pro_slavin_0'])assert(rosters.find(r=>r.factionId==='norsca').explicitlyExcluded.some(e=>e.key===key));
 assert.equal(game.getLord('ca_lord_wh2_main_def_black_ark').characterKind,'special_lord');
 assert.equal(game.getHero('ca_hero_wh2_dlc16_wef_malicious_branchwraith_beasts').characterKind,'generic_hero');
 const {legendaryHeroNotices,resolveCharacterLoc}=await import('../tools/wh3-importer/production-growth/characters.mjs');
 for(const r of rosters)for(const e of r.legendaryHeroes){const notice=legendaryHeroNotices[e.subtypeKey];const resolved=resolveCharacterLoc(raw.preflight.rows,notice??`agent_subtypes_onscreen_name_override_${e.subtypeKey}`);assert(resolved.text.includes('Legendary Hero'));if(notice)assert(resolved.text.includes(e.name));}
});
test('unresolved Dragonship captain identities remain visible as five HOLD expectations and never become guessed aliases or duplicate production entries',async()=>{
 const {rosters,checkCoverage}=await source(),r=rosters.find(r=>r.factionId==='high_elves');
 assert.equal(r.heldCharacters.length,5);assert.equal(r.holds.length,5);
 const report=checkCoverage([r],units,lords,heroes)[0];assert.equal(report.status,'HOLD');assert.equal(report.sourceStatus,'SOURCE COMPLETE');assert.deepEqual(report.counts.specialLords,{admitted:0,expected:5});assert.equal(report.missing.length,5);
 for(const e of r.heldCharacters){assert(!lords.some(c=>c.id===e.id));assert.equal(e.subtypeAliases.length,0);assert(r.explicitlyExcluded.some(x=>x.key===e.subtypeKey&&x.reason.startsWith('HOLD_CHARACTER_IDENTITY')));}
 assert(render('/factions/high_elves').includes('검토 보류'));
});
