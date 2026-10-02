const hpOverlay=require('../tools/wh3-importer/hp-policy/overlay.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const {validateUnits}=require('../.test-build/src/domain/unitValidation.js');
const {unitCatalogRepository:catalog}=require('../.test-build/src/repositories/unitCatalogRepository.js');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const base='tools/wh3-importer/expansion-batch-01/';
const units=hpOverlay.staticProductionView(read('src/data/units.json')),factions=read('src/data/factions.json'),diagnostics=read('src/data/unitDiagnostics.json');
const options=()=>({bundle:read(base+'sources.json'),committedReview:read(base+'review.json'),units:structuredClone(units),
  factions:structuredClone(factions),diagnosticIds:diagnostics.entries.map(d=>d.id),validate:validateUnits});
const modules=async()=>({...await import('../tools/wh3-importer/expansion-batch-01/review.mjs'),
  ...await import('../tools/wh3-importer/expansion-batch-01/admission.mjs'),...await import('../tools/wh3-importer/expansion-batch-01/compact.mjs'),...await import('../tools/wh3-importer/promotion/first-batch.mjs')});

test('expansion exact-name catalog is bounded to 24 and cannot inject keys, paid policies or aliases',async()=>{
  const {expansionCatalog,validateExpansionCatalog}=await import('../tools/wh3-importer/expansion-batch-01/catalog.mjs');
  const {representativeCatalog}=await import('../tools/wh3-importer/pilot-catalog.mjs');
  assert.equal(representativeCatalog.length,24);assert.equal(expansionCatalog.length,24);validateExpansionCatalog(expansionCatalog);
  for(const input of [[],[...expansionCatalog,expansionCatalog[0]],expansionCatalog.map((c,i)=>i===0?{...c,mainKey:'guessed'}:c),
    expansionCatalog.map((c,i)=>i===0?{...c,rootSelection:'paid-recruitment'}:c)])assert.throws(()=>validateExpansionCatalog(input));
  const {decodeSource}=await modules();const source=decodeSource(read(base+'sources.json'));assert.deepEqual(source.catalog,expansionCatalog);
  assert(!/[A-Z]:[\\/]/.test(JSON.stringify(source)));assert(source.schemas.length<40);
  for(const e of source.preflight)if(e.permissionTrace)assert(e.permissionTrace.rows.length<=400);
  for(const c of source.candidates)assert(c.dump.rows.length<=250);
});

test('all 24 preflights retain zero/multiple roots and exact primary alias conflicts without selection',async()=>{
  const {decodeSource}=await modules();const source=decodeSource(read(base+'sources.json')),preflight=source.preflight;
  assert.equal(preflight.length,24);assert.equal(preflight.filter(e=>e.roots.length===1).length,16);
  assert.equal(preflight.filter(e=>e.roots.length>1).length,6);assert.equal(preflight.filter(e=>!e.roots.length).length,2);
  for(const e of preflight){
    for(const loc of e.localisationMatches)assert.equal(loc.text,e.sample.displayName);
    for(const root of e.roots){assert.equal(root.localisation.text,e.sample.displayName);assert.equal(root.localisation.key,`land_units_onscreen_name_${root.landKey}`);
      assert.equal(typeof root.rawVariant.isRenown,'boolean');assert(Array.isArray(root.permissionGroups));
      assert(Object.hasOwn(root.structure,'mount')&&Object.hasOwn(root.structure,'engine')&&Object.hasOwn(root.structure,'articulated'));
      assert.equal(root.missile.primary,'');assert.deepEqual(root.missile.junctions,[]);
    }
    if(e.roots.length!==1){assert.equal(e.status,'BLOCKED');assert(!source.candidates.some(c=>c.slug===e.sample.slug));
      assert.equal(e.blockers[0].category,e.roots.length?'IDENTITY_AMBIGUITY':'ROOT_NOT_FOUND');}
  }
  assert.deepEqual(preflight.filter(e=>!e.roots.length).map(e=>e.sample.displayName),['Temple Guards','Kroxigors']);
  for(const e of preflight.filter(e=>e.sample.displayName.startsWith('Tomb Guard'))){
    assert.deepEqual(e.roots[0].primaryAliases.map(a=>a.factionId),['tomb_kings','vampire_counts']);
    assert.equal(e.blockers[0].category,'NO_PRIMARY_CATALOG_MAPPING');assert.equal(e.status,'BLOCKED');
  }
});

test('review replays exact field subsets, original candidate hashes, all unknown IDs and no new mappings',async()=>{
  const {reviewExpansion,expansionReviewArtifact,expansionAllowlist,decodeSource}=await modules(),input=options();
  const reviews=reviewExpansion(input.bundle);
  assert.deepEqual(expansionReviewArtifact(input.bundle,reviews),input.committedReview);
  assert.equal(reviews.length,14);assert.deepEqual(reviews.map(r=>r.slug),expansionAllowlist.map(r=>r.slug));
  assert.deepEqual(input.committedReview.counts,{uniqueRoot:16,ambiguous:6,rootNotFound:2,CLEAN:0,PARTIAL:14,BLOCKED:10});
  for(const [i,r] of reviews.entries()) {
    assert.equal(r.source.sha256,expansionAllowlist[i].sha256);assert.deepEqual(r.scopedMappings,[]);
    assert.deepEqual(r.remainingUnmapped,decodeSource(input.bundle).candidates[i].originalUnmapped);
    for(const group of ['identity','affiliation/catalog','classification','movement','defense','melee','campaign','customBattle'])assert.equal(r.groups[group].status,'PROMOTABLE');
    for(const group of ['abilities','passiveAbilities','attributes'])if(r.groups[group].status==='NEEDS_MAPPING') {
      assert(!Object.hasOwn(r.normalized.unit,group));assert(r.withdrawals.some(w=>w.field===group));
      assert(!r.normalized.provenance.fields.some(f=>f.field.startsWith(group+'.')));
    }
  }
});

test('new records never select mounted representatives, convert raw counts, infer HP/speed or store missile',async()=>{
  const {reviewExpansion}=await modules();let mounted=0;
  for(const r of reviewExpansion(options().bundle)) {
    const u=r.normalized.unit;
    assert(!u.missile);
    for(const key of ['count','totalHealth','healthPerEntity','unitScale'])assert(!Object.hasOwn(u.entities,key));
    for(const key of ['speed','groundSpeed','chargeSpeed'])assert(!Object.hasOwn(u.movement,key));
    if(r.composite){mounted++;assert.deepEqual(u.entities,{});assert(!Object.hasOwn(u.defense,'projectilePenetrationResistance'));}
    else{assert(u.entities.mass>0);assert(u.entities.entitySize);}
  }
  assert.equal(mounted,4);
  const varg=units.find(u=>u.name==='Vargheists');assert.deepEqual(varg.entities,{entitySize:'large',mass:1300});assert.equal(varg.movement.canFly,true);
});

test('explicit admission appends 14, preserves previous 20 values/order and is idempotent without mutating inputs',async()=>{
  const {buildExpansionBatch,baselineUnitsHash,evidenceHash}=await modules();
  const input=options(),before=structuredClone({...input,validate:undefined});delete before.validate;
  const batch=buildExpansionBatch(input);assert.equal(batch.added,0);assert.deepEqual(batch.units,units);
  const after=structuredClone({...input,validate:undefined});delete after.validate;assert.deepEqual(after,before);
  assert.equal(evidenceHash(units.slice(0,20)),baselineUnitsHash);
  input.units=units.slice(0,20);const first=buildExpansionBatch(input);assert.equal(first.added,14);assert.deepEqual(first.units,units.slice(0,34));
  assert.deepEqual(first.units.slice(0,20),input.units);assert.deepEqual(buildExpansionBatch({...input,units:first.units}).units,first.units);
  assert.deepEqual(validateUnits(units,factions.map(f=>f.id)),[]);
  assert.equal(catalog.list().length,106);assert.equal(new Set(catalog.list().map(e=>e.id)).size,106);
  assert.equal(catalog.list().filter(e=>e.hasProduction&&!e.isSample).length,101);assert.equal(catalog.list().filter(e=>e.isSample).length,5);
  assert.equal(catalog.search('','evidence').length,5);assert.equal(catalog.search('','diagnostic-only').length,0);
});

test('gate refuses source/review/identity/hash/unknown/snapshot/affiliation drift, collisions and overwrites',async()=>{
  const {buildExpansionBatch}=await modules();
  for(const mutate of [
    x=>{x.bundle.data.catalog[0].displayName='guess';},x=>{x.bundle.data.candidates[0].identity.caMainUnitKey='other';},
    x=>{x.bundle.data.candidates[0].identity.caLandUnitKey='other';},x=>{x.bundle.data.candidates[0].source.sha256='wrong';},
    x=>{x.bundle.data.candidates[0].originalUnmapped=[];},x=>{x.bundle.provenance.gameVersion='9.1';},
    x=>{x.bundle.data.candidates[0].affiliation.factionId='empire';},x=>{x.bundle.data.preflight[2].roots.push(x.bundle.data.preflight[2].roots[0]);},
    x=>{x.committedReview.candidates[0].productionProjectionSha256='wrong';},x=>{x.committedReview.candidates[0].unknownIds=[];},
    x=>{x.units.push(x.units[0]);},x=>{x.units[20].defense.armor=999;},x=>{x.units[6].defense.armor=999;},
    x=>{x.factions[0].description='changed';},x=>{x.diagnosticIds.push(x.units[20].id);},x=>{x.validate=()=>['invalid'];},
  ]){const x=options();mutate(x);assert.throws(()=>buildExpansionBatch(x));}
});

test('production boundary rejects optional fragments, cardinality/HP/speed inference and numeric curated provenance',async()=>{
  const {reviewExpansion,assertReviewedProductionResult}=await modules();
  for(const r of reviewExpansion(options().bundle)) {
    const review={mainKey:r.identity.caMainUnitKey,landKey:r.identity.caLandUnitKey,id:r.identity.internalId,
      name:r.name,factionId:r.affiliation.factionId,militaryGroup:r.affiliation.militaryGroup};
    const policy={expected:r.remainingUnmapped,omittedGroups:r.withdrawals.filter(w=>['abilities','passiveAbilities','attributes'].includes(w.field)).map(w=>w.field)};
    const check=value=>assertReviewedProductionResult(value,validateUnits,factions.map(f=>f.id),review,policy);
    check(r.normalized);
    const mutations=[x=>{x.unit.entities.count=r.groups['composition/runtime structure'].rawCardinality.numMen.value;},
      x=>{x.unit.entities.totalHealth=1000;},x=>{x.unit.movement.speed=10;},x=>{x.unit.missile={projectile:{baseDamage:1}};},
      x=>{x.provenance.fields.find(f=>f.field==='defense.armor').kind='CURATED';},
      ...policy.omittedGroups.map(g=>x=>{x.unit[g]=['mapped_fragment'];})];
    if(r.remainingUnmapped.length)mutations.push(x=>{x.unmapped=[];});
    for(const mutate of mutations){const x=structuredClone(r.normalized);mutate(x);assert.throws(()=>check(x),r.slug);}
  }
});

test('diagnostic, shared, factions and historical pilot/review bytes remain unchanged',async()=>{
  const {preservedBytes}=await modules();
  for(const [path,hash] of Object.entries(preservedBytes))assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),hash,path);
  assert(diagnostics.entries.every(d=>d.productionEligible===false));
});

