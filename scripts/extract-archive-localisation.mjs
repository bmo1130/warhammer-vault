import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {openRawSource,resolveOptions} from '../tools/wh3-importer/extract.mjs';
import {sha256File} from '../tools/wh3-importer/hash.mjs';
import {decodeSource} from '../tools/wh3-importer/expansion-batch-01/compact.mjs';
import {rosterSourceHash} from '../tools/wh3-importer/production-growth/roster.mjs';
import {portable} from '../tools/wh3-importer/expansion-batch-01/projection.mjs';
import {evidenceHash} from '../tools/wh3-importer/promotion/first-batch.mjs';
import {buildArchiveRequests,archiveInputsHash} from '../tools/wh3-importer/unit-localisation/archive.mjs';
import {inspectTables} from '../tools/wh3-importer/inspect.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const data=Object.fromEntries(['factions','lords','heroes','legacyCharacters','characterAliases'].map(p=>[p,read(`src/data/${p}.json`)]));
const roster=decodeSource(read('tools/wh3-importer/faction-rosters/source.json'),rosterSourceHash);
const requests=buildArchiveRequests(roster,data);
const options=await resolveOptions(process.argv.slice(2)),s=await openRawSource(options);
try{
  assert.deepEqual(portable(s.metadata),roster.provenance,'Existing roster snapshot required');
  const pack=await s.reader.open(path.join(options.gamePath,'data','local_kr.pack'));
  const ids=[...new Set(requests.flatMap(r=>r.nameReferences??[]).map(r=>Number(r.nameId)))];
  const names=await inspectTables(s.reader,s.schema,[{table:'names_tables',where:[{field:'id',op:'oneOf',value:ids}]}],1000);
  const index=new Map(),schemas=new Map(),inventory=[];
  for(const file of pack.files.filter(f=>f.file_type==='Loc').sort((a,b)=>a.path.localeCompare(b.path))){
    const decoded=await s.reader.decode(pack,file.path);
    schemas.set(`Loc:${decoded.tableVersion}`,{table:'Loc',version:decoded.tableVersion,fields:decoded.fields});inventory.push({path:file.path,rowCount:decoded.rows.length});
    for(const row of decoded.rows){const rows=index.get(row.key)??[];rows.push({id:`kr:${file.path}:${row.key}`,table:'Loc',key:{key:row.key},sourcePack:pack.info.file_name,path:file.path,tableVersion:decoded.tableVersion,row});index.set(row.key,rows);}
  }
  const selected=new Map(),missing=[],optionalMissing=[];
  const visit=(key,stack=[],optional=false)=>{if(stack.includes(key))return;const rows=index.get(key)??[];if(!rows.length)(optional?optionalMissing:missing).push(key);
    for(const r of rows){selected.set(r.id,r);for(const match of r.row.text.matchAll(/\{\{tr:([^}]+)\}\}/g))visit(match[1],[...stack,key],optional);}};
  requests.forEach(r=>r.recipe.keys.forEach(k=>visit(k)));
  requests.forEach(r=>(r.nameReferences??[]).filter(ref=>ref.emptyEnglish).forEach(ref=>visit(ref.localisationKey,[],true)));
  const localisationConventions=[];
  for(const table of ['cultures_tables','land_units_tables','agent_subtypes_tables','names_tables']){
    const versions=new Set([...roster.preflight.rows,...names.rows].filter(r=>r.table===table).map(r=>r.tableVersion));
    for(const d of s.schema.definitions[table].filter(d=>versions.has(d.version)))localisationConventions.push({table,version:d.version,localised_fields:d.localised_fields});
  }
  const result={format:'warhammer-vault-archive-ko-source-v1',gameExecuted:false,rosterSourceHash,inputsHash:archiveInputsHash(data),
    provenance:portable(s.metadata),koreanPack:{file_name:pack.info.file_name,pfh_file_type:pack.info.pfh_file_type,sizeBytes:fs.statSync(pack.info.file_path).size,sha256:await sha256File(pack.info.file_path)},
    nameRows:portable(names.rows),nameSchemas:names.schemas,nameCoverage:names.coverage,
    schemas:[...schemas.values()],localisationConventions,inventory,requests,rows:[...selected.values()].sort((a,b)=>a.id.localeCompare(b.id)),missingKeys:[...new Set(missing)].sort(),optionalMissingKeys:[...new Set(optionalMissing)].sort()};
  fs.writeFileSync('tools/wh3-importer/unit-localisation/archive-source.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({requests:requests.length,rows:result.rows.length,missing:result.missingKeys,sourceHash:evidenceHash(result)},null,2));
}finally{await s.client.close();}
