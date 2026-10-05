import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runAudit} from '../tools/wh3-importer/skill-self-scope-audit/replay.mjs';
import {sha256} from '../tools/wh3-importer/research-classifier/classify.mjs';
const dir=new URL('../tools/wh3-importer/skill-self-scope-audit/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',dir))),replayed=runAudit(manifest);
if(process.argv.includes('--write')){
 for(const [name,bytes] of Object.entries(replayed.outputs))fs.writeFileSync(new URL(name+'.json',dir),bytes);
 manifest.outputSha256=Object.fromEntries(Object.entries(replayed.outputs).map(([name,bytes])=>[name,sha256(bytes)]));
 fs.writeFileSync(new URL('manifest.json',dir),JSON.stringify(manifest,null,2)+'\n');
}else for(const [name,bytes] of Object.entries(replayed.outputs)){assert.equal(sha256(bytes),manifest.outputSha256[name],`${name} hash drift`);assert.equal(fs.readFileSync(new URL(name+'.json',dir),'utf8'),bytes,`${name} replay drift`);}
if(process.argv.includes('--check-raw'))assert.equal(sha256(fs.readFileSync(new URL('generated/wh3/skill-self-scope-audit/identity-raw.json',new URL('../',import.meta.url)))),manifest.identityRawSha256);
const {skillKeys,effectKeys,junctionRowIds,...combatCounts}=replayed.result.coverage.characterCombat;
console.log(JSON.stringify({verdict:replayed.result.architecture.recommendation,self:replayed.result.coverage.self.junctions,taxonomy:replayed.result.coverage.taxonomy,combat:combatCounts,tiers:replayed.result.coverage.tiers.map(t=>({name:t.name,skills:t.skills,effects:t.effects,junctions:t.junctions})),identity:replayed.result.identity.counts,next:replayed.result['next-blockers'].recommendedCodeOnlyNext,preservedFiles:515,newAdmission:0}));
