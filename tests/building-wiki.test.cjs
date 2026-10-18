const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const React=require('react');
const {renderToString}=require('react-dom/server');
const {MemoryRouter}=require('react-router-dom');
const App=require('../.test-build/src/App.js').default;
const Catalog=require('../.test-build/src/components/BuildingCatalog.js').default;
const {buildingWikiRepository:wiki,createBuildingWiki,bretonniaBuildingScope,buildingDisplayName}=require('../.test-build/src/repositories/buildingWikiRepository.js');
const {recruitmentBuilding,unitRecruitmentAdmission}=require('../.test-build/src/repositories/unitRecruitment.js');
const {gameRepository:game}=require('../.test-build/src/repositories/gameRepository.js');
const {searchArchive,resolveSavedTargetName}=require('../.test-build/src/repositories/archivePresentation.js');
const {wikiRepository:personal,parseBackup}=require('../.test-build/src/repositories/wikiRepository.js');
const {memoryIndexedDb}=require('./fixtures/memoryIndexedDb.cjs');
const projection=JSON.parse(fs.readFileSync('src/data/unitRecruitmentAdmissions.json'));
const render=url=>renderToString(React.createElement(MemoryRouter,{initialEntries:[url]},React.createElement(App))).replace(/<!--.*?-->/g,'');
const key='wh_main_brt_stables_3';
const knight='ca_unit_wh_main_brt_cav_knights_of_the_realm';

test('bounded scope has exactly six chains and eighteen existing exact stages; no guessed worship stage zero',()=>{
  assert.equal(bretonniaBuildingScope.length,6);assert.equal(wiki.list().length,18);
  const selectedChains=new Set(bretonniaBuildingScope.map(c=>c.key));
  const expected=Object.values(projection.buildings).filter(b=>selectedChains.has(b.chainKey)).map(b=>b.key).sort();
  assert.deepEqual(wiki.list().map(e=>e.building.key).sort(),expected);
  for(const entry of wiki.list())assert.equal(entry.building,recruitmentBuilding(entry.building.key));
  assert.deepEqual(wiki.chain('wh_main_BRETONNIA_worship').map(e=>e.building.stage),[1,2]);
  for(const unknown of ['wh_main_brt_worship_1','wh_main_emp_barracks_1','wh2_main_rogue_settlement_major_3','wh2_dlc12_special_bordeleaux_manann_shrine_1','Stables','toString','__proto__'])assert.equal(wiki.get(unknown),undefined);
  assert.throws(()=>createBuildingWiki([],k=>k===key?undefined:recruitmentBuilding(k)),/registry drift/);
  assert.throws(()=>createBuildingWiki([],k=>k===key?{...recruitmentBuilding(k),chainKey:'wrong'}:recruitmentBuilding(k)),/registry drift/);
});

test('reverse index equals every admitted direct row at its exact building, keeping source keys and conditions',()=>{
  const allLinks=wiki.list().flatMap(e=>e.links);
  assert.equal(allLinks.length,61);assert.equal(new Set(allLinks.map(l=>l.unit.id)).size,24);
  for(const entry of wiki.list()){
    const expected=projection.admissions.flatMap(a=>a.requirements.filter(r=>r.buildingId===entry.building.key).map(r=>[a.id,r.sourceKey])).sort();
    assert.deepEqual(entry.links.map(l=>[l.unit.id,l.requirement.sourceKey]).sort(),expected);
    for(const link of entry.links){
      assert(unitRecruitmentAdmission(link.unit));assert.equal(link.source.type,'BUILDING');assert.equal(link.source.key,entry.building.key);
      assert.equal(link.source.requirementKey,link.requirement.sourceKey);assert.equal(link.requirement.buildingStage,entry.building.stage);
      assert.equal(link.source.effectiveStatus,'PARTIAL_SOURCE');assert.equal(link.source.reference.table,'building_units_allowed_tables');
    }
  }
  assert(wiki.get(key).links.some(l=>l.unit.id===knight));
  assert(!wiki.get('wh_main_brt_stables_2').links.some(l=>l.unit.id===knight));
  assert.equal(wiki.get('wh_main_brt_farm_extra_1').links.length,0);
  assert.equal(wiki.get('wh_main_brt_farm_extra_2').links.length,0);
});

test('missing source, edited admission, same-name/sample and special-only units cannot fabricate direct links or inheritance',()=>{
  const unit=game.getUnit(knight),campaign=unit.campaign;
  for(const changed of [
    {...unit,id:'same-name-unreviewed'},
    {...unit,gameVersion:'sample'},
    {...unit,campaign:{...campaign,recruitmentRequirements:campaign.recruitmentRequirements.filter(r=>r.buildingId!==key)}},
    {...unit,campaign:{...campaign,recruitmentSources:campaign.recruitmentSources.filter(s=>s.key!==key)}},
    {...unit,campaign:{...campaign,recruitmentRequirements:campaign.recruitmentRequirements.map(r=>r.buildingId===key?{...r,buildingStage:1}:r)}},
    {...unit,campaign:{...campaign,recruitmentSources:campaign.recruitmentSources.map(s=>s.key===key?{...s,type:'UNIT_UPGRADE'}:s)}},
  ])assert.equal(createBuildingWiki([changed]).list().flatMap(e=>e.links).length,0);
  const empty=createBuildingWiki([]);assert.equal(empty.get('wh_main_brt_stables_5').links.length,0);
  assert.throws(()=>createBuildingWiki([unit],k=>k===key?{...recruitmentBuilding(k),stage:99}:recruitmentBuilding(k)),/identity drift/);
});

