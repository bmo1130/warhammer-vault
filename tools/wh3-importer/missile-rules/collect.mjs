import fs from 'node:fs';
import assert from 'node:assert/strict';
import {resolveOptions,openRawSource} from '../extract.mjs';
import {inspectTables} from '../inspect.mjs';
import {resolveReferenceTable} from '../trace-unit.mjs';
import {reviewUnitEntities} from '../unit-entities/review.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';

// Exact current Production roots, finite forward/reference stages. Every saved
// selection is bounded to 100 seed keys / 1,000 rows; no unfiltered table dump.
export async function collectMissileCatalog(output) {
  const seeds=[];
  reviewUnitEntities(undefined,undefined,({unit,dump,selectors:s,context:c})=>seeds.push({id:unit.id,mainKey:s.fact(c.root,'unit').value,
    landKey:s.fact(c.land,'key').value,mainRowHash:digest(c.root.row),landRowHash:digest(c.land.row),snapshotId:digest(snapshotIdentity(dump.provenance))}));
  const source=await openRawSource(await resolveOptions([])),rows=new Map(),schemas=new Map(),coverage=[];
  try {
    const snapshotId=digest(snapshotIdentity(source.metadata));assert(seeds.every(s=>s.snapshotId===snapshotId));assert.equal(source.metadata.gameVersion,'9.0.2.0');
    const selected=table=>[...rows.values()].filter(r=>r.table===table);
    const select=async(table,field,values)=>{
      const keys=[...new Set(values.filter(v=>v!==''&&v!==null&&v!==undefined))];
      for(let i=0;i<keys.length;i+=100) {
        const result=await inspectTables(source.reader,source.schema,[{table,where:[{field,op:'oneOf',value:keys.slice(i,i+100)}]}],1000);
        assert(result.coverage.every(c=>c.tableFiles>0),'Unavailable table is not proof of absence: '+table);
        result.rows.forEach(r=>{if(rows.has(r.id))assert.deepEqual(rows.get(r.id),r);rows.set(r.id,r);});
        result.schemas.forEach(s=>schemas.set(s.table+':'+s.version,s));coverage.push(...result.coverage);
      }
      console.log(table+' '+selected(table).length+' selected rows / '+keys.length+' exact keys');
    };
    const forward=async(table,field)=>{
      const defs=(await source.reader.tables(table)).map(t=>t.fields.find(f=>f.name===field)?.is_reference);
      assert(defs.length&&defs.every(d=>Array.isArray(d)&&JSON.stringify(d)===JSON.stringify(defs[0])),'Missing processed reference '+table+'.'+field);
      await select(resolveReferenceTable(defs[0][0],source.schema),defs[0][1],selected(table).map(r=>r.row[field]));
    };
    await select('main_units_tables','unit',seeds.map(s=>s.mainKey));
    await forward('main_units_tables','land_unit');
    for(const s of seeds){assert.equal(digest(selected('main_units_tables').find(r=>r.row.unit===s.mainKey)?.row),s.mainRowHash,s.mainKey);assert.equal(digest(selected('land_units_tables').find(r=>r.row.key===s.landKey)?.row),s.landRowHash,s.landKey);}
    await forward('land_units_tables','engine');
    await select('land_units_to_battle_personalities_junctions_tables','land_unit',seeds.map(s=>s.landKey));
    await select('unit_missile_weapon_junctions_tables','unit',seeds.map(s=>s.mainKey));
    await forward('land_units_to_battle_personalities_junctions_tables','battle_personality');
    await forward('battle_personalities_tables','battle_entity_stats');
    await forward('unit_missile_weapon_junctions_tables','battle_entity_stats_override');
    await forward('land_units_tables','primary_missile_weapon');
    await forward('battlefield_engines_tables','missile_weapon');
    await forward('battle_entity_stats_tables','primary_missile_weapon');
    await forward('unit_missile_weapon_junctions_tables','missile_weapon');
    await select('missile_weapons_to_projectiles_tables','missile_weapon',selected('missile_weapons_tables').map(r=>r.row.key));
    await forward('missile_weapons_tables','default_projectile');
    await forward('missile_weapons_to_projectiles_tables','projectile');
    await forward('projectiles_tables','explosion_type');
    // Preserve effect references to additional weapons; no activation/operation
    // or campaign effect arithmetic is inferred from their existence.
    await select('effect_bonus_value_missile_weapon_junctions_tables','missile_weapon_junction',selected('unit_missile_weapon_junctions_tables').map(r=>r.row.id));
    await forward('effect_bonus_value_missile_weapon_junctions_tables','effect');
    const relationships=[];
    for(const from of rows.values())for(const f of schemas.get(from.table+':'+from.tableVersion).fields.filter(f=>f.is_reference)) {
      const table=resolveReferenceTable(f.is_reference[0],source.schema);
      for(const to of selected(table).filter(r=>Object.hasOwn(r.row,f.is_reference[1])&&r.row[f.is_reference[1]]===from.row[f.name]))relationships.push({from:from.id,to:to.id,field:f.name,targetField:f.is_reference[1],value:from.row[f.name],evidence:'RPFM processed schema is_reference'});
    }
    const result={format:'ca-exact-production-missile-catalog-source-v1',sourceKind:'ca-pack',gameExecuted:false,extractedAt:new Date().toISOString(),provenance:source.metadata,
      snapshotId,scope:{units:seeds.length,seedKeysPerQuery:100,maxRowsPerQuery:1000,fullImport:false},seeds,schemas:[...schemas.values()],rows:[...rows.values()],relationships,coverage};
    fs.mkdirSync('generated/wh3/missile',{recursive:true});fs.writeFileSync(output,JSON.stringify(result));console.log('Saved '+rows.size+' exact-scope rows to '+output);
    return result;
  } finally {await source.client.close();}
}
if(process.argv[1]?.endsWith('missile-rules/collect.mjs')||process.argv[1]?.endsWith('missile-rules\\collect.mjs'))await collectMissileCatalog(process.argv[2]??'generated/wh3/missile/catalog.source.json');
