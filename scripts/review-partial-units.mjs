import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { reviewPartialCandidates, reviewArtifact, renderPartialReview, diagnosticSha256 } from '../tools/wh3-importer/promotion/partial-review.mjs';
const args=process.argv.slice(2);
if(args.length!==1 || !['--check','--write'].includes(args[0])) throw new Error('Use --check or --write. Reviews only the 14 pinned PARTIAL sources; never writes production/evidence data.');
const root=new URL('../',import.meta.url), source=new URL('tools/wh3-importer/promotion/partial-sources.json',root);
const evidence=JSON.parse(await readFile(source,'utf8'));
const bytes=await readFile(new URL('src/data/unitDiagnostics.json',root));
if(createHash('sha256').update(bytes).digest('hex')!==diagnosticSha256) throw new Error('Diagnostic source changed; review references before replay.');
const artifact=reviewArtifact(reviewPartialCandidates(evidence,JSON.parse(bytes)),evidence.contextInventory);
const outputs=[['tools/wh3-importer/promotion/partial-review.json',JSON.stringify(artifact,null,2)+'\n'],
  ['tools/wh3-importer/promotion/PARTIAL_REVIEW.md',renderPartialReview(artifact)]];
for(const [path,text] of outputs) {
  const url=new URL(path,root);
  if(args[0]==='--write') await writeFile(url,text);
  else if((await readFile(url,'utf8')).replaceAll('\r\n','\n')!==text) throw new Error(`Stale review artifact: ${path}`);
}
console.log(JSON.stringify({mode:args[0],reviewed:artifact.candidates.length,coreEligible:artifact.candidates.filter(c=>c.overall==='PROMOTABLE_WITH_OMISSIONS').length,
  scopedAliases:artifact.candidates.reduce((n,c)=>n+c.scopedMappings.length,0),diagnosticConnections:artifact.candidates.filter(c=>c.admission==='EXACT_DIAGNOSTIC_CONNECTION_REQUIRED').length},null,2));
