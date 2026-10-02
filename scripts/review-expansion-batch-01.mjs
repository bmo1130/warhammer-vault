import { readFile,writeFile } from 'node:fs/promises';
import { reviewExpansion, expansionReviewArtifact,renderExpansionReview } from '../tools/wh3-importer/expansion-batch-01/review.mjs';
const mode=process.argv[2];
if(process.argv.length!==3 || !['--check','--write'].includes(mode))throw new Error('Use --check or --write');
const base='tools/wh3-importer/expansion-batch-01/';
const bundle=JSON.parse(await readFile(base+'sources.json','utf8'));
const reviews=reviewExpansion(bundle),artifact=expansionReviewArtifact(bundle,reviews);
for(const [name,output] of [['review.json',JSON.stringify(artifact,null,2)+'\n'],['EXPANSION_BATCH_01.md',renderExpansionReview(artifact)]]) {
  if(mode==='--write')await writeFile(base+name,output);
  else if(await readFile(base+name,'utf8')!==output)throw new Error(`Expansion review differs: ${name}`);
}
console.log(`Expansion review ${mode}: 24 preflights, ${reviews.length} safe reviewed core subsets`);
