import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {originalBaseline,buildProbe,REVISION} from './probe.mjs';
const root=new URL('../../../',import.meta.url),dir=new URL('./',import.meta.url);
const json=p=>JSON.parse(readFileSync(new URL(p,dir))),sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=json('manifest.json'),source=json('source.json');
for(const [p,h] of Object.entries(manifest.files))assert.equal(sha(readFileSync(new URL(p,root))),h,`Preserved file changed: ${p}`);
for(const [p,h] of Object.entries(manifest.evidenceFiles))assert.equal(sha(readFileSync(new URL(p,dir))),h,`Evidence changed: ${p}`);
const f=originalBaseline();assert.equal(f.status,'UNAVAILABLE');assert.deepEqual(f.owner,source.owner);assert.deepEqual(f.force,source.force);
for(const u of f.units.rows){
 const data=source.units.find(d=>d.mainKey.value===u.MainKey.value);assert(data);assert.equal(u.statItems.rows.length,7);assert.equal(u.statScan.size.value,7);
 assert.deepEqual(data.rows,u.statItems.rows.map(r=>({index:r.index,access:r.access,luaType:r.luaType,key:r.viaDetails.Key,value:r.viaDetails.Value,keyQuery:r.keyQuery,valueQuery:r.valueQuery})));
 for(const r of u.statItems.rows){assert.equal(r.access.status,'NULL');assert.equal(r.luaType,'nil');assert.equal(r.viaDetails.Key.status,'VALUE');assert.equal(r.viaDetails.Value.status,'VALUE');}
}
assert.equal(source.multiRankSemantics,'UNKNOWN');assert.equal(source.canonicalNewCapture,'NOT_OBSERVED');assert(buildProbe().includes(REVISION));
console.log(JSON.stringify({status:'PASS',preservedFiles:Object.keys(manifest.files).length,observedParentValues:14,originalLine:source.input.reference.line,canonicalNewCapture:'NOT_OBSERVED',semantics:'UNKNOWN',newAdmission:0},null,2));
