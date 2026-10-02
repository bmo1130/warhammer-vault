import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {openRawSource,resolveOptions} from '../extract.mjs';
import {discoverSample} from '../pilot-discovery.mjs';
import {attemptSample} from '../pilot.mjs';
import {loadUnitValidator} from '../normalization/validation.mjs';
import {normalizeUnit} from '../normalization/normalizer.mjs';
import {inspectMissileSources} from '../missile-semantics/collect.mjs';
import {missileSourceContract} from '../missile-semantics/contract.mjs';
import {restoreTrace} from '../promotion/partial-review.mjs';
import {isReviewedSource} from '../reviewed-snapshots.mjs';
import {decodeSource} from '../expansion-batch-01/compact.mjs';
import {portable} from '../expansion-batch-01/projection.mjs';
import {growthAdmissions,growthPolicy,replayGrowthReview} from './batch.mjs';
const options={skip:process.env.WH3_RUN_INTEGRATION==='1'?false:'Set WH3_RUN_INTEGRATION=1 with local static pack config.'};
const bundles=await Promise.all(Object.keys(growthAdmissions).map(async name=>{
  const compact=JSON.parse(await readFile(new URL(`../${name}/sources.json`,import.meta.url),'utf8'));
  return {name,compact,source:decodeSource(compact,growthAdmissions[name].sourceHash)};
}));
let source,opening;
const actualSource=()=>opening??=(async()=>{
  source=await openRawSource(await resolveOptions([]));
  const loc=source.local.files.filter(f=>f.path==='text/db/unit_attributes__.loc');
  if(loc.length===1)source.supplementalLocalisations.push(await source.reader.decode(source.local,loc[0].path));
  return source;
})();
after(async()=>{await source?.client.close();});
test('growth live static snapshot equals all three committed compact batch snapshots',options,async()=>{
  const s=await actualSource();assert(isReviewedSource(s.metadata,''));
  for(const b of bundles)assert.deepEqual(s.metadata.packs.map(p=>[p.file_name,p.sha256]),b.source.provenance.packs.map(p=>[p.file_name,p.sha256]));
});
test('all 72 live exact-name discoveries reproduce roots, permissions and source structure without game execution',options,async()=>{
  const s=await actualSource();
  for(const b of bundles)for(const sample of growthPolicy(b.name).catalog) {
    const live=await discoverSample(s,sample),saved=b.source.preflight.find(e=>e.sample.slug===sample.slug);
    assert.deepEqual(s.localisation.rows.filter(l=>l.text===sample.displayName),saved.localisationMatches);
    assert.deepEqual(live.candidates.map(c=>[c.mainKey,c.landKey,c.permissionGroups]),saved.roots.map(c=>[c.mainKey,c.landKey,c.permissionGroups]));
    assert.deepEqual(portable(live.evidence.rows),saved.permissionTrace.rows,sample.displayName);
    for(const [i,c]of live.candidates.entries())assert.deepEqual([c.land.mount,c.land.engine,c.land.articulated_record,c.land.primary_missile_weapon],
      [saved.roots[i].structure.mount,saved.roots[i].structure.engine,saved.roots[i].structure.articulated,saved.roots[i].missile.primary]);
  }
});
test('all 72 live traces and missile graphs replay exact static fields, unknowns, omissions and production review decisions',options,async()=>{
  const s=await actualSource(),validate=await loadUnitValidator();
  for(const b of bundles) {
    const {reviews}=replayGrowthReview(b.name,b.compact);assert.equal(reviews.length,24);
    for(const candidate of b.source.candidates) {
      const sample=growthPolicy(b.name).catalog.find(c=>c.slug===candidate.slug);
      const actual=await attemptSample(s,{slug:sample.slug,displayName:sample.displayName,reason:'Static growth regression',expectedCoverage:[]},validate);
      assert.equal(actual.status,candidate.status);assert.deepEqual(actual.validation,[]);
      assert.deepEqual(portable(actual.dump.rows),candidate.dump.rows,candidate.name);
      assert.deepEqual(portable(actual.missileExtras.rows),candidate.missileExtras.rows);
      const liveInspection=await inspectMissileSources(s,actual.dump),evidence=restoreTrace(b.source,candidate.missileInspection);
      assert.deepEqual(portable(liveInspection.evidence.rows),evidence.rows,candidate.name+': missile graph');
      const savedInspection={evidence,contract:missileSourceContract(evidence,{mainKey:candidate.identity.caMainUnitKey,landKey:candidate.identity.caLandUnitKey})};
      const dump=restoreTrace(b.source,candidate.dump),permissionTrace=restoreTrace(b.source,b.source.preflight.find(e=>e.sample.slug===candidate.slug).permissionTrace);
      const saved=portable(normalizeUnit(dump,{...candidate.affiliation,permissionTrace,missileInspection:savedInspection}));
      const live=portable(normalizeUnit(actual.dump,{...actual.affiliation,permissionTrace:actual.discovery.evidence,missileInspection:liveInspection}));
      for(const group of ['unit','unmapped','omitted'])assert.deepEqual(live[group],saved[group],candidate.name+': '+group);
      assert.deepEqual(live.provenance.fields,saved.provenance.fields);
    }
  }
});
