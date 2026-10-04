import assert from 'node:assert/strict';
import {readFileSync as read} from 'node:fs';
import {verifyProtected as verifyResearch,fileHash} from '../research-admission-batch-01/protected.mjs';
const root=new URL('../../../',import.meta.url),json=p=>JSON.parse(read(new URL(p,root)));
const allowed=new Set(['src/pages/CalculatorPage.tsx','scripts/review-research-mappings.mjs']);
// Preserve the Research admission manifest itself. Only the new Skill UI/replay
// integration can extend its exact before → after pins outside that artifact.
export function verifyProtected(path,baselineHash){
 const current=fileHash(path,read(new URL(path,root)));
 if(current===baselineHash)return;
 const previous=json('tools/wh3-importer/research-admission-batch-01/manifest.json').forwardFiles[path];
 if(allowed.has(path)){
  const forward=json('tools/wh3-importer/skill-slice-01/manifest.json').forwardFiles[path];
  assert(previous&&forward,'Missing reviewed forward integration');
  assert.equal(previous.before,baselineHash);assert.equal(forward.before,previous.after);
  assert.equal(current,forward.after,`Skill integration drift: ${path}`);return;
 }
 verifyResearch(path,baselineHash);
}
