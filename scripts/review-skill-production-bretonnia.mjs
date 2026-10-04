import fs from 'node:fs';
import assert from 'node:assert/strict';
import {replay} from '../tools/wh3-importer/skill-production-bretonnia/replay.mjs';
import {verifyProtected} from '../tools/wh3-importer/skill-production-bretonnia/protected.mjs';
import {projectExtraction,encodeSource,serializeSource} from '../tools/wh3-importer/skill-production-bretonnia/source.mjs';
import {sha256} from '../tools/wh3-importer/research-classifier/classify.mjs';
const root=new URL('../',import.meta.url),dir='tools/wh3-importer/skill-production-bretonnia/',read=p=>fs.readFileSync(new URL(p,root));
const manifest=JSON.parse(read(dir+'manifest.json'));verifyProtected(manifest,read);
const result=replay(read(dir+'source.json'),read('src/data/units.json'),read(dir+'selection.json'),read(dir+'review.json'),['caSkillEffect','caSkillBatch01','caSkillBatch02'].map(p=>JSON.parse(read(`src/data/${p}.json`))),manifest);
for(const [name,bytes] of Object.entries(result.outputs)){assert.equal(sha256(bytes),manifest.outputSha256[name],`${name} hash drift`);assert.equal(read(dir+name+'.json').toString(),bytes,`${name} replay drift`);}
if(process.argv.includes('--check-raw')){const raw=read(result.source.originalExtraction.path);assert.equal(sha256(raw),manifest.originalExtractionSha256);assert.equal(serializeSource(encodeSource(projectExtraction(raw))),read(dir+'source.json').toString());}
console.log(JSON.stringify({verdict:result.report.finalVerdict,discoveredSkills:result.report.totalSkills,ranks:result.report.totalSkillRanks,effectJunctions:result.report.totalEffectJunctions,direct:result.report.directEffectCandidates,admission:result.report.admission,overlap:result.admission.overlapVerdict,preservedFiles:Object.keys(manifest.preservedFiles).length,nextBlocker:result.report.nextBlocker}));
