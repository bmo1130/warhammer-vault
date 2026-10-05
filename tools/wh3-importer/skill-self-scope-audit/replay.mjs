import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileHash} from '../research-admission-batch-01/protected.mjs';
import {sha256} from '../research-classifier/classify.mjs';
import {verifySource,serialize} from '../skill-production-bretonnia/source.mjs';
import {scan} from '../skill-production-bretonnia/scan.mjs';
import {classify} from '../skill-production-bretonnia/classify.mjs';
import {serializeCompact} from '../skill-production-bretonnia/compact.mjs';
import {baselineCommit} from './policy.mjs';
import {audit} from './audit.mjs';
const root=new URL('../../../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root)),priorDir='tools/wh3-importer/skill-production-bretonnia/';
export function runAudit(manifest){
 assert.equal(manifest.baselineCommit,baselineCommit);assert.equal(Object.keys(manifest.preservedFiles).length,515);
 for(const [path,hash] of Object.entries(manifest.preservedFiles))assert.equal(fileHash(path,read(path)),hash,`Protected file changed: ${path}`);
 const priorManifest=JSON.parse(read(priorDir+'manifest.json')),source=verifySource(read(priorDir+'source.json'),priorManifest);
 const bytes=read('tools/wh3-importer/skill-self-scope-audit/identity-source.json');assert.equal(sha256(bytes),manifest.identitySourceSha256);
 const extra=JSON.parse(bytes);assert.equal(extra.sourceSha256,priorManifest.sourceSha256);assert.equal(extra.snapshotId,priorManifest.snapshotId);
 const units=JSON.parse(read('src/data/units.json')),{inventory,memberships}=scan(source,units),classification=classify(inventory,memberships);
 assert.equal(sha256(serialize(JSON.parse(read(priorDir+'coverage.json')))),priorManifest.outputSha256.coverage);
 const coverage=JSON.parse(read(priorDir+'coverage.json')),paths=[...read('src/domain/unitModifiers.ts').toString().matchAll(/'([^']+)': true/g)].map(m=>m[1]);
 const result=audit(source,extra,inventory,classification,coverage,units,paths);
 return {source,extra,scanned:inventory,classification,memberships,result,outputs:Object.fromEntries(Object.entries(result).map(([key,value])=>[key,['inventory','classification'].includes(key)?serializeCompact(value):serialize(value)]))};
}
