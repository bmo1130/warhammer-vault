import fs from 'node:fs';
import assert from 'node:assert/strict';
import {admitBatch,serialize} from '../tools/wh3-importer/skill-batch-01/review.mjs';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root)),dir='tools/wh3-importer/skill-batch-01/';
const result=admitBatch(read(dir+'source.json'),read('src/data/units.json'),JSON.parse(read(dir+'manifest.json')));
for(const [path,value] of [[dir+'review.json',result.review],[dir+'admission.json',result.admission],['src/data/caSkillBatch01.json',result.projection]]){
 if(process.argv.includes('--write'))fs.writeFileSync(new URL(path,root),serialize(value));
 else assert.equal(read(path).toString(),serialize(value),`Skill batch replay drift: ${path}`);
}
console.log('Skill batch review/admission/projection PASS:',JSON.stringify(result.review.summary),'New admission: Aspiring Knights / 3 effects / 4 modifiers / Foot Squires only; multi-rank deferred');
