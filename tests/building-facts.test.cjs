const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawnSync}=require('node:child_process');
const React=require('react'),{renderToString}=require('react-dom/server');
const {MemoryRouter}=require('react-router-dom');
const App=require('../.test-build/src/App.js').default;
const Core=require('../.test-build/src/components/BuildingCoreDetails.js').default;
const {buildingNumber}=require('../.test-build/src/components/BuildingCoreDetails.js');
const {buildingWikiRepository:wiki}=require('../.test-build/src/repositories/buildingWikiRepository.js');
const {buildingFacts}=require('../.test-build/src/repositories/buildingFacts.js');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const folder='tools/wh3-importer/building-wiki/';
const source=read(folder+'source.json'),manifest=read(folder+'manifest.json'),admission=read('src/data/buildingWikiAdmissions.json');
const facts=key=>admission.admissions.find(a=>a.key===key);
const effect=(key,id)=>facts(key).effects.items.find(e=>e.key===id);
const render=key=>renderToString(React.createElement(MemoryRouter,{initialEntries:['/buildings/'+key]},React.createElement(App))).replace(/<!--.*?-->/g,'');
const modules=async()=>({...await import('../tools/wh3-importer/building-wiki/admit.mjs'),...await import('../tools/wh3-importer/recruitment/predict.mjs'),...await import('../tools/wh3-importer/runtime-evidence/contract.mjs')});

test('9.0.4 admission replays all eighteen names, costs, turns, complete effects and income without refreshing 9.0.2 recruitment',async()=>{
 const {buildBuildingAdmission}=await modules();assert.deepEqual(buildBuildingAdmission(),admission);
 assert.deepEqual(admission,read(folder+'admission.json'));assert.equal(admission.gameVersion,'9.0.4.0');assert.equal(admission.recruitmentGameVersion,'9.0.2.0');
 assert.equal(admission.admissions.length,18);for(const c of Object.values(admission.coverage))assert.deepEqual(c,{verified:18,held:0,total:18});
 assert.equal(admission.effectCoverage.rows,42);assert.equal(admission.effectCoverage.definitions,20);assert.equal(admission.effectCoverage.scopeDefinitions,12);
 assert.equal(admission.effectCoverage.officialKoreanDescriptions,20);assert.equal(admission.effectCoverage.officialScopeLabels,7);assert.equal(admission.effectCoverage.missingOfficialScopeLabels,5);
 assert(admission.comparison.every(c=>c.costMatch&&c.turnsMatch));
 assert.equal(wiki.list().flatMap(e=>e.links).length,61);assert.equal(new Set(wiki.list().flatMap(e=>e.links).map(l=>l.unit.id)).size,24);
});

test('independent economy, military and special representatives retain exact Korean Loc and raw cost/time fields',()=>{
 for(const [key,name,cost,turns] of [
  ['wh_main_brt_farm_1','평지',500,1],['wh_main_brt_farm_2','농장',1000,2],['wh_main_brt_farm_3','영토',1500,3],
  ['wh_main_brt_farm_extra_1','풍차',1500,2],['wh_main_brt_farm_extra_2','물레방아',2000,3],
  ['wh_main_brt_barracks_4','왕립 막사',4000,4],['wh_main_brt_carpenter_2','공성병기 작업장',10000,6],
  ['wh_main_brt_stables_5','왕립 동물원',8000,5],['wh_main_brt_worship_3','여제의 대성당',10000,6],
 ]){
  const a=facts(key);assert.equal(a.koreanName.value,name);assert.equal(a.constructionCost.value,cost);assert.equal(a.constructionTurns.value,turns);
  const raw=source.rows.find(r=>r.table==='building_levels_tables'&&r.row.level_name===key);
  assert.equal(a.constructionCost.reference.rowId,raw.id);assert.equal(a.constructionTurns.reference.rowId,raw.id);
  assert.equal(raw.row.create_cost,cost);assert.equal(raw.row.create_time,turns);assert.equal(wiki.get(key).name,name);
 }
 for(const a of admission.admissions){assert.match(a.koreanName.value,/[가-힣]/);const loc=source.localisations.filter(r=>r.row.key===a.koreanName.field);assert.equal(loc.length,1);assert.equal(loc[0].row.text,a.koreanName.value);}
 assert(wiki.list('Royal Stables').some(e=>e.name==='왕립 마구간'));assert.equal(wiki.list('물레방아')[0].building.key,'wh_main_brt_farm_extra_2');
});

