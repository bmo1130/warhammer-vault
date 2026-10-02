import hpOverlay from '../tools/wh3-importer/hp-policy/overlay.cjs';
import {readFile,writeFile} from 'node:fs/promises';
import {growthAdmissions,buildProductionGrowth,growthAdmissionReport} from '../tools/wh3-importer/production-growth/batch.mjs';
import {preservedBytes} from '../tools/wh3-importer/expansion-batch-01/admission.mjs';
import {byteHash} from '../tools/wh3-importer/expansion-batch-01/projection.mjs';
import {loadUnitValidator} from '../tools/wh3-importer/normalization/validation.mjs';
const mode=process.argv[2];
if(process.argv.length!==3||!['--check','--write'].includes(mode))throw Error('Use --check or --write');
const read=async path=>JSON.parse(await readFile(path,'utf8'));
for(const [path,hash]of Object.entries(preservedBytes))if(byteHash(await readFile(path))!==hash)throw Error('Preserved artifact changed: '+path);
const batches=await Promise.all(Object.keys(growthAdmissions).map(async name=>({name,bundle:await read(`tools/wh3-importer/${name}/sources.json`),review:await read(`tools/wh3-importer/${name}/review.json`)})));
const batch=buildProductionGrowth({batches,units:hpOverlay.staticProductionView(await read('src/data/units.json')),factions:await read('src/data/factions.json'),
  diagnosticIds:(await read('src/data/unitDiagnostics.json')).entries.map(e=>e.id),validate:await loadUnitValidator()});
for(const [path,value]of [['src/data/units.json',hpOverlay.applyProductionHP(batch.units)],...batches.map(b=>[`tools/wh3-importer/${b.name}/admission.json`,growthAdmissionReport(b.name,batch)])]) {
  const output=JSON.stringify(value,null,2)+'\n';
  if(mode==='--write')await writeFile(path,output);
  else if(await readFile(path,'utf8')!==output)throw Error('Growth admission differs: '+path);
}
console.log(JSON.stringify({mode,added:batch.added,production:batch.units.filter(u=>u.gameVersion!=='sample').length,sample:batch.units.filter(u=>u.gameVersion==='sample').length}));
