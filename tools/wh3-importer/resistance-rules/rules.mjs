import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
import {reviewUnitEntities} from '../unit-entities/review.mjs';

const folder='tools/wh3-importer/resistance-rules/';
const read=p=>JSON.parse(fs.readFileSync(p));
export const serialize=v=>JSON.stringify(v,null,2)+'\n';
export const fields=Object.freeze({physical:'damage_mod_physical',missile:'damage_mod_missile',spell:'damage_mod_magic',fire:'damage_mod_flame',ward:'damage_mod_all'});
export const stats=Object.freeze({physical:'stat_resistance_physical',missile:'stat_resistance_missile',spell:'stat_resistance_magic',fire:'stat_resistance_flame',ward:'stat_resistance_all'});
export function verifyInputs(manifest) {
  assert.equal(manifest.format,'ca-base-resistance-rules-v1');
  for(const pin of manifest.inputs)assert.equal(digest(read(pin.file)),pin.hash,'Resistance source drift: '+pin.file);
}

// Each field is independent. Missing named fields/joins never default to zero.
// No component, ability, effect, display clamp or campaign value enters this rule.
export function predictResistances(t) {
  const values={},review={};
  const ref=t.landReference;
  const joined=t.mainKey&&t.landKey&&ref?.value===t.landKey&&ref.source?.table==='main_units_tables'&&
    ref.source.rowKey?.unit===t.mainKey&&ref.source.field==='land_unit'&&ref.source.schemaVersion===7&&ref.source.joins?.length===0;
  for(const [kind,field] of Object.entries(fields)) {
    const f=t.facts[kind],s=f?.source;
    const exact=joined&&s?.table==='land_units_tables'&&s.rowKey?.key===t.landKey&&s.field===field&&s.schemaVersion===54&&
      s.joins?.length===1&&s.joins[0].from===ref.source.rowId&&s.joins[0].to===s.rowId&&s.joins[0].field==='land_unit'&&
      s.joins[0].targetField==='key'&&s.joins[0].value===t.landKey&&s.joins[0].traversal==='from-to';
    let reason=!exact?'MISSING_OR_AMBIGUOUS_EXACT_LAND_FIELD':!Number.isSafeInteger(f.value)||f.value< -2147483648||f.value>2147483647?'INVALID_I32_PERCENTAGE_POINTS':
      kind!=='fire'&&f.value<0?'UNVALIDATED_NEGATIVE_NONFIRE_BASE':null;
    if(reason)review[kind]={status:'UNKNOWN',reason};
    else {values[kind]=f.value;review[kind]={status:'COMPLETE',reason:null};}
  }
  const known=Object.keys(values).length;
  return {values,review,status:known===5?'COMPLETE':known?'PARTIAL':'UNKNOWN'};
}

