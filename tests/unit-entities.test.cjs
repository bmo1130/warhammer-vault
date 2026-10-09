const {withoutUnitMissiles:stripMissiles}=require('../.test-build/src/repositories/unitMissiles.js');
const {withoutUnitRecruitment}=require('../.test-build/src/repositories/unitRecruitment.js');
const withoutUnitMissiles=unit=>stripMissiles(withoutUnitRecruitment(unit));
const {withoutUnitResistances}=require('../.test-build/src/repositories/unitResistances.js');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const React=require('react');
const {renderToString}=require('react-dom/server');
const {gameRepository:game}=require('../.test-build/src/repositories/gameRepository.js');
const {applyUnitEntities,withoutUnitEntities,unitEntityAdmission}=require('../.test-build/src/repositories/unitEntities.js');
const {withoutUnitSpeed}=require('../.test-build/src/repositories/unitSpeed.js');
const {applyUnitPassives}=require('../.test-build/src/repositories/unitPassives.js');
const {applyUnitAttributes}=require('../.test-build/src/repositories/unitAttributes.js');
const {localiseUnit}=require('../.test-build/src/repositories/unitLocalisation.js');
const {createUnitCatalog}=require('../.test-build/src/repositories/unitCatalogRepository.js');
const {unitDiagnosticRepository:diagnostics}=require('../.test-build/src/repositories/unitDiagnosticRepository.js');
const {validateUnits}=require('../.test-build/src/domain/unitValidation.js');
const Details=require('../.test-build/src/components/UnitProductionDetails.js').default;
const {wikiRepository:wiki,parseBackup}=require('../.test-build/src/repositories/wikiRepository.js');
const {memoryIndexedDb}=require('./fixtures/memoryIndexedDb.cjs');
const read=p=>JSON.parse(readFileSync(p));
const raw=read('src/data/units.json'),manifest=read('tools/wh3-importer/unit-entities/manifest.json');
const review=read('tools/wh3-importer/unit-entities/admission.json'),projection=read('src/data/unitEntityAdmissions.json');
const production=game.listUnits().filter(u=>u.gameVersion!=='sample');
const rules=read('src/data/unitHpEntityRuleAdmissions.json');
const expected={
  wh_main_emp_inf_swordsmen:[120,8280],wh_main_brt_cav_mounted_yeomen_0:[60,5520],wh_dlc01_chs_mon_dragon_ogre:[16,9856],
  wh2_dlc13_lzd_mon_dread_saurian_1:[1,15088],wh2_dlc09_tmb_veh_skeleton_chariot_0:[12,7032],
  wh_main_brt_art_field_trebuchet:[4,4512],wh2_dlc09_tmb_art_screaming_skull_catapult_0:[4,4356],
  wh2_main_skv_art_plagueclaw_catapult:[4,5028],wh2_dlc12_skv_veh_doom_flayer_0:[8,6128],wh_main_vmp_veh_black_coach:[1,5980],
  wh_main_emp_inf_spearmen_1:[120,8280],wh_dlc07_brt_inf_battle_pilgrims_0:[120,8280],wh_dlc07_brt_art_blessed_field_trebuchet_0:[4,4512],
};

test('all thirteen previously verified HP values regress exactly inside expanded empirical Ultra coverage',()=>{
  assert.equal(production.length,1110);
  assert.equal(production.filter(u=>u.entities.count!==undefined).length,1071);
  assert.equal(production.filter(u=>u.entities.count===undefined).length,39);
  assert.equal(production.filter(u=>u.entities.totalHealth!==undefined).length,986);
  assert.equal(production.filter(u=>u.entities.healthPerEntity!==undefined).length,0);
  assert.deepEqual(review.summary.combined,{complete:13,partial:0,unknown:1097});
  assert.equal(projection.admissions.length,Object.keys(expected).length);
  for(const [key,[count,totalHealth]]of Object.entries(expected)){
    const u=game.getUnit('ca_unit_'+key);assert.equal(u.entities.count,count,key);assert.equal(u.entities.totalHealth,totalHealth,key);
    assert.equal(unitEntityAdmission(u).unitSize,'ULTRA');
    const a=review.admissions.find(a=>a.id===u.id);assert.equal(a.countMeaning,'INITIAL_LOGICAL_COMBAT_ENTITIES_NOT_COMPONENT_OR_CREW_COUNT');
    assert(a.references.length&&a.rawFacts['land.bonus_hit_points'].source.rowId);
    assert.equal(a.healthPerEntityStatus,'UNKNOWN');
  }
  assert.equal(new Set(projection.admissions.map(a=>game.getUnit(a.id).factionId)).size,7);
  assert.deepEqual(validateUnits(game.listUnits(),game.listFactions().map(f=>f.id)),[]);
});

