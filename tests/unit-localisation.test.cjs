const {withoutUnitMissiles:stripMissiles}=require('../.test-build/src/repositories/unitMissiles.js');
const {withoutUnitRecruitment}=require('../.test-build/src/repositories/unitRecruitment.js');
const withoutUnitMissiles=unit=>stripMissiles(withoutUnitRecruitment(unit));
const {withoutUnitResistances}=require('../.test-build/src/repositories/unitResistances.js');
const {withoutUnitEntities}=require('../.test-build/src/repositories/unitEntities.js');
const {withoutUnitSpeed}=require('../.test-build/src/repositories/unitSpeed.js');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const React=require('react');
const {renderToString}=require('react-dom/server');
const {MemoryRouter}=require('react-router-dom');
const App=require('../.test-build/src/App.js').default;
const {gameRepository:game}=require('../.test-build/src/repositories/gameRepository.js');
const {unitCatalogRepository:catalog,createUnitCatalog}=require('../.test-build/src/repositories/unitCatalogRepository.js');
const {unitDiagnosticRepository:diagnostics}=require('../.test-build/src/repositories/unitDiagnosticRepository.js');
const {localiseUnit,withoutUnitLocalisation}=require('../.test-build/src/repositories/unitLocalisation.js');
const {withoutUnitAttributes}=require('../.test-build/src/repositories/unitAttributes.js');
const {withoutUnitPassives}=require('../.test-build/src/repositories/unitPassives.js');
const {resolveSavedTargetName}=require('../.test-build/src/repositories/archivePresentation.js');
const {wikiRepository:wiki,parseBackup}=require('../.test-build/src/repositories/wikiRepository.js');
const {memoryIndexedDb}=require('./fixtures/memoryIndexedDb.cjs');
const {validateUnits}=require('../.test-build/src/domain/unitValidation.js');
const json=p=>JSON.parse(readFileSync(p));
const raw=json('src/data/units.json'),projection=json('src/data/unitLocalisations.json');
const render=id=>renderToString(React.createElement(MemoryRouter,{initialEntries:[`/units/${id}`]},React.createElement(App)));

test('every exact Production ID gets its admitted Korean name; Samples, all stats and raw projections remain unchanged',()=>{
  assert.equal(projection.admissions.length,raw.filter(u=>u.gameVersion!=='sample').length);
  assert.deepEqual(projection.holds,[]);
  assert.equal(new Set(projection.admissions.map(a=>a.id)).size,projection.admissions.length);
  for(const u of raw){
    const current=game.getUnit(u.id);
    assert.deepEqual(withoutUnitSpeed(withoutUnitEntities(withoutUnitPassives(withoutUnitAttributes(withoutUnitLocalisation(withoutUnitResistances(withoutUnitMissiles(current))))))),u);
    if(u.gameVersion==='sample')assert.deepEqual(current,u);
    else {
      const a=projection.admissions.find(a=>a.id===u.id);
      assert(/[가-힣]/.test(current.name));assert.equal(current.name,a.name);assert.equal(a.englishName,u.name);
      assert.equal(a.localisationKey,`land_units_onscreen_name_${a.landKey}`);
      for(const query of [current.name,u.name,u.id]){
        assert(game.search(query).some(r=>r.id===u.id));
        assert(catalog.search(query).some(r=>r.id===u.id));
      }
      assert.equal(resolveSavedTargetName({entityType:'unit',entityId:u.id}),current.name);
    }
  }
  assert.deepEqual(validateUnits(game.listUnits(),game.listFactions().map(f=>f.id)),[]);
  const source=json('tools/wh3-importer/unit-localisation/source.json');
  assert.equal(source.rows.length,1072);assert.deepEqual(source.missingKeys,[]);
  const baseline='52d4a40';
  for(const path of ['src/data/units.json','src/data/factions.json','src/data/lords.json','src/data/heroes.json','src/data/factionRosters.json','src/data/characterAliases.json','src/data/legacyCharacters.json','src/data/unitSharedIdentities.json','src/data/unitHpAdmissions.json','src/data/unitSpeedAdmissions.json','src/data/unitDiagnostics.json','tools/wh3-importer/faction-rosters/source.json','tools/wh3-importer/faction-rosters/admission.json']){
    const old=spawnSync('git',['show',`${baseline}:${path}`],{maxBuffer:128*1024*1024});assert.equal(old.status,0,old.error?.message);
    assert.equal(readFileSync(path,'utf8').replace(/\r\n/g,'\n'),old.stdout.toString().replace(/\r\n/g,'\n'),path);
  }
  assert.equal(game.listFactions().filter(f=>game.getRosterCoverage(f.id)?.status==='ROSTER COMPLETE').length,23);
});

