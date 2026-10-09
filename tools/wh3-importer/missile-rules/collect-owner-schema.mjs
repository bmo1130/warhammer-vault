import fs from 'node:fs';
import assert from 'node:assert/strict';
import {resolveOptions,openRawSource} from '../extract.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
import {loadSource} from './source.mjs';
// Processed metadata only; no entity/mount/articulation table rows saved.
const source=await openRawSource(await resolveOptions([]));
try {
  const snapshotId=digest(snapshotIdentity(source.metadata));assert.equal(snapshotId,loadSource().snapshotId);
  const tables=[];
  for(const name of ['mounts_tables','battle_entities_tables','land_unit_articulated_vehicles_tables'])for(const t of await source.reader.tables(name))
    tables.push({table:t.table,path:t.path,version:t.tableVersion,fields:t.fields});
  fs.writeFileSync('tools/wh3-importer/missile-rules/owner-schema.source.json',JSON.stringify({format:'ca-missile-nonweapon-owner-schema-v1',snapshotId,provenance:source.metadata,tables},null,2)+'\n');
} finally {await source.client.close();}
