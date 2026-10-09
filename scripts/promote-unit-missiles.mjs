import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildMissileRules,serialize,projectMissile} from '../tools/wh3-importer/missile-rules/rules.mjs';
import {renderReport,renderAudit} from '../tools/wh3-importer/missile-rules/report.mjs';
import {loadUnitValidator} from '../tools/wh3-importer/normalization/validation.mjs';
const mode=process.argv[2]??'--check';assert(['--write','--check'].includes(mode));
const {report,projection}=buildMissileRules(),byId=new Map(projection.admissions.map(a=>[a.id,a]));
const units=JSON.parse(fs.readFileSync('src/data/units.json')).map(u=>{
  const a=byId.get(u.id);if(!a)return u;
  assert.equal(u.gameVersion,projection.gameVersion);assert.deepEqual(u.missile??null,a.originalMissile);
  return projectMissile(u,a.values);
});
const validate=await loadUnitValidator();assert.deepEqual(validate(units,JSON.parse(fs.readFileSync('src/data/factions.json')).map(f=>f.id)),[]);
for(const [p,v] of Object.entries({'tools/wh3-importer/missile-rules/report.json':report,'src/data/unitMissileAdmissions.json':projection})) {
  if(mode==='--write')fs.writeFileSync(p,serialize(v));else assert.deepEqual(JSON.parse(fs.readFileSync(p)),v,'Missile replay drift: '+p);
}
for(const [p,v] of Object.entries({'tools/wh3-importer/missile-rules/RULES.md':renderReport(report),'tools/wh3-importer/missile-rules/AUDIT.md':renderAudit(report)})) {
  if(mode==='--write')fs.writeFileSync(p,v);else assert.equal(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),v);
}
console.log(JSON.stringify(report.summary));console.log('Basic missile promotion '+mode+' PASS');
