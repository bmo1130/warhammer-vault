import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildPartialProductionBatch } from '../tools/wh3-importer/promotion/partial-batch.mjs';
import { diagnosticSha256 } from '../tools/wh3-importer/promotion/partial-review.mjs';
import { loadUnitValidator } from '../tools/wh3-importer/normalization/validation.mjs';
const args=process.argv.slice(2);
if(args.length!==1 || !['--check','--write'].includes(args[0])) throw new Error('Use --check or --write. Four reviewed PARTIAL identities only; no game, discovery or runtime ingestion.');
const root=new URL('../',import.meta.url), paths=['src/data/units.json','src/data/factions.json'];
const originals=await Promise.all(paths.map(p=>readFile(new URL(p,root),'utf8'))), [units,factions]=originals.map(JSON.parse);
const evidence=JSON.parse(await readFile(new URL('tools/wh3-importer/promotion/partial-sources.json',root),'utf8'));
const bytes=await readFile(new URL('src/data/unitDiagnostics.json',root));
if(createHash('sha256').update(bytes).digest('hex')!==diagnosticSha256) throw new Error('Diagnostic evidence changed; review before production admission.');
const batch=buildPartialProductionBatch({evidence,diagnostics:JSON.parse(bytes),units,factions,validate:await loadUnitValidator()});
const outputs=[batch.units,batch.factions].map(value=>JSON.stringify(value,null,2)+'\n');
if(args[0]==='--write') {
  try {for(let i=0;i<paths.length;i++) if(outputs[i]!==originals[i]) await writeFile(new URL(paths[i],root),outputs[i]);}
  catch(error) {for(let i=0;i<paths.length;i++) await writeFile(new URL(paths[i],root),originals[i]);throw error;}
} else if(batch.added.units || batch.added.factions) throw new Error('Reviewed partial batch passed but has not been applied.');
console.log(JSON.stringify({mode:args[0],added:batch.added,admitted:batch.admitted.map(c=>({id:c.unit.id,retainedUnknowns:c.remainingUnmapped.map(x=>x.caId),omittedGroups:c.withdrawals.map(x=>x.field)}))},null,2));
