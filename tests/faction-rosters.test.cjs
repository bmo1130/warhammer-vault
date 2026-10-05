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
 const {rosters,checkCoverage}=await source();
 assert.equal(rosters.length,9);
 for(const r of rosters){
  const report=checkCoverage([r],units,lords,heroes)[0];
  assert.equal(report.status,'ROSTER COMPLETE');assert.deepEqual(report.missing,[]);
  assert.deepEqual(game.getRosterCoverage(r.factionId).counts.map(c=>[c.admitted,c.expected]),Object.values(report.counts).map(c=>[c.admitted,c.expected]));
  for(const key of r.subtypeKeys)assert.equal([...r.legendaryLords,...r.genericLords,...r.legendaryHeroes,...r.genericHeroes].filter(e=>e.subtypeKey===key).length+r.explicitlyExcluded.filter(e=>e.kind==='character'&&e.key===key).length,1,key);
  for(const key of r.mainKeys)assert.equal(r.units.filter(e=>e.mainKey===key).length+r.explicitlyExcluded.filter(e=>e.kind==='unit'&&e.key===key).length,1,key);
  for(const [category,collection]of [['units',units],['legendaryLords',lords],['genericLords',lords],['legendaryHeroes',heroes],['genericHeroes',heroes]]){
   for(const e of r[category]){
    const changed=collection.filter(item=>item.id!==e.id);
    const c=checkCoverage([r],category==='units'?changed:units,category.endsWith('Lords')?changed:lords,category.endsWith('Heroes')?changed:heroes)[0];
    assert.equal(c.status,'HOLD',e.id);assert(c.missing.includes(e.id));
   }
  }
 }
 const changed=structuredClone(lords);changed.find(c=>c.id==='heinrich_kemmler').characterKind='generic_lord';
 assert.equal(checkCoverage([rosters.find(r=>r.factionId==='vampire_counts')],units,changed,heroes)[0].status,'HOLD');
 assert.equal(game.getRosterCoverage('warriors_of_chaos'),undefined);
 assert(!render('/').includes('샘플 팩션'));
 const companion=heroes.find(h=>h.subtypeKey==='wh2_dlc11_cst_ghost_paladin');
 assert.equal(companion.characterKind,'legendary_hero');
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
