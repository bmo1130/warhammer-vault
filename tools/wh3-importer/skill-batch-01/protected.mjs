import assert from 'node:assert/strict';
import {readFileSync as read} from 'node:fs';
import {verifyProtected as previousVerify} from '../skill-slice-01/protected.mjs';
import {fileHash} from '../research-admission-batch-01/protected.mjs';
const root=new URL('../../../',import.meta.url),json=p=>JSON.parse(read(new URL(p,root)));
const allowed=new Set(['src/pages/CalculatorPage.tsx','scripts/review-research-mappings.mjs']);
// Extend only the same explicitly reviewed Calculator/replay integration paths;
// prior Skill and Research artifacts retain their original pins and bytes.
export function verifyProtected(path,baselineHash){
 const current=fileHash(path,read(new URL(path,root)));
 if(current===baselineHash)return;
 if(!allowed.has(path)){previousVerify(path,baselineHash);return;}
 const research=json('tools/wh3-importer/research-admission-batch-01/manifest.json').forwardFiles[path];
 const slice=json('tools/wh3-importer/skill-slice-01/manifest.json').forwardFiles[path];
 const batch=json('tools/wh3-importer/skill-batch-01/manifest.json').forwardFiles[path];
 assert(research&&slice&&batch);assert.equal(research.before,baselineHash);
 assert.equal(slice.before,research.after);assert.equal(batch.before,slice.after);assert.equal(current,batch.after,'Unreviewed Skill batch integration');
}
