import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {parseLogs} from '../skill-rank-runtime-resolution/resolve.mjs';
import {SKILLS} from '../skill-rank-runtime-resolution/experiment.mjs';
import {buildProbe,REVISION} from './probe.mjs';
export function replay() {
 const root=new URL('../../../',import.meta.url),dir=new URL('./',import.meta.url);
 const json=p=>JSON.parse(readFileSync(new URL(p,dir),'utf8'));
 const sha=b=>createHash('sha256').update(b).digest('hex');
 const manifest=json('manifest.json');
 assert.equal(manifest.baseline,'6dd11ee45d0a6aa35681cbe81a511b2066761590');
 for(const [file,hash] of Object.entries(manifest.files)) assert.equal(sha(readFileSync(new URL(file,root))),hash,`Historical file changed: ${file}`);
 for(const [file,hash] of Object.entries(manifest.evidenceFiles)) assert.equal(sha(readFileSync(new URL(file,dir))),hash,`Evidence changed: ${file}`);
 const audit=json('failure-analysis.json'),parsed=parseLogs([{name:audit.relatedLog.name,text:readFileSync(new URL(audit.relatedLog.excerpts,dir),'utf8')}]);
 assert.equal(parsed.problems.length,0);assert.equal(parsed.frames.length,audit.captures.length);
 parsed.frames.forEach((entry,i)=>{
  const row=audit.captures[i],frame=entry.frame;
  assert.equal(entry.captureSha256,row.captureSha256);assert.deepEqual(frame.owner,row.owner);assert.deepEqual(frame.armyRoster,row.roster);
  assert.equal(frame.status,'UNAVAILABLE');assert.match(frame.error,/Stat list incomplete/);assert.equal(frame.units,undefined);
  assert.deepEqual(row.ranks,SKILLS.map(s=>({skillKey:s.key,level:frame.skills.rows.find(r=>r.Key.value===s.key).Level})));
  assert.equal(row.statObservationStatus,'NOT_OBSERVED');
 });
 assert.equal(audit.resolution.semantics,'UNKNOWN');assert.equal(audit.resolution.productionEligible,false);assert.equal(audit.resolution.correctedProbeRuntime,'NOT_OBSERVED');
 assert(buildProbe().includes(REVISION));
 return {status:'PASS',preservedFiles:Object.keys(manifest.files).length,relatedUnavailableCaptures:parsed.frames.length,statObservations:0,semantics:'UNKNOWN',newAdmission:0,liveCorrectedProbe:'NOT_OBSERVED'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) console.log(JSON.stringify(replay(),null,2));
