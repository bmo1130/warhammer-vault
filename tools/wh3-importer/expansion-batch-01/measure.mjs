import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { byteHash } from './projection.mjs';

// Measurement only: no source mutation. Byte totals are overlapping by property.
export function measureObjects(value) {
  const groups = new Map();
  function walk(item, key = 'root') {
    if (!item || typeof item !== 'object') return;
    if (Array.isArray(item)) { item.forEach(v => walk(v, key)); return; }
    const json = JSON.stringify(item), group = groups.get(key) ?? { count: 0, bytes: 0, unique: new Set() };
    group.count++; group.bytes += Buffer.byteLength(json); group.unique.add(json); groups.set(key, group);
    Object.entries(item).forEach(([k,v]) => walk(v,k));
  }
  walk(value);
  return Object.fromEntries([...groups].map(([key,g]) => [key,{occurrences:g.count,unique:g.unique.size,
    occurrenceBytes:g.bytes,uniqueBytes:[...g.unique].reduce((n,j)=>n+Buffer.byteLength(j),0)}]));
}

if (process.argv[1]?.endsWith('measure.mjs')) {
  const base = 'tools/wh3-importer/expansion-batch-01/';
  const report = {};
  for (const name of ['sources','review']) {
    const bytes = await readFile(base+name+'.json');
    report[name] = { bytes:bytes.length,lines:bytes.toString().split('\n').length-1,sha256:byteHash(bytes),
      objects:measureObjects(JSON.parse(bytes)) };
  }
  await mkdir('generated/wh3/expansion-compact-baseline',{recursive:true});
  await writeFile('generated/wh3/expansion-compact-baseline/measurement.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
