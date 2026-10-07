import assert from 'node:assert/strict';
import {evidenceHash} from '../promotion/first-batch.mjs';
import {isReviewedSource} from '../reviewed-snapshots.mjs';
import {discoverRoster,rosterSourceHash} from '../production-growth/roster.mjs';

export const sourceHash='0c2c5074655bfaccbe851062d924d541704540fcca9d66e8925fedb68aa64716';
export const koreanPackHash='c8c283ed5ef9c8f1ce1a7437731342829a48048180d8890b1cf640fa1721426d';
export const unitsHash='871daf7a4aeeef0c941908e6509dac68158a3f2842d25ab4b333651ab24df14c';

// No name matching, suffix heuristics, machine translation or pack precedence.
// Every reference must have exactly one raw row; ambiguity stays HOLD.
export function resolveUnitLoc(rows,key,stack=[]) {
  assert(!stack.includes(key),`CYCLIC_LOC: ${key}`);
  const matches=rows.filter(r=>r.table==='Loc'&&r.row.key===key);
  assert.equal(matches.length,1,`MISSING_OR_AMBIGUOUS_LOC: ${key}`);
  const r=matches[0];
  assert.equal(r.key.key,key,'Loc row key drift');
  assert.equal(r.sourcePack,'local_kr.pack','Wrong Loc language pack');
  assert.equal(r.id,`kr:${r.path}:${key}`,'Loc source pointer drift');
  assert(typeof r.row.text==='string'&&r.row.text.trim(),'EMPTY_LOC');
  const sourceRowIds=[r.id];
  const text=r.row.text.replace(/\{\{tr:([^}]+)\}\}/g,(_,child)=>{const v=resolveUnitLoc(rows,child,[...stack,key]);sourceRowIds.push(...v.sourceRowIds);return v.text;});
  assert(!text.includes('{{')&&!text.includes('[[')&&!/[\r\n]/.test(text),'UNRESOLVED_OR_NON_NAME_MARKUP');
  assert(/[가-힣]/.test(text),'NO_KOREAN_TEXT');
  return {text,sourceRowIds:[...new Set(sourceRowIds)]};
}

export function reviewUnitLocalisation(source,roster,units) {
  assert.equal(evidenceHash(source),sourceHash,'Korean raw source hash drift');
  assert.equal(source.format,'warhammer-vault-unit-ko-source-v1');
  assert.equal(source.gameExecuted,false);
  assert.equal(source.rosterSourceHash,rosterSourceHash);
  assert.equal(source.unitsHash,unitsHash);
  assert.equal(evidenceHash(units),unitsHash,'Existing Unit facts drift');
  assert(isReviewedSource(source.provenance,''),'Unreviewed DB/schema/English source');
  assert.deepEqual(source.provenance,roster.provenance,'Source snapshot differs from roster');
  assert.equal(source.koreanPack.file_name,'local_kr.pack');
  assert.equal(source.koreanPack.pfh_file_type,'Release');
  assert.equal(source.koreanPack.sha256,koreanPackHash);
  const inventory=new Set(source.inventory.map(f=>f.path));
  assert.equal(inventory.size,source.inventory.length);
  assert.equal(new Set(source.rows.map(r=>r.id)).size,source.rows.length,'Duplicate Loc source ID');
  for(const r of source.rows){
    assert(inventory.has(r.path),'Loc outside decoded pack inventory');
    const schema=source.schemas.find(s=>s.table===r.table&&s.version===r.tableVersion);
    assert(schema?.fields.some(f=>f.name==='key'&&f.is_key)&&schema.fields.some(f=>f.name==='text'),'Unverified Loc schema');
  }
  const entries=new Map(discoverRoster(roster).flatMap(r=>r.units).map(e=>[e.id,e]));
  const production=units.filter(u=>u.gameVersion!=='sample');
  assert.deepEqual(source.requests.map(r=>r.id),production.map(u=>u.id),'Incomplete/duplicate Unit request inventory');
  const admissions=[],holds=[];
  for(const [i,u] of production.entries()){
    const request=source.requests[i],entry=entries.get(u.id);
    assert(entry&&request.mainKey===entry.mainKey&&request.landKey===entry.landKey&&request.localisationKey===entry.localisationKey&&request.englishName===entry.name&&u.name===entry.name,'Exact Unit/roster identity drift');
    const main=roster.preflight.rows.filter(r=>r.table==='main_units_tables'&&r.row.unit===request.mainKey);
    const land=roster.preflight.rows.filter(r=>r.table==='land_units_tables'&&r.row.key===request.landKey);
    assert.equal(main.length,1);assert.equal(land.length,1);
    assert.equal(main[0].row.land_unit,request.landKey);
    const mainSchema=roster.schemas.find(s=>s.table===main[0].table&&s.version===main[0].tableVersion);
    const ref=mainSchema.fields.find(f=>f.name==='land_unit').is_reference;
    assert.deepEqual(ref,['land_units','key'],'Main/land processed schema drift');
    const convention=source.localisationConventions.find(s=>s.table===land[0].table&&s.version===land[0].tableVersion);
    assert(convention?.localised_fields.some(f=>f.name==='onscreen_name'),'Unverified name convention');
    assert.equal(request.localisationKey,`land_units_onscreen_name_${request.landKey}`);
    assert.equal(u.gameVersion,source.provenance.gameVersion);
    try {
      const resolved=resolveUnitLoc(source.rows,request.localisationKey);
      admissions.push({...request,name:resolved.text,sourceRowIds:resolved.sourceRowIds});
    } catch(error){holds.push({...request,reason:error.message});}
  }
  return {format:'warhammer-vault-unit-ko-admission-v1',locale:'ko',gameVersion:source.provenance.gameVersion,sourceHash,rosterSourceHash,unitsHash,koreanPack:source.koreanPack,admissions,holds};
}
