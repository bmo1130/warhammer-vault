import {readFileSync as read,writeFileSync as write} from 'node:fs';
import assert from 'node:assert/strict';
import {admitResearch,serialize} from '../tools/wh3-importer/research-admission-batch-01/admit.mjs';
const root=new URL('../',import.meta.url),file=p=>new URL(p,root),dir='tools/wh3-importer/research-admission-batch-01/';
const json=p=>JSON.parse(read(file(p))),scan='tools/wh3-importer/research-scan-bretonnia/';
export function replayAdmission() {
  return admitResearch({sourceBytes:read(file(scan+'source.json')),unitsBytes:read(file('src/data/units.json')),
    scanManifest:json(scan+'manifest.json'),policyBytes:read(file('tools/wh3-importer/research-classifier/policy.mjs')),
    classifierBytes:read(file('tools/wh3-importer/research-classifier/classify.mjs')),reportBytes:read(file(scan+'report.json')),
    reviewed:json(dir+'reviewed-input.json'),manifest:json(dir+'manifest.json'),legacyBytes:read(file(dir+'legacy-projection.json'))});
}
const result=replayAdmission();
for(const [path,value] of [[dir+'admission.json',result.admission],[dir+'summary.json',result.summary],['src/data/caResearchEffect.json',result.projection]]) {
  if(process.argv.includes('--write'))write(file(path),serialize(value));
  else assert.equal(read(file(path),'utf8'),serialize(value),`Admission replay drift: ${path}`);
}
console.log('Reviewed Research admission PASS:',JSON.stringify(result.summary));
