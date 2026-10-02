import { isDeepStrictEqual } from 'node:util';
import { evidenceHash } from '../promotion/first-batch.mjs';

export const sourceFormat = 'warhammer-vault-expansion-01-source-v2';
export const historicalSourceHash = 'e10f3727bf00af27f69a0a623247275db62f4137137f1f416baf39fd7754b4e1';
const fail = message => { throw new Error(`Compact expansion source refused: ${message}`); };
const intern = (dictionary, id, value) => {
  if (Object.hasOwn(dictionary,id) && !isDeepStrictEqual(dictionary[id],value)) fail(`conflicting dictionary payload ${id}`);
  dictionary[id] = value;
  return id;
};

// One-time projection codec, also used by new static extraction projections.
// Only v2 is read from disk. The expanded shape is an in-memory normalizer input.
export function encodeSource(expanded) {
  const rows={}, rowMetadata={}, relationships={}, skippedReferences={}, reasons={}, edgeMetadata={};
  const provenance=expanded.provenance;
  const shapes=new Map(), originalRows=new Map();
  function collect(value) {
    if (!value || typeof value!=='object') return;
    if (value.id && value.table && value.row) {
      if (originalRows.has(value.id) && !isDeepStrictEqual(originalRows.get(value.id),value)) fail(`conflicting row payload ${value.id}`);
      originalRows.set(value.id,value);
      const shape=value.table+':'+Object.keys(value.row).join(',');
      const group=shapes.get(shape)??new Map(); group.set(value.id,value.row); shapes.set(shape,group);
    }
    Object.values(value).forEach(collect);
  }
  collect(expanded);
  const defaults=new Map([...shapes].map(([shape,records])=> {
    const values=[...records.values()];
    return [shape,Object.fromEntries(Object.keys(values[0]).map(field=> {
      const counts=new Map();
      for (const row of values) { const json=JSON.stringify(row[field]); counts.set(json,(counts.get(json)??0)+1); }
      const [json]=[...counts].sort((a,b)=>b[1]-a[1] || (a[0]<b[0]?-1:a[0]>b[0]?1:0))[0];
      return [field,JSON.parse(json)];
    }))];
  }));
  function encode(value, key='') {
    if (typeof value === 'string' && ['reason','evidence'].includes(key))
      return {$reason:intern(reasons,`reason-${evidenceHash(value).slice(0,16)}`,value)};
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(v=>encode(v,key));
    if (Object.keys(value).some(k=>k.startsWith('$'))) fail('reserved reference property in source');
    if (value.rowId && originalRows.has(value.rowId) && isDeepStrictEqual(value,{rowId:value.rowId,...originalRows.get(value.rowId).row}))
      return {$rowProjection:value.rowId};
    if (key==='provenance') {
      const {extractionSource,...base}=value;
      if (!isDeepStrictEqual(base,provenance)) fail('non-shared provenance');
      return {$provenance:extractionSource??null};
    }
    if (value.id && value.table && value.row) {
      if (Object.keys(value).join(',')!=='id,table,key,sourcePack,path,tableVersion,row') fail('unexpected row envelope');
      const {id,table,key:rowKey,sourcePack,path,tableVersion,row}=value;
      const rowDefaults=defaults.get(table+':'+Object.keys(row).join(','));
      const meta={table,sourcePack,path,tableVersion,rowDefaults};
      const metadata=intern(rowMetadata,evidenceHash(meta).slice(0,16),meta);
      const delta=Object.fromEntries(Object.entries(row).filter(([k,v])=>!isDeepStrictEqual(v,rowDefaults[k])));
      const keyFields=Object.keys(rowKey);
      if (!isDeepStrictEqual(rowKey,Object.fromEntries(keyFields.map(k=>[k,row[k]])))) fail('row key differs from payload');
      intern(rows,id,{metadata,keyFields,row:delta});
      return key==='rows'?id:{$row:id};
    }
    const result=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encode(v,k)]));
    if (key==='relationships' || key==='skippedReferences') {
      const dictionary=key==='relationships'?relationships:skippedReferences;
      const shared=Object.fromEntries(Object.entries(result).filter(([k])=>!['from','to','value'].includes(k)));
      const metadata=intern(edgeMetadata,evidenceHash(shared).slice(0,16),shared);
      const edge={metadata,...Object.fromEntries(Object.entries(result).filter(([k])=>['from','to','value'].includes(k)))};
      return intern(dictionary,evidenceHash(value).slice(0,20),edge);
    }
    return result;
  }
  const {format,provenance:unused,schemas,...body}=expanded;
  const data=encode(body);
  const definitions=Object.fromEntries(schemas.map(s=>[`${s.table}:${s.version}`,s]));
  if (Object.keys(definitions).length!==schemas.length) fail('duplicate schema definition');
  return {format:sourceFormat,expandedSha256:evidenceHash(expanded),provenance,schemas:definitions,
    rowMetadata,rows,edgeMetadata,relationships,skippedReferences,reasons,data};
}

