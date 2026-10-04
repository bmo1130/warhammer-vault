import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {sha256} from '../research-classifier/classify.mjs';
import {pins} from '../research-classifier/policy.mjs';
import {validateSource} from '../skill-class-selector-research/research.mjs';
export const serialize=v=>JSON.stringify(v,null,2)+'\n';
export const unique=xs=>[...new Set(xs)].sort();
const cmp=(a,b)=>a<b?-1:a>b?1:0;
export function projectExtraction(bytes){
 const r=JSON.parse(bytes);assert.equal(r.format,'wh3-full-skill-extraction-v1');
 return {format:'wh3-full-skill-source-v1',cultureKey:r.cultureKey,subtypeKeys:r.subtypeKeys,treeSetKeys:r.treeSetKeys,contextualSetKeys:r.contextualSetKeys,skillKeys:r.skillKeys,selectorKeys:r.selectorKeys,relationTables:r.relationTables,
  originalExtraction:{path:'generated/wh3/skill-production-bretonnia/raw.json',sha256:sha256(bytes),extractedAt:r.extractedAt},provenance:r.provenance,
  schemas:r.schemas.map(s=>({table:s.table,version:s.version,fields:s.fields.map(({name,field_type,is_key,is_reference,description})=>({name,field_type,is_key,is_reference,description})),localisedFields:s.localisedFields.map(f=>f.name)})).sort((a,b)=>cmp(`${a.table}:${a.version}`,`${b.table}:${b.version}`)),
  rows:r.rows.sort((a,b)=>cmp(a.id,b.id)),relationships:r.relationships.sort((a,b)=>cmp(JSON.stringify(a),JSON.stringify(b))),coverage:r.coverage.sort((a,b)=>cmp(JSON.stringify(a.query),JSON.stringify(b.query)))};
}
// Lossless canonical table-default/delta dictionaries and row-reference tuples.
// Full source payloads, processed schemas, keys and edges are restored exactly.
export function encodeSource(source){
 const groups=new Map();for(const r of source.rows){const k=JSON.stringify([r.table,r.sourcePack,r.sourcePackPath,r.path,r.tableVersion,Object.keys(r.row),Object.keys(r.key)]);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
 const metadata=[],metaIndex=new Map();
 for(const [k,rs] of [...groups].sort((a,b)=>cmp(a[0],b[0]))){const [table,sourcePack,sourcePackPath,path,tableVersion,fields,keyFields]=JSON.parse(k);
  const defaults=fields.map(f=>{const counts=new Map();for(const r of rs){const s=JSON.stringify(r.row[f]);counts.set(s,(counts.get(s)??0)+1);}return JSON.parse([...counts].sort((a,b)=>b[1]-a[1]||cmp(a[0],b[0]))[0][0]);});
  metaIndex.set(k,metadata.length);metadata.push({table,sourcePack,sourcePackPath,path,tableVersion,fields,keyFields,defaults});
 }
 const ids=source.rows.map(r=>r.id),indices=new Map(ids.map((id,i)=>[id,i])),evidence=unique(source.relationships.map(r=>r.evidence));
 const rows=source.rows.map(r=>{const k=JSON.stringify([r.table,r.sourcePack,r.sourcePackPath,r.path,r.tableVersion,Object.keys(r.row),Object.keys(r.key)]),mi=metaIndex.get(k),m=metadata[mi];return [r.id,mi,m.fields.flatMap((f,i)=>isDeepStrictEqual(r.row[f],m.defaults[i])?[]:[[i,r.row[f]]])];});
 const edges=source.relationships.map(e=>[indices.get(e.from),e.field,indices.get(e.to),e.targetField,evidence.indexOf(e.evidence)]);
 const {format,rows:unusedRows,relationships:unusedEdges,...header}=source;
 return {format:'wh3-full-skill-source-compact-v1',expandedSha256:sha256(JSON.stringify(source)),header,metadata,rows,evidence,edges};
}
export function decodeSource(compact){
 assert.equal(compact.format,'wh3-full-skill-source-compact-v1');const ids=new Set();
 const rows=compact.rows.map(([id,mi,deltas])=>{assert(!ids.has(id),'Duplicate row reference');ids.add(id);const m=compact.metadata[mi];assert(m,'Missing row metadata');assert.equal(m.fields.length,m.defaults.length);assert.equal(new Set(m.fields).size,m.fields.length);
  const values=structuredClone(m.defaults),seen=new Set();for(const [i,value] of deltas){assert(Number.isInteger(i)&&i>=0&&i<m.fields.length&&!seen.has(i),'Invalid duplicate/unknown delta');seen.add(i);values[i]=value;}
  const row=Object.fromEntries(m.fields.map((f,i)=>[f,values[i]]));return {id,table:m.table,key:Object.fromEntries(m.keyFields.map(f=>[f,row[f]])),sourcePack:m.sourcePack,sourcePackPath:m.sourcePackPath,path:m.path,tableVersion:m.tableVersion,row};});
 const relationships=compact.edges.map(([fi,field,ti,targetField,ei])=>{const from=rows[fi],to=rows[ti],evidence=compact.evidence[ei];assert(from&&to&&evidence,'Missing edge reference');return {from:from.id,field,to:to.id,targetField,value:to.table==='Loc'?to.row.key:from.row[field],evidence};});
 const source={format:'wh3-full-skill-source-v1',...compact.header,rows,relationships};
 // Projection property order is part of the original expanded hash.
 const {rows:ignoredRows,relationships:ignoredEdges,coverage,...head}=source;const expanded={...head,rows,relationships,coverage};
 assert.equal(sha256(JSON.stringify(expanded)),compact.expandedSha256,'Expanded source payload/schema/provenance drift');assert.deepEqual(encodeSource(expanded),compact,'Non-canonical or unused source dictionary');return expanded;
}
export function serializeSource(source){
 const tuples=new Set(['metadata','rows','edges']);return '{\n'+Object.entries(source).map(([k,v])=>`  ${JSON.stringify(k)}: `+(tuples.has(k)?'[\n'+v.map(r=>'    '+JSON.stringify(r)).join(',\n')+'\n  ]':JSON.stringify(v,null,2).replaceAll('\n','\n  '))).join(',\n')+'\n}\n';
}
export function verifySource(bytes,manifest){
 assert.equal(sha256(bytes),manifest.sourceSha256,'Full source hash drift');const source=decodeSource(JSON.parse(bytes));
 assert.equal(sha256(JSON.stringify(source)),manifest.expandedSourceSha256,'Expanded manifest pin drift');assert.equal(source.rows.length,manifest.sourceRows);assert.equal(source.relationships.length,manifest.sourceEdges);
 assert.equal(source.originalExtraction.sha256,manifest.originalExtractionSha256);assert.equal(source.cultureKey,'wh_main_brt_bretonnia');assert.equal(manifest.snapshotId,pins.snapshotId);
 assert.equal(sha256(JSON.stringify(source.schemas)),manifest.processedSchemasSha256,'Full schema drift');
 validateSource({...source,format:'wh3-skill-class-selector-source-v1'});return source;
}
