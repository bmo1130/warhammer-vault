import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildSpeedRules,serialize} from '../tools/wh3-importer/speed-rules/rules.mjs';
import {renderReport,renderAudit} from '../tools/wh3-importer/speed-rules/report.mjs';
import {loadUnitValidator} from '../tools/wh3-importer/normalization/validation.mjs';
const mode=process.argv[2]??'--check';assert(['--write','--check'].includes(mode));
const {report,projection}=buildSpeedRules(),byId=new Map(projection.admissions.map(a=>[a.id,a]));
const units=JSON.parse(fs.readFileSync('src/data/units.json')).map(u=>{
  const a=byId.get(u.id);if(!a)return u;
  assert.equal(u.gameVersion,projection.gameVersion);assert.equal(u.movement.speed??null,a.originalSpeed);
  return {...u,movement:{...u.movement,speed:a.value}};
});
const validate=await loadUnitValidator();assert.deepEqual(validate(units,JSON.parse(fs.readFileSync('src/data/factions.json')).map(f=>f.id)),[]);
for(const [p,v] of Object.entries({'tools/wh3-importer/speed-rules/report.json':report,'src/data/unitSpeedRuleAdmissions.json':projection})) {
  if(mode==='--write')fs.writeFileSync(p,serialize(v));else assert.deepEqual(JSON.parse(fs.readFileSync(p)),v,'Speed rule replay drift: '+p);
}
for(const [doc,markdown] of Object.entries({'tools/wh3-importer/speed-rules/RULES.md':renderReport(report),'tools/wh3-importer/speed-rules/AUDIT.md':renderAudit(report)})) {
  if(mode==='--write')fs.writeFileSync(doc,markdown);else assert.equal(fs.readFileSync(doc,'utf8').replace(/\r\n/g,'\n'),markdown);
}
console.log(JSON.stringify(report.summary));console.log('Base card Speed rules '+mode+' PASS');
