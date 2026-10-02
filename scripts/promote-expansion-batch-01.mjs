import hpOverlay from '../tools/wh3-importer/hp-policy/overlay.cjs';
import { readFile,writeFile } from 'node:fs/promises';
import { buildExpansionBatch,expansionAdmissionReport,preservedBytes } from '../tools/wh3-importer/expansion-batch-01/admission.mjs';
import { byteHash } from '../tools/wh3-importer/expansion-batch-01/projection.mjs';
import { loadUnitValidator } from '../tools/wh3-importer/normalization/validation.mjs';
const mode=process.argv[2];
if(process.argv.length!==3 || !['--check','--write'].includes(mode))throw new Error('Use --check or --write');
const read=async path=>JSON.parse(await readFile(path,'utf8'));
for(const [path,hash] of Object.entries(preservedBytes))if(byteHash(await readFile(path))!==hash)throw new Error(`Preserved artifact bytes changed: ${path}`);
const base='tools/wh3-importer/expansion-batch-01/';
const batch=buildExpansionBatch({bundle:await read(base+'sources.json'),committedReview:await read(base+'review.json'),
  units:hpOverlay.staticProductionView(await read('src/data/units.json')),factions:await read('src/data/factions.json'),
  diagnosticIds:(await read('src/data/unitDiagnostics.json')).entries.map(e=>e.id),validate:await loadUnitValidator()});
for(const [path,value] of [['src/data/units.json',hpOverlay.applyProductionHP(batch.units)],[base+'admission.json',expansionAdmissionReport(batch)]]) {
  const output=JSON.stringify(value,null,2)+'\n';
  if(mode==='--write')await writeFile(path,output);
  else if(await readFile(path,'utf8')!==output)throw new Error(`Expansion admission replay differs: ${path}`);
}
console.log(JSON.stringify({mode,added:batch.added,admitted:batch.admitted.map(a=>a.name)},null,2));