test('new infantry, mounted and monstrous routes use existing production UI and unchanged backup v1',async()=>{
  const React=require('react'),{renderToString}=require('react-dom/server'),{MemoryRouter}=require('react-router-dom');
  const App=require('../.test-build/src/App.js').default;
  const {wikiRepository:wiki,parseBackup}=require('../.test-build/src/repositories/wikiRepository.js');
  const {memoryIndexedDb}=require('./fixtures/memoryIndexedDb.cjs');global.indexedDB=memoryIndexedDb();
  for(const name of ['Foot Squires','Questing Knights','Vargheists']) {
    const u=units.find(u=>u.name===name),entry=catalog.get(u.id),target={entityType:'unit',entityId:u.id};
    const html=renderToString(React.createElement(MemoryRouter,{initialEntries:[entry.route]},React.createElement(App))).replace(/<!--.*?-->/g,'');
    for(const text of ['Production',name,'기본 스탯','미입력','즐겨찾기 추가','내 기록',u.source,`href="/factions/${u.factionId}"`])assert(html.includes(text),text);
    assert(html.includes(`<span>근접 공격</span><strong>${u.melee.meleeAttack}</strong>`));assert(!html.includes('Production data unavailable'));
    assert(catalog.search(name).some(e=>e.id===u.id));
    await wiki.saveArticle(target,{evaluation:'Expansion continuity',tactics:'Verified core',strengths:'',weaknesses:''});await wiki.setBookmark(target,true);await wiki.recordView(target);
  }
  const backup=await wiki.exportBackup();assert.equal(backup.version,1);
  global.indexedDB=memoryIndexedDb();await wiki.importBackup(parseBackup(JSON.parse(JSON.stringify(backup))));
  const restored=await wiki.exportBackup();for(const key of ['articles','bookmarks','recentViews'])assert.deepEqual(restored[key],backup[key]);
});
