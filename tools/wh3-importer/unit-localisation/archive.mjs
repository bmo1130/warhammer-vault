import assert from 'node:assert/strict';
import {evidenceHash} from '../promotion/first-batch.mjs';
import {rosterSourceHash} from '../production-growth/roster.mjs';
import {specialLordNotices,resolveCharacterLoc} from '../production-growth/characters.mjs';
import {koreanPackHash,resolveKoreanText} from './review.mjs';
import {isReviewedSource} from '../reviewed-snapshots.mjs';

export const archiveSourceHash='c1021959d607bc3b40a85cda2d314c0ebef622f7e7d371c92ea40d91a4eae14f';
const one=(rows,table,field,value)=>{const found=rows.filter(r=>r.table===table&&r.row[field]===value);assert.equal(found.length,1,`Missing/ambiguous ${table}.${field}=${value}`);return found[0];};
const text=(rows,key)=>resolveCharacterLoc(rows,key).text;
const noticeName=value=>value.match(/\[\[col:yellow\]\](.*?)\[\[\/col\]\]/)?.[1];
function nativeReference(roster,row,field,target,targetField){
  const schema=roster.schemas.find(s=>s.table===row.table&&s.version===row.tableVersion);
  assert.deepEqual(schema?.fields.find(f=>f.name===field)?.is_reference,[target,targetField],'Native name reference drift');
}
export function archiveInputsHash(data){return evidenceHash(data);}
export function buildArchiveRequests(roster,data){
  const rows=roster.preflight.rows,requests=[];
  for(const f of data.factions){
    const seed=roster.catalog.find(c=>c.factionId===f.id);assert(seed,'Unlinked faction identity');
    const culture=one(rows,'cultures_tables','key',seed.cultureKey),key=`cultures_name_${seed.cultureKey}`;
    requests.push({type:'faction',category:'faction',id:f.id,originalName:f.name,englishName:text(rows,key),cultureKey:seed.cultureKey,
      recipe:{mode:'DIRECT',keys:[key]},sourceRowIds:[culture.id]});
  }
  const collections=[['lord',data.lords],['hero',data.heroes],['legacy_lord',data.legacyCharacters.filter(c=>c.entityType==='lord')],['legacy_hero',data.legacyCharacters.filter(c=>c.entityType==='hero')]];
  for(const [type,items]of collections)for(const c of items){
    const subtype=one(rows,'agent_subtypes_tables','key',c.subtypeKey);
    nativeReference(roster,subtype,'associated_unit_override','main_units','unit');
    assert.equal(subtype.row.associated_unit_override,c.mainKey);
    const main=one(rows,'main_units_tables','unit',c.mainKey),land=one(rows,'land_units_tables','key',c.landKey);
    nativeReference(roster,main,'land_unit','land_units','key');assert.equal(main.row.land_unit,c.landKey);
    const sourceRowIds=[subtype.id,main.id,land.id];
    for(const alias of c.subtypeAliases){
      const row=one(rows,'agent_subtypes_tables','key',alias);nativeReference(roster,row,'associated_unit_override','main_units','unit');
      assert.equal(row.row.associated_unit_override,c.mainKey);sourceRowIds.push(row.id);
    }
    const unique=rows.filter(r=>r.table==='unique_agents_tables'&&r.row.agent_subtype===c.subtypeKey);assert(unique.length<=1,'Ambiguous named character');
    const nameKeys=[],nameReferences=[];
    if(unique.length){
      const u=unique[0];nativeReference(roster,u,'agent_subtype','agent_subtypes','key');sourceRowIds.push(u.id);
      for(const field of ['forename','surname','other_name','clan_name'])if(u.row[field]){
        nativeReference(roster,u,field,'names','id');
        const nameId=u.row[field],localisationKey=`names_name_${nameId}`;
        assert(/^\d+$/.test(nameId)&&Number.isSafeInteger(Number(nameId))&&String(Number(nameId))===nameId,'Non-exact numeric name reference');
        const englishPart=resolveCharacterLoc(rows,localisationKey);
        sourceRowIds.push(...englishPart.sourceRowIds);
        nameReferences.push({uniqueRowId:u.id,field,nameId,localisationKey,emptyEnglish:englishPart.text===''});
        // CA assigns nonempty IDs to empty surname/clan placeholders. They
        // contribute no name text; an absent Korean translation of an exact
        // empty English part is not a missing character display name.
        if(englishPart.text!=='')nameKeys.push(localisationKey);
      }
    }
    const properName=nameKeys.map(k=>text(rows,k)).filter(Boolean).join(' ');
    const overrideKey=`agent_subtypes_onscreen_name_override_${c.subtypeKey}`;
    const override=rows.some(r=>r.table==='Loc'&&r.row.key===overrideKey)?text(rows,overrideKey):null;
    let recipe,englishName;
    if(type.startsWith('legacy_')){
      recipe={mode:'DIRECT',keys:[`land_units_onscreen_name_${c.landKey}`]};englishName=text(rows,recipe.keys[0]);
    }else if(specialLordNotices[c.subtypeKey]){
      recipe={mode:'NAMED_NOTICE',keys:[specialLordNotices[c.subtypeKey]]};englishName=noticeName(text(rows,recipe.keys[0]));
    }else if(properName){recipe={mode:'NAME_PARTS',keys:nameKeys};englishName=properName;}
    else{
      const key=override&&!['Legendary Hero','Legendary Lord'].includes(override)?overrideKey:`land_units_onscreen_name_${c.landKey}`;
      recipe={mode:'DIRECT',keys:[key]};englishName=text(rows,key);
    }
    assert.equal(englishName,c.name,'Existing canonical English display recipe drift');
    requests.push({type,category:type.startsWith('legacy_')?type:c.characterKind,id:c.id,originalName:c.name,englishName,
      subtypeKey:c.subtypeKey,subtypeAliases:c.subtypeAliases,mainKey:c.mainKey,landKey:c.landKey,recipe,sourceRowIds,nameReferences});
  }
  assert.equal(new Set(requests.map(r=>r.id)).size,requests.length,'Duplicate archive identity');
  for(const alias of data.characterAliases){const request=requests.find(r=>r.id===alias.canonicalId);assert(request&&request.subtypeAliases.includes(alias.subtypeKey),'Alias canonical name link drift');}
  return requests;
}

