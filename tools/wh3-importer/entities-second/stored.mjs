import fs from 'node:fs';
import {decodeSource as decodeCompact} from '../expansion-batch-01/compact.mjs';
import {decodeSource,encodeSource} from '../missile-rules/source.mjs';
import {digest,snapshotIdentity} from '../runtime-evidence/contract.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const old=read('tools/wh3-importer/unit-entities/rules-report.json');
const snapshotId=old.catalog[0].staticSnapshotId;
const wanted=new Set(['main_units_tables','land_units_tables','battlefield_engines_tables','mounts_tables','battle_entities_tables','land_unit_articulated_vehicles_tables']);
const records=new Map(),schemas=new Map(),pins=[];
function walk(v,file,provenance){
  if(!v||typeof v!=='object')return;
  provenance=v.provenance??provenance;
  if(v.id&&wanted.has(v.table)&&v.row&&provenance){
    let identity;try{identity=digest(snapshotIdentity(provenance));}catch{}
    if(identity===snapshotId){const key=v.table+':'+(v.row.key??v.row.unit),prior=records.get(key);
      if(prior&&digest(prior.row.row)!==digest(v.row))throw Error('Conflicting stored row '+key);
      if(!prior)records.set(key,{row:v,file,provenance});}
  }
  if(v.table&&v.fields&&wanted.has(v.table))schemas.set(v.table+':'+v.version,v);
  for(const x of Object.values(v))walk(x,file,provenance);
}
function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+e.name;
  if(e.isDirectory()){if(!['.local','entities-second'].includes(e.name))scan(p);}
  else if(/\.json$/.test(p)&&/source|sources/.test(e.name)){let v=read(p);
    try{if(v.format==='ca-missile-source-gzip-json-v1')v=decodeSource(v);else if(v.rowMetadata)v=decodeCompact(v,v.expandedSha256);}catch{continue;}
    const before=records.size;walk(v,p,v.provenance);if(records.size>before)pins.push({file:p,hash:digest(read(p))});
  }
}}
scan('tools/wh3-importer');
// Recover bounded archived CA captures too; preserve their original byte hash
// in the new committed envelope rather than requiring ignored files at replay.
const archives=[];
for(const file of ['generated/wh3/runtime-evidence/cco-p0-9.0.2/static-candidates.json','generated/wh3/runtime-evidence/cco-p0-ultra-9.0.2/static-candidates.json']){
  if(!fs.existsSync(file))continue;const v=read(file),before=records.size;
  if(v.snapshotId!==snapshotId)throw Error('Archive snapshot drift');
  walk(v,file,v.extraEvidence?.provenance);
  archives.push({file,hash:digest(v),added:records.size-before,snapshotId:v.snapshotId});
}
const held=old.catalog.filter(t=>t.status!=='COMPLETE'),selected=new Map();
function get(table,key){const r=records.get(table+':'+key);if(r)selected.set(table+':'+key,r);return r?.row.row;}
const chains=held.map(t=>{const main=get('main_units_tables',t.mainKey),land=get('land_units_tables',t.landKey),roles={},missing=[];
  if(!main||!land||main.land_unit!==t.landKey)throw Error('Exact main/land missing '+t.mainKey);
  const refs={man:land.man_entity,mount:land.mount,engine:land.engine,articulation:land.articulated_record};
  for(const [role,ref]of Object.entries(refs)){if(!ref)continue;
    const key=role==='man'?ref:role==='mount'?get('mounts_tables',ref)?.entity:role==='engine'?get('battlefield_engines_tables',ref)?.battle_entity:get('land_unit_articulated_vehicles_tables',ref)?.articulated_entity;
    const row=get('battle_entities_tables',key);if(!row)missing.push(role+'.EXACT_9_0_2_HP_MISSING:'+ref+' -> '+(key??'?'));else roles[role]={key,...row};
  }
  return {id:t.id,mainKey:t.mainKey,landKey:t.landKey,main,land,refs,roles,missing};
});
const result={format:'stored-ca-9-0-2-entities-source-v1',snapshotId,inputs:pins,archives,rows:[...selected.values()],schemas:[...schemas.values()],chains};
fs.writeFileSync('tools/wh3-importer/entities-second/stored.source.json',JSON.stringify(encodeSource(result))+'\n');
console.log({pooled:records.size,selected:selected.size,complete:chains.filter(t=>!t.missing.length).length,missing:chains.filter(t=>t.missing.length).length});
