import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildResistanceRules,serialize} from '../tools/wh3-importer/resistance-rules/rules.mjs';
import {renderReport,renderAudit} from '../tools/wh3-importer/resistance-rules/report.mjs';
import {loadUnitValidator} from '../tools/wh3-importer/normalization/validation.mjs';
const mode=process.argv[2]??'--check';assert(['--write','--check'].includes(mode));
const {report,projection}=buildResistanceRules(),byId=new Map(projection.admissions.map(a=>[a.id,a]));
const units=JSON.parse(fs.readFileSync('src/data/units.json')).map(u=>{
  const a=byId.get(u.id);if(!a)return u;
  assert.equal(u.gameVersion,projection.gameVersion);assert.deepEqual(u.defense.resistances??null,a.originalResistances);
  return {...u,defense:{...u.defense,resistances:{...u.defense.resistances,...a.values}}};
});
const validate=await loadUnitValidator();assert.deepEqual(validate(units,JSON.parse(fs.readFileSync('src/data/factions.json')).map(f=>f.id)),[]);
for(const [p,v] of Object.entries({'tools/wh3-importer/resistance-rules/report.json':report,'src/data/unitResistanceAdmissions.json':projection})) {
  if(mode==='--write')fs.writeFileSync(p,serialize(v));else assert.deepEqual(JSON.parse(fs.readFileSync(p)),v,'Resistance replay drift: '+p);
}
for(const [p,doc] of Object.entries({'tools/wh3-importer/resistance-rules/RULES.md':renderReport(report),'tools/wh3-importer/resistance-rules/AUDIT.md':renderAudit(report)})) {
  if(mode==='--write')fs.writeFileSync(p,doc);else assert.equal(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),doc);
}
console.log(JSON.stringify(report.summary));console.log('Base resistance promotion '+mode+' PASS');
