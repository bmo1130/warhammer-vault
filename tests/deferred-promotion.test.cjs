const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const React=require('react');
const {renderToString}=require('react-dom/server');
const {MemoryRouter}=require('react-router-dom');
const App=require('../.test-build/src/App.js').default;
const {validateUnits}=require('../.test-build/src/domain/unitValidation.js');
const {unitCatalogRepository:catalog}=require('../.test-build/src/repositories/unitCatalogRepository.js');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const units=read('src/data/units.json'),factions=read('src/data/factions.json');
const evidence=read('tools/wh3-importer/promotion/partial-sources.json');
const diagnostics=read('src/data/unitDiagnostics.json');
const committedReview=read('tools/wh3-importer/promotion/partial-review.json');
const moduleUnderTest=()=>import('../tools/wh3-importer/promotion/partial-batch.mjs');
const options=()=>({units:structuredClone(units),factions:structuredClone(factions),evidence:structuredClone(evidence),
  diagnostics:structuredClone(diagnostics),committedReview:structuredClone(committedReview),validate:validateUnits});
const get=(o,path)=>path.split('.').reduce((v,k)=>v?.[k],o);
const render=id=>renderToString(React.createElement(MemoryRouter,{initialEntries:[`/units/${id}`]},React.createElement(App))).replace(/<!--.*?-->/g,'');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const expected=[
  ['sample-01','wh_main_brt_cav_grail_knights','bretonnia','wh_main_group_bretonnia','57873b9a53e7bfc608aecd52da062cb67f937ecea0f297a7ce12fead245ea3a2'],
  ['sample-08','wh_main_brt_cav_mounted_yeomen_0','bretonnia','wh_main_group_bretonnia','f268c6be6c35cee41d666b78ab1c3ece6101e6f50ee40dfff9fa4b809fdab681'],
  ['sample-09','wh_main_brt_cav_pegasus_knights','bretonnia','wh_main_group_bretonnia','34250111f164503ef1250f53d37ba7fae4fd17c05e368b8a7991865ea6a8da2f'],
  ['sample-21','wh_dlc04_emp_cav_royal_altdorf_gryphites_0','empire','wh_main_group_empire','91ce7d542e6089c24d1fa9db340469f9289a7ffc0d87df9c78c202e1e056b551'],
  ['sample-16','wh2_dlc12_skv_inf_ratling_gun_0','skaven','wh2_main_skv','d3bbcd833812879adc9fa99f6ddce6af23741eb120c4e287b5111ae479e3ae87'],
];

test('deferred admission is exactly five pinned identities and appends without changing the existing five production or five samples',async()=>{
  const {buildDeferredProductionBatch,deferredBatchSlugs,committedPartialReviewSha256}=await moduleUnderTest();
  const {evidenceHash}=await import('../tools/wh3-importer/promotion/first-batch.mjs');
  assert.deepEqual(deferredBatchSlugs,expected.map(x=>x[0]));assert(Object.isFrozen(deferredBatchSlugs));
  assert.equal(evidenceHash(committedReview),committedPartialReviewSha256);
  const before=options(),supplied=options(),batch=buildDeferredProductionBatch(supplied);
  assert.deepEqual(supplied,before);assert.deepEqual(batch.added,{units:0,factions:0});
  assert.deepEqual(batch.units,units);assert.deepEqual(batch.factions,factions);
  for(const [slug,key,faction,group,hash] of expected){
    const c=committedReview.candidates.find(c=>c.slug===slug),a=batch.admitted.find(c=>c.slug===slug);
    assert.equal(c.identity.caMainUnitKey,key);assert.equal(c.identity.caLandUnitKey,key);assert.equal(c.identity.internalId,`ca_unit_${key}`);
    assert.equal(c.affiliation.factionId,faction);assert.equal(c.affiliation.militaryGroup,group);
    assert.equal(c.source.sha256,hash);assert.equal(c.overall,'PROMOTABLE_WITH_OMISSIONS');assert.equal(a.unit.gameVersion,'9.0.2.0');
    const projected=structuredClone(a.unit);projected.source=c.productionProjection.source;projected.sources=c.productionProjection.sources;
    assert.deepEqual(projected,c.productionProjection);assert(a.unit.sources.publicStats.includes(hash));
    assert(!diagnostics.entries.some(d=>d.id===a.unit.id));
  }
  const baseline=options();baseline.units=units.slice(0,10);baseline.factions=factions.slice(0,4);
  assert.equal(evidenceHash(baseline.units),'e335b12183ba1d9aec527f9824a6e3a5c9c1157cfd03cabf35f5e774d8e80832');
  assert.equal(evidenceHash(baseline.factions),'91360117d5fa92752d6919cae95707c7cf89f75b22209873fe2e57d0a41b450a');
  const appended=buildDeferredProductionBatch(baseline);assert.deepEqual(appended.added,{units:5,factions:1});
  assert.deepEqual(appended.units,units);assert.deepEqual(appended.factions,factions);
  assert.equal(units.filter(u=>u.gameVersion!=='sample').length,10);assert.equal(units.filter(u=>u.gameVersion==='sample').length,5);
  assert.equal(catalog.list().filter(c=>c.kind==='diagnostic-only').length,5);assert.equal(catalog.list().length,20);
  assert.equal(sha(readFileSync('src/data/unitDiagnostics.json')),committedReview.diagnosticSha256);
});

