import fs from 'node:fs';
import assert from 'node:assert/strict';
import {replay,projectExtraction,serialize} from '../tools/wh3-importer/skill-class-selector-research/research.mjs';
import {sha256} from '../tools/wh3-importer/research-classifier/classify.mjs';
import {pins} from '../tools/wh3-importer/research-classifier/policy.mjs';
import {fileHash} from '../tools/wh3-importer/research-admission-batch-01/protected.mjs';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root)),dir='tools/wh3-importer/skill-class-selector-research/';
const manifest=JSON.parse(read(dir+'manifest.json')),selection=JSON.parse(read(dir+'selection.json'));
assert.equal(manifest.format,'wh3-skill-class-selector-manifest-v1');assert.equal(manifest.baselineCommit,'1b932d7cf25559238843b09f53cc378f28bfa393');assert.equal(manifest.snapshotId,pins.snapshotId);
assert.equal(sha256(read(dir+'selection.json')),manifest.selectionSha256);
for(const [path,hash] of Object.entries(manifest.preservedFiles))assert.equal(fileHash(path,read(path)),hash,`Preserved file drift: ${path}`);
const bytes=read(dir+'source.json'),result=replay(bytes,read('src/data/units.json'),selection,manifest);
for(const [name,data] of [['report',result.report],['membership',result.membership]]){
 const output=serialize(data);assert.equal(sha256(output),manifest[name+'Sha256'],`${name} output hash drift`);
 if(process.argv.includes('--write'))fs.writeFileSync(new URL(dir+name+'.json',root),output);
 else assert.equal(read(dir+name+'.json').toString(),output,`${name} replay drift`);
}
if(process.argv.includes('--check-raw')){const raw=read(JSON.parse(bytes).originalExtraction.path);assert.equal(sha256(raw),manifest.originalExtractionSha256);assert.equal(serialize(projectExtraction(raw)),bytes.toString());}
console.log(JSON.stringify({verdict:result.report.finalVerdict,...result.report.counts,selectors:result.report.selectors.map(s=>({key:s.key,main:s.mainMembers,production:s.productionUnitIds.length,omitted:s.omittedNonProduction,ambiguous:s.ambiguous.length})),newAdmissions:0,preservedFiles:Object.keys(manifest.preservedFiles).length}));
