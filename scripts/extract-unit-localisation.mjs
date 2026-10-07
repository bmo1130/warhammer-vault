import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {openRawSource,resolveOptions} from '../tools/wh3-importer/extract.mjs';
import {sha256File} from '../tools/wh3-importer/hash.mjs';
import {isReviewedSource} from '../tools/wh3-importer/reviewed-snapshots.mjs';
import {decodeSource} from '../tools/wh3-importer/expansion-batch-01/compact.mjs';
import {rosterSourceHash,discoverRoster} from '../tools/wh3-importer/production-growth/roster.mjs';
import {portable} from '../tools/wh3-importer/expansion-batch-01/projection.mjs';
import {evidenceHash} from '../tools/wh3-importer/promotion/first-batch.mjs';

const read=p=>JSON.parse(fs.readFileSync(p));
const units=read('src/data/units.json').filter(u=>u.gameVersion!=='sample');
const roster=decodeSource(read('tools/wh3-importer/faction-rosters/source.json'),rosterSourceHash);
const entries=new Map(discoverRoster(roster).flatMap(r=>r.units).map(e=>[e.id,e]));
const requests=units.map(u=>{const e=entries.get(u.id);assert(e&&e.name===u.name,'Exact existing roster identity/name required');return {id:u.id,mainKey:e.mainKey,landKey:e.landKey,localisationKey:e.localisationKey,englishName:u.name};});
const options=await resolveOptions(process.argv.slice(2));
const s=await openRawSource(options);
try {
  assert(isReviewedSource(s.metadata,''),'Requires the existing reviewed DB/schema/English snapshot');
  const pack=await s.reader.open(path.join(options.gamePath,'data','local_kr.pack'));
  const locFiles=pack.files.filter(f=>f.file_type==='Loc').sort((a,b)=>a.path.localeCompare(b.path));
  assert(locFiles.length,'No Korean Loc files');
  const index=new Map(),schemas=new Map(),inventory=[];
  for(const file of locFiles){
    const decoded=await s.reader.decode(pack,file.path);
    schemas.set(`Loc:${decoded.tableVersion}`,{table:'Loc',version:decoded.tableVersion,fields:decoded.fields});
    inventory.push({path:file.path,rowCount:decoded.rows.length});
    for(const row of decoded.rows){const rows=index.get(row.key)??[];rows.push({id:`kr:${file.path}:${row.key}`,table:'Loc',key:{key:row.key},sourcePack:pack.info.file_name,path:file.path,tableVersion:decoded.tableVersion,row});index.set(row.key,rows);}
  }
  const selected=new Map(),missing=[];
  const visit=(key,stack=[])=>{
    if(stack.includes(key))return; // Reviewer explicitly rejects cycles.
    const rows=index.get(key)??[];
    if(!rows.length){missing.push(key);return;}
    for(const r of rows){selected.set(r.id,r);for(const match of r.row.text.matchAll(/\{\{tr:([^}]+)\}\}/g))visit(match[1],[...stack,key]);}
  };
  requests.forEach(r=>visit(r.localisationKey));
  const versions=new Set(roster.preflight.rows.filter(r=>r.table==='land_units_tables').map(r=>r.tableVersion));
  const localisationConventions=s.schema.definitions.land_units_tables.filter(d=>versions.has(d.version)).map(d=>({table:'land_units_tables',version:d.version,localised_fields:d.localised_fields}));
  const result={format:'warhammer-vault-unit-ko-source-v1',gameExecuted:false,rosterSourceHash,unitsHash:evidenceHash(read('src/data/units.json')),provenance:portable(s.metadata),koreanPack:{file_name:pack.info.file_name,pfh_file_type:pack.info.pfh_file_type,sizeBytes:fs.statSync(pack.info.file_path).size,sha256:await sha256File(pack.info.file_path)},schemas:[...schemas.values()],localisationConventions,inventory,requests,rows:[...selected.values()].sort((a,b)=>a.id.localeCompare(b.id)),missingKeys:[...new Set(missing)].sort()};
  fs.mkdirSync('tools/wh3-importer/unit-localisation',{recursive:true});
  fs.writeFileSync('tools/wh3-importer/unit-localisation/source.json',JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({requests:requests.length,rows:result.rows.length,missing:result.missingKeys.length,sourceHash:evidenceHash(result),koreanPack:result.koreanPack},null,2));
} finally {await s.client.close();}
