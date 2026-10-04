import fs from 'node:fs';
import assert from 'node:assert/strict';
import {replay,projectExtraction,serialize,keys} from '../tools/wh3-importer/skill-owner-research/research.mjs';
import {sha256} from '../tools/wh3-importer/research-classifier/classify.mjs';
import {fileHash} from '../tools/wh3-importer/research-admission-batch-01/protected.mjs';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root)),dir='tools/wh3-importer/skill-owner-research/';
const manifest=JSON.parse(read(dir+'manifest.json'));
assert.equal(manifest.baselineCommit,'b5308568cea08ce28b016545c019ea3c94f71848');
assert.equal(sha256(read(dir+'selection.json')),manifest.selectionSha256);
assert.deepEqual(JSON.parse(read(dir+'selection.json')).skills.map(s=>s.key),keys);
for(const [path,hash] of Object.entries(manifest.preservedFiles))assert.equal(fileHash(path,read(path)),hash,`Preserved file drift: ${path}`);
const sourceBytes=read(dir+'source.json'),result=replay(sourceBytes,manifest,manifest.priorReviewPaths.map(p=>JSON.parse(read(p))));
assert.equal(sha256(serialize(result)),manifest.reportSha256,'Report hash drift');
if(process.argv.includes('--write'))fs.writeFileSync(new URL(dir+'report.json',root),serialize(result));
else assert.equal(read(dir+'report.json').toString(),serialize(result),'Shared owner replay drift');
if(process.argv.includes('--check-raw')){
 const source=JSON.parse(sourceBytes),raw=read(source.originalExtraction.path);
 assert.equal(sha256(raw),manifest.originalExtractionSha256);
 assert.equal(serialize(projectExtraction(raw)),sourceBytes.toString(),'Actual extraction projection drift');
 console.log('Actual bounded CA owner extraction projection PASS (read-only).');
}
console.log('Shared-owner research PASS: 6 samples / 47 exact owner-node chains / 5 EXACT_OWNER_SET + 1 EXACT_SINGLE_OWNER / verdict B / 0 new admissions.');