test('farm gold and regional income modifiers stay distinct; windmills never become flat gold or estimated campaign income',()=>{
 const incomeKey='wh_main_effect_economy_gdp_agriculture_farming';
 for(const [key,value] of [['wh_main_brt_farm_1',300],['wh_main_brt_farm_2',450],['wh_main_brt_farm_3',600]]){
  const e=effect(key,incomeKey);assert.equal(e.value,value);assert.equal(e.unit,'gold');assert.equal(e.incomeKind,'BASE');assert.equal(e.scopeKey,'building_to_building_own');assert.equal(facts(key).income.baseGold,value);
 }
 for(const [key,value] of [['wh_main_brt_farm_extra_1',25],['wh_main_brt_farm_extra_2',50]]){
  const e=effect(key,'wh_dlc07_effect_economy_gdp_mod_farming');assert.equal(e.value,value);assert.equal(e.unit,'percent');assert.equal(e.incomeKind,'MODIFIER');assert.equal(e.scopeKey,'region_to_region_own_text');assert.equal(facts(key).income.baseGold,0);
  const html=render(key);assert(html.includes(`농장 수입: +${value}%`));assert(html.includes('자신의 지역'));assert(!html.includes(`${value} 골드`));
 }
 assert.equal(effect('wh_main_brt_farm_2','wh_dlc07_effect_economy_gdp_mod_industry').value,-50);
 assert.equal(effect('wh_main_brt_farm_3','wh_dlc07_effect_economy_gdp_mod_industry').value,-100);
 assert(render('wh_main_brt_farm_2').includes('산업 수입: -50%'));assert(render('wh_main_brt_farm_2').includes('수입: 450 골드'));
 assert.equal(facts('wh_main_brt_barracks_1').income.baseGold,0);assert.equal(facts('wh_main_brt_barracks_1').effects.status,'COMPLETE');
});

test('complete effects include growth, recruitment, hero capacity, corruption, conditional chivalry and hidden raw values',()=>{
 assert.equal(effect('wh_main_brt_farm_extra_1','wh_main_effect_province_growth_building').value,5);
 assert.equal(effect('wh_main_brt_farm_extra_1','wh_main_effect_province_growth_adjacent_provinces').value,2);
 assert.equal(effect('wh_main_brt_farm_extra_1','wh_main_effect_unit_recruitment_points').value,1);
 assert.equal(effect('wh_main_brt_stables_3','wh_main_effect_agent_cap_increase_champion_paladin').value,1);
 const chivalry=effect('wh_main_brt_worship_3','wh_dlc07_effect_chivalry_building');assert.equal(chivalry.value,20);assert(chivalry.condition.includes('브레토니아'));
 const hidden=admission.admissions.flatMap(a=>a.effects.items).filter(e=>e.hidden);assert.equal(hidden.length,3);assert(hidden.every(e=>e.name==='[HIDDEN]'));
 assert.equal(effect('wh_main_brt_farm_1','wh_dlc07_effect_dummy_peasant_building_chain').value,0);
 assert.equal(effect('wh_main_brt_farm_1','wh_main_effect_economy_gdp_agriculture_farming').valueDamaged,150);
 for(const a of admission.admissions){const raw=source.rows.filter(r=>r.table==='building_effects_junction_tables'&&r.row.building===a.key);assert.deepEqual(a.effects.items.map(e=>e.reference.rowId).sort(),raw.map(r=>r.id).sort());}
 const html=render('wh_main_brt_worship_3');assert(html.includes('기사도: 턴 당 +20'));assert(html.includes('소유자 문화가 브레토니아일 때'));assert(html.includes('게임 UI 숨김 효과'));
 assert(!html.includes('[[img:'));assert(!html.includes('\\\\n('));
});

