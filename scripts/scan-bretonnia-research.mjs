import { readFileSync,writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { scanResearch } from '../tools/wh3-importer/research-scan-bretonnia/scan.mjs';
import { sha256 } from '../tools/wh3-importer/research-classifier/classify.mjs';
const root=new URL('../',import.meta.url),file=p=>new URL(p,root),folder='tools/wh3-importer/research-scan-bretonnia/';
const manifest=JSON.parse(readFileSync(file(folder+'manifest.json')));
const result=scanResearch(readFileSync(file(folder+'source.json')),readFileSync(file('src/data/units.json')),manifest,
  readFileSync(file('tools/wh3-importer/research-classifier/policy.mjs')),readFileSync(file('tools/wh3-importer/research-classifier/classify.mjs')));
const outputs={'report.json':result.report,'summary.json':result.summary,'rejections.json':result.rejections,'representatives.json':result.representatives};
for(const [name,value] of Object.entries(outputs)) {
  const bytes=JSON.stringify(value,null,2)+'\n';
  if(process.argv.includes('--write')) {writeFileSync(file(folder+name),bytes);manifest.outputs={...manifest.outputs,[name]:sha256(bytes)};}
  else {assert.equal(readFileSync(file(folder+name),'utf8'),bytes,`Replay drift: ${name}`);assert.equal(sha256(bytes),manifest.outputs[name]);}
}
if(process.argv.includes('--write')) writeFileSync(file(folder+'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Full Research scan replay PASS:',JSON.stringify(result.summary));
