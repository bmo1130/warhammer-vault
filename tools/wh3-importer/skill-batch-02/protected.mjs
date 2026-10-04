import assert from 'node:assert/strict';
import {readFileSync as read} from 'node:fs';
import {fileHash} from '../research-admission-batch-01/protected.mjs';
const root=new URL('../../../',import.meta.url);
// The prior batch's immutable manifest still pins its historical adapter.
// Only this reviewed registry addition may forward that historical app hash.
export function verifyAppIntegration(path,previousHash){
 const current=fileHash(path,read(new URL(path,root)));
 if(current===previousHash)return;
 assert.equal(path,'src/domain/caSkillEffect.ts');
 const prior=JSON.parse(read(new URL('tools/wh3-importer/skill-batch-01/manifest.json',root))).appFiles[path];
 const next=JSON.parse(read(new URL('tools/wh3-importer/skill-batch-02/manifest.json',root))).appFiles[path];
 assert(prior&&next);assert.equal(previousHash,prior.after);
 assert.equal(next.before,prior.after);assert.equal(current,next.after,'Unreviewed Skill registry change');
}
