import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { reviewResearch } from '../tools/wh3-importer/research-slice/review.mjs';
const root = new URL('../', import.meta.url);
const file = name => new URL(name, root);
const result = reviewResearch(readFileSync(file('tools/wh3-importer/research-slice/source.json')), JSON.parse(readFileSync(file('tools/wh3-importer/research-slice/admission.json'))));
for (const [name, value] of [['tools/wh3-importer/research-slice/review.json', result.review], ['src/data/caResearchEffect.json', result.projection]]) {
  const expected = JSON.stringify(value, null, 2) + '\n';
  if (process.argv.includes('--write')) writeFileSync(file(name), expected);
  else assert.equal(readFileSync(file(name), 'utf8'), expected, `Replay mismatch: ${name}`);
}
console.log('Regular Tournaments: exact research/scope/Grail Knights proof → 2 reviewed ADD modifiers; projection replay PASS');