test('mounted core fields survive NEEDS_RUNTIME while all representative entities, speeds, health and incomplete optional groups stay absent',async()=>{
  const {buildDeferredProductionBatch}=await moduleUnderTest(),batch=buildDeferredProductionBatch(options());
  for(const a of batch.admitted){
    for(const key of ['count','unitScale','totalHealth','healthPerEntity'])assert(!Object.hasOwn(a.unit.entities,key));
    for(const key of ['speed','groundSpeed','chargeSpeed'])assert(!Object.hasOwn(a.unit.movement,key));
    assert(!a.unit.defense.resistances);assert(!a.unit.campaign.recruitmentRequirements && !a.unit.campaign.unitCap);
    assert.equal(typeof a.unit.defense.armor,'number');assert.equal(typeof a.unit.melee.meleeAttack,'number');
    assert.equal(typeof a.unit.campaign.recruitmentCost,'number');assert.equal(typeof a.unit.customBattle.cost,'number');
  }
  for(const a of batch.admitted.filter(c=>c.slug!=='sample-16')){assert.deepEqual(a.unit.entities,{});assert(!a.unit.missile);
    assert.equal(committedReview.candidates.find(c=>c.slug===a.slug).groups['composition/runtime structure'].status,'NEEDS_RUNTIME');}
  const grail=batch.admitted[0].unit;
  assert.deepEqual(grail.abilities,['lance']);assert.deepEqual(grail.passiveAbilities,['blessing_of_the_lady']);
  assert.deepEqual(grail.attributes,['perfect_vigour','stalk_in_forest','immune_to_psychology','knight']);
  for(const a of batch.admitted.slice(1,4))for(const group of ['abilities','passiveAbilities','attributes'])assert(!Object.hasOwn(a.unit,group));
  assert.deepEqual(batch.admitted[1].unit.movement,{canSkirmish:false});
  assert.deepEqual(batch.admitted[2].unit.movement,{canSkirmish:false,canFly:true});
});