export function decodeSource(compact) {
  if (compact.format!==sourceFormat) fail('unsupported format');
  const get=(dictionary,id,kind)=> {
    if (typeof id!=='string' || !Object.hasOwn(dictionary,id)) fail(`missing referenced ${kind} ${id}`);
    return dictionary[id];
  };
  const decodedRows={};
  for (const [id,record] of Object.entries(compact.rows)) {
    const meta=get(compact.rowMetadata,record.metadata,'row metadata');
    if (record.metadata!==evidenceHash(meta).slice(0,16)) fail('row metadata hash differs');
    const schema=get(compact.schemas,`${meta.table}:${meta.tableVersion}`,'schema');
    if (schema.table!==meta.table || schema.version!==meta.tableVersion || !id.startsWith(meta.table+':')) fail('schema/row identity differs');
    if (Object.keys(record.row).some(k=>!Object.hasOwn(meta.rowDefaults,k))) fail('unknown row delta field');
    const row={...meta.rowDefaults,...record.row};
    if (record.keyFields.some(k=>!Object.hasOwn(row,k)) || new Set(record.keyFields).size!==record.keyFields.length) fail('invalid row key fields');
    decodedRows[id]={id,table:meta.table,key:Object.fromEntries(record.keyFields.map(k=>[k,row[k]])),sourcePack:meta.sourcePack,path:meta.path,tableVersion:meta.tableVersion,row};
  }
  function decode(value,key='') {
    if (typeof value==='string' && key==='rows') return structuredClone(get(decodedRows,value,'row'));
    if (typeof value==='string' && ['relationships','skippedReferences'].includes(key)) {
      const record=get(key==='relationships'?compact.relationships:compact.skippedReferences,value,key);
      const meta=get(compact.edgeMetadata,record.metadata,'edge metadata');
      if (evidenceHash(meta).slice(0,16)!==record.metadata) fail('edge metadata hash differs');
      // Original property order is part of the pinned source value hash.
      const order=key==='relationships'?['from','field','to','targetField','value','direction','evidence']:['from','field','targetTable','value','reason'];
      const restored=Object.fromEntries(order.filter(k=>Object.hasOwn(meta,k)||Object.hasOwn(record,k)).map(k=>[k,Object.hasOwn(meta,k)?meta[k]:record[k]]));
      const result=decode(restored);
      if (evidenceHash(result).slice(0,20)!==value) fail('relationship/skipped content hash differs');
      return result;
    }
    if (!value || typeof value!=='object') return value;
    if (Array.isArray(value)) {
      if (key==='rows' && new Set(value).size!==value.length) fail('duplicate row reference in trace');
      return value.map(v=>decode(v,key));
    }
    const refs=Object.keys(value).filter(k=>k.startsWith('$'));
    if (refs.length) {
      if (refs.length!==1 || Object.keys(value).length!==1) fail('malformed reference');
      const ref=refs[0],id=value[ref];
      if (ref==='$row') return structuredClone(get(decodedRows,id,'row'));
      if (ref==='$rowProjection') return {rowId:id,...structuredClone(get(decodedRows,id,'row projection').row)};
      if (ref==='$reason') return get(compact.reasons,id,'reason');
      if (ref==='$provenance') return {...compact.provenance,...(id===null?{}:{extractionSource:id})};
      fail(`unknown reference ${ref}`);
    }
    if (value.schemaRefs) for (const id of value.schemaRefs) get(compact.schemas,id,'schema');
    return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,decode(v,k)]));
  }
  const body=decode(compact.data);
  // Preserve historical property order: its hash is also embedded in production.
  const expanded={format:'warhammer-vault-expansion-01-source-v1',gameExecuted:body.gameExecuted,
    provenance:compact.provenance,catalog:body.catalog,preflight:body.preflight,candidates:body.candidates,
    schemas:Object.values(compact.schemas)};
  if (compact.expandedSha256!==historicalSourceHash || evidenceHash(expanded)!==historicalSourceHash) fail('expanded source hash differs (row payload/schema/provenance corruption)');
  if (!isDeepStrictEqual(encodeSource(expanded),compact)) fail('non-canonical source dictionary or unused evidence');
  return expanded;
}

// Named dictionary records on separate lines keep row/schema diffs local.
// The rest stays pretty JSON; no whole-file minification.
export function serializeSource(compact) {
  const dictionaries=new Set(['schemas','rowMetadata','rows','edgeMetadata','relationships','skippedReferences','reasons']);
  return '{\n'+Object.entries(compact).map(([key,value])=> {
    if (dictionaries.has(key)) return `  ${JSON.stringify(key)}: {\n`+Object.entries(value)
      .map(([id,record])=>`    ${JSON.stringify(id)}: ${JSON.stringify(record)}`).join(',\n')+'\n  }';
    return `  ${JSON.stringify(key)}: `+JSON.stringify(value,null,2).replaceAll('\n','\n  ');
  }).join(',\n')+'\n}\n';
}
