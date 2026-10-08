import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildRules} from '../tools/wh3-importer/unit-entities/rules.mjs';
import {serialize} from '../tools/wh3-importer/unit-entities/review.mjs';
import {loadUnitValidator} from '../tools/wh3-importer/normalization/validation.mjs';
import {renderRulesReport} from '../tools/wh3-importer/unit-entities/rules-report.mjs';
const mode=process.argv[2]??'--check';assert(['--write','--check'].includes(mode));
const {report,projection}=buildRules();
const units=JSON.parse(fs.readFileSync('src/data/units.json'));
const byId=new Map(projection.admissions.map(a=>[a.id,a]));
const materialized=units.map(u=>{
  const a=byId.get(u.id);if(!a)return u;
  assert.equal(u.gameVersion,projection.gameVersion);
  assert.equal(u.entities.count??null,a.originalCount);assert.equal(u.entities.totalHealth??null,a.originalTotalHealth);
  return {...u,entities:{...u.entities,...(a.count!==null?{count:a.count}:{}),...(a.totalHealth!==null?{totalHealth:a.totalHealth}:{})}};
});
const validate=await loadUnitValidator();assert.deepEqual(validate(materialized,JSON.parse(fs.readFileSync('src/data/factions.json')).map(f=>f.id)),[]);
for(const [p,v]of Object.entries({'tools/wh3-importer/unit-entities/rules-report.json':report,'src/data/unitHpEntityRuleAdmissions.json':projection})){
  if(mode==='--write')fs.writeFileSync(p,serialize(v));else assert.deepEqual(JSON.parse(fs.readFileSync(p)),v,'Empirical rule drift: '+p);
}
const doc='tools/wh3-importer/unit-entities/RULES.md',markdown=renderRulesReport(report);
if(mode==='--write')fs.writeFileSync(doc,markdown);else assert.equal(fs.readFileSync(doc,'utf8').replace(/\r\n/g,'\n'),markdown,'Rule report drift');
console.log(JSON.stringify(report.summary,null,2));console.log(`HP/entity category rules ${mode} PASS`);
