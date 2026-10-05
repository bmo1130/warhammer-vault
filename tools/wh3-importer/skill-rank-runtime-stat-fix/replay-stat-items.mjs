import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseLogs} from '../skill-rank-runtime-resolution/resolve.mjs';
import {STAT_KEYS,SKILLS} from '../skill-rank-runtime-resolution/experiment.mjs';
import {buildProbe,DIAGNOSTIC_REVISION} from './probe.mjs';
const root=new URL('../../../',import.meta.url),dir=new URL('./',import.meta.url);
const json=p=>JSON.parse(readFileSync(new URL(p,dir))),sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=json('stat-items-manifest.json'),analysis=json('stat-items-failure.json');
for(const [p,h] of Object.entries(manifest.files))assert.equal(sha(readFileSync(new URL(p,root))),h,`Preserved file changed: ${p}`);
for(const [p,h] of Object.entries(manifest.evidenceFiles))assert.equal(sha(readFileSync(new URL(p,dir))),h,`Evidence changed: ${p}`);
const parsed=parseLogs([{name:analysis.source.path,text:readFileSync(new URL(analysis.source.excerpt,dir),'utf8')}]);
assert.equal(parsed.problems.length,0);assert.equal(parsed.frames.length,1);
const e=parsed.frames[0],f=e.frame;assert.equal(e.captureSha256,analysis.source.captureSha256);
assert.equal(f.status,'UNAVAILABLE');assert.match(f.error,/Exact stat lookup unavailable/);
assert.deepEqual(f.owner,analysis.owner);assert.deepEqual(f.force,analysis.force);assert.equal(f.force.IsPreviewingStance.value,true);
for(const skill of SKILLS){
 const row=f.skills.rows.find(s=>s.Key.value===skill.key);assert.equal(row.Level.value,0);
 const u=f.units.rows.find(u=>u.MainKey.value===skill.mainKey);assert.equal(u.detailsAccess.status,'CONTEXT');assert.equal(u.statScan.size.status,'VALUE');assert.equal(u.statScan.size.value,7);assert.equal(u.statItems,undefined);
 for(const key of STAT_KEYS){assert.equal(u.stats[key].access.status,'NULL');assert.equal(u.stats[key].Value.status,'UNSUPPORTED');}
}
assert.equal(analysis.semantics,'UNKNOWN');assert.equal(analysis.newAdmission,0);assert(buildProbe().includes(DIAGNOSTIC_REVISION));
console.log(JSON.stringify({status:'PASS',preservedFiles:Object.keys(manifest.files).length,originalCaptureLine:analysis.source.reference.line,actualItemKeys:'NOT_OBSERVED',actualItemValues:'NOT_OBSERVED',semantics:'UNKNOWN',newAdmission:0},null,2));
