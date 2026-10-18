import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadSource as loadRecruitment} from '../recruitment/source.mjs';
import {recruitmentGraph,reference} from '../recruitment/predict.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';

const folder='tools/wh3-importer/building-wiki/';
const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const json=value=>JSON.stringify(value,null,2)+'\n';
export const unknown=reason=>({status:'UNKNOWN',value:null,reason});
export function numericField(graph,row,field) {
  if(!row)return unknown('Exact building_levels 원본 행 미확인');
  const definition=graph.field(row,field),value=row.row[field];
  if(definition?.field_type!=='I32'||typeof value!=='number'||!Number.isSafeInteger(value)||value<0)
    return unknown(`${field}: 올바른 원본 정수 또는 processed schema 미확인`);
  return {status:'VERIFIED',value,field,reference:reference(row)};
}
export const cleanLoc=text=>text.replace(/\[\[img:[^\]]*\]\]\[\[\/img\]\]/g,'').replace(/\\+n/g,' ').trim();
export function formatEffect(text,value) {
  return cleanLoc(text).replace(/%\+n/g,(value>0?'+':'')+value).replace(/%n/g,String(value));
}

export function buildBuildingAdmission(source=read(folder+'source.json'),manifest=read(folder+'manifest.json')) {
  assert.equal(source.provenance.gameVersion,'9.0.4.0','Building source version drift');
  assert.equal(source.provenance.gameVersion,manifest.gameVersion);
  assert.equal(digest(source),manifest.sourceHash,'Building source snapshot/payload drift');
  assert.equal(digest(snapshotIdentity(source.provenance)),source.snapshotId);
  assert.equal(source.koreanPack.pfh_file_type,'Release');
  assert.equal(source.koreanPack.sha256,'b8433f8d430c3c97d4db2873e1cacfef5a2ea020587238a70f9ba53b54f84c01','Korean pack drift');
  const registry=read('src/data/unitRecruitmentAdmissions.json'),selection=read(folder+'selection.json');
  assert.equal(registry.snapshotId,manifest.recruitmentSnapshotId);
  assert.deepEqual(source.keys,selection.keys);assert.equal(new Set(source.keys).size,18);
  const graph=recruitmentGraph(source),oldGraph=recruitmentGraph(loadRecruitment());
  const exact=(table,field,key)=>{const rows=graph.get(table,field,key);assert.equal(rows.length,1,`Non-exact ${table}.${field}: ${key}`);return rows[0];};
  const linked=(row,field)=>{const rows=graph.links(row,field);assert.equal(rows.length,1,`Missing/ambiguous ${row.id}.${field}`);return rows[0];};
  const loc=key=>{
    const matches=source.localisations.filter(r=>r.row.key===key);
    if(matches.length!==1||!matches[0].row.text||matches[0].row.text.includes('{{tr:'))return unknown(`공식 한국어 Loc 누락·중복·미해결: ${key}`);
    const row=matches[0];assert.equal(row.sourcePack,'local_kr.pack');assert.equal(digest(row.row),row.hash);
    return {status:'VERIFIED',value:row.row.text,field:key,reference:{table:'Loc',key:{key},rowId:row.hash}};
  };
  const comparison=[];
  const admissions=source.keys.map(key=>{
    const row=exact('building_levels','level_name',key),building=registry.buildings[key];
    assert(building&&graph.covered('building_levels','level_name',key));
    assert.equal(row.row.chain,building.chainKey);assert.equal(row.row.level,building.stage);
    assert.equal(row.row.primary_slot_building_building_level_requirement,building.requiredPrimaryBuildingLevel);
    const variants=graph.get('building_culture_variants','building',key);
    assert.equal(variants.length,1);const variant=variants[0];
    assert.equal(linked(variant,'building').id,row.id);assert.equal(variant.row.culture,'wh_main_brt_bretonnia');
    assert.equal(variant.row.disables,false);
    const nameKey='building_culture_variants_name_'+['building','culture','subculture','faction'].map(f=>variant.row[f]).join('');
    assert(source.schemas.find(s=>s.table==='building_culture_variants_tables')?.localisedFields.some(f=>f.name==='name'));
    const effectRows=graph.get('building_effects_junction','building',key);
    assert(graph.covered('building_effects_junction','building',key),'Effect list selection is not closed');
    // Coverage is complete even for a zero-row result; an absent query is never
    // promoted to an empty effect list or zero income.
    const items=effectRows.map(effectRow=>{
      const r=effectRow.row,definition=linked(effectRow,'effect'),scope=linked(effectRow,'effect_scope');
      assert.equal(linked(effectRow,'building').id,row.id);
      for(const field of ['value','value_damaged','value_ruined'])assert.equal(typeof r[field],'number');
      assert([r.value,r.value_damaged,r.value_ruined].every(Number.isFinite));
      const name=loc('effects_description_'+r.effect),officialScope=loc('campaign_effect_scopes_localised_text_'+r.effect_scope);
      const rule=manifest.incomeRules[r.effect];
      const bonusRows=graph.get('effect_bonus_value_basic_junction','effect',r.effect);
      if(rule)assert(bonusRows.some(b=>b.row.bonus_value_id===rule.bonus&&linked(b,'effect').id===definition.id),'Income bonus meaning drift');
      let condition=null;
      if(r.context_requirement){const context=linked(effectRow,'context_requirement');
        assert.equal(context.row.expression,'Owner.CultureKey == "wh_main_brt_bretonnia"','Unreviewed condition');
        condition='소유자 문화가 브레토니아일 때';}
      assert.equal(scope.row.ownership,'yours');assert.equal(scope.row.territory,'any');
      assert(manifest.scopeLabels[r.effect_scope],'Unreviewed scope');
      const template=name.status==='VERIFIED'?name.value:null;
      return {key:r.effect,name:template===null?null:cleanLoc(template),
        text:template===null?null:formatEffect(template,r.value),
        nameStatus:name.status,value:r.value,valueDamaged:r.value_damaged,valueRuined:r.value_ruined,
        unit:rule?.unit??(template?.includes('%n%')||template?.includes('%+n%')?'percent':'raw'),
        scope:manifest.scopeLabels[r.effect_scope],scopeKey:r.effect_scope,
        officialScope:officialScope.status==='VERIFIED'?cleanLoc(officialScope.value):null,
        scopeDefinition:scope.row,condition,contextKey:r.context_requirement,
        kind:rule?'INCOME':'OTHER',incomeKind:rule?.kind??null,
        hidden:definition.row.priority===0,reference:reference(effectRow),definitionReference:reference(definition),scopeReference:reference(scope),
        localisation:name,scopeLocalisation:officialScope};
    });
    const income=items.filter(e=>e.kind==='INCOME');
    const baseIncome=income.filter(e=>e.incomeKind==='BASE');
    assert(baseIncome.length<=1,'Multiple base income rows need an explicit review; never total unrelated scopes');
    const old=oldGraph.get('building_levels','level_name',key)[0];
    comparison.push({key,costMatch:old.row.create_cost===row.row.create_cost,turnsMatch:old.row.create_time===row.row.create_time});
    return {key,chainKey:row.row.chain,stage:row.row.level,koreanName:loc(nameKey),variantReference:reference(variant),
      constructionCost:numericField(graph,row,'create_cost'),constructionTurns:numericField(graph,row,'create_time'),
      effects:{status:'COMPLETE',items},
      income:{status:'COMPLETE',effects:income.map(e=>e.reference.rowId),baseGold:baseIncome[0]?.value??0}};
  });
  assert.equal(new Set(admissions.map(a=>a.chainKey)).size,6);
  const coverage=Object.fromEntries(['koreanName','constructionCost','constructionTurns','effects','income'].map(field=>[field,
    {verified:admissions.filter(a=>['VERIFIED','COMPLETE'].includes(a[field].status)).length,held:admissions.filter(a=>a[field].status==='UNKNOWN').length,total:18}]));
  return {format:'bounded-building-wiki-admission-v1',gameVersion:manifest.gameVersion,snapshotId:source.snapshotId,
    recruitmentGameVersion:registry.gameVersion,recruitmentSnapshotId:manifest.recruitmentSnapshotId,sourceHash:digest(source),koreanPackHash:source.koreanPack.sha256,
    coverage,effectCoverage:{rows:admissions.flatMap(a=>a.effects.items).length,definitions:source.rows.filter(r=>r.table==='effects_tables').length,
      officialKoreanDescriptions:source.localisations.filter(r=>r.row.key.startsWith('effects_description_')).length,
      officialScopeLabels:source.localisations.filter(r=>r.row.key.startsWith('campaign_effect_scopes_')).length,
      missingOfficialScopeLabels:source.missingLocKeys.length,scopeDefinitions:source.rows.filter(r=>r.table==='campaign_effect_scopes_tables').length},comparison,admissions};
}
export function replayBuildingAdmission(write=false) {
  const projection=buildBuildingAdmission();
  for(const file of [folder+'admission.json','src/data/buildingWikiAdmissions.json']){
    if(write)fs.writeFileSync(file,json(projection));else assert.deepEqual(read(file),projection,`Building admission replay drift: ${file}`);
  }
  console.log(json({coverage:projection.coverage,effectCoverage:projection.effectCoverage,comparisonMatches:projection.comparison.filter(c=>c.costMatch&&c.turnsMatch).length}));
  console.log('Building wiki admission '+(write?'written':'--check PASS'));return projection;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===fs.realpathSync(process.argv[1]))replayBuildingAdmission(process.argv.includes('--write'));