test('missing or invalid numbers are UNKNOWN, a verified zero remains zero, and missing effect coverage cannot prove zero income',async()=>{
 const {numericField,recruitmentGraph,buildBuildingAdmission,digest}=await modules(),s=structuredClone(source),row=s.rows.find(r=>r.table==='building_levels_tables');
 const graph=recruitmentGraph(s);row.row.create_cost=0;assert.equal(numericField(graph,row,'create_cost').value,0);
 for(const value of [undefined,null,NaN,Infinity,-1,'0']){row.row.create_cost=value;assert.equal(numericField(graph,row,'create_cost').status,'UNKNOWN');}
 assert.equal(buildingNumber(undefined,'골드'),'미확인 (UNKNOWN)');assert.equal(buildingNumber({status:'VERIFIED',value:0},'골드'),'0 골드');
 const held={...facts('wh_main_brt_farm_1'),constructionCost:{status:'UNKNOWN',value:null,reason:'missing'},constructionTurns:{status:'UNKNOWN',value:null,reason:'missing'},income:{status:'UNKNOWN',effects:[],baseGold:null},effects:{status:'UNKNOWN',items:[]}};
 const html=renderToString(React.createElement(Core,{facts:held,recruitmentCount:0}));assert(!html.includes('0 골드'));assert(html.includes('미확인 (UNKNOWN)'));assert(html.includes('효과 없음이나 수입 0으로 판정하지'));
 const broken=structuredClone(source);broken.coverage=broken.coverage.filter(c=>c.query.table!=='building_effects_junction_tables');
 assert.throws(()=>buildBuildingAdmission(broken,{...manifest,sourceHash:digest(broken)}),/not closed/);
});

test('snapshot, row, schema, Loc and source edge drift fail closed; ambiguous official names are held instead of translated',async()=>{
 const {buildBuildingAdmission,digest}=await modules();
 for(const mutate of [s=>s.provenance.gameVersion='9.0.3.0',s=>s.rows[0].row.create_cost=1,s=>s.localisations[0].row.text='임의 번역',s=>s.schemas[0].fields.pop(),s=>s.relationships.pop()]){
  const s=structuredClone(source);mutate(s);assert.throws(()=>buildBuildingAdmission(s),/drift/);
 }
 const ambiguous=structuredClone(source);ambiguous.localisations.push(structuredClone(ambiguous.localisations[0]));
 const a=buildBuildingAdmission(ambiguous,{...manifest,sourceHash:digest(ambiguous)});assert.equal(a.admissions.find(a=>a.koreanName.status==='UNKNOWN').koreanName.value,null);
 const broken=structuredClone(source);broken.relationships=broken.relationships.filter(e=>e.field!=='effect_scope');
 assert.throws(()=>buildBuildingAdmission(broken,{...manifest,sourceHash:digest(broken)}),/Missing\/ambiguous/);
});

test('core player information precedes collapsed raw evidence and Vite exploration limits remain byte-equivalent',()=>{
 const html=render('wh_main_brt_farm_2');assert(html.includes('<h1>농장</h1>'));assert(html.includes('1,000 골드'));assert(html.includes('2 턴'));assert(html.includes('수입: 450 골드'));
 assert(html.indexOf('건설 비용')<html.indexOf('원본 근거 · 상세 건설 조건'));assert(html.indexOf('확인된 모집 유닛 연결')<html.indexOf('원본 근거 · 상세 건설 조건'));
 assert(html.includes('<details class="building-evidence">'));assert(!html.includes('<details class="building-evidence" open'));
 const old=spawnSync('git',['show','HEAD:vite.config.ts'],{encoding:'utf8'});assert.equal(old.status,0);assert.equal(fs.readFileSync('vite.config.ts','utf8').replace(/\r\n/g,'\n'),old.stdout.replace(/\r\n/g,'\n'));
 assert.equal(buildingFacts(wiki.get('wh_main_brt_farm_2').building).koreanName.value,'농장');
});
