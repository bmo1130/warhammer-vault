const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const {createHash}=require('node:crypto');
const React=require('react');
const {renderToString}=require('react-dom/server');
const {MemoryRouter}=require('react-router-dom');
const App=require('../.test-build/src/App.js').default;
const {validateUnits}=require('../.test-build/src/domain/unitValidation.js');
const {gameRepository:game}=require('../.test-build/src/repositories/gameRepository.js');
const {unitCatalogRepository:catalog}=require('../.test-build/src/repositories/unitCatalogRepository.js');
const {getUnitAttributeLabel,getUnitAbilityLabel}=require('../.test-build/src/domain/unitLabels.js');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const evidence=read('tools/wh3-importer/promotion/partial-sources.json'), diagnostics=read('src/data/unitDiagnostics.json');
const units=read('src/data/units.json'),factions=read('src/data/factions.json');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const get=(object,path)=>path.split('.').reduce((value,key)=>value?.[key],object);
const reviewModule=()=>import('../tools/wh3-importer/promotion/partial-review.mjs');
const reviews=async()=>{const m=await reviewModule();return m.reviewPartialCandidates(evidence,diagnostics);};
const options=()=>({evidence:structuredClone(evidence),diagnostics:structuredClone(diagnostics),units:structuredClone(units),factions:structuredClone(factions),validate:validateUnits});
const render=id=>renderToString(React.createElement(MemoryRouter,{initialEntries:[`/units/${id}`]},React.createElement(App))).replace(/<!--.*?-->/g,'');

test('exactly fourteen saved PARTIAL identities reproduce both review artifacts; BLOCKED and CLEAN subjects are excluded',async()=>{
  const m=await reviewModule(), all=await reviews();
  assert.equal(all.length,14);
  assert.deepEqual(all.map(c=>c.slug),['sample-01','sample-04','sample-05','sample-07','sample-08','sample-09','sample-12','sample-14','sample-15','sample-16','sample-17','sample-21','sample-22','sample-24']);
  for(const c of all){assert.deepEqual(Object.keys(c.groups),m.reviewGroups);assert.equal(c.originalStatus,'PARTIAL');assert.equal(c.overall,'PROMOTABLE_WITH_OMISSIONS');
    assert.deepEqual(c.materializedContexts,[]);
    for(const group of Object.values(c.groups))assert(['PROMOTABLE','OMIT','NEEDS_MAPPING','NEEDS_RUNTIME','BLOCKED'].includes(group.status));}
  const artifact=m.reviewArtifact(all,evidence.contextInventory);
  assert.deepEqual(artifact,read('tools/wh3-importer/promotion/partial-review.json'));
  assert.equal(m.renderPartialReview(artifact),readFileSync('tools/wh3-importer/promotion/PARTIAL_REVIEW.md','utf8').replaceAll('\r\n','\n'));
  for(const c of evidence.candidates)if(existsSync(c.reviewedSource.reference)){
    const bytes=readFileSync(c.reviewedSource.reference),pilot=JSON.parse(bytes);
    assert.equal(sha(bytes),c.reviewedSource.sha256);assert.equal(pilot.status,'PARTIAL');assert.equal(pilot.discovery.candidates.length,1);
    const {normalizeUnit}=await import('../tools/wh3-importer/normalization/normalizer.mjs');
    const baseline=normalizeUnit(m.restoreTrace(evidence,c.dump),{...c.affiliation,permissionTrace:m.restoreTrace(evidence,c.permissionTrace)});
    assert.deepEqual(baseline.unit,pilot.normalized.unit);assert.deepEqual(baseline.omitted,pilot.normalized.omitted);
  }
  if(existsSync(evidence.contextInventory.reference)){
    const bytes=readFileSync(evidence.contextInventory.reference),context=JSON.parse(bytes);
    assert.equal(sha(bytes),evidence.contextInventory.sha256);assert.equal(context.requested.length,19);
    for(const c of all)assert(!context.requested.some(r=>r.mainKey===c.identity.caMainUnitKey));
  }
});

