import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {prepareEvidenceView} from './evidence-view.mjs';
import {reviewUnitEntities,serialize} from '../tools/wh3-importer/unit-entities/review.mjs';
import {loadUnitValidator} from '../tools/wh3-importer/normalization/validation.mjs';

const mode=process.argv[2]??'--check';assert(['--write','--check'].includes(mode));
// This policy deliberately pins the original 101-unit catalog. Replay it in
// its existing isolated evidence view, never weaken its cohort/hash guards.
const cwd=prepareEvidenceView();
const replay=spawnSync(process.execPath,['tools/wh3-importer/hp-policy/static-derived.mjs','--check'],{cwd,encoding:'utf8'});
assert.equal(replay.status,0,replay.stderr||replay.stdout);
const {review,projection}=reviewUnitEntities();
const units=JSON.parse(fs.readFileSync('src/data/units.json'));
const byId=new Map(projection.admissions.map(a=>[a.id,a]));
const materialized=units.map(u=>{const a=byId.get(u.id);return a?{...u,entities:{...u.entities,count:a.count}}:u;});
const validate=await loadUnitValidator();assert.deepEqual(validate(materialized,JSON.parse(fs.readFileSync('src/data/factions.json')).map(f=>f.id)),[]);
for(const [p,v]of Object.entries({'tools/wh3-importer/unit-entities/admission.json':review,'src/data/unitEntityAdmissions.json':projection})){
  if(mode==='--write')fs.writeFileSync(p,serialize(v));else assert.deepEqual(JSON.parse(fs.readFileSync(p)),v,'Entity admission/projection drift: '+p);
}
console.log(JSON.stringify(review.summary,null,2));console.log(`Unit entity count + HP ${mode} PASS`);
