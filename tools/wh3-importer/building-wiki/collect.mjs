import fs from 'node:fs';
import assert from 'node:assert/strict';
import {openRawSource,resolveOptions} from '../extract.mjs';
import {inspectTables} from '../inspect.mjs';
import {resolveReferenceTable} from '../trace-unit.mjs';
import {sha256File} from '../hash.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';

const plan=JSON.parse(fs.readFileSync('tools/wh3-importer/building-wiki/selection.json'));
const source=await openRawSource(await resolveOptions([])),rows=new Map(),schemas=new Map(),coverage=[],unavailable=[];
try {
  assert.equal(source.metadata.gameVersion,'9.0.4.0','This bounded refresh is explicitly for 9.0.4.0');
  const selected=table=>[...rows.values()].filter(r=>r.table===table);
  const select=async(table,field,values)=>{
    const keys=[...new Set(values.filter(v=>v!==''&&v!==undefined))];if(!keys.length)return;
    const tables=await source.reader.tables(table);
    if(!tables.length){unavailable.push({table,field,keys,reason:'No table files; not a verified empty relation'});return;}
    const result=await inspectTables(source.reader,source.schema,[{table,where:[{field,op:'oneOf',value:keys}]}],1000);
    result.rows.forEach(r=>rows.set(r.id,r));result.schemas.forEach(s=>schemas.set(s.table+':'+s.version,s));coverage.push(...result.coverage);
    console.log(table,selected(table).length);
  };
  const forward=async(table,field)=>{
    if(!selected(table).length)return;
    const refs=(await source.reader.tables(table)).map(t=>t.fields.find(f=>f.name===field)?.is_reference);
    assert(refs.length&&refs.every(r=>Array.isArray(r)&&JSON.stringify(r)===JSON.stringify(refs[0])),table+'.'+field);
    await select(resolveReferenceTable(refs[0][0],source.schema)??refs[0][0]+'_tables',refs[0][1],selected(table).map(r=>r.row[field]));
  };
  await select('building_levels_tables','level_name',plan.keys);
  await select('building_culture_variants_tables','building',plan.keys);
  await select('building_effects_junction_tables','building',plan.keys);
  await forward('building_effects_junction_tables','effect');
  await forward('building_effects_junction_tables','effect_scope');
  await forward('building_effects_junction_tables','context_requirement');
  await select('effect_bonus_value_basic_junction_tables','effect',selected('effects_tables').map(r=>r.row.effect));
  if(selected('effect_bonus_value_basic_junction_tables').length)await forward('effect_bonus_value_basic_junction_tables','bonus_value_id');
  for(const field of ['location','ownership','source','target','territory'])await forward('campaign_effect_scopes_tables',field);
  console.log('Reading official Korean Loc...');
  const kr=await source.reader.open((await resolveOptions([])).gamePath+'/data/local_kr.pack');
  const koreanPack={...kr.info,sha256:await sha256File(kr.info.file_path)};
  const nameKeys=selected('building_culture_variants_tables').map(r=>'building_culture_variants_name_'+['building','culture','subculture','faction'].map(f=>r.row[f]).join(''));
  const locKeys=[...new Set([...nameKeys,...selected('effects_tables').map(r=>'effects_description_'+r.row.effect),
    ...selected('campaign_effect_scopes_tables').map(r=>'campaign_effect_scopes_localised_text_'+r.row.key)])];
  const localisations=[],locCoverage=[];
  // Query every CA Korean Loc file; record exact match counts, including zero.
  for(const file of kr.files.filter(f=>f.file_type==='Loc')){
    const decoded=await source.reader.decode(kr,file.path);
    schemas.set('Loc:'+decoded.tableVersion,{table:'Loc',version:decoded.tableVersion,fields:decoded.fields,localisedFields:[]});
    for(const key of locKeys){
      const matches=decoded.rows.filter(r=>r.key===key);
      if(matches.length)locCoverage.push({path:file.path,key,matches:matches.length});
      for(const row of matches)localisations.push({sourcePack:'local_kr.pack',path:file.path,row,hash:digest(row)});
    }
  }
  const relationships=[];
  for(const from of rows.values())for(const field of schemas.get(from.table+':'+from.tableVersion).fields.filter(f=>f.is_reference)){
    const table=resolveReferenceTable(field.is_reference[0],source.schema);
    for(const to of selected(table).filter(r=>r.row[field.is_reference[1]]===from.row[field.name]))
      relationships.push({from:from.id,to:to.id,field:field.name,targetField:field.is_reference[1],value:from.row[field.name]});
  }
  const result={format:'ca-bounded-building-source-v1',extractedAt:new Date().toISOString(),gameExecuted:false,keys:plan.keys,provenance:source.metadata,
    snapshotId:digest(snapshotIdentity(source.metadata)),koreanPack,schemas:[...schemas.values()],rows:[...rows.values()],coverage,relationships,unavailable,
    localisations,locCoverage,requestedLocKeys:locKeys,missingLocKeys:locKeys.filter(key=>!localisations.some(r=>r.row.key===key))};
  fs.writeFileSync('generated/wh3/building-wiki/raw.json',JSON.stringify(result,null,2)+'\n');
  console.log('Saved',rows.size,'DB rows;',localisations.length,'Loc rows;',result.missingLocKeys.length,'missing keys');
} finally {await source.client.close();}