export function buildResistanceRules(manifest=read(folder+'manifest.json')) {
  verifyInputs(manifest);
  const source=read(folder+'semantics.source.json'),inventory=read(folder+'schema-inventory.json'),truth=read(folder+'ground-truth.json');
  assert.equal(digest(snapshotIdentity(source.provenance)),manifest.snapshotId);
  assert.equal(source.provenance.gameVersion,manifest.gameVersion);
  assert.equal(inventory.schemaSha256,source.provenance.schemaSha256);
  const schema=inventory.tables.find(t=>t.table==='land_units_tables').definitions[0];
  assert.equal(schema.version,54);
  for(const [kind,field] of Object.entries(fields)) {
    const f=schema.fields.find(f=>f.name===field);
    assert.equal(f.field_type,'I32');assert.equal(f.default_value,'0');assert(f.description.includes('0 is unaffected'));
    const ui=source.rows.find(r=>r.table==='ui_unit_stats_tables'&&r.row.key===stats[kind]);assert(ui);
    assert(source.relationships.some(e=>e.from===ui.id&&e.field==='localisation'));
  }
  assert(source.rows.some(r=>r.table==='Loc'&&r.row.key.endsWith('onscreen_name_stat_resistance_magic')&&r.row.text.includes('Spell Resistance')));
  assert(source.rows.some(r=>r.table==='ui_unit_stats_tables'&&r.row.key==='stat_resistance_all'&&r.row.icon.includes('resistance_ward_save')));
  const catalog=[],sourceRows={},joinPaths={},rowIds=new Map(),pathIds=new Map();
  const intern=f=>{
    if(!f)return null;
    const {joins,field,...row}=f.source,h=digest(row),p=digest(joins);
    if(!rowIds.has(h))rowIds.set(h,'s'+rowIds.size);
    if(!pathIds.has(p))pathIds.set(p,'p'+pathIds.size);
    const sourceId=rowIds.get(h),pathId=pathIds.get(p);sourceRows[sourceId]=row;joinPaths[pathId]=joins;
    return {value:f.value,field,sourceId,pathId};
  };
  reviewUnitEntities(undefined,undefined,({unit,source:origin,dump,selectors:s,context:c})=>{
    assert.equal(digest(snapshotIdentity(dump.provenance)),manifest.snapshotId);
    const t={id:unit.id,name:unit.name,mainKey:s.fact(c.root,'unit').value,landKey:s.fact(c.land,'key')?.value,
      landReference:s.fact(c.root,'land_unit'),facts:Object.fromEntries(Object.entries(fields).map(([k,f])=>[k,s.fact(c.land,f)??null]))};
    const prediction=predictResistances(t);
    const shape=s.fact(c.land,'articulated_record')?.value?'ARTICULATED':s.fact(c.land,'engine')?.value?'ENGINE':s.fact(c.land,'mount')?.value?'MOUNTED':'MAN_ONLY';
    catalog.push({id:t.id,name:t.name,mainKey:t.mainKey,landKey:t.landKey,source:origin,shape,
      classification:{caste:s.fact(c.root,'caste')?.value,category:s.fact(c.land,'category')?.value,class:s.fact(c.land,'class')?.value},
      landReference:intern(t.landReference),facts:Object.fromEntries(Object.entries(t.facts).map(([k,f])=>[k,intern(f)])),prediction,
      originalResistances:unit.defense.resistances??null});
  });
  assert.equal(catalog.length,1110);assert(catalog.every(t=>t.originalResistances===null),'Unexpected existing base resistances');
  const byId=new Map(catalog.map(t=>[t.id,t]));
  const rawComparisons=source.rows.filter(r=>r.table==='main_units_tables'&&byId.has('ca_unit_'+r.row.unit)).map(root=>{
    const t=byId.get('ca_unit_'+root.row.unit),lands=source.rows.filter(r=>r.table==='land_units_tables'&&r.row.key===root.row.land_unit);
    assert.equal(lands.length,1);assert.equal(root.row.land_unit,t.landKey);
    assert(source.relationships.some(e=>e.from===root.id&&e.field==='land_unit'&&e.to===lands[0].id));
    const comparisons=Object.fromEntries(Object.entries(fields).map(([kind,field])=>{
      const expected=lands[0].row[field],actual=t.prediction.values[kind];assert.equal(actual,expected,t.id+'.'+kind);
      return [kind,{expected,raw:expected,actual,matches:actual===expected}];
    }));
    return {id:t.id,name:t.name,shape:t.shape,kind:'INDEPENDENT_EXACT_SNAPSHOT_PACK_REEXTRACTION',uiReading:null,confidence:'EXACT_RAW_MATCH_NOT_LIVE_UI',comparisons};
  });
  const referenceComparisons=[truth.manualReference,{...truth.official.zeroExample,kind:truth.official.kind,source:truth.official.url}].map(ref=>{
    const t=byId.get(ref.id);assert(t);
    return {...ref,name:t.name,uiReadingKind:ref.kind,comparisons:Object.fromEntries(Object.entries(ref.expected).map(([k,expected])=>{
      const raw=t.facts[k]?.value,actual=t.prediction.values[k];assert.equal(actual,expected,'Historical reference conflict: '+ref.id+'.'+k);
      return [k,{expected,raw,actual,matches:actual===expected}];
    }))};
  });
  const perType=Object.fromEntries(Object.keys(fields).map(k=>{const values=catalog.map(t=>t.prediction.values[k]);return [k,{before:0,after:values.filter(v=>v!==undefined).length,unknownBefore:1110,unknownAfter:values.filter(v=>v===undefined).length,
    explicitZero:values.filter(v=>v===0).length,nonzero:values.filter(v=>v!==undefined&&v!==0).length,positive:values.filter(v=>v>0).length,negative:values.filter(v=>v<0).length,COMPLETE:values.filter(v=>v!==undefined).length,PARTIAL:0,UNKNOWN:values.filter(v=>v===undefined).length}];}));
  const summary={production:1110,promotedUnits:catalog.filter(t=>Object.keys(t.prediction.values).length).length,
    promotedFields:Object.values(perType).reduce((n,v)=>n+v.after,0),explicitZeroFields:Object.values(perType).reduce((n,v)=>n+v.explicitZero,0),
    nonzeroUnits:catalog.filter(t=>Object.values(t.prediction.values).some(v=>v!==0)).length,
    ...Object.fromEntries(['COMPLETE','PARTIAL','UNKNOWN'].map(k=>[k,catalog.filter(t=>t.prediction.status===k).length])),perType};
  const structures=[...new Set(catalog.map(t=>t.shape))].map(shape=>({shape,promoted:catalog.filter(t=>t.shape===shape&&t.prediction.status==='COMPLETE').length,
    partial:catalog.filter(t=>t.shape===shape&&t.prediction.status==='PARTIAL').length,unknown:catalog.filter(t=>t.shape===shape&&t.prediction.status==='UNKNOWN').length}));
  const categories=[...new Set(catalog.map(t=>t.classification.category))].map(category=>({category,count:catalog.filter(t=>t.classification.category===category).length}));
  const dynamicEffects=source.rows.filter(r=>r.table==='special_ability_phase_stat_effects_tables'&&/resistance|weakness/.test(r.row.stat)).map(r=>({sourceId:r.id,...r.row,
    phase:source.rows.find(p=>p.table==='special_ability_phases_tables'&&p.row.id===r.row.phase)?.row??null,
    ability:source.rows.find(a=>a.table==='unit_special_abilities_tables'&&a.row.key===r.row.phase)?.row??null,
    admission:'EXCLUDED_FROM_BASE_FIELDS'}));
  const characters=source.rows.filter(r=>r.table==='main_units_tables'&&!byId.has('ca_unit_'+r.row.unit)).map(root=>{
    const land=source.rows.find(r=>r.table==='land_units_tables'&&r.row.key===root.row.land_unit);
    return {mainKey:root.row.unit,landKey:land?.row.key,mount:land?.row.mount,raw:land?Object.fromEntries(Object.entries(fields).map(([k,f])=>[k,land.row[f]])):null,
      status:'AUDITED_OUTSIDE_UNIT_SLICE',reason:'Separate Character canonical/mount schema; no character resistance fields written',uiReading:null};
  });
  const candidateComparisons=Object.entries(truth.manualReference.expected).map(([kind,expected])=>{
    const raw=byId.get(truth.manualReference.id).facts[kind].value;
    return {id:truth.manualReference.id,kind,expected,RAW_PERCENT_POINTS:{actual:raw,matches:raw===expected},RAW_X100:{actual:raw*100,matches:raw*100===expected},ONE_MINUS_RAW_PERCENT:{actual:100-raw,matches:100-raw===expected},FRACTION:{actual:raw/100,matches:raw/100===expected}};
  });
  const report={format:'ca-base-resistance-report-v1',baselineCommit:manifest.baselineCommit,gameVersion:manifest.gameVersion,snapshotId:manifest.snapshotId,
    inputs:manifest.inputs,summary,structures,categories,rawComparisons,referenceComparisons,candidateComparisons,dynamicEffects,characters,
    confidenceLimit:truth.limit,held:catalog.filter(t=>t.prediction.status!=='COMPLETE').map(t=>({id:t.id,review:t.prediction.review})),sourceRows,joinPaths,catalog};
  const sourceHash=digest(report),projection={format:'unit-base-resistance-admissions-v1',gameVersion:manifest.gameVersion,snapshotId:manifest.snapshotId,sourceHash,reportReference:folder+'report.json',
    admissions:catalog.filter(t=>Object.keys(t.prediction.values).length).map(t=>({id:t.id,mainKey:t.mainKey,landKey:t.landKey,originalResistances:t.originalResistances,
      values:t.prediction.values,status:t.prediction.status,kind:'CA_EXPLICIT_BASE_PERCENTAGE_POINTS',rule:'EXACT_LAND_UNIT_DAMAGE_MOD_FIELDS',confidence:'VERIFIED_SCHEMA_AND_GAME_FACING_LABELS',reportPointer:'/catalog/'+catalog.indexOf(t)}))};
  return {report:JSON.parse(serialize(report)),projection};
}