test('Ratling stores only ten direct static missile fields and the reviewed MAN size/mass, without count, ammo or inferred formulas',async()=>{
  const {buildDeferredProductionBatch,ratlingMissileFields}=await moduleUnderTest();
  const rat=buildDeferredProductionBatch(options()).admitted.find(c=>c.slug==='sample-16').unit;
  assert.deepEqual(rat.entities,{entitySize:'small',mass:150});assert(!rat.passiveAbilities && !rat.abilities);
  assert.deepEqual(rat.attributes,['stalk_in_forest']);
  assert.deepEqual(rat.missile,{range:145,projectile:{baseDamage:2,armorPiercingDamage:6,bonusVsLarge:0,bonusVsInfantry:0,shotsPerVolley:18,penetration:{resistanceBudget:0}},accuracy:{calibrationDistance:70,calibrationArea:2.7},reload:{baseTime:5}});
  const review=committedReview.candidates.find(c=>c.slug==='sample-16'),source=evidence.candidates.find(c=>c.slug==='sample-16');
  assert.equal(ratlingMissileFields.length,10);
  for(const field of ratlingMissileFields){const p=review.groups.missile.promotableFields.find(p=>p.field===field);assert.equal(p.kind,'DIRECT');
    assert.deepEqual(get(rat,field),p.value);assert.equal(p.source.sourcePack,'db.pack');
    assert.deepEqual(source.dump.rows.find(row=>row.id===p.source.rowId).row[p.source.field],p.rawValue);}
  for(const field of ['missile.ammunition','missile.reload.reloadSkill','missile.reload.displayedTime','missile.dps','missile.burstDps','missile.volleyDps',
    'missile.projectile.penetration.maxPenetrations','missile.projectile.penetration.stopsAtEntitySize'])assert.equal(get(rat,field),undefined);
});

test('source, snapshot, identity, original SHA, projection or remaining raw ID drift refuses the deferred batch without refresh',async()=>{
  const {buildDeferredProductionBatch}=await moduleUnderTest();
  const changes=[
    s=>{s.evidence.candidates[0].dump.rows[0].row.num_men=999;},
    s=>{s.committedReview.candidates[0].identity.caLandUnitKey='other';},
    s=>{s.committedReview.candidates[0].source.sha256='changed';},
    s=>{s.committedReview.gameVersion='new';},
    s=>{s.committedReview.candidates[0].overall='BLOCKED';},
    s=>{s.committedReview.candidates.find(c=>c.slug==='sample-09').productionProjection.movement.speed=100;},
    s=>{s.committedReview.candidates.find(c=>c.slug==='sample-08').remainingUnmapped=[];},
    s=>{s.committedReview.candidates.find(c=>c.slug==='sample-16').remainingUnmapped.pop();},
    s=>{delete s.committedReview;},
    s=>{s.units[10].defense.armor=999;},
    s=>{s.factions.at(-1).description='complete roster';},
    s=>{const c=s.committedReview.candidates[0];s.diagnostics.entries.push({id:c.identity.internalId,sourceMainKey:c.identity.caMainUnitKey,sourceLandKey:c.identity.caLandUnitKey,contextId:null,missiles:[],cases:[]});},
  ];
  for(const change of changes){const supplied=options();change(supplied);const before=structuredClone({...supplied,validate:undefined});
    assert.throws(()=>buildDeferredProductionBatch(supplied));assert.deepEqual({...supplied,validate:undefined},before);}
});

test('production boundary rejects unknown loss, mapped fragments of withdrawn groups and expansion or inference of the Ratling missile subset',async()=>{
  const {assertReviewedProductionResult}=await import('../tools/wh3-importer/promotion/first-batch.mjs');
  const {reviewPartialCandidates}=await import('../tools/wh3-importer/promotion/partial-review.mjs');
  const {ratlingMissileFields}=await moduleUnderTest();
  for(const c of reviewPartialCandidates(evidence,diagnostics).filter(c=>expected.some(x=>x[0]===c.slug))){
    const identity={mainKey:c.identity.caMainUnitKey,landKey:c.identity.caLandUnitKey,id:c.unit.id,name:c.name,factionId:c.affiliation.factionId,militaryGroup:c.affiliation.militaryGroup};
    const policy={expected:c.remainingUnmapped,omittedGroups:c.withdrawals.filter(w=>['abilities','passiveAbilities','attributes'].includes(w.field)).map(w=>w.field)};
    const check=r=>assertReviewedProductionResult(r,validateUnits,factions.map(f=>f.id),identity,policy,c.slug==='sample-16'?ratlingMissileFields:null);
    check(c.normalized);
    const changes=[r=>{r.unit.entities.count=12;},r=>{r.unit.entities.totalHealth=0;},r=>{r.unit.movement.speed=99;}];
    if(c.remainingUnmapped.length)changes.push(r=>{r.unmapped=[];},r=>{r.unmapped.pop();});
    for(const group of policy.omittedGroups)changes.push(r=>{r.unit[group]=['stalk_in_forest'];});
    if(c.slug==='sample-16')changes.push(r=>{r.unit.missile.ammunition=18;},r=>{r.unit.missile.dps=28.8;},
      r=>{delete r.unit.missile.reload;},r=>{r.unit.missile.projectile.shotsPerVolley=1;},
      r=>{r.unit.missile.projectile.penetration.stopsAtEntitySize='tiny';},
      r=>{r.provenance.fields.find(f=>f.field==='missile.range').kind='CURATED';});
    else changes.push(r=>{r.unit.entities.mass=100;},r=>{r.unit.missile={projectile:{baseDamage:1}};});
    for(const change of changes){const r=structuredClone(c.normalized);change(r);assert.throws(()=>check(r),c.slug);}
    if(c.slug==='sample-16')assert.throws(()=>assertReviewedProductionResult(c.normalized,validateUnits,factions.map(f=>f.id),identity,policy),/missile promotion/);
  }
});

