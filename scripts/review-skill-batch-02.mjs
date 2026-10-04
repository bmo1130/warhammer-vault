import fs from 'node:fs';
import assert from 'node:assert/strict';
import {admitBatch,serialize} from '../tools/wh3-importer/skill-batch-02/review.mjs';
import {fileHash} from '../tools/wh3-importer/research-admission-batch-01/protected.mjs';
import {sha256} from '../tools/wh3-importer/research-classifier/classify.mjs';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root)),dir='tools/wh3-importer/skill-batch-02/';
const manifest=JSON.parse(read(dir+'manifest.json'));
assert.equal(sha256(read(dir+'selection.json')),manifest.selectionSha256,'Selection drift');
for(const [path,hash] of Object.entries(manifest.preservedFiles))assert.equal(fileHash(path,read(path)),hash,`Preserved file drift: ${path}`);
for(const [path,pin] of Object.entries(manifest.appFiles))assert.equal(fileHash(path,read(path)),pin.after,`App integration drift: ${path}`);
const result=admitBatch(read(dir+'source.json'),read('src/data/units.json'),manifest);
for(const [path,value] of [[dir+'review.json',result.review],[dir+'admission.json',result.admission],['src/data/caSkillBatch02.json',result.projection]]){
 if(process.argv.includes('--write'))fs.writeFileSync(new URL(path,root),serialize(value));
 else assert.equal(read(path).toString(),serialize(value),`Skill batch replay drift: ${path}`);
}
console.log('Skill batch 02 PASS:',JSON.stringify(result.review.summary),'Admission: Blessed Water / exact Fay / rank1 / charge +30% / Battle Pilgrims. '+result.review.overlap.status);
