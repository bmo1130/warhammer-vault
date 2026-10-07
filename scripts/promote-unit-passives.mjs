import fs from 'node:fs';
import assert from 'node:assert/strict';
import {decodeSource} from '../tools/wh3-importer/expansion-batch-01/compact.mjs';
import {rosterSourceHash} from '../tools/wh3-importer/production-growth/roster.mjs';
import {reviewUnitPassives} from '../tools/wh3-importer/unit-passives/review.mjs';
import {loadUnitValidator} from '../tools/wh3-importer/normalization/validation.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),mode=process.argv[2]??'--check';
assert(['--write','--check'].includes(mode));
const units=read('src/data/units.json');
const {review,projection}=reviewUnitPassives(read('tools/wh3-importer/unit-passives/source.json'),read('tools/wh3-importer/unit-attributes/source.json'),decodeSource(read('tools/wh3-importer/faction-rosters/source.json'),rosterSourceHash),units,read('src/data/unitAttributeAdmissions.json'),read('tools/wh3-importer/unit-passives/mappings.json'));
const byId=new Map(projection.admissions.map(a=>[a.id,a]));
const materialized=units.map(u=>{const a=byId.get(u.id);return a?.passiveAbilities!==undefined?{...u,passiveAbilities:a.passiveAbilities}:u;});
const validate=await loadUnitValidator();assert.deepEqual(validate(materialized,read('src/data/factions.json').map(f=>f.id)),[]);
for(const [p,v]of Object.entries({'tools/wh3-importer/unit-passives/admission.json':review,'src/data/unitPassiveAdmissions.json':projection})){
  if(mode==='--write')fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');else assert.deepEqual(read(p),v,`Passive admission/projection drift: ${p}`);
}
console.log(JSON.stringify(review.summary,null,2));console.log(`Unit passives ${mode} PASS`);
