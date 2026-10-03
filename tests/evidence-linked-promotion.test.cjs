const hpOverlay=require('../tools/wh3-importer/production-overlay.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {createHash}=require('node:crypto');
const {validateUnits}=require('../.test-build/src/domain/unitValidation.js');
const {createUnitCatalog,unitCatalogRepository:catalog}=require('../.test-build/src/repositories/unitCatalogRepository.js');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const units=hpOverlay.staticProductionView(read('src/data/units.json')),factions=read('src/data/factions.json'),diagnostics=read('src/data/unitDiagnostics.json');
const registry=read('src/data/unitSharedIdentities.json');
const options=()=>({units:structuredClone(units),factions:structuredClone(factions),diagnostics:structuredClone(diagnostics),
  evidence:read('tools/wh3-importer/promotion/partial-sources.json'),committedReview:read('tools/wh3-importer/promotion/partial-review.json'),validate:validateUnits});
const batchModule=()=>import('../tools/wh3-importer/promotion/evidence-linked-batch.mjs');

test('five bounded admissions replay exact records, registry, omissions, hashes and previous collection preservation',async()=>{
  const {buildEvidenceLinkedBatch,evidenceLinkedSlugs}=await batchModule();
  assert.deepEqual(evidenceLinkedSlugs,['sample-07','sample-12','sample-14','sample-15','sample-24']);
  const input=options(),before=options(),batch=buildEvidenceLinkedBatch(input);
  assert.deepEqual(input,before);assert.deepEqual(batch.units,units);assert.deepEqual(batch.factions,factions);
  assert.deepEqual(batch.registry,registry);assert.deepEqual(batch.added,{units:0,factions:0});
  input.units=units.slice(0,15);input.factions=factions.slice(0,5);
  const first=buildEvidenceLinkedBatch(input);
  assert.deepEqual(first.added,{units:5,factions:3});assert.deepEqual(first.units,units.slice(0,20));assert.deepEqual(first.factions,factions);
  assert.equal(createHash('sha256').update(readFileSync('src/data/unitDiagnostics.json')).digest('hex'),registry.diagnosticSha256);
  const {reviewPartialCandidates}=await import('../tools/wh3-importer/promotion/partial-review.mjs');
  const replay=reviewPartialCandidates(before.evidence,before.diagnostics);
  for(const a of batch.admitted){
    const c=before.committedReview.candidates.find(c=>c.slug===a.slug),link=registry.links.find(l=>l.productionId===a.unit.id);
    assert.deepEqual(link.partialReviewIdentity,c.identity);assert.deepEqual(link.candidateSource,c.source);
    assert.deepEqual(a.remainingUnmapped,replay.find(r=>r.slug===a.slug).remainingUnmapped);
    assert.deepEqual(a.withdrawals,replay.find(r=>r.slug===a.slug).withdrawals);
    const projected=structuredClone(a.unit);projected.source=c.productionProjection.source;projected.sources=c.productionProjection.sources;
    assert.deepEqual(projected,c.productionProjection);assert(!a.unit.missile);
    assert.deepEqual(a.unit.entities,a.slug==='sample-07'?{entitySize:'small',mass:90}:{});
    for(const field of ['speed','groundSpeed','chargeSpeed'])assert(!Object.hasOwn(a.unit.movement,field));
    for(const field of ['abilities','passiveAbilities','attributes'])assert(!Object.hasOwn(a.unit,field));
    for(const group of ['classification','movement','defense','melee','campaign','customBattle'])assert(Object.keys(a.unit[group]).length);
  }
});

test('admission refuses source, candidate identity/hash, review, unknown, snapshot, collision and existing-record drift',async()=>{
  const {buildEvidenceLinkedBatch}=await batchModule();
  const mutations=[
    x=>{x.evidence.candidates[3].reviewedSource.sha256='wrong';},
    x=>{x.evidence.candidates[3].identity.caLandUnitKey='wrong';},
    x=>{x.committedReview.candidates[3].remainingUnmapped=[];},
    x=>{x.committedReview.candidates[3].productionProjection.entities.count=12;},
    x=>{x.diagnostics.entries[0].sourceMainKey='wrong';},
    x=>{x.diagnostics.entries[0].sourceLandKey='wrong';},
    x=>{x.diagnostics.entries[0].id='wrong';},
    x=>{x.diagnostics.entries[0].productionEligible=true;},
    x=>{x.diagnostics.gameVersion='9.1';},
    x=>{x.diagnostics.batchId='other';},
    x=>{x.diagnostics.staticSnapshotId='wrong';},
    x=>{x.diagnostics.snapshot.packs[0].sha256='wrong';},
    x=>{x.units.find(u=>u.id===registry.links.at(-1).productionId).entities.totalHealth=5980;},
    x=>{x.factions.at(-1).description='whole roster';},
    x=>{x.diagnostics.entries.push({...x.diagnostics.entries[0],id:'zombies'});},
    x=>{x.units.push(x.units[0]);},
    x=>{x.validate=()=>['invalid'];},
  ];
  for(const mutate of mutations){const x=options();mutate(x);assert.throws(()=>buildEvidenceLinkedBatch(x));}
});

test('only exact reviewed shared collisions pass; identity, provenance and snapshot mismatch fail closed',()=>{
  assert.equal(createUnitCatalog(units,diagnostics.entries).length,106);
  for(const link of registry.links){
    const u=units.find(u=>u.id===link.productionId),d=diagnostics.entries.find(d=>d.id===link.diagnosticId);
    assert.equal(createUnitCatalog([u],[d]).length,1);
    for(const mutate of [d=>{d.sourceMainKey='other';},d=>{d.sourceLandKey='other';},d=>{d.contextId='other';}]){
      const changed=structuredClone(d);mutate(changed);assert.throws(()=>createUnitCatalog([u],[changed]),/ID collision/);
    }
    for(const mutate of [u=>{u.sources.publicStats='other source';},u=>{u.gameVersion='9.1';},u=>{u.entities.count=12;},u=>{u.id=d.id;u.source='another main/land record';}]){
      const changed=structuredClone(u);mutate(changed);assert.throws(()=>createUnitCatalog([changed],[d]),/ID collision/);
    }
    const wrongRecord={...units[0],id:d.id,name:d.name};assert.throws(()=>createUnitCatalog([wrongRecord],[d]),/ID collision/);
    const sameName={...d,id:'unrelated',name:u.name};assert.equal(createUnitCatalog([u],[sameName]).length,2);
    for(const mutate of [s=>{s.gameVersion='9.1';},s=>{s.staticSnapshotId='other';},s=>{s.snapshot.schemaSha256='other';},s=>{s.snapshot.packs[0].sha256='other';}]){
      const snapshot=structuredClone(diagnostics);mutate(snapshot);assert.throws(()=>createUnitCatalog([u],[d],snapshot),/ID collision/);
    }
  }
  assert.throws(()=>createUnitCatalog([units[0]],[{...diagnostics.entries[0],id:units[0].id}]),/ID collision/);
  assert.equal(catalog.list().filter(e=>e.hasProduction&&!e.isSample).length,101);
  assert.equal(catalog.list().filter(e=>e.isSample).length,5);
  assert.equal(catalog.list().filter(e=>e.hasProduction&&e.hasDiagnostic).length,5);
  assert.equal(catalog.search('','diagnostic-only').length,0);assert.equal(catalog.search('','evidence').length,5);
  for(const name of ['Free Company','Black Coach'])assert.equal(catalog.search(name).length,1);
});

test('legacy diagnostic personal target survives shared route and backup v1 without migration',async()=>{
  const {memoryIndexedDb}=require('./fixtures/memoryIndexedDb.cjs');
  const {wikiRepository:wiki,parseBackup}=require('../.test-build/src/repositories/wikiRepository.js');
  const d=diagnostics.entries[0],target={entityType:'unit',entityId:d.id};
  const before=createUnitCatalog(units.filter(u=>u.id!==d.id),diagnostics.entries).find(e=>e.id===d.id);
  assert.equal(before.kind,'diagnostic-only');global.indexedDB=memoryIndexedDb();
  const article=await wiki.saveArticle(target,{evaluation:'승격 전 Black Coach 기록',tactics:'기존 전술',strengths:'',weaknesses:''});
  await wiki.setBookmark(target,true);await wiki.recordView(target);
  const backup=await wiki.exportBackup();assert.equal(backup.version,1);assert.equal(article.id,`unit:${d.id}`);
  const after=catalog.get(d.id);assert(after.hasProduction&&after.hasDiagnostic);assert.equal(before.route,after.route);
  const React=require('react'),{renderToString}=require('react-dom/server'),{MemoryRouter}=require('react-router-dom');
  const App=require('../.test-build/src/App.js').default;
  assert(renderToString(React.createElement(MemoryRouter,{initialEntries:[after.route]},React.createElement(App))).includes('Production'));
  assert.deepEqual(await wiki.getArticle(target),article);assert(await wiki.hasBookmark(target));
  global.indexedDB=memoryIndexedDb();await wiki.importBackup(parseBackup(JSON.parse(JSON.stringify(backup))));
  assert.deepEqual(await wiki.getArticle(target),article);assert(await wiki.hasBookmark(target));
  const restored=await wiki.exportBackup();for(const key of ['articles','bookmarks','recentViews'])assert.deepEqual(restored[key],backup[key]);
});

test('each shared boundary retains unknown IDs and refuses partial group restoration, runtime stats or missiles',async()=>{
  const {reviewPartialCandidates}=await import('../tools/wh3-importer/promotion/partial-review.mjs');
  const {assertReviewedProductionResult}=await import('../tools/wh3-importer/promotion/first-batch.mjs');
  const x=options();
  for(const c of reviewPartialCandidates(x.evidence,x.diagnostics).filter(c=>registry.links.some(l=>l.partialReviewSlug===c.slug))){
    const identity={id:c.unit.id,mainKey:c.identity.caMainUnitKey,landKey:c.identity.caLandUnitKey,name:c.name,
      factionId:c.affiliation.factionId,militaryGroup:c.affiliation.militaryGroup};
    const policy={expected:c.remainingUnmapped,omittedGroups:c.withdrawals.filter(w=>['abilities','passiveAbilities','attributes'].includes(w.field)).map(w=>w.field)};
    const check=r=>assertReviewedProductionResult(r,validateUnits,factions.map(f=>f.id),identity,policy);
    check(c.normalized);
    const mutations=[r=>{r.unmapped=[];},r=>{r.unit.entities.totalHealth=5980;},r=>{r.unit.entities.count=12;},
      r=>{r.unit.movement.speed=60;},r=>{r.unit.missile={projectile:{baseDamage:125}};},
      r=>{r.provenance.identity.caLandUnitKey='different';},r=>{r.provenance.fields.find(p=>p.field==='defense.armor').kind='CURATED';},
      ...policy.omittedGroups.map(group=>r=>{r.unit[group]=['guessed_fragment'];})];
    for(const mutate of mutations){const r=structuredClone(c.normalized);mutate(r);assert.throws(()=>check(r),c.slug);}
  }
});

test('all shared pages order production, summary, collapsed evidence and unchanged personal controls',()=>{
  const React=require('react'),{renderToString}=require('react-dom/server'),{MemoryRouter}=require('react-router-dom');
  const App=require('../.test-build/src/App.js').default;
  for(const link of registry.links){
    const html=renderToString(React.createElement(MemoryRouter,{initialEntries:[`/units/${link.productionId}`]},React.createElement(App))).replace(/<!--.*?-->/g,'');
    for(const text of ['>Production<','>Evidence<','기본 스탯',link.productionRecord.source,'UNVERIFIED','INCONCLUSIVE','즐겨찾기 추가','내 기록'])assert(html.includes(text),text);
    const positions=['stats-card','근접 피해','diagnostic-overview','diagnostic-section','article-section'].map(s=>html.indexOf(s));
    assert(positions.every((p,i)=>p>=0 && (i===0 || p>positions[i-1])));
    assert(html.includes(`<span>근접 공격</span><strong>${link.productionRecord.melee.meleeAttack}</strong>`));
    assert(!html.includes('Production data unavailable')&&!html.includes('Diagnostic-only entry · production 미승격'));
    assert(!html.includes('<details class="panel diagnostic-section" open'));
  }
});
