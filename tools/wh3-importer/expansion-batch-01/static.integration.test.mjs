import { test,after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveOptions,openRawSource } from '../extract.mjs';
import { discoverSample } from '../pilot-discovery.mjs';
import { attemptSample } from '../pilot.mjs';
import { loadUnitValidator } from '../normalization/validation.mjs';
import { normalizeUnit } from '../normalization/normalizer.mjs';
import { restoreTrace } from '../promotion/partial-review.mjs';
import { expansionCatalog } from './catalog.mjs';
import { portable } from './projection.mjs';
import { decodeSource } from './compact.mjs';
import { isReviewedSource } from '../reviewed-snapshots.mjs';

const enabled=process.env.WH3_RUN_INTEGRATION==='1',options={skip:enabled?false:'Set WH3_RUN_INTEGRATION=1 with local static pack config.'};
let source;
let opening;
async function actualSource(){
  return opening??= (async()=>{
    source=await openRawSource(await resolveOptions([]));
    const loc=source.local.files.filter(f=>f.path==='text/db/unit_attributes__.loc');
    if(loc.length===1)source.supplementalLocalisations.push(await source.reader.decode(source.local,loc[0].path));
    return source;
  })();
}
const bundle=decodeSource(JSON.parse(await readFile(new URL('./sources.json',import.meta.url),'utf8')));
after(async()=>{await source?.client.close();});
test('actual static packs match pinned game/schema/pack snapshot without game execution',options,async()=>{
  const s=await actualSource();assert(isReviewedSource(s.metadata,''));
  assert.deepEqual(s.metadata.packs.map(p=>[p.file_name,p.sha256]),bundle.provenance.packs.map(p=>[p.file_name,p.sha256]));
});
test('all 24 live exact-name discoveries reproduce zero/multiple roots, permissions and structural preflight',options,async()=>{
  const s=await actualSource();
  for(const sample of expansionCatalog){
    const actual=await discoverSample(s,sample),saved=bundle.preflight.find(e=>e.sample.slug===sample.slug);
    assert.deepEqual(s.localisation.rows.filter(r=>r.text===sample.displayName),saved.localisationMatches);
    assert.deepEqual(actual.candidates.map(c=>[c.mainKey,c.landKey,c.permissionGroups]),saved.roots.map(c=>[c.mainKey,c.landKey,c.permissionGroups]));
    for(const [i,c] of actual.candidates.entries()){
      const root=saved.roots[i];assert.equal(c.main.is_renown,root.rawVariant.isRenown);
      assert.deepEqual([c.land.mount,c.land.engine,c.land.articulated_record,c.land.primary_missile_weapon],
        [root.structure.mount,root.structure.engine,root.structure.articulated,root.missile.primary]);
    }
  }
});
test('14 live schema traces and conservative normalizations equal committed bounded source fields/unknowns/omissions',options,async()=>{
  const s=await actualSource(),validate=await loadUnitValidator();
  for(const candidate of bundle.candidates){
    const sample=expansionCatalog.find(c=>c.slug===candidate.slug);
    const actual=await attemptSample(s,{...sample,reason:'Static regression',expectedCoverage:[]},validate);
    assert.equal(actual.status,candidate.status);assert.deepEqual(actual.validation,[]);
    assert.deepEqual(portable(actual.dump.rows),candidate.dump.rows,candidate.name);
    assert.deepEqual(portable(actual.missileExtras.rows),candidate.missileExtras.rows);
    const permissionTrace=restoreTrace(bundle,bundle.preflight.find(e=>e.sample.slug===candidate.slug).permissionTrace);
    const saved=portable(normalizeUnit(restoreTrace(bundle,candidate.dump),{...candidate.affiliation,permissionTrace}));
    const live=portable(actual.normalized);
    for(const group of ['unit','unmapped','omitted'])assert.deepEqual(live[group],saved[group],`${candidate.name}: ${group}`);
    assert.deepEqual(live.provenance.fields,saved.provenance.fields);
  }
});
