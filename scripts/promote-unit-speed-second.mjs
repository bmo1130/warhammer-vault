import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildSecond,serialize,folder} from '../tools/wh3-importer/speed-second/rules.mjs';
import {renderRules,renderAudit,renderValidation,renderBrowserEvidence} from '../tools/wh3-importer/speed-second/report.mjs';
const mode=process.argv[2]??'--check';assert(['--write','--check'].includes(mode));
const {report,projection}=buildSecond();
for(const [file,value]of [[folder+'report.json',serialize(report)],['src/data/unitSpeedSecondAdmissions.json',serialize(projection)],
  [folder+'RULES.md',renderRules(report)],[folder+'AUDIT.md',renderAudit(report)],[folder+'VALIDATION.md',renderValidation(report)+renderBrowserEvidence(report)]]){
  if(mode==='--write')fs.writeFileSync(file,value);else assert.equal(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),value,'Speed second replay drift '+file);
}
console.log(JSON.stringify(report.summary));console.log('Speed second '+mode+' PASS');
