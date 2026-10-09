import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildSecond,folder,serialize} from '../tools/wh3-importer/entities-second/rules.mjs';
import {renderDocuments} from '../tools/wh3-importer/entities-second/report.mjs';
const mode=process.argv[2]??'--check';assert(['--write','--check'].includes(mode));
const {report,projection}=buildSecond();
for(const [p,v]of Object.entries({[folder+'report.json']:report,'src/data/unitHpEntitySecondAdmissions.json':projection})){
  if(mode==='--write')fs.writeFileSync(p,serialize(v));else assert.deepEqual(JSON.parse(fs.readFileSync(p)),v,'Entities second replay drift '+p);
}
for(const [file,value]of Object.entries(renderDocuments(report))){
  if(mode==='--write')fs.writeFileSync(folder+file,value);else assert.equal(fs.readFileSync(folder+file,'utf8').replace(/\r\n/g,'\n'),value,'Entities second document drift '+file);
}
console.log(JSON.stringify(report.summary));console.log('HP/count second '+mode+' PASS');
