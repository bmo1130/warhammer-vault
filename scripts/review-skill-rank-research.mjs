import fs from 'node:fs';
import assert from 'node:assert/strict';
import {replay,projectExtraction,serialize,keys} from '../tools/wh3-importer/skill-rank-research/research.mjs';
import {sha256} from '../tools/wh3-importer/research-classifier/classify.mjs';
import {fileHash} from '../tools/wh3-importer/research-admission-batch-01/protected.mjs';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root)),dir='tools/wh3-importer/skill-rank-research/';
const manifest=JSON.parse(read(dir+'manifest.json'));
assert.equal(manifest.baselineCommit,'83566932318795ab73430a27b88a57a4a3b50069');
assert.equal(sha256(read(dir+'selection.json')),manifest.selectionSha256);
assert.deepEqual(JSON.parse(read(dir+'selection.json')).skills.map(s=>s.key),keys);
for(const [path,hash] of Object.entries(manifest.preservedFiles))assert.equal(fileHash(path,read(path)),hash,`Preserved file drift: ${path}`);
const auditBytes=read(dir+'runtime-audit.json'),audit=JSON.parse(auditBytes);
assert.equal(sha256(auditBytes),manifest.runtimeAuditSha256);
assert.equal(fileHash(audit.probe.path,read(audit.probe.path)),audit.probe.sha256);
const sourceBytes=read(dir+'source.json'),result=replay(sourceBytes,manifest);
assert.equal(sha256(serialize(result)),manifest.reportSha256,'Report hash drift');
if(process.argv.includes('--write'))fs.writeFileSync(new URL(dir+'report.json',root),serialize(result));
else assert.equal(read(dir+'report.json').toString(),serialize(result),'Research replay drift');
if(process.argv.includes('--check-raw')){
 const source=JSON.parse(sourceBytes),raw=read(source.originalExtraction.path);
 assert.equal(sha256(raw),manifest.originalExtractionSha256);
 assert.equal(serialize(projectExtraction(raw)),sourceBytes.toString(),'Actual CA extraction projection drift');
 for(const input of audit.inputs)for(const path of input.paths)assert.equal(sha256(read(path)),input.sha256,`Raw runtime log drift: ${path}`);
 console.log('Actual CA projection and existing raw log identities PASS (read-only).');
}
console.log('Multi-rank Skill research replay PASS: 4 skills / 20 rank-effect rows / UNKNOWN (D) / no admission.');
