import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { reviewExpansion, expansionReviewArtifact,expandedReviewArtifact,renderExpansionReview } from '../tools/wh3-importer/expansion-batch-01/review.mjs';
const mode=process.argv[2];
if(process.argv.length!==3 || !['--check','--write','--verbose'].includes(mode))throw new Error('Use --check, --write or --verbose');
const base='tools/wh3-importer/expansion-batch-01/';
const bundle=JSON.parse(await readFile(base+'sources.json','utf8'));
const reviews=reviewExpansion(bundle),artifact=expansionReviewArtifact(bundle,reviews);
const expanded=expandedReviewArtifact(bundle,reviews);
if (mode==='--verbose') {
  await mkdir('generated/wh3/expansion-batch-01',{recursive:true});
  await writeFile('generated/wh3/expansion-batch-01/review.verbose.json',JSON.stringify(expanded,null,2)+'\n');
} else for(const [name,output] of [['review.json',JSON.stringify(artifact,null,2)+'\n'],['EXPANSION_BATCH_01.md',renderExpansionReview(expanded)]]) {
  if(mode==='--write')await writeFile(base+name,output);
  else if(await readFile(base+name,'utf8')!==output)throw new Error(`Expansion review differs: ${name}`);
}
console.log(`Expansion review ${mode}: 24 preflights, ${reviews.length} safe reviewed core subsets`);
