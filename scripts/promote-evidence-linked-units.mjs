import hpOverlay from '../tools/wh3-importer/hp-policy/overlay.cjs';
import { readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { buildEvidenceLinkedBatch } from '../tools/wh3-importer/promotion/evidence-linked-batch.mjs';
import { diagnosticSha256 } from '../tools/wh3-importer/promotion/partial-review.mjs';
import { loadUnitValidator } from '../tools/wh3-importer/normalization/validation.mjs';
const mode=process.argv.slice(2);
if(mode.length!==1 || !['--check','--write'].includes(mode[0])) throw new Error('Use --check or --write');
const root=new URL('../',import.meta.url),read=async p=>JSON.parse(await readFile(new URL(p,root),'utf8'));
const bytes=await readFile(new URL('src/data/unitDiagnostics.json',root));
if(createHash('sha256').update(bytes).digest('hex')!==diagnosticSha256) throw new Error('Diagnostic bytes changed');
const batch=buildEvidenceLinkedBatch({evidence:await read('tools/wh3-importer/promotion/partial-sources.json'),
  committedReview:await read('tools/wh3-importer/promotion/partial-review.json'),diagnostics:JSON.parse(bytes),
  units:hpOverlay.staticProductionView(await read('src/data/units.json')),factions:await read('src/data/factions.json'),validate:await loadUnitValidator()});
for(const [path,value] of [['src/data/units.json',hpOverlay.applyProductionHP(batch.units)],['src/data/factions.json',batch.factions],['src/data/unitSharedIdentities.json',batch.registry]]) {
  const output=JSON.stringify(value,null,2)+'\n';
  if(mode[0]==='--write') await writeFile(new URL(path,root),output);
  else if(await readFile(new URL(path,root),'utf8')!==output) throw new Error(`Replay differs: ${path}`);
}
console.log(JSON.stringify({mode:mode[0],added:batch.added,admitted:batch.admitted.map(c=>c.unit.id)},null,2));