test('every non-count field, old HP, Sample, roster, Character identity and prior slice evidence survives',()=>{
  for(const r of raw){
    const previous=applyUnitPassives(applyUnitAttributes(localiseUnit(r))),current=game.getUnit(r.id);
    assert.deepEqual(withoutUnitSpeed(withoutUnitEntities(withoutUnitResistances(withoutUnitMissiles(current)))),previous,r.id);
    if(r.gameVersion==='sample')assert.deepEqual(current,r);
  }
  for(const path of ['src/data/units.json','src/data/unitLocalisations.json','src/data/unitAttributeAdmissions.json','src/data/unitPassiveAdmissions.json',
    'src/data/unitHpAdmissions.json','src/data/unitSpeedAdmissions.json','src/data/factionRosters.json','src/data/characterAliases.json',
    'src/data/legacyCharacters.json','src/data/lords.json','src/data/heroes.json','src/data/factions.json','src/data/unitSharedIdentities.json',
    'tools/wh3-importer/unit-passives/admission.json','tools/wh3-importer/unit-passives/source.json','tools/wh3-importer/hp-policy/review.json',
    'tools/wh3-importer/hp-policy/static-review.json']){
    const old=spawnSync('git',['show',`464e844:${path}`],{maxBuffer:128*1024*1024});assert.equal(old.status,0);
    assert.equal(readFileSync(path,'utf8').replace(/\r\n/g,'\n'),old.stdout.toString().replace(/\r\n/g,'\n'),path);
  }
  assert.equal(production.filter(u=>u.attributes!==undefined).length,1107);
  assert.equal(production.filter(u=>u.passiveAbilities!==undefined).length,1105);
  assert.equal(production.filter(u=>/[가-힣]/.test(u.name)).length,1110);
  assert.equal(game.listFactions().filter(f=>game.getRosterCoverage(f.id)?.status==='ROSTER COMPLETE').length,23);
});

test('raw count is not logical count; heterogeneous artillery HP, riders, articulation and single bodies are never collapsed',()=>{
  const sample=k=>review.samples.find(c=>c.id==='ca_unit_'+k);
  const dread=sample('wh2_dlc13_lzd_mon_dread_saurian_1');assert.equal(dread.rawFacts['main.num_men'].value,12);assert.equal(dread.actual.count,1);
  const chariot=sample('wh2_dlc09_tmb_veh_skeleton_chariot_0');assert.equal(chariot.rawFacts['main.num_men'].value,24);assert.equal(chariot.actual.count,12);
  const arty=sample('wh_main_brt_art_field_trebuchet');assert.equal(arty.rawFacts['main.num_men'].value,44);assert.equal(arty.actual.count,4);
  assert.equal(arty.rawFacts['engine.hit_points'].value,500);assert.notEqual(arty.actual.totalHealth/4,500);
  const steam=sample('wh_main_emp_veh_steam_tank');assert.equal(steam.rawFacts['mount.hit_points'].value,10);assert.equal(steam.expected,null);assert.equal(steam.actual.count,null);
  for(const s of review.samples)if(s.expected===null)assert.deepEqual(s.actual,{count:null,totalHealth:null});
  for(const category of ['INFANTRY','ELITE_LOW_COUNT_INFANTRY','CAVALRY','MONSTROUS_INFANTRY','SINGLE_MONSTER_WITH_CREW','ARTILLERY','CHARIOT','FLYING_MOUNTED','SWARM'])assert(review.samples.some(c=>c.category===category));
  for(const category of ['LORD','HERO']){
    const c=review.characters.find(c=>c.category===category);assert.equal(c.rawValues.num_men,1);assert.equal(c.expected,null);assert.equal(game.getUnit(c.id),undefined);
    assert(!projection.admissions.some(a=>a.id===c.id));
  }
  assert.deepEqual(review.scaling,{ULTRA:'DIRECT_CAPTURE_OR_EXISTING_EXACT_PROFILE_ONLY',LARGE:'UNKNOWN',MEDIUM:'UNKNOWN',SMALL:'UNKNOWN'});
  assert.equal(review.catalog.length,1110);assert.equal(review.summary.incompleteRawHpChains,113);
});

