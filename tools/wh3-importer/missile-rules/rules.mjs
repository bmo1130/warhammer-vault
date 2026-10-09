import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
import {loadSource,decodeSource} from './source.mjs';
import {fields,missileGraph,inspectMissileUnit,predictMissile} from './predict.mjs';
export {fields,predictMissile};
export const folder='tools/wh3-importer/missile-rules/';
const read=p=>JSON.parse(fs.readFileSync(p));
export const serialize=v=>JSON.stringify(v,null,2)+'\n';
export const core=m=>Object.fromEntries(Object.entries({baseDamage:m?.projectile.baseDamage,armorPiercingDamage:m?.projectile.armorPiercingDamage,range:m?.range,baseTime:m?.reload?.baseTime}).filter(([,v])=>v!==undefined));
export function projectMissile(unit,values) {
  if(!Object.keys(values).length)return unit;
  const {baseDamage,armorPiercingDamage,range,baseTime}=values;
  return {...unit,missile:{...unit.missile,projectile:{...unit.missile?.projectile,
    ...(baseDamage!==undefined?{baseDamage}:{}),...(armorPiercingDamage!==undefined?{armorPiercingDamage}:{})},
    ...(range!==undefined?{range}:{}),...(baseTime!==undefined?{reload:{...unit.missile?.reload,baseTime}}:{})}};
}
export function verifyInputs(manifest) {
  assert.equal(manifest.format,'ca-basic-missile-rules-v1');
  for(const p of manifest.inputs)assert.equal(digest(read(p.file)),p.hash,'Missile source drift: '+p.file);
}
export function buildMissileRules(manifest=read(folder+'manifest.json')) {
  verifyInputs(manifest);
  const source=loadSource(),truth=read(folder+'ground-truth.json'),inventory=read(folder+'schema-inventory.json'),ui=read(folder+'ui.source.json');
  assert.equal(digest(snapshotIdentity(source.provenance)),manifest.snapshotId);assert.equal(digest(snapshotIdentity(ui.provenance)),manifest.snapshotId);
  assert.equal(source.provenance.gameVersion,manifest.gameVersion);assert.equal(source.scope.units,1110);assert.equal(source.scope.fullImport,false);
  assert.equal(digest(source.schemas),inventory.processedSchemasHash);
  const owners=read(folder+'owner-schema.source.json');assert.equal(owners.snapshotId,manifest.snapshotId);
  assert.equal(digest(snapshotIdentity(owners.provenance)),manifest.snapshotId);
  for(const [table,version] of [['mounts_tables',10],['battle_entities_tables',39],['land_unit_articulated_vehicles_tables',6]]) {
    const defs=owners.tables.filter(t=>t.table===table);assert(defs.length);
    for(const d of defs){assert.equal(d.version,version);assert(!d.fields.some(f=>f.is_reference&&['missile_weapons','projectiles','battle_personalities','battle_entity_stats'].includes(f.is_reference[0].replace(/_tables$/,''))),'Additional weapon ownership route needs review');}
  }
  assert(owners.tables.find(t=>t.table==='battle_entities_tables').fields.find(f=>f.name==='can_cast_projectile').description.includes('projectile spell'));
  const schema=source.schemas.find(s=>s.table==='projectiles_tables');assert.equal(schema.version,53);
  for(const [k,f] of Object.entries(fields))assert.equal(schema.fields.find(x=>x.name===f)?.field_type,k==='baseTime'?'F32':'I32');
  assert(ui.rows.some(r=>r.table==='Loc'&&r.row.key==='unit_stat_localisations_onscreen_name_stat_reloading'&&r.row.text.includes('Reload Skill')));
  const graph=missileGraph(source),rawUnits=new Map(read('src/data/units.json').filter(u=>u.gameVersion!=='sample').map(u=>[u.id,u]));
  assert.equal(rawUnits.size,1110);assert.equal(new Set(source.seeds.map(s=>s.id)).size,1110);
  const catalog=source.seeds.map(seed=>{
    const u=rawUnits.get(seed.id);assert(u);assert.equal(u.gameVersion,manifest.gameVersion);
    const t={id:seed.id,...inspectMissileUnit(graph,seed)},prediction=predictMissile(t,core(u.missile));
    const main=source.rows.find(r=>r.id===t.mainRowId),land=source.rows.find(r=>r.id===t.landRowId);
    assert.equal(digest(main?.row),seed.mainRowHash);assert.equal(digest(land?.row),seed.landRowHash);
    const shape=t.engine?'ENGINE':t.mount?'MOUNTED':t.articulated?'ARTICULATED':'LAND';
    return {id:seed.id,name:u.name,mainKey:seed.mainKey,landKey:seed.landKey,mainRowId:t.mainRowId,landRowId:t.landRowId,shape,
      category:t.category,class:t.class,ammo:t.ammo,issues:t.issues,paths:t.paths.map(p=>({...p,projectiles:p.projectiles.map(x=>{
        const {row,...rest}=x;return {...rest,rowId:row.id,key:row.row.key,category:row.row.category,shotType:row.row.shot_type};
      })})),originalMissile:u.missile??null,prediction};
  });
  const byId=new Map(catalog.map(t=>[t.id,t]));
  const regression=truth.baseline.map(b=>{
    const t=byId.get(b.id),actual=t.prediction.values;
    assert.deepEqual(t.originalMissile,b.originalMissile);assert.deepEqual(core(t.originalMissile),b.expected);
    for(const [k,v] of Object.entries(b.expected))assert.equal(actual[k],v,'Baseline missile regression '+b.id+'.'+k);
    const projectiles=t.paths.flatMap(p=>p.projectiles);
    const comparisons=Object.fromEntries(Object.entries(b.expected).map(([k,expected])=>[k,{expected,raw:[...new Set(projectiles.map(p=>p.facts[fields[k]]?.value))],actual:actual[k],matches:actual[k]===expected}]));
    const raw=projectiles[0].facts,n=raw.projectile_number.value,shots=raw.shots_per_volley.value,burst=raw.burst_size.value;
    const blast=projectiles[0].explosion[0]?.raw;
    return {...b,comparisons,candidates:{RAW_DIRECT:{base:raw.damage.value,ap:raw.ap_damage.value},RAW_TIMES_VOLLEY:{base:raw.damage.value*shots,ap:raw.ap_damage.value*shots},
      RAW_TIMES_LAUNCH_COUNT:{base:raw.damage.value*n,ap:raw.ap_damage.value*n},RAW_TIMES_BURST:{base:raw.damage.value*burst,ap:raw.ap_damage.value*burst},
      DIRECT_PLUS_BLAST:blast?{base:raw.damage.value+blast.detonation_damage,ap:raw.ap_damage.value+blast.detonation_damage_ap}:null},
      explanation:'Existing fields are direct per-projectile damage, effective range and raw base reload. No card Missile Strength or current cycle inference.'};
  });
  assert.equal(regression.length,17);
  const rawComparisons=[];
  const validation=decodeSource(read(folder+'validation.source.json'));
  for(const {id,dump} of validation.captures) {
    const ref=truth.representatives.find(r=>r.id===id);assert(ref);
    assert.equal(digest(snapshotIdentity(dump.provenance)),manifest.snapshotId);
    const t=byId.get(id),main=source.rows.find(r=>r.id===t.mainRowId),land=source.rows.find(r=>r.id===t.landRowId);
    assert(dump.rows.some(r=>r.table===main.table&&digest(r.row)===digest(main.row)));
    assert(dump.rows.some(r=>r.table===land.table&&digest(r.row)===digest(land.row)));
    const comparisons=t.paths.filter(p=>['LAND_PRIMARY','ENGINE'].includes(p.role)).flatMap(p=>p.projectiles.filter(x=>x.kind==='DEFAULT').map(p=>{
      const previous=dump.rows.filter(r=>r.table==='projectiles_tables'&&r.row.key===p.key);assert.equal(previous.length,1,'Independent old trace missing '+ref.id);
      const fresh=source.rows.find(r=>r.id===p.rowId);assert.equal(digest(fresh.row),digest(previous[0].row));
      const raw=Object.fromEntries(Object.entries(fields).map(([k,f])=>[k,previous[0].row[f]]));
      const fieldsChecked=Object.fromEntries(Object.entries(raw).map(([k,expected])=>[k,{expected,fresh:p.facts[fields[k]].value,production:t.prediction.values[k]??null,
        rawMatches:expected===p.facts[fields[k]].value,admittedMatches:t.prediction.values[k]===undefined?null:expected===t.prediction.values[k]}]));
      return {projectile:p.key,previousRowId:previous[0].id,freshRowId:p.rowId,fields:fieldsChecked};
    }));
    assert(comparisons.length);rawComparisons.push({...ref,kind:'INDEPENDENT_EXTRACTOR_REPLAY_SAME_CA_SNAPSHOT',uiReading:null,status:t.prediction.status,comparisons});
  }
  assert.equal(rawComparisons.length,truth.representatives.length);
  const manual=truth.manualReference,t=byId.get(manual.id),p=t.paths.find(p=>p.role==='ENGINE').projectiles[0];
  const manualComparison={...manual,raw:Object.fromEntries(Object.entries(fields).map(([k,f])=>[k,p.facts[f].value])),production:t.prediction.values,
    matches:Object.fromEntries(Object.entries(manual.expectedRaw).map(([k,v])=>[k,p.facts[fields[k]].value===v])),
    cardDifference:{rawDirectTotal:p.facts.damage.value+p.facts.ap_damage.value,reportedMissileStrength:manual.missileStrength,
      rawReload:p.facts.base_reload_time.value,reportedCurrentReload:manual.currentReload},admission:'RANGE_AND_BASE_RELOAD_ONLY_COMPOSITE_DAMAGE_HELD'};
  assert(Object.values(manualComparison.matches).every(Boolean));
  const targets=catalog.filter(t=>t.prediction.status!=='N/A'),summary={production:1110,regularMissileUnits:targets.length,notApplicable:1110-targets.length,
    ...Object.fromEntries(['COMPLETE','PARTIAL','UNKNOWN','N/A'].map(s=>[s,catalog.filter(t=>t.prediction.status===s).length])),
    newlyPromotedUnits:catalog.filter(t=>Object.keys(t.prediction.values).some(k=>core(t.originalMissile)[k]===undefined)).length,
    perField:Object.fromEntries(Object.keys(fields).map(k=>{
      const before=catalog.filter(t=>core(t.originalMissile)[k]!==undefined).length,after=catalog.filter(t=>t.prediction.values[k]!==undefined).length;
      return [k,{before,after,newFields:after-before,unknownBefore:targets.length-before,unknownAfter:targets.length-after,notApplicable:1110-targets.length,
        targetCoveragePercent:after/targets.length*100,allUnitStoredPercent:after/1110*100,resolvedIncludingNotApplicablePercent:(after+1110-targets.length)/1110*100}];
    }))};
  const structures=[...new Set(catalog.map(t=>t.shape))].map(shape=>({shape,...Object.fromEntries(['COMPLETE','PARTIAL','UNKNOWN','N/A'].map(s=>[s,catalog.filter(t=>t.shape===shape&&t.prediction.status===s).length])),
    newlyPromoted:catalog.filter(t=>t.shape===shape&&Object.keys(t.prediction.values).some(k=>core(t.originalMissile)[k]===undefined)).length}));
  const held=targets.filter(t=>t.prediction.status!=='COMPLETE').map(t=>({id:t.id,mainKey:t.mainKey,landKey:t.landKey,status:t.prediction.status,
    weapons:[...new Set(t.paths.map(p=>p.weaponKey))],projectiles:[...new Set(t.paths.flatMap(p=>p.projectiles.map(x=>x.key)))],review:t.prediction.review}));
  const report={format:'ca-basic-missile-report-v1',baselineCommit:manifest.baselineCommit,gameVersion:manifest.gameVersion,snapshotId:manifest.snapshotId,
    sourceReference:folder+'catalog.source.json',expandedSourceHash:digest(source),schemaReference:folder+'schema-inventory.json',ownerSchemaReference:folder+'owner-schema.source.json',inputs:manifest.inputs,
    confidenceLimit:truth.limit,summary,structures,regression,rawComparisons,manualComparison,held,catalog};
  const projection={format:'unit-basic-missile-admissions-v1',gameVersion:manifest.gameVersion,snapshotId:manifest.snapshotId,sourceHash:digest(report),reportReference:folder+'report.json',
    admissions:catalog.map((t,i)=>({id:t.id,mainKey:t.mainKey,landKey:t.landKey,originalMissile:t.originalMissile,values:t.prediction.values,status:t.prediction.status,
      kind:t.originalMissile?'PRESERVED_AND_CA_INVARIANT':'CA_REFERENCE_PROFILE_INVARIANT',reportPointer:'/catalog/'+i}))};
  return {report:JSON.parse(serialize(report)),projection};
}