test('existing detail UI reads all ten missile fields including zeros without an empty section on other entries',async()=>{
  const rat=units.find(u=>u.id==='ca_unit_wh2_dlc12_skv_inf_ratling_gun_0'),html=render(rat.id);
  for(const [label,value] of [['사거리',145],['발사체 기본 피해',2],['발사체 관통 피해 (AP)',6],['발사체 대대형 보너스',0],['발사체 대보병 보너스',0],
    ['일제 사격당 발사 수 (shots per volley, raw)',18],['보정 거리 (calibration distance)',70],['보정 영역 (calibration area)',2.7],
    ['기본 재장전 시간 (초, raw/base)',5],['관통 저항 예산 (resistance budget)',0]])assert(html.includes(`<span>${label}</span><strong>${value}</strong>`),label);
  assert(html.includes('관통 저항 예산은 관통 개체 수가 아닙니다'));assert(!html.includes('실제 장전시간</span>'));
  for(const [slug,key] of expected){const h=render(`ca_unit_${key}`);assert(h.includes('>Production<')&&h.includes('내 기록')&&h.includes('즐겨찾기 추가'));
    assert.equal(h.includes('사격 · 검증된 정적 필드'),slug==='sample-16');assert(h.includes('미입력'));
  }
  assert(!render('zombies').includes('사격 · 검증된 정적 필드'));
  assert(!render(diagnostics.entries[0].id).includes('사격 · 검증된 정적 필드'));
  const list=renderToString(React.createElement(MemoryRouter,{initialEntries:['/units']},React.createElement(App))).replace(/<!--.*?-->/g,'');
  assert(list.includes('20개 항목'));
});

test('new production targets round-trip personal articles, bookmarks and recent views through unchanged backup v1',async()=>{
  const {memoryIndexedDb}=require('./fixtures/memoryIndexedDb.cjs');
  const {wikiRepository:wiki,parseBackup}=require('../.test-build/src/repositories/wikiRepository.js');
  global.indexedDB=memoryIndexedDb();
  const targets=expected.map(([,key])=>({entityType:'unit',entityId:`ca_unit_${key}`}));
  for(const target of targets){await wiki.setBookmark(target,true);await wiki.recordView(target);
    await wiki.saveArticle(target,{evaluation:'개인 의견',tactics:'새 production subset',strengths:'',weaknesses:''});}
  const backup=await wiki.exportBackup();assert.equal(backup.version,1);assert.equal(backup.articles.length,5);
  assert.equal(backup.bookmarks.length,5);assert.equal(backup.recentViews.length,5);
  assert(!backup.articles.some(a=>'missile' in a || 'entities' in a));
  global.indexedDB=memoryIndexedDb();await wiki.importBackup(parseBackup(JSON.parse(JSON.stringify(backup))));
  const restored=await wiki.exportBackup();for(const key of ['articles','notes','bookmarks','recentViews'])assert.deepEqual(restored[key],backup[key]);
});
