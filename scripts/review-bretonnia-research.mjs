import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { reviewResearch } from '../tools/wh3-importer/research-slice/review.mjs';
import { reviewBatch } from '../tools/wh3-importer/research-batch-01/review.mjs';
const root = new URL('../', import.meta.url);
const file = name => new URL(name, root);
const result = reviewResearch(readFileSync(file('tools/wh3-importer/research-slice/source.json')), JSON.parse(readFileSync(file('tools/wh3-importer/research-slice/admission.json'))));
const batch = reviewBatch(readFileSync(file('tools/wh3-importer/research-batch-01/source.json')), readFileSync(file('tools/wh3-importer/research-batch-01/policy.json')), JSON.parse(readFileSync(file('tools/wh3-importer/research-batch-01/admission.json'))), readFileSync(file('src/data/units.json')), result.projection);
for (const [name, value] of [['tools/wh3-importer/research-slice/review.json', result.review], ['tools/wh3-importer/research-batch-01/review.json', batch.review], ['tools/wh3-importer/research-admission-batch-01/legacy-projection.json', batch.projections]]) {
  const expected = JSON.stringify(value, null, 2) + '\n';
  if (process.argv.includes('--write')) writeFileSync(file(name), expected);
  else assert.equal(readFileSync(file(name), 'utf8'), expected, `Replay mismatch: ${name}`);
}
console.log(`Research replay PASS: ${batch.review.candidates.length} reviewed candidates, ${new Set(batch.projections.map(p=>p.researchKey)).size} projected research, ${batch.projections.length} exact unit contexts; original Regular Tournaments unchanged`);

// Historical review remains byte-replayable; current app additionally passes the reviewed admission gate.
await import('./admit-bretonnia-research.mjs');