test('offline entity review replays original parser, exact source chains and pinned scopes; mutations fail closed',async()=>{
  const {reviewUnitEntities,reviewedCount}=await import('../tools/wh3-importer/unit-entities/review.mjs');
  assert.deepEqual(reviewUnitEntities(),{review,projection});
  assert.throws(()=>reviewUnitEntities(manifest,raw.slice(1)),/baseline drift/);
  const wrongPin=structuredClone(manifest);wrongPin.inputs[0].sha256='guess';assert.throws(()=>reviewUnitEntities(wrongPin),/source hash drift/);
  const wrongSize={...manifest,unitSize:'MEDIUM'};assert.throws(()=>reviewUnitEntities(wrongSize),/ULTRA/);
  const record=read('tools/wh3-importer/hp-policy/review.json').review.find(r=>r.candidates.length>1);
  for(const mutate of [r=>r.candidates[1].NumEntitiesInitial++,r=>r.candidates[0].NumEntitiesInitial=0,
    r=>r.candidates[0].unitSize='MEDIUM',r=>r.candidates[0].metadata.contextId='campaign_skill',r=>r.candidates[0].metadata.scenarioId='CAMPAIGN',
    r=>r.candidates[0].metadata.staticSnapshotId='wrong',r=>r.candidates[0].HealthMax++,r=>r.status='WITHHELD',r=>r.held.push({reason:'conflict'})]){
    const bad=structuredClone(record);mutate(bad);assert.throws(()=>reviewedCount(bad),/refused/);
  }
});

test('only exact entity overlay can be removed by the shared identity guard; HP or count drift remains a collision',()=>{
  for(const d of diagnostics.list()){
    const u=game.getUnit(d.id);assert.equal(createUnitCatalog([u],[d]).length,1);
    for(const changed of [{...u,entities:{...u.entities,count:(u.entities.count??0)+1}},
      {...u,entities:{...u.entities,totalHealth:(u.entities.totalHealth??0)+1}}])assert.throws(()=>createUnitCatalog([changed],[d]),/collision/);
  }
  const u=raw.find(r=>projection.admissions.some(a=>a.id===r.id));
  for(const entities of [{...u.entities,count:1},{...u.entities,totalHealth:1}])assert.throws(()=>applyUnitEntities({...u,entities}),/identity drift/);
  const current=game.getUnit(u.id);assert.equal(withoutUnitEntities({...current,entities:{...current.entities,count:999}}).entities.count,999);
});

test('validator rejects unsafe, fractional, nonpositive counts; UI retains Ultra, total and per-entity meanings',()=>{
  const u=production[0],factions=game.listFactions().map(f=>f.id);
  for(const count of [0,-1,0.5,Infinity,NaN,Number.MAX_SAFE_INTEGER+1])assert(validateUnits([{...u,entities:{...u.entities,count}}],factions).some(i=>i.field==='entities.count'));
  const known=game.getUnit('ca_unit_wh_main_brt_art_field_trebuchet');
  const html=renderToString(React.createElement(Details,{unit:known})).replace(/<!--.*?-->/g,'');
  assert(html.includes('전투 개체 수 (Ultra)'));assert(html.includes('부대 총 생명력 (Ultra)'));assert(html.includes('개체당 생명력'));
  assert(html.includes('승무원이나 탑승자를 별도로 더하지 않습니다'));assert(html.includes('4512'));assert(html.includes('script_log_031026_1244.txt:83'));
  assert(html.includes(rules.sourceHash));
  const unknown=production.find(u=>u.entities.count===undefined);assert(renderToString(React.createElement(Details,{unit:unknown})).includes('미확인'));
});

test('existing bookmarks, article and recent records keep the exact Unit identity after count promotion',async()=>{
  global.indexedDB=memoryIndexedDb();const target={entityType:'unit',entityId:'ca_unit_wh_main_emp_inf_swordsmen'};
  await wiki.saveArticle(target,{evaluation:'기존 문서',tactics:'진형',strengths:'',weaknesses:''});await wiki.setBookmark(target,true);await wiki.recordView(target);
  const backup=await wiki.exportBackup();global.indexedDB=memoryIndexedDb();await wiki.importBackup(parseBackup(backup));
  assert.equal((await wiki.getArticle(target)).evaluation,'기존 문서');assert(await wiki.hasBookmark(target));assert.equal((await wiki.listRecent())[0].entityId,target.entityId);
  assert.equal(game.getUnit(target.entityId).entities.count,120);
});
