const hpOverlay=require('../tools/wh3-importer/hp-policy/overlay.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {validateUnits}=require('../.test-build/src/domain/unitValidation.js');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const units=hpOverlay.staticProductionView(read('src/data/units.json')),factions=read('src/data/factions.json');
const names=['expansion-batch-02','expansion-batch-03','expansion-batch-04'];
const inputs=()=>({batches:names.map(name=>({name,bundle:read(`tools/wh3-importer/${name}/sources.json`),review:read(`tools/wh3-importer/${name}/review.json`)})),
  units:structuredClone(units),factions:structuredClone(factions),diagnosticIds:read('src/data/unitDiagnostics.json').entries.map(e=>e.id),validate:validateUnits});
const modules=async()=>({...await import('../tools/wh3-importer/production-growth/batch.mjs'),
  ...await import('../tools/wh3-importer/expansion-batch-01/compact.mjs'),
  ...await import('../tools/wh3-importer/expansion-batch-01/projection.mjs'),
  ...await import('../tools/wh3-importer/promotion/first-batch.mjs')});

test('growth preserves exact original 29 Production / 5 Sample IDs, values, order and serialized bytes',async()=>{
  const {evidenceHash,byteHash,baselineUnitsHash,baselineUnitsBytesHash}=await modules();
  const baseline=units.slice(0,34);
  assert.equal(evidenceHash(baseline),baselineUnitsHash);
  assert.equal(byteHash(JSON.stringify(baseline,null,2)+'\n'),baselineUnitsBytesHash);
  assert.equal(units.filter(u=>u.gameVersion!=='sample').length,101);assert.equal(units.filter(u=>u.gameVersion==='sample').length,5);
  assert.equal(evidenceHash(baseline.filter(u=>u.gameVersion!=='sample')),'117cebac549c9ea985809079a57830d6c7990fff9350c93ace705eed0dabc78e');
  assert.equal(evidenceHash(units.filter(u=>u.gameVersion==='sample')),'892b95c759ff9a69d82fb8c5db2914e00701cc989d59d39c6e34a0cf2d56f856');
});
test('72 exact explicit admissions replay deterministic compact dictionaries and reviews without staging',async()=>{
  const {growthAdmissions,decodeSource,encodeSource,serializeSource,replayGrowthReview,growthPolicy}=await modules();
  const {reviewExpansion,expansionReviewArtifact}=await import('../tools/wh3-importer/expansion-batch-01/review.mjs');
  for(const b of inputs().batches) {
    const source=decodeSource(b.bundle,growthAdmissions[b.name].sourceHash);
    assert.deepEqual(encodeSource(source),b.bundle);
    assert.equal(serializeSource(encodeSource(source)),readFileSync(`tools/wh3-importer/${b.name}/sources.json`,'utf8'));
    const result=replayGrowthReview(b.name,b.bundle);assert.deepEqual(result.artifact,b.review);
    assert.deepEqual(result.reviews.map(r=>r.slug),growthPolicy(b.name).allowlist.map(a=>a.slug));assert.equal(result.reviews.length,24);
    assert(source.preflight.every(e=>e.roots.length===1));
    // A scoped allowlist must point back to its real source index, never the
    // index of the smaller review list.
    const policy={...growthPolicy(b.name),allowlist:[growthPolicy(b.name).allowlist[7]]};
    const subset=expansionReviewArtifact(b.bundle,reviewExpansion(b.bundle,policy),policy);
    assert.equal(subset.candidates[0].sourcePointer,'data.candidates.7');
  }
});
test('growth admission preserves caller inputs, canonical order, byte determinism and repeat equality',async()=>{
  const {buildProductionGrowth,growthAdmissionReport}=await modules(),input=inputs();input.units=units.slice(0,34);
  const before=structuredClone({...input,validate:undefined}),first=buildProductionGrowth(input);
  assert.deepEqual({...input,validate:undefined},before);assert.equal(first.added,72);assert.deepEqual(first.units,units);
  const reversed=buildProductionGrowth({...input,batches:[...input.batches].reverse()});assert.deepEqual(reversed.units,first.units);
  assert.equal(JSON.stringify(first.units,null,2)+'\n',hpOverlay.serialize(hpOverlay.staticProductionView(read('src/data/units.json'))));
  const repeat=buildProductionGrowth({...input,units:first.units});assert.equal(repeat.added,0);assert.deepEqual(repeat.units,first.units);
  for(const name of names)assert.deepEqual(growthAdmissionReport(name,repeat),read(`tools/wh3-importer/${name}/admission.json`));
});
test('growth refuses unapproved identity, blocked/source drift, unknown loss, missing row, review mutation and collisions',async()=>{
  const {buildProductionGrowth,growthPolicy}=await modules();
  for(const mutate of [
    x=>{x.units[5].defense.armor=999;},x=>{x.units.push({...x.units[0],id:'unapproved'});},
    x=>{x.units.push(x.units[0]);},x=>{[x.units[34],x.units[35]]=[x.units[35],x.units[34]];},
    x=>{x.diagnosticIds.push(x.units[34].id);},x=>{x.factions[0].name='guess';},x=>{x.batches.pop();},
    x=>{x.batches[0].bundle.data.preflight[0].status='BLOCKED';},
    x=>{x.batches[0].bundle.data.preflight[0].roots.push(x.batches[0].bundle.data.preflight[0].roots[0]);},
    x=>{x.batches[0].bundle.data.candidates[0].identity.caMainUnitKey='unknown';},
    x=>{x.batches[0].bundle.data.candidates[0].originalUnmapped=[];},
    x=>{delete x.batches[0].bundle.rows[x.batches[0].bundle.data.candidates[0].dump.rows[0]];},
    x=>{x.batches[0].review.candidates[0].productionProjectionSha256='other';},
  ]){const x=inputs();mutate(x);assert.throws(()=>buildProductionGrowth(x));}
  const {reviewExpansion:review}=await import('../tools/wh3-importer/expansion-batch-01/review.mjs');
  const b=inputs().batches[0],policy=growthPolicy(b.name);
  assert.throws(()=>review(b.bundle,{...policy,allowlist:[{...policy.allowlist[0],slug:'unknown'}]}),/unavailable\/blocked/);
  assert.throws(()=>review(b.bundle,{...policy,allowlist:[{...policy.allowlist[0],mainKey:'unapproved'}]}),/exact identity/);
});
test('HP/count/scale/speed remain absent; missile ambiguity withholds fields while raw graph and unknown IDs survive',async()=>{
  const {replayGrowthReview}=await modules();let missile=0,withheld=0,unknowns=0;
  for(const b of inputs().batches)for(const r of replayGrowthReview(b.name,b.bundle).reviews) {
    const u=r.normalized.unit;
    for(const field of ['count','totalHealth','healthPerEntity','unitScale'])assert(!Object.hasOwn(u.entities,field));
    for(const field of ['speed','groundSpeed','chargeSpeed'])assert(!Object.hasOwn(u.movement,field));
    if(r.composite)assert.deepEqual(u.entities,{});
    if(u.missile){missile++;assert.equal(r.missileReview.completeness,'COMPLETE_STATIC_SINGLE');
      assert(!Object.hasOwn(u.missile,'ammunition'));assert(!Object.hasOwn(u.missile,'strength'));assert(!Object.hasOwn(u.missile.reload??{},'currentTime'));}
    if(r.missileReview.completeness==='STRUCTURE_KNOWN_RUNTIME_UNRESOLVED'){withheld++;assert(!u.missile);assert(r.withdrawals.some(w=>w.field==='missile'));assert(r.missileReview.paths.length>0);}
    unknowns+=r.remainingUnmapped.length;
    for(const group of ['abilities','passiveAbilities','attributes'])if(r.groups[group].status==='NEEDS_MAPPING')assert(!Object.hasOwn(u,group));
  }
  assert.equal(missile,16);assert.equal(withheld,18);assert.equal(unknowns,227);
});
test('historical blocked roots remain unselected and historical diagnostic/shared identity/artifact bytes are unchanged',async()=>{
  const {decodeSource,byteHash}=await modules(),source=decodeSource(read('tools/wh3-importer/expansion-batch-01/sources.json'));
  const {preservedBytes}=await import('../tools/wh3-importer/expansion-batch-01/admission.mjs');
  for(const [path,hash]of Object.entries(preservedBytes))assert.equal(byteHash(readFileSync(path)),hash,path);
  assert.equal(source.preflight.filter(e=>e.status==='BLOCKED').length,10);
  for(const e of source.preflight.filter(e=>e.status==='BLOCKED'))for(const root of e.roots)assert(!units.some(u=>u.id==='ca_unit_'+root.mainKey));
});
