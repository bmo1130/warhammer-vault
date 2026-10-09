import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildDamageRules,serialize} from '../tools/wh3-importer/missile-damage/rules.mjs';
import {renderRules,renderAudit} from '../tools/wh3-importer/missile-damage/report.mjs';
import {projectMissile} from '../tools/wh3-importer/missile-rules/rules.mjs';
import {loadUnitValidator} from '../tools/wh3-importer/normalization/validation.mjs';
const mode=process.argv[2]??'--check';assert(['--write','--check'].includes(mode));
const {report,projection}=buildDamageRules();
const first=JSON.parse(fs.readFileSync('src/data/unitMissileAdmissions.json'));
const firstById=new Map(first.admissions.map(a=>[a.id,a])),byId=new Map(projection.admissions.map(a=>[a.id,a]));
const units=JSON.parse(fs.readFileSync('src/data/units.json')).map(u=>projectMissile(u,byId.get(u.id)?.values??firstById.get(u.id)?.values??{}));
const validate=await loadUnitValidator();assert.deepEqual(validate(units,JSON.parse(fs.readFileSync('src/data/factions.json')).map(f=>f.id)),[]);
for(const [file,value] of Object.entries({'tools/wh3-importer/missile-damage/report.json':serialize(report),'src/data/unitMissileDamageAdmissions.json':serialize(projection),
  'tools/wh3-importer/missile-damage/RULES.md':renderRules(report),'tools/wh3-importer/missile-damage/AUDIT.md':renderAudit(report)})) {
  if(mode==='--write')fs.writeFileSync(file,value);else assert.equal(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),value,'Damage replay drift: '+file);
}
console.log(JSON.stringify(report.summary));console.log('Direct missile damage '+mode+' PASS');
