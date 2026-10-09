import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
import {loadSource,decodeSource} from '../missile-rules/source.mjs';
import {missileGraph,inspectMissileUnit} from '../missile-rules/predict.mjs';
import {predictDamage} from './predict.mjs';
export const folder='tools/wh3-importer/missile-damage/';
const read=p=>JSON.parse(fs.readFileSync(p));
export const serialize=v=>JSON.stringify(v,null,2)+'\n';
export function buildDamageRules(manifest=read(folder+'manifest.json')) {
  for(const input of manifest.inputs)assert.equal(digest(read(input.file)),input.hash,'Damage input drift: '+input.file);
  const previous=read('tools/wh3-importer/missile-rules/report.json'),first=read('src/data/unitMissileAdmissions.json'),source=loadSource();
  const selection=decodeSource(read(folder+'selection.source.json'));
  assert.equal(digest(snapshotIdentity(selection.provenance)),manifest.snapshotId);assert.equal(selection.gameExecuted,false);
  const graph=missileGraph(source),firstById=new Map(first.admissions.map(a=>[a.id,a]));
  for(const c of selection.coverage) {
    assert.equal(c.tableFiles,1,'Unreviewed pack precedence');
    assert.equal(selection.rows.filter(r=>r.table===c.query.table&&c.query.where.every(w=>w.value.includes(r.row[w.field]))).length,c.matchedRows,'Incomplete fresh selection');
  }
  const fresh=selection.rows.filter(r=>['missile_weapons_tables','projectiles_tables'].includes(r.table));
  for(const r of fresh)assert.deepEqual(r,source.rows.find(x=>x.id===r.id),'Reextraction drift '+r.row.key);
  const description=(table,field)=>source.schemas.find(s=>s.table===table)?.fields.find(f=>f.name===field)?.description;
  assert(description('missile_weapons_to_projectiles_tables','projectile').includes('different shot_types'));
  assert(description('missile_weapons_tables','hide_secondary_range_ammo_statistics_ui').includes('missle strength'));
  assert(description('unit_missile_weapon_junctions_tables','battle_entity_stats_override').includes('specified battle entity stats'));
  assert(description('battlefield_engines_tables','missile_weapon').includes('Crewless war machines'));
  const catalog=previous.held.map(h=>{
    const t=inspectMissileUnit(graph,source.seeds.find(s=>s.id===h.id)),before=firstById.get(h.id);
    for(const p of t.paths){assert(fresh.some(r=>r.id===p.weaponRowId));for(const x of p.projectiles)assert(fresh.some(r=>r.id===x.row.id));}
    const prediction=predictDamage(t,before,selection);
    assert.equal(prediction.values.range,before.values.range);assert.equal(prediction.values.baseTime,before.values.baseTime);
    const newFields=['baseDamage','armorPiercingDamage'].filter(k=>before.values[k]===undefined&&prediction.values[k]!==undefined);
    return {id:h.id,mainKey:h.mainKey,landKey:h.landKey,firstSliceStatus:before.status,firstSliceValues:before.values,firstSliceReview:h.review,
      issues:t.issues,...prediction,newFields};
  });
  const byId=new Map(catalog.map(t=>[t.id,t]));
  const effective=first.admissions.map(a=>({...a,...(byId.has(a.id)?{values:byId.get(a.id).values,status:byId.get(a.id).status}:{})}));
  const summary={production:1110,regularMissileUnits:370,notApplicable:740,
    fields:Object.fromEntries(['baseDamage','armorPiercingDamage','range','baseTime'].map(k=>[k,{before:first.admissions.filter(a=>a.values[k]!==undefined).length,after:effective.filter(a=>a.values[k]!==undefined).length}])),
    statuses:Object.fromEntries(['COMPLETE','PARTIAL','UNKNOWN','N/A'].map(k=>[k,{before:first.admissions.filter(a=>a.status===k).length,after:effective.filter(a=>a.status===k).length}])),
    processedUnits:catalog.length,newlyPromotedUnits:catalog.filter(t=>t.newFields.length).length,newDamageFields:catalog.reduce((n,t)=>n+t.newFields.length,0),
    perType:Object.fromEntries(['MULTIPLE_PROFILES','MULTISHOT_VOLLEY','DIRECT_AND_EXPLOSION','PRECURSOR','HIDDEN_SECONDARY','ARTILLERY_WAR_MACHINE','MOUNT_RIDER','INCOMPLETE_REFERENCE'].map(k=>{
      const group=catalog.filter(t=>t.types.includes(k));return [k,{processed:group.length,promoted:group.filter(t=>t.newFields.length).length,
        damageComplete:group.filter(t=>t.values.baseDamage!==undefined&&t.values.armorPiercingDamage!==undefined).length,remainingDamageHeld:group.filter(t=>t.values.baseDamage===undefined||t.values.armorPiercingDamage===undefined).length}];})),
    explosionOnlyProfiles:catalog.flatMap(t=>t.profiles.filter(p=>p.damageKind==='EXPLOSION_ONLY').map(p=>({id:t.id,weapon:p.weaponKey,projectile:p.projectileKey}))),
    freshRawRows:fresh.length,liveGameCardReadings:0,
  };
  const regression=previous.regression.map(b=>{
    const t=inspectMissileUnit(graph,source.seeds.find(s=>s.id===b.id)),p=predictDamage(t,{values:{}},selection);
    assert.equal(p.values.baseDamage,b.expected.baseDamage);assert.equal(p.values.armorPiercingDamage,b.expected.armorPiercingDamage);
    const actual=effective.find(a=>a.id===b.id).values;assert.deepEqual(actual,b.expected);
    return {id:b.id,expected:b.expected,actual,fieldsChecked:4,matches:true};
  });
  const comparisons=catalog.map(t=>({id:t.id,rawProfiles:t.profiles.map(p=>({weapon:p.weaponKey,projectile:p.projectileKey,
    rawDirect:[p.baseDamage,p.armorPiercingDamage],rawExplosion:p.explosion?[p.explosion.baseDamage,p.explosion.armorPiercingDamage]:null,
    projectileNumber:p.projectileNumber,shotsPerVolley:p.shotsPerVolley,burstSize:p.burstSize,activation:p.activation,
    uiDisplayedDamage:p.uiDisplayedDamage,uiSelectedProfile:p.uiSelectedProfile})),selectedProfiles:t.selectedProfiles,production:t.values}));
  const independent=decodeSource(read(folder+'validation.source.json'));
  assert.equal(digest(snapshotIdentity(independent.provenance)),manifest.snapshotId);assert.equal(independent.gameExecuted,false);
  const rawComparisons=independent.captures.map(c=>{
    const t=byId.get(c.id);assert(t);
    const comparable=c.dump.rows.filter(r=>['main_units_tables','land_units_tables','missile_weapons_tables','projectiles_tables','projectiles_explosions_tables'].includes(r.table));
    const outsideScope=[];
    const checked=comparable.flatMap(r=>{
      const sameKey=source.rows.filter(x=>x.table===r.table&&digest(x.key)===digest(r.key));
      if(!sameKey.length){outsideScope.push({table:r.table,key:r.key,traceRowId:r.id,reason:'OUTSIDE_REGULAR_WEAPON_CATALOG_SCOPE'});return [];}
      const known=sameKey.find(x=>digest(x.row)===digest(r.row));assert(known,'Independent trace drift '+c.id+' '+r.table);
      return {table:r.table,key:r.key,traceRowId:r.id,catalogRowId:known.id,rowHash:digest(r.row)};
    });
    assert(checked.some(r=>r.table==='projectiles_tables'));return {id:c.id,kind:'INDEPENDENT_EXTRACTOR_SAME_CA_SNAPSHOT',rows:checked,outsideScope,uiReading:null};
  });
  const held=catalog.filter(t=>t.status!=='COMPLETE').map(t=>({id:t.id,mainKey:t.mainKey,landKey:t.landKey,status:t.status,
    damageReview:t.review,otherFieldReview:Object.fromEntries(Object.entries(t.firstSliceReview).filter(([k,v])=>['range','baseTime'].includes(k)&&v.status==='UNKNOWN')),
    profiles:t.profiles.map(p=>({weaponKey:p.weaponKey,projectileKey:p.projectileKey,activation:p.activation,owners:p.owners.map(o=>o.role)}))}));
  const report={format:'ca-missile-direct-damage-report-v1',baselineCommit:manifest.baselineCommit,gameVersion:manifest.gameVersion,snapshotId:manifest.snapshotId,
    inputs:manifest.inputs,sourceReference:'tools/wh3-importer/missile-rules/catalog.source.json',selectionReference:folder+'selection.source.json',
    validationReference:folder+'validation.source.json',summary,regression,rawComparisons,comparisons,held,catalog};
  const projection={format:'unit-missile-damage-admissions-v1',gameVersion:manifest.gameVersion,snapshotId:manifest.snapshotId,firstSliceHash:digest(first),sourceHash:digest(report),
    reportReference:folder+'report.json',admissions:catalog.map((t,i)=>({id:t.id,values:t.values,status:t.status,profiles:t.profiles,selection:t.selection,reportPointer:'/catalog/'+i}))};
  return {report,projection};
}
