import assert from 'node:assert/strict';
import {readFileSync as read} from 'node:fs';
import {sha256} from '../research-classifier/classify.mjs';
const root=new URL('../../../',import.meta.url);
const file=p=>new URL(p,root);
const forwardPaths=new Set(['src/data/caResearchEffect.json','src/domain/caResearchEffect.ts',
  'src/pages/CalculatorPage.tsx','src/style.css','scripts/review-bretonnia-research.mjs',
  'scripts/review-research-mappings.mjs']);
export const fileHash=(path,bytes)=>sha256(/\.(?:mjs|ts|tsx|ps1|md|css)$/.test(path)?bytes.toString().replace(/\r\n/g,'\n'):bytes);
// Historical manifests keep their original pins. Only explicitly reviewed app
// and replay integration files can evolve; both before and after hashes must
// match. Source, classifier, policy, Production and evidence remain byte-pinned.
export function verifyProtected(path,baselineHash) {
  const current=fileHash(path,read(file(path)));
  if(current===baselineHash)return;
  assert(forwardPaths.has(path),`Protected source/data cannot evolve in this admission: ${path}`);
  const manifest=JSON.parse(read(file('tools/wh3-importer/research-admission-batch-01/manifest.json')));
  const evolution=manifest.forwardFiles[path];
  assert(evolution,`Unreviewed protected file changed: ${path}`);
  assert.equal(evolution.before,baselineHash,`Historical pin mismatch: ${path}`);
  assert.equal(current,evolution.after,`Reviewed forward integration drift: ${path}`);
}