test('search, saved names and fallback names use exact identity without merging by name',()=>{
  for(const query of ['Royal Stables','ROYAL STABLES',key,'마구간'])assert(wiki.list(query).some(e=>e.building.key===key));
  assert.equal(wiki.list('not-a-building').length,0);
  assert.equal(wiki.list('브레토니아').length,18);
  assert(searchArchive('Royal Stables').some(e=>e.type==='building'&&e.id===key));
  assert.equal(resolveSavedTargetName({entityType:'building',entityId:key}),'왕립 마구간');
  assert.equal(resolveSavedTargetName({entityType:'building',entityId:'old-missing-building'}),undefined);
  const b=recruitmentBuilding(key);
  assert.equal(buildingDisplayName({...b,variants:[{...b.variants[0],name:'{{tr:unknown}}'}]}),'왕립 마구간');
  assert.equal(buildingDisplayName({...b,key:'unreviewed',variants:[]}), 'unreviewed');
});

test('list/detail routes show stages, prerequisites, uncertainty and provenance, with bidirectional exact links',()=>{
  const list=render('/buildings');assert(list.includes('6개 체인 · 18개 단계'));assert(list.includes('건물 이름, 체인, 영문 ID 검색'));
  assert.equal((list.match(/class="entity-row"/g)??[]).length,18);
  const detail=render('/buildings/'+key);
  for(const text of ['왕립 마구간','CA 단계 2 · 주건물 요구 단계 3','Tier로 환산하지','실제 캠페인 건설·모집 가능 여부: 미확인','문화·진영 variant','wh_main_brt_bretonnia','building_levels_tables','building_units_allowed_tables','Snapshot:','Source hash:','내 기록'])assert(detail.includes(text),text);
  assert(detail.includes('href="/units/'+knight+'"'));assert(detail.includes('aria-current="page"'));
  assert(render('/units/'+knight).includes('href="/buildings/'+key+'"'));
  assert(render('/buildings/wh_main_brt_farm_2').includes('href="/buildings/wh_main_brt_farm_extra_1"'));
  const extra=render('/buildings/wh_main_brt_farm_extra_1');assert(extra.includes('현재 승인 자료에 직접 모집 연결이 없습니다'));assert(extra.includes('비모집 건물로 확정한 것은 아닙니다'));
  for(const id of ['missing','wh_main_brt_worship_1','wh_main_emp_barracks_1'])assert(render('/buildings/'+id).includes('항목을 찾을 수 없습니다'));
  assert(render('/').includes('href="/buildings"'));
  assert(renderToString(React.createElement(MemoryRouter,null,React.createElement(Catalog))).includes('직접 연결 0 유닛'));
});

test('existing building and other personal records survive read-only browsing and v1 backup roundtrip without a schema change',async()=>{
  global.indexedDB=memoryIndexedDb();
  const targets=[{entityType:'building',entityId:key},{entityType:'building',entityId:'old-missing-building'},{entityType:'unit',entityId:knight},{entityType:'faction',entityId:'bretonnia'}];
  for(const target of targets){await personal.saveArticle(target,{evaluation:'보존할 기록',tactics:'개인 운용',strengths:'장점',weaknesses:'단점'});await personal.setBookmark(target,true);await personal.recordView(target);}
  const before=await personal.exportBackup();assert.equal(before.version,1);
  for(const url of ['/buildings','/buildings/'+key,'/buildings/wh_main_brt_farm_extra_2'])render(url);
  const after=await personal.exportBackup();for(const field of ['articles','notes','bookmarks','recentViews','manualModifierProfiles'])assert.deepEqual(after[field],before[field]);
  global.indexedDB=memoryIndexedDb();await personal.importBackup(parseBackup(JSON.parse(JSON.stringify(before))));
  const restored=await personal.exportBackup();for(const field of ['articles','notes','bookmarks','recentViews','manualModifierProfiles'])assert.deepEqual(restored[field],before[field]);
  assert.equal((await personal.getArticle(targets[1])).evaluation,'보존할 기록');
});

test('all preexisting game data and persistence sources remain identical to HEAD',()=>{
  const listed=spawnSync('git',['ls-tree','-r','--name-only','HEAD','--','src/data','src/repositories/wikiRepository.ts','src/domain/entities.ts'],{encoding:'utf8'});assert.equal(listed.status,0);
  for(const file of listed.stdout.trim().split('\n')){
    const original=spawnSync('git',['show',`HEAD:${file}`],{maxBuffer:128*1024*1024});assert.equal(original.status,0);
    assert.equal(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),original.stdout.toString().replace(/\r\n/g,'\n'),file);
  }
});