export function reviewArchiveLocalisation(source,roster,data){
  assert.equal(evidenceHash(source),archiveSourceHash,'Archive Korean raw source hash drift');
  assert.equal(source.format,'warhammer-vault-archive-ko-source-v1');assert.equal(source.gameExecuted,false);
  assert.equal(source.rosterSourceHash,rosterSourceHash);assert.equal(source.inputsHash,archiveInputsHash(data),'Archive identity baseline drift');
  assert(isReviewedSource(source.provenance,''));assert.deepEqual(source.provenance,roster.provenance);
  assert.equal(source.koreanPack.sha256,koreanPackHash);assert.equal(source.koreanPack.file_name,'local_kr.pack');assert.equal(source.koreanPack.pfh_file_type,'Release');
  const requests=buildArchiveRequests(roster,data);assert.deepEqual(source.requests,requests,'Exact name request inventory drift');
  const nameIds=[...new Set(requests.flatMap(r=>r.nameReferences??[]).map(r=>r.nameId))].sort();
  assert.deepEqual([...source.nameRows.map(r=>String(r.row.id))].sort(),nameIds,'Incomplete/ambiguous native name targets');
  for(const id of nameIds){const row=source.nameRows.find(r=>String(r.row.id)===id),schema=source.nameSchemas.find(s=>s.table===row.table&&s.version===row.tableVersion);
    assert(row.table==='names_tables'&&Number.isSafeInteger(row.row.id)&&row.key.id===row.row.id&&schema?.fields.some(f=>f.name==='id'&&f.is_key&&f.field_type==='I64'),'Unverified numeric name target');}
  const inventory=new Set(source.inventory.map(f=>f.path));assert.equal(inventory.size,source.inventory.length);
  assert.equal(new Set(source.rows.map(r=>r.id)).size,source.rows.length);
  for(const r of source.rows){assert(inventory.has(r.path));const s=source.schemas.find(s=>s.table===r.table&&s.version===r.tableVersion);assert(s?.fields.some(f=>f.name==='key'&&f.is_key)&&s.fields.some(f=>f.name==='text'));}
  const admissions=[],holds=[];
  for(const r of requests){
    // Exact localised field convention for direct/name-part keys. Recruitment
    // notices retain the already reviewed, identity-specific English recipe.
    if(r.recipe.mode!=='NAMED_NOTICE')for(const key of r.recipe.keys){
      const table=key.startsWith('names_name_')?'names_tables':key.startsWith('cultures_')?'cultures_tables':key.startsWith('agent_subtypes_')?'agent_subtypes_tables':'land_units_tables';
      const field=['names_tables','cultures_tables'].includes(table)?'name':table==='agent_subtypes_tables'?'onscreen_name_override':'onscreen_name';
      const raw=table==='names_tables'?source.nameRows.find(x=>String(x.row.id)===key.slice('names_name_'.length)):r.sourceRowIds.map(id=>roster.preflight.rows.find(x=>x.id===id)).find(x=>x.table===table);
      const convention=source.localisationConventions.find(c=>c.table===table&&c.version===raw.tableVersion);assert(convention?.localised_fields.some(f=>f.name===field),'Unverified archive name convention');
    }
    try{
      const emptyParts=[];
      const resolved=r.recipe.mode==='NAME_PARTS'?(r.nameReferences??[]).map(ref=>{
        if(ref.emptyEnglish&&!source.rows.some(row=>row.row.key===ref.localisationKey)){
          assert(source.optionalMissingKeys.includes(ref.localisationKey),'Missing empty-part absence evidence');
          emptyParts.push({key:ref.localisationKey,reason:'EXACT_EMPTY_ENGLISH_NON_NAME_SLOT_NO_KOREAN_ROW'});
          return{text:'',sourceRowIds:[]};
        }
        return resolveKoreanText(source.rows,ref.localisationKey);
      }):r.recipe.keys.map(k=>resolveKoreanText(source.rows,k));
      const name=r.recipe.mode==='NAME_PARTS'?resolved.map(v=>v.text).filter(Boolean).join(' '):r.recipe.mode==='NAMED_NOTICE'?noticeName(resolved[0].text):resolved[0].text;
      assert(typeof name==='string'&&name.trim()&&!name.includes('{{')&&!name.includes('[[')&&!/[\r\n]/.test(name)&&/[가-힣]/.test(name),'UNRESOLVED_OR_NON_KOREAN_NAME');
      admissions.push({...r,name,emptyParts,sourceRowIds:[...new Set([...r.sourceRowIds,...(r.nameReferences??[]).map(ref=>source.nameRows.find(x=>String(x.row.id)===ref.nameId).id),...resolved.flatMap(v=>v.sourceRowIds)])]});
    }catch(e){holds.push({...r,reason:e.message});}
  }
  const categories=['faction','legendary_lord','generic_lord','special_lord','legendary_hero','generic_hero','special_hero','legacy_lord','legacy_hero'];
  const summary=Object.fromEntries(categories.map(category=>{const rs=requests.filter(r=>r.category===category),known=admissions.filter(a=>a.category===category).length;return[category,{total:rs.length,before:rs.filter(r=>/[가-힣]/.test(r.originalName)).length,after:known,unknown:rs.length-known}];}));
  return{format:'warhammer-vault-archive-ko-admission-v1',locale:'ko',gameVersion:source.provenance.gameVersion,sourceHash:archiveSourceHash,
    rosterSourceHash,inputsHash:source.inputsHash,koreanPack:source.koreanPack,summary,exactLocs:source.rows.length,
    admissions,holds,aliases:data.characterAliases.map(a=>({...a,localisationId:admissions.find(r=>r.id===a.canonicalId)?.id??null}))};
}
