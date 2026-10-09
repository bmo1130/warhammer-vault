import fs from 'node:fs';
import {resolveOptions,openRawSource} from '../extract.mjs';
import {inspectTables} from '../inspect.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
import {encodeSource} from '../missile-rules/source.mjs';
const old=JSON.parse(fs.readFileSync('tools/wh3-importer/unit-entities/rules-report.json'));
const held=old.catalog.filter(c=>c.status!=='COMPLETE');
const source=await openRawSource(await resolveOptions([]));
try {
  const rows=[],schemas=[],coverage=[];
  const select=async(table,field,values)=>{
    const keys=[...new Set(values.filter(Boolean))];
    for(let i=0;i<keys.length;i+=100){const q={table,where:[{field,op:'oneOf',value:keys.slice(i,i+100)}]};
      const r=await inspectTables(source.reader,source.schema,[q],1000);rows.push(...r.rows);schemas.push(...r.schemas);coverage.push(...r.coverage);}
  };
  await select('main_units_tables','unit',held.map(t=>t.mainKey));
  await select('land_units_tables','key',held.map(t=>t.landKey));
  const lands=rows.filter(r=>r.table==='land_units_tables').map(r=>r.row);
  await select('mounts_tables','key',lands.map(r=>r.mount));
  await select('battlefield_engines_tables','key',lands.map(r=>r.engine));
  await select('land_unit_articulated_vehicles_tables','key',lands.map(r=>r.articulated_record));
  await select('battle_entities_tables','key',[...lands.map(r=>r.man_entity),
    ...rows.filter(r=>r.table==='mounts_tables').map(r=>r.row.entity),
    ...rows.filter(r=>r.table==='battlefield_engines_tables').map(r=>r.row.battle_entity),
    ...rows.filter(r=>r.table==='land_unit_articulated_vehicles_tables').map(r=>r.row.articulated_entity)]);
  const capture={format:'ca-entities-second-comparison-source-v1',extractedAt:new Date().toISOString(),gameExecuted:false,
    snapshotId:digest(snapshotIdentity(source.metadata)),productionSnapshotId:old.catalog[0].staticSnapshotId,
    provenance:source.metadata,scope:{heldUnits:held.length,fullImport:false},
    rows:[...new Map(rows.map(r=>[r.id,r])).values()],schemas:[...new Map(schemas.map(s=>[s.table+':'+s.version,s])).values()],coverage};
  fs.writeFileSync('tools/wh3-importer/entities-second/fresh.source.json',JSON.stringify(encodeSource(capture))+'\n');
  console.log({version:source.metadata.gameVersion,rows:capture.rows.length,gameExecuted:false});
}finally{await source.client.close();}
