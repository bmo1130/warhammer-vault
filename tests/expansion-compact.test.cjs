const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const base='tools/wh3-importer/expansion-batch-01/';
const read=name=>JSON.parse(readFileSync(base+name+'.json','utf8'));
const modules=async()=>({...await import('../tools/wh3-importer/expansion-batch-01/compact.mjs'),
  ...await import('../tools/wh3-importer/expansion-batch-01/review.mjs'),
  ...await import('../tools/wh3-importer/promotion/first-batch.mjs')});

test('compact source decode/encode/review is deterministic and lossless without generated staging',async()=>{
  const {decodeSource,encodeSource,serializeSource,historicalSourceHash,evidenceHash,reviewExpansion,expandedReviewArtifact,expansionReviewArtifact}=await modules();
  const compact=read('sources'),expanded=decodeSource(compact);
  assert.equal(evidenceHash(expanded),historicalSourceHash);
  assert.deepEqual(encodeSource(expanded),compact);
  assert.equal(serializeSource(encodeSource(expanded)),readFileSync(base+'sources.json','utf8'));
  assert.deepEqual(decodeSource(structuredClone(compact)),expanded);
  const reviews=reviewExpansion(compact);
  assert.deepEqual(expansionReviewArtifact(compact,reviews),read('review'));
  assert.equal(evidenceHash(expandedReviewArtifact(compact,reviews)),'2a1f6203c07bba010ae3cbe862dbd01c0eb1597ac04333f7281a2e7fe47919b0');
  assert.equal(Object.keys(compact.rows).length,1178);
  assert.equal(new Set(Object.values(compact.rows).map(r=>r.metadata)).size,Object.keys(compact.rowMetadata).length);
});

test('compact source refuses duplicate row references',async()=>{
  const {decodeSource}=await modules(),source=read('sources');
  const rows=source.data.candidates[0].dump.rows;rows.push(rows[0]);
  assert.throws(()=>decodeSource(source),/duplicate row reference/);
});
test('compact source refuses a missing referenced row',async()=>{
  const {decodeSource}=await modules(),source=read('sources');
  delete source.rows[source.data.candidates[0].dump.rows[0]];
  assert.throws(()=>decodeSource(source),/missing referenced row/);
});
test('compact source fails closed on conflicting same-ID envelopes and changed row payloads',async()=>{
  const {decodeSource,encodeSource}=await modules(),source=read('sources');
  const expanded=decodeSource(source),row=expanded.candidates[0].dump.rows[0];
  expanded.candidates[0].dump.rows.push({...structuredClone(row),row:{...row.row,num_men:999}});
  assert.throws(()=>encodeSource(expanded),/conflicting row payload/);
  const record=source.rows[source.data.candidates[0].dump.rows[0]];
  record.row[Object.keys(source.rowMetadata[record.metadata].rowDefaults)[0]]='changed';
  assert.throws(()=>decodeSource(source),/expanded source hash differs/);
});
test('compact source refuses missing/corrupt schema references and definitions',async()=>{
  const {decodeSource}=await modules();
  const missing=read('sources');missing.data.candidates[0].dump.schemaRefs[0]='main_units_tables:999';
  assert.throws(()=>decodeSource(missing),/missing referenced schema/);
  const corrupt=read('sources');corrupt.schemas['main_units_tables:7'].fields[0].name='wrong';
  assert.throws(()=>decodeSource(corrupt),/expanded source hash differs/);
});
test('compact source refuses reason/edge corruption and unused dictionary records',async()=>{
  const {decodeSource}=await modules();
  const reason=read('sources');reason.reasons[Object.keys(reason.reasons)[0]]='changed';
  assert.throws(()=>decodeSource(reason),/hash differs/);
  const edge=read('sources');edge.relationships[Object.keys(edge.relationships)[0]].to='missing';
  assert.throws(()=>decodeSource(edge),/content hash differs/);
  const extra=read('sources');extra.reasons.unused='unused';
  assert.throws(()=>decodeSource(extra),/non-canonical/);
});
test('24 discoveries, original extraction hashes, 10 blockers, all unknowns and omission meanings retain baseline equality',async()=>{
  const {decodeSource,evidenceHash,reviewExpansion,expandedReviewArtifact}=await modules(),compact=read('sources'),source=decodeSource(compact);
  const review=expandedReviewArtifact(compact,reviewExpansion(compact));
  assert.equal(evidenceHash(source.preflight),'33e3b7d61a49d95d5f2de12809a7333838404566c49eb575a007d905ee6be98f');
  assert.equal(evidenceHash(source.preflight.map(e=>e.source)),'70b9edc9736fe24bfb53b293b2e4c552e293bb96bb9d7ad30fb42edbf15e4bb2');
  const blocked=review.preflight.filter(e=>e.status==='BLOCKED');assert.equal(blocked.length,10);
  assert.equal(evidenceHash(blocked),'25f83a53efef3c2cfc1e77b5acdb872a41aed24d758e9c660ba69fb34e11af8f');
  assert.equal(evidenceHash(review.candidates.map(c=>c.remainingUnmapped)),'479f969720aa10ba4f70fcf6cda89581400a7a7df0071ae9ed7089358d573650');
  assert.equal(evidenceHash(review.candidates.map(c=>({groups:Object.fromEntries(Object.entries(c.groups).map(([g,v])=>[g,v.omitted??[]])),withdrawals:c.withdrawals}))),
    '8c537a689a7ac6a2754975e025b0e4ea3f21567280fd13669a47a0e6d63d07c7');
  const decisions=read('review');
  for (const [i,c] of decisions.candidates.entries()) {
    assert.equal(c.productionProjectionSha256,evidenceHash(review.candidates[i].productionProjection));
    for (const [g,v] of Object.entries(c.groups)) {
      assert.deepEqual(v.admittedFields,review.candidates[i].groups[g].promotableFields?.map(f=>f.field));
      assert.deepEqual(v.omitted?.map(id=>({...decisions.omissions[id],reason:decisions.reasons[decisions.omissions[id].reason]})),review.candidates[i].groups[g].omitted);
    }
  }
});
test('all 29 Production and 5 Sample values/order retain the pre-refactor collection hash',async()=>{
  const {evidenceHash}=await modules(),units=JSON.parse(readFileSync('src/data/units.json','utf8')).slice(0,34);
  assert.equal(evidenceHash(units),'ff930ee3ffcf5674e25a4ee7d2731169c109a1dafdb08a8945bab009dcf18ea4');
  assert.equal(units.filter(u=>u.gameVersion!=='sample').length,29);
  assert.equal(units.filter(u=>u.gameVersion==='sample').length,5);
  assert.equal(evidenceHash(units.filter(u=>u.gameVersion!=='sample')),'117cebac549c9ea985809079a57830d6c7990fff9350c93ace705eed0dabc78e');
  assert.equal(evidenceHash(units.filter(u=>u.gameVersion==='sample')),'892b95c759ff9a69d82fb8c5db2914e00701cc989d59d39c6e34a0cf2d56f856');
});
