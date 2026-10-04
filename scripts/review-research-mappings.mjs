import {verifyProtected} from '../tools/wh3-importer/research-admission-batch-01/protected.mjs';
import {readFileSync as read,writeFileSync as write} from 'node:fs';
import assert from 'node:assert/strict';
import {reviewMappings,verifyBatchRegression,sourceSha256} from '../tools/wh3-importer/research-mapping-review-01/review.mjs';
import {sha256} from '../tools/wh3-importer/research-classifier/classify.mjs';
const root=new URL('../',import.meta.url),file=p=>new URL(p,root);
const dir='tools/wh3-importer/research-mapping-review-01/',scan='tools/wh3-importer/research-scan-bretonnia/';
const json=p=>JSON.parse(read(file(p))),manifest=json(dir+'manifest.json');
assert.equal(manifest.format,'wh3-exact-research-mapping-review-manifest-v1');
assert.equal(manifest.baselineCommit,'5d0e1ea6a0283c3cbd086c8f65f1d468b2729884');
assert.equal(manifest.sourceSha256,sourceSha256);
assert.equal(manifest.baselinePolicySha256,'c6a397517d1da83d2dd360780de19e9eea88f2a4974334ca39a98413b11a5729');
assert.equal(manifest.reviewedPolicySha256,json(scan+'manifest.json').policySha256);
for(const name of ['before.json','baseline-policy.json','selected.json']) assert.equal(sha256(read(file(dir+name))),manifest.inputs[name],`${name} drift`);
assert.equal(json(dir+'before.json').originalReportSha256,'ab95773d7c6a2f646d6e1c4c9d4af9c2fdfbe027720e22d84c3cbd7b0d54aabd');
const units=read(file('src/data/units.json'));
const result=reviewMappings(read(file(scan+'source.json')),units,json(scan+'manifest.json'),json(dir+'before.json'),
  json(dir+'baseline-policy.json'),json(dir+'selected.json'),read(file('tools/wh3-importer/research-classifier/policy.mjs')),
  read(file('tools/wh3-importer/research-classifier/classify.mjs')));
const batch=verifyBatchRegression(read(file('tools/wh3-importer/research-batch-01/source.json')),units,
  manifest.batchBefore.whitelistSha256,manifest.batchBefore.reportSha256);
for(const [name,value] of Object.entries({'source-trace.json':result.trace,'review.json':result.review,'after.json':result.after,'coverage-delta.json':result.delta})) {
  const bytes=JSON.stringify(value,null,2)+'\n';
  if(process.argv.includes('--write')) {write(file(dir+name),bytes);manifest.outputs={...manifest.outputs,[name]:sha256(bytes)};}
  else {assert.equal(read(file(dir+name),'utf8'),bytes,`${name} replay drift`);assert.equal(sha256(bytes),manifest.outputs[name]);}
}
for(const [path,hash] of Object.entries(manifest.protectedFiles)) verifyProtected(path,hash);
if(process.argv.includes('--write')) write(file(dir+'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Exact mapping review replay PASS: 8 reviewed / 6 DIRECT / 2 REVIEW; batch:',batch.DIRECT_CANDIDATE,
  '; full scan:',JSON.stringify({before:result.delta.before.effects.counts,after:result.delta.after.effects.counts,
    newCandidates:result.delta.newModifierCandidates,newUnits:result.delta.newTargetUnits}));