test('raw source, snapshot, exact requests and materialized projection replay without installed packs',async()=>{
  const {reviewUnitLocalisation}=await import('../tools/wh3-importer/unit-localisation/review.mjs');
  const {decodeSource}=await import('../tools/wh3-importer/expansion-batch-01/compact.mjs');
  const {rosterSourceHash}=await import('../tools/wh3-importer/production-growth/roster.mjs');
  const source=json('tools/wh3-importer/unit-localisation/source.json');
  const roster=decodeSource(json('tools/wh3-importer/faction-rosters/source.json'),rosterSourceHash);
  assert.deepEqual(reviewUnitLocalisation(source,roster,raw),projection);
  for(const mutate of [s=>s.rows[0].row.text='추측한 번역',s=>s.requests[0].landKey='wrong',s=>s.provenance.schemaSha256='wrong',s=>s.koreanPack.sha256='wrong',s=>s.rows.pop()]){
    const changed=structuredClone(source);mutate(changed);assert.throws(()=>reviewUnitLocalisation(changed,roster,raw),/source hash drift/);
  }
  assert.throws(()=>reviewUnitLocalisation(source,roster,raw.slice(1)),/Unit facts drift/);
});

test('missing, duplicate, cyclic, wrong-pack and non-Korean Loc values never become guessed names',async()=>{
  const {resolveUnitLoc}=await import('../tools/wh3-importer/unit-localisation/review.mjs');
  const row=(key,text)=>({id:`kr:text/test.loc:${key}`,table:'Loc',key:{key},sourcePack:'local_kr.pack',path:'text/test.loc',tableVersion:1,row:{key,text,tooltip:false}});
  const a=row('a','{{tr:b}} (방패)'),b=row('b','검사');
  assert.deepEqual(resolveUnitLoc([a,b],'a'),{text:'검사 (방패)',sourceRowIds:[a.id,b.id]});
  for(const rows of [[],[a],[row('a','검사'),row('a','검사')],[row('a','{{tr:a}}')],[row('a','{{tr:b}}'),row('b','{{tr:a}}')],[row('a','English only')],[row('a','')],[row('a','[[col:red]]검사')],[{...row('a','검사'),sourcePack:'local_en.pack'}]])assert.throws(()=>resolveUnitLoc(rows,'a'));
});

test('shared diagnostic collision gate accepts only the exact name admission and still rejects modified facts',()=>{
  for(const d of diagnostics.list()){
    const u=game.getUnit(d.id);assert.equal(createUnitCatalog([u],[d]).length,1);
    for(const changed of [{...u,name:'다른 이름'},{...u,gameVersion:'wrong'},{...u,defense:{...u.defense,armor:999}}])assert.throws(()=>createUnitCatalog([changed],[d]),/collision/);
    assert.throws(()=>localiseUnit({...withoutUnitLocalisation(u),name:'Changed English name'}),/identity drift/);
    const html=render(u.id);assert(html.includes(`<h1>${u.name}</h1>`));assert(html.includes('lang="en"'));assert(html.includes('local_kr.pack'));assert(html.includes(projection.koreanPack.sha256));
  }
});

test('existing Unit articles, bookmarks and recent views restore by the same ID with a Korean display name',async()=>{
  global.indexedDB=memoryIndexedDb();
  const target={entityType:'unit',entityId:raw.find(u=>u.gameVersion!=='sample').id};
  const content={evaluation:'이전 개인 문서',tactics:'내 조합',strengths:'',weaknesses:''};
  await wiki.saveArticle(target,content);await wiki.setBookmark(target,true);await wiki.recordView(target);
  const backup=await wiki.exportBackup();global.indexedDB=memoryIndexedDb();await wiki.importBackup(parseBackup(backup));
  assert.equal((await wiki.getArticle(target)).evaluation,content.evaluation);assert(await wiki.hasBookmark(target));
  assert.equal((await wiki.listRecent())[0].entityId,target.entityId);
  assert.equal(resolveSavedTargetName(target),game.getUnit(target.entityId).name);
});