test('every retained core field traces to a processed static row and survives composite/mapping uncertainty',async()=>{
  const all=await reviews();
  for(const c of all){
    assert.deepEqual(validateUnits([c.unit],[c.unit.factionId]),[]);
    for(const g of ['identity','affiliation/catalog','classification','defense','melee','campaign','customBattle'])assert.equal(c.groups[g].status,'PROMOTABLE',`${c.name}/${g}`);
    const source=evidence.candidates.find(s=>s.slug===c.slug),rows=[...source.dump.rows,...source.permissionTrace.rows];
    for(const p of c.normalized.provenance.fields){
      const row=rows.find(r=>r.id===p.source.rowId);assert(row,p.field);
      assert.deepEqual(p.rawValue,row.row[p.source.field]);assert.deepEqual(p.source.rowKey,row.key);
      assert.deepEqual(get(c.unit,p.field),p.value);
      if(typeof p.value==='number')assert.equal(p.kind,'DIRECT');
    }
    for(const group of ['defense','melee','campaign','customBattle'])for(const p of c.groups[group].promotableFields)assert.deepEqual(get(c.unit,p.field),p.value);
    assert(!/[A-Z]:[\\/]|\/Users\//.test(JSON.stringify(c)));
  }
});

test('composite review never chooses a representative or converts static/runtime counts and HP into Unit values',async()=>{
  const all=await reviews(), composite=all.filter(c=>c.composite);
  assert.equal(composite.length,9);
  for(const c of all){for(const key of ['count','totalHealth','healthPerEntity','unitScale'])assert(!Object.hasOwn(c.unit.entities,key));
    for(const key of ['speed','groundSpeed','chargeSpeed'])assert(!Object.hasOwn(c.unit.movement,key));}
  for(const c of composite){assert.deepEqual(c.unit.entities,{});assert.equal(c.groups.entities.status,'OMIT');assert.equal(c.groups['composition/runtime structure'].status,'NEEDS_RUNTIME');assert(!c.unit.defense.projectilePenetrationResistance);}
  const coach=all.find(c=>c.slug==='sample-14'),chariot=all.find(c=>c.slug==='sample-15'),doom=all.find(c=>c.slug==='sample-17');
  assert.equal(coach.groups['composition/runtime structure'].runtimeCases[0].observedLogicalCount.value,1);
  assert.deepEqual(coach.groups['composition/runtime structure'].runtimeCases[0].views.map(v=>v.size),[1,2,1,1]);
  assert.equal(chariot.groups['composition/runtime structure'].runtimeCases[0].observedLogicalCount.value,12);
  assert.deepEqual(chariot.groups['composition/runtime structure'].runtimeCases[0].views.map(v=>v.size),[24,24,12,12]);
  assert.equal(doom.groups['composition/runtime structure'].rawCardinality.numMen.value,8);
  assert.equal(doom.groups['composition/runtime structure'].rawCardinality.numEngines.value,8);
  const modified=structuredClone(diagnostics);for(const e of modified.entries)for(const c of e.cases)c.fields.NumEntities.value=999;
  const m=await reviewModule(), repeated=m.reviewPartialCandidates(evidence,modified);
  assert.deepEqual(repeated.map(c=>c.unit),all.map(c=>c.unit));
});

test('missile source scope is independent from body structure; uncertain activation never enters Unit.missile',async()=>{
  const all=await reviews();
  for(const slug of ['sample-07','sample-12','sample-24'])assert(!all.find(c=>c.slug===slug).unit.missile);
  const necro=all.find(c=>c.slug==='sample-12'),fcm=all.find(c=>c.slug==='sample-07'),dread=all.find(c=>c.slug==='sample-24');
  assert.equal(necro.groups.missile.status,'PROMOTABLE');assert.equal(necro.groups.missile.storage,'OMIT');
  assert.equal(necro.groups.missile.promotableFields.find(p=>p.field==='missile.range').value,330);
  assert.equal(necro.groups.missile.promotableFields.find(p=>p.field==='missile.projectile.armorPiercingDamage').value,145);
  assert.deepEqual([...new Set(necro.groups.missile.sourcePaths.map(p=>p.role))],['LAND_PRIMARY','RIDER']);
  assert.equal(fcm.groups.missile.status,'NEEDS_RUNTIME');assert.equal(new Set(fcm.groups.missile.sourcePaths.map(p=>p.weaponKey)).size,3);
  assert.equal(dread.groups.missile.status,'NEEDS_RUNTIME');assert.equal(dread.groups.missile.promotableFields.length,0);
  const ratling=all.find(c=>c.slug==='sample-16');assert.equal(ratling.groups.missile.status,'PROMOTABLE');
  assert.equal(ratling.unit.missile.projectile.shotsPerVolley,18);assert(!ratling.unit.missile.projectile.penetration.stopsAtEntitySize);
  assert(!ratling.unit.missile.ammunition && !ratling.unit.missile.strength);
});

test('seven candidate-scoped aliases use exact Loc/flags, while all other unknown IDs and incomplete groups remain explicit',async()=>{
  const all=await reviews(),swords=all.find(c=>c.slug==='sample-04'),spears=all.find(c=>c.slug==='sample-05'),sterns=all.find(c=>c.slug==='sample-22'),doom=all.find(c=>c.slug==='sample-17');
  assert.deepEqual(swords.originalUnmapped,[]);assert.equal(swords.scopedMappings.length,0);
  assert.equal(all.reduce((n,c)=>n+c.scopedMappings.length,0),7);
  assert.deepEqual(spears.unit.attributes,['charge_defense_vs_large','charge_reflection','stalk_in_forest']);
  assert.deepEqual(sterns.unit.passiveAbilities,['regeneration','crumbling','disintegrating']);
  for(const c of [spears,sterns])for(const alias of c.scopedMappings){assert.equal(alias.localisation.source.table,'Loc');assert.equal(alias.scope,c.identity.caMainUnitKey);
    assert.equal(alias.kind==='abilities'?getUnitAbilityLabel(alias.alias):getUnitAttributeLabel(alias.alias),alias.label);}
  assert.deepEqual(doom.remainingUnmapped.map(x=>x.caId),['wh2_dlc12_unit_passive_the_best_defence','wh2_main_unit_passive_scurry_away']);
  assert.equal(doom.groups.passiveAbilities.status,'NEEDS_MAPPING');assert(!doom.unit.passiveAbilities);
  for(const c of all)for(const group of ['abilities','passiveAbilities','attributes'])if(c.groups[group].status==='NEEDS_MAPPING')assert(!c.unit[group]);
  const {idMappings}=await import('../tools/wh3-importer/normalization/ids.mjs');
  assert(!idMappings.attributes.charge_reflection && !idMappings.abilities.wh_main_unit_passive_regeneration);
});

test('bounded partial production appends only four reviewed identities and is idempotent without overwriting first batch or samples',async()=>{
  const {buildPartialProductionBatch,partialBatchSlugs}=await import('../tools/wh3-importer/promotion/partial-batch.mjs');
  const supplied=options(),before=options(),batch=buildPartialProductionBatch(supplied);
  assert.deepEqual(supplied,before);assert.deepEqual(batch.units,units);assert.deepEqual(batch.factions,factions);assert.deepEqual(batch.added,{units:0,factions:0});
  assert.deepEqual(batch.admitted.map(c=>c.slug),partialBatchSlugs);
  const fromFirst=options();fromFirst.units=units.slice(0,6);fromFirst.factions=factions.slice(0,2);
  assert.equal(sha(JSON.stringify(fromFirst.units)),'867a8839d09887a87d68d018dd8819f122773749a7313fdd623ecbe73d8ed71f');
  assert.equal(sha(JSON.stringify(fromFirst.factions)),'5c0aed29c4109ae75409680686bb4ecbdcaecd6bc805556d1eeb84d6b695d43c');
  assert.deepEqual(buildPartialProductionBatch(fromFirst).units,units);assert.deepEqual(buildPartialProductionBatch(fromFirst).added,{units:4,factions:2});
  assert.equal(sha(readFileSync('src/data/unitDiagnostics.json')),(await reviewModule()).diagnosticSha256);
  assert.equal(units.filter(u=>u.gameVersion==='sample').length,5);assert.equal(catalog.list().filter(e=>e.hasProduction&&!e.isSample).length,5);
  assert.equal(game.getFactionUnits('empire').length,2);assert.equal(game.getFactionUnits('skaven').length,1);
  assert.equal(game.getFactionUnits('vampire_counts').filter(u=>u.gameVersion!=='sample').length,1);
  for(const d of diagnostics.entries)assert(!game.getUnit(d.id) && d.productionEligible===false);
});

test('partial gates refuse source/identity drift, speculative representatives, unknown loss, diagnostic collision and differing records',async()=>{
  const {buildPartialProductionBatch}=await import('../tools/wh3-importer/promotion/partial-batch.mjs');
  for(const change of [s=>{s.evidence.candidates[0].reviewedSource.status='BLOCKED';},s=>{s.evidence.candidates[0].dump.rows[0].row.num_men=999;},s=>{s.evidence.candidates.splice(0,1);},s=>{s.units[6].defense.armor=999;},s=>{s.factions.push(s.factions[0]);},s=>{s.diagnostics.entries.push({id:units[8].id,sourceMainKey:units[8].id.slice(8),sourceLandKey:units[8].id.slice(8),contextId:null,missiles:[],cases:[]});}]){
    const supplied=options();change(supplied);assert.throws(()=>buildPartialProductionBatch(supplied));}
  const doom=(await reviews()).find(c=>c.slug==='sample-17');
  const {assertReviewedProductionResult}=await import('../tools/wh3-importer/promotion/first-batch.mjs');
  const review={mainKey:doom.identity.caMainUnitKey,landKey:doom.identity.caLandUnitKey,id:doom.unit.id,name:doom.name,factionId:doom.unit.factionId,militaryGroup:doom.affiliation.militaryGroup};
  const check=r=>assertReviewedProductionResult(r,validateUnits,factions.map(f=>f.id),review,{expected:doom.remainingUnmapped,omittedGroups:['passiveAbilities']});
  check(doom.normalized);
  for(const change of [r=>{r.unit.entities.count=8;},r=>{r.unit.entities.mass=500;},r=>{r.unit.entities.totalHealth=0;},r=>{r.unit.movement.speed=null;},r=>{r.unit.missile={projectile:{}};},r=>{r.unit.passiveAbilities=['scurry_away'];},r=>{r.unmapped.splice(0,1);},r=>{r.unmapped=[];},r=>{r.unit.defense.armor=Infinity;},r=>{r.unit.classification.role='INCONCLUSIVE';}]){
    const r=structuredClone(doom.normalized);change(r);assert.throws(()=>check(r));}
});

test('new production detail routes retain verified stats, omissions and existing personal controls',async()=>{
  const {buildPartialProductionBatch}=await import('../tools/wh3-importer/promotion/partial-batch.mjs');
  for(const {unit} of buildPartialProductionBatch(options()).admitted){assert.deepEqual(game.getUnit(unit.id),unit);const html=render(unit.id);
    for(const text of ['>Production<','근접 피해','출처·버전·생략 범위','미입력','내 기록','즐겨찾기 추가'])assert(html.includes(text),`${unit.name}/${text}`);
    assert(!html.includes('Production data unavailable')&&!html.includes('>Sample<'));
    assert(html.includes(String(unit.melee.meleeAttack))&&html.includes(String(unit.melee.damage.armorPiercing)));
  }
  assert(render('zombies').includes('>Sample<'));
  assert(render(diagnostics.entries[0].id).includes('Production data unavailable'));
});

test('production, sample and diagnostic personal targets round-trip through the unchanged version-one backup without Unit stats',async()=>{
  const {memoryIndexedDb}=require('./fixtures/memoryIndexedDb.cjs');
  const {wikiRepository:wiki,parseBackup}=require('../.test-build/src/repositories/wikiRepository.js');
  global.indexedDB=memoryIndexedDb();
  const ids=[...units.slice(6).map(u=>u.id),'zombies',diagnostics.entries[0].id];
  for(const id of ids){const target={entityType:'unit',entityId:id};await wiki.setBookmark(target,true);await wiki.recordView(target);
    await wiki.saveArticle(target,{evaluation:`personal:${id}`,tactics:'개인 기록',strengths:'',weaknesses:''});}
  const backup=await wiki.exportBackup();assert.equal(backup.version,1);assert.equal(backup.articles.length,6);
  assert(!backup.articles.some(a=>'defense' in a || 'entities' in a || 'productionProjection' in a));
  global.indexedDB=memoryIndexedDb();await wiki.importBackup(parseBackup(JSON.parse(JSON.stringify(backup))));
  const restored=await wiki.exportBackup();for(const key of ['articles','notes','bookmarks','recentViews'])assert.deepEqual(restored[key],backup[key]);
  for(const id of ids)assert.equal((await wiki.getArticle({entityType:'unit',entityId:id})).evaluation,`personal:${id}`);
});
