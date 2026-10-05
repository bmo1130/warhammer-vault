// Bounded missing identity/mount closure only; never re-extract Skill source.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {openRawSource,resolveOptions} from '../tools/wh3-importer/extract.mjs';
import {sha256} from '../tools/wh3-importer/research-classifier/classify.mjs';
import {verifySource,unique} from '../tools/wh3-importer/skill-production-bretonnia/source.mjs';
import {resolveReferenceTable} from '../tools/wh3-importer/trace-unit.mjs';
const priorDir='tools/wh3-importer/skill-production-bretonnia/',manifest=JSON.parse(fs.readFileSync(priorDir+'manifest.json'));
const prior=verifySource(fs.readFileSync(priorDir+'source.json'),manifest),byId=new Map(prior.rows.map(r=>[r.id,r]));
const subtypes=prior.rows.filter(r=>r.table==='agent_subtypes_tables'&&prior.subtypeKeys.includes(r.row.key));
const baseKeys=unique(subtypes.map(r=>r.row.associated_unit_override));
const grantRows=prior.rows.filter(r=>r.table==='character_skill_level_to_ancillaries_junctions_tables'&&prior.skillKeys.includes(r.row.skill));
const s=await openRawSource(await resolveOptions()),rows=new Map(),refs=new Set(),schemas=new Map(),coverage=[];
try{
 assert.equal(s.metadata.gameVersion,prior.provenance.gameVersion);assert.equal(s.metadata.schemaSha256,prior.provenance.schemaSha256);
 for(const pack of prior.provenance.packs)assert(s.metadata.packs.some(p=>p.sha256===pack.sha256&&p.file_name===pack.file_name),'CA snapshot changed');
 async function q(table,field,values){
  const found=[];for(const t of await s.reader.tables(table)){
   assert(t.fields.some(f=>f.name===field));
   schemas.set(`${table}:${t.tableVersion}`,{table,version:t.tableVersion,fields:t.fields.map(({name,field_type,is_key,is_reference,description})=>({name,field_type,is_key,is_reference,description}))});
   for(const raw of t.rows.filter(r=>values.includes(r[field]))){
    const key=Object.fromEntries(t.fields.filter(f=>f.is_key).map(f=>[f.name,raw[f.name]]));
    const id=`${table}:${sha256(JSON.stringify([t.sourcePack,t.path,key,raw])).slice(0,20)}`;
    if(byId.has(id)){assert.deepEqual(byId.get(id).row,raw);refs.add(id);}else rows.set(id,{id,table,key,sourcePack:t.sourcePack,sourcePackPath:t.sourcePackPath,path:t.path,tableVersion:t.tableVersion,row:raw});
    found.push(raw);
   }
  }coverage.push({query:{table,field,values},matchedRows:found.length});assert(rows.size<1000,'Identity extraction bound exceeded');return found;
 }
 const grants=await q('ancillaries_tables','key',unique(grantRows.map(r=>r.row.granted_ancillary)));
 assert.equal(grants.length,unique(grantRows.map(r=>r.row.granted_ancillary)).length,'Missing mount grant ancillary');
 const allowed=await q('ancillaries_included_agent_subtypes_tables','agent_subtype',prior.subtypeKeys);
 await q('ancillaries_tables','key',unique(allowed.map(r=>r.ancillary)));
 const customs=await q('units_custom_battle_mounts_tables','base_unit',baseKeys);
 const allAnc=[...rows.values(),...[...refs].map(id=>byId.get(id))].filter(r=>r.table==='ancillaries_tables');
 const main=await q('main_units_tables','unit',unique([...baseKeys,...customs.map(r=>r.mounted_unit),...allAnc.map(r=>r.row.provided_bodyguard_unit)].filter(Boolean)));
 const land=await q('land_units_tables','key',unique(main.map(r=>r.land_unit)));
 const mounts=await q('mounts_tables','key',unique(land.map(r=>r.mount).filter(Boolean)));
 await q('battle_entities_tables','key',unique([...land.map(r=>r.man_entity),...mounts.map(r=>r.entity)].filter(Boolean)));
 await q('melee_weapons_tables','key',unique(land.map(r=>r.primary_melee_weapon).filter(Boolean)));
 await q('unit_armour_types_tables','key',unique(land.map(r=>r.armour).filter(Boolean)));
 await q('unit_shield_types_tables','key',unique(land.map(r=>r.shield).filter(Boolean)));
 const missile=await q('missile_weapons_tables','key',unique(land.map(r=>r.primary_missile_weapon).filter(Boolean)));
 await q('projectiles_tables','key',unique(missile.map(r=>r.default_projectile).filter(Boolean)));
 // Preserve base subtype/grant identities as references to immutable source.
 for(const r of [...subtypes,...grantRows])refs.add(r.id);
 const all=[...rows.values(),...[...refs].map(id=>byId.get(id))],relationships=[];
 for(const from of all){const schema=schemas.get(`${from.table}:${from.tableVersion}`)??prior.schemas.find(s=>s.table===from.table&&s.version===from.tableVersion);assert(schema);
  for(const f of schema.fields.filter(f=>f.is_reference&&from.row[f.name])){const target=resolveReferenceTable(f.is_reference[0],s.schema);for(const to of all.filter(r=>r.table===target&&r.row[f.is_reference[1]]===from.row[f.name]))relationships.push({from:from.id,field:f.name,to:to.id,targetField:f.is_reference[1],value:from.row[f.name],evidence:'RPFM processed schema is_reference'});}
 }
 const result={format:'wh3-skill-self-identity-source-v1',sourceSha256:manifest.sourceSha256,snapshotId:manifest.snapshotId,provenance:s.metadata,subtypeKeys:prior.subtypeKeys,baseKeys,grantRowIds:grantRows.map(r=>r.id),reusedRowIds:[...refs].sort(),schemas:[...schemas.values()],rows:[...rows.values()].sort((a,b)=>a.id.localeCompare(b.id)),relationships:relationships.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),coverage};
 fs.mkdirSync('generated/wh3/skill-self-scope-audit',{recursive:true});fs.writeFileSync('generated/wh3/skill-self-scope-audit/identity-raw.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({newRows:result.rows.length,reusedRows:refs.size,baseUnits:baseKeys.length,mountGrants:grants.length,customMountRoutes:customs.length,unitProfiles:land.length,relationships:relationships.length}));
}finally{await s.client.close();}
