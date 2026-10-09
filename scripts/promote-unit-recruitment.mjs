import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildRecruitment,serialize,projectRecruitment} from '../tools/wh3-importer/recruitment/rules.mjs';
import {renderReport,renderAudit} from '../tools/wh3-importer/recruitment/report.mjs';
import {loadUnitValidator} from '../tools/wh3-importer/normalization/validation.mjs';
const mode=process.argv[2]??'--check';assert(['--write','--check'].includes(mode));
const {report,projection}=buildRecruitment(),byId=new Map(projection.admissions.map(a=>[a.id,a]));
const units=JSON.parse(fs.readFileSync('src/data/units.json')).map(u=>{const a=byId.get(u.id);if(!a)return u;assert.deepEqual(u.campaign??null,a.originalCampaign);return projectRecruitment(u,a);});
const validate=await loadUnitValidator();assert.deepEqual(validate(units,JSON.parse(fs.readFileSync('src/data/factions.json')).map(f=>f.id)),[]);
for(const [p,v] of Object.entries({'tools/wh3-importer/recruitment/report.json':report,'src/data/unitRecruitmentAdmissions.json':projection})){
  if(mode==='--write')fs.writeFileSync(p,serialize(v));else assert.deepEqual(JSON.parse(fs.readFileSync(p)),v,'Recruitment replay drift: '+p);
}
for(const [p,v] of Object.entries({'tools/wh3-importer/recruitment/RULES.md':renderReport(report),'tools/wh3-importer/recruitment/AUDIT.md':renderAudit(report)})){
  if(mode==='--write')fs.writeFileSync(p,v);else assert.equal(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),v);
}
console.log(JSON.stringify(report.summary));console.log('Recruitment promotion '+mode+' PASS');
