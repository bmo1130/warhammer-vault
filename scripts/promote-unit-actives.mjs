import fs from 'node:fs';
import assert from 'node:assert/strict';
import {decodeSource} from '../tools/wh3-importer/expansion-batch-01/compact.mjs';
import {rosterSourceHash} from '../tools/wh3-importer/production-growth/roster.mjs';
import {evidenceHash} from '../tools/wh3-importer/promotion/first-batch.mjs';
import {reviewActives,compareIndependent,verifyRepresentatives} from '../tools/wh3-importer/unit-actives/rules.mjs';
import {loadUnitValidator} from '../tools/wh3-importer/normalization/validation.mjs';
import {reports} from '../tools/wh3-importer/unit-actives/report.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),folder='tools/wh3-importer/unit-actives/',mode=process.argv[2]??'--check';
assert(['--write','--check'].includes(mode));
const manifest=read(folder+'manifest.json');
assert.equal(evidenceHash(read(folder+'ownership-schema.json')),manifest.ownershipSchemaHash,'Ownership/variant schema inventory drift');
for(const input of manifest.inputs)assert.equal(evidenceHash(read(input.file)),input.hash,`Other slice drift: ${input.file}`);
const units=read('src/data/units.json'),roster=decodeSource(read('tools/wh3-importer/faction-rosters/source.json'),rosterSourceHash);
const {review,projection}=reviewActives(read(folder+'source.json'),read('tools/wh3-importer/unit-attributes/source.json'),read('tools/wh3-importer/unit-passives/source.json'),roster,units,read('src/data/unitAttributeAdmissions.json'),read('src/data/unitPassiveAdmissions.json'));
review.independentComparisons=compareIndependent(roster,review);
const validation=read(folder+'validation.source.json');assert.equal(evidenceHash(validation),manifest.validationHash,'Independent representative source drift');
review.representatives=verifyRepresentatives(validation,read(folder+'source.json'),read('tools/wh3-importer/unit-attributes/source.json'),read('tools/wh3-importer/unit-passives/source.json'),roster,review,projection);
const byId=new Map(projection.admissions.map(a=>[a.id,a]));
const materialized=units.map(u=>{const a=byId.get(u.id);return a?.abilities!==undefined?{...u,abilities:a.abilities,boundAbilities:a.boundAbilities}:u;});
const validate=await loadUnitValidator();assert.deepEqual(validate(materialized,read('src/data/factions.json').map(f=>f.id)),[]);
for(const [p,v]of Object.entries({[folder+'admission.json']:review,'src/data/unitActiveAdmissions.json':projection})){
  if(mode==='--write')fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');else assert.deepEqual(read(p),v,`Active admission/projection drift: ${p}`);
}
for(const [file,text]of Object.entries(reports(review,read(folder+'source.json'),projection,manifest))){if(mode==='--write')fs.writeFileSync(folder+file,text);else assert.equal(fs.readFileSync(folder+file,'utf8').replace(/\r\n/g,'\n'),text,'Active report drift: '+file);}
console.log(JSON.stringify(review.summary,null,2));console.log(`Unit actives ${mode} PASS; independent inventories ${review.independentComparisons.length}`);
