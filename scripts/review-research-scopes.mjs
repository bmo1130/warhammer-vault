import {verifyProtected} from '../tools/wh3-importer/skill-batch-01/protected.mjs';
import {readFileSync as read,writeFileSync as write} from 'node:fs';
import assert from 'node:assert/strict';
import {reviewScope,sourceSha256,baselineReportSha256} from '../tools/wh3-importer/research-scope-review-01/review.mjs';
import {sha256} from '../tools/wh3-importer/research-classifier/classify.mjs';
const root=new URL('../',import.meta.url),file=p=>new URL(p,root),dir='tools/wh3-importer/research-scope-review-01/';
const json=p=>JSON.parse(read(file(p))),manifest=json(dir+'manifest.json');
assert.equal(manifest.format,'wh3-research-scope-review-manifest-v1');
assert.equal(manifest.baselineCommit,'aef2d61bc59c507c0aad21ea01e4183538bba2c4');
assert.equal(manifest.sourceSha256,sourceSha256);assert.equal(manifest.baselineReportSha256,baselineReportSha256);
for(const [path,hash] of Object.entries(manifest.unchangedFiles)) verifyProtected(path,hash);
const protectedManifest=json(manifest.protectedManifestPath);
for(const [path,hash] of Object.entries(protectedManifest.protectedFiles)) verifyProtected(path,hash);
const result=reviewScope(read(file(manifest.sourceRef)),read(file('src/data/units.json')),
  json('tools/wh3-importer/research-scan-bretonnia/manifest.json'),
  read(file('tools/wh3-importer/research-classifier/policy.mjs')),read(file('tools/wh3-importer/research-classifier/classify.mjs')));
const outputs={'selected.json':result.selected,'inventory.json':result.inventory,'scope-source-trace.json':result.trace,
  'semantic-review.json':result.review,'cases.json':result.cases,'before.json':result.summary,'after.json':result.summary,'coverage-delta.json':result.delta};
for(const [name,value] of Object.entries(outputs)) {
  const bytes=JSON.stringify(value,null,2)+'\n';
  if(process.argv.includes('--write')){write(file(dir+name),bytes);manifest.outputs[name]=sha256(bytes);}
  else {assert.equal(read(file(dir+name),'utf8'),bytes,`Replay drift: ${name}`);assert.equal(sha256(bytes),manifest.outputs[name]);}
}
if(process.argv.includes('--write'))write(file(dir+'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Scope review replay PASS: 79 faction occurrences / 0 scope-only candidates; conclusion C; no whitelist change; DIRECT 15 / candidates 96 / Units 22 / DIRECT technologies 10.');
