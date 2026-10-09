import fs from 'node:fs';
import assert from 'node:assert/strict';
import {resolveOptions,openRawSource} from '../extract.mjs';
import {inspectTables} from '../inspect.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
import {loadSource,encodeSource} from '../missile-rules/source.mjs';

// Reuse the held exact keys. This is a supplementary selection/UI investigation,
// not another full unit scan or a replacement for the immutable first slice.
const folder='tools/wh3-importer/missile-damage/';
const previous=JSON.parse(fs.readFileSync('tools/wh3-importer/missile-rules/report.json'));
const catalog=loadSource(),held=new Set(previous.held.map(t=>t.id));
const targets=previous.catalog.filter(t=>held.has(t.id)||t.originalMissile);
const projectiles=[...new Set(targets.flatMap(t=>t.paths.flatMap(p=>p.projectiles.map(x=>x.key))))];
const weapons=[...new Set(targets.flatMap(t=>t.paths.map(p=>p.weaponKey)))];
const source=await openRawSource(await resolveOptions([]));
try {
  assert.equal(digest(snapshotIdentity(source.metadata)),catalog.snapshotId);
  const rows=[],schemas=[],coverage=[];
  const select=async(table,field,keys)=>{
    for(let i=0;i<keys.length;i+=100) {
      const r=await inspectTables(source.reader,source.schema,[{table,where:[{field,op:'oneOf',value:keys.slice(i,i+100)}]}],1000);
      assert(r.coverage.every(c=>c.tableFiles>0));rows.push(...r.rows);schemas.push(...r.schemas);coverage.push(...r.coverage);
    }
  };
  await select('missile_weapons_tables','key',weapons);
  await select('projectiles_tables','key',projectiles);
  for(const r of rows)assert.equal(digest(r.row),digest(catalog.rows.find(x=>x.table===r.table&&x.row.key===r.row.key)?.row),'Fresh raw drift '+r.row.key);
  await select('projectile_shot_type_enum_tables','key',[...new Set(rows.filter(r=>r.table==='projectiles_tables').map(r=>r.row.shot_type))]);
  await select('projectile_shot_type_displays_tables','key',[...new Set(rows.filter(r=>r.table==='projectiles_tables').map(r=>r.row.projectile_shot_type_display))]);
  const schemaDefinitions=Object.entries(source.schema.definitions).filter(([n])=>/campaign_bonus_value_id_unit_missile_weapons/.test(n));
  const capture={format:'ca-missile-damage-selection-source-v1',gameExecuted:false,extractedAt:new Date().toISOString(),provenance:source.metadata,
    snapshotId:catalog.snapshotId,scope:{heldUnits:held.size,regressionUnits:17,fullImport:false,keysPerQuery:100,maxRowsPerQuery:1000},
    rows:[...new Map(rows.map(r=>[r.id,r])).values()],schemas:[...new Map(schemas.map(s=>[s.table+':'+s.version,s])).values()],coverage,schemaDefinitions};
  fs.writeFileSync(folder+'selection.source.json',JSON.stringify(encodeSource(capture))+'\n');
  console.log('Fresh exact weapon/projectile/UI selection:',capture.rows.length,'rows;',held.size,'reused held units; gameExecuted=false');
} finally {await source.client.close();}
