import fs from 'node:fs';
import assert from 'node:assert/strict';
import {resolveOptions,openRawSource} from '../extract.mjs';
import {traceUnitByMainKey} from '../trace-unit.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
import {loadSource,encodeSource} from '../missile-rules/source.mjs';
const folder='tools/wh3-importer/missile-damage/',catalog=loadSource();
const source=await openRawSource(await resolveOptions([]));
try {
  assert.equal(digest(snapshotIdentity(source.metadata)),catalog.snapshotId);
  const captures=[];
  for(const mainKey of JSON.parse(fs.readFileSync(folder+'representatives.json'))) {
    const seed=catalog.seeds.find(s=>s.mainKey===mainKey);assert(seed);
    const dump=await traceUnitByMainKey(source.reader,source.schema,source.localisation,source.metadata,
      {mainKey,landKey:seed.landKey,localisationKey:'land_units_onscreen_name_'+seed.landKey},['missile']);
    captures.push({id:seed.id,dump});console.log(mainKey,dump.rows.length,'independent trace rows');
  }
  fs.writeFileSync(folder+'validation.source.json',JSON.stringify(encodeSource({format:'ca-missile-damage-independent-traces-v1',gameExecuted:false,provenance:source.metadata,captures}))+'\n');
} finally {await source.client.close();}
