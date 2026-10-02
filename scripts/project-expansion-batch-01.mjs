import { readFile,writeFile } from 'node:fs/promises';
import { projectExpansion } from '../tools/wh3-importer/expansion-batch-01/projection.mjs';
import { serializeSource } from '../tools/wh3-importer/expansion-batch-01/compact.mjs';
const mode=process.argv[2];
if(process.argv.length!==3 || !['--check','--write'].includes(mode))throw new Error('Use --check or --write; requires ignored extraction staging');
const preflight=JSON.parse(await readFile('generated/wh3/expansion-batch-01/preflight.json','utf8'));
const results=await Promise.all(preflight.entries.map(async ({sample})=> {
  const bytes=await readFile(`generated/wh3/expansion-batch-01/units/${sample.slug}.result.json`);
  return {bytes,result:JSON.parse(bytes)};
}));
const output=serializeSource(projectExpansion(preflight,results));
const target='tools/wh3-importer/expansion-batch-01/sources.json';
if(mode==='--write')await writeFile(target,output);
else if(await readFile(target,'utf8')!==output)throw new Error('Expansion staging projection differs; no automatic refresh');
console.log(`Expansion projection ${mode}: 24 preflights, ${results.filter(r=>r.result.normalized).length} candidates`);
