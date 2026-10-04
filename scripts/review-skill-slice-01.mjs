import fs from 'node:fs';
import assert from 'node:assert/strict';
import {admitSkill,serialize} from '../tools/wh3-importer/skill-slice-01/review.mjs';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root)),dir='tools/wh3-importer/skill-slice-01/';
const result=admitSkill(read(dir+'source.json'),read('src/data/units.json'),JSON.parse(read(dir+'manifest.json')));
for(const [path,value] of [[dir+'review.json',result.review],[dir+'admission.json',result.admission],['src/data/caSkillEffect.json',result.projection]]) {
 if(process.argv.includes('--write'))fs.writeFileSync(new URL(path,root),serialize(value));
 else assert.equal(read(path).toString(),serialize(value),`Skill replay drift: ${path}`);
}
console.log('Skill evidence + admission + projection replay PASS: Champions of Bordeleaux / exact Alberic / level 1 / 2 effects / 1 Production target; RoR omitted');
