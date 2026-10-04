import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { classifyBatch } from '../tools/wh3-importer/research-classifier/classify.mjs';
const file = p => new URL(`../${p}`, import.meta.url);
const report = classifyBatch(readFileSync(file('tools/wh3-importer/research-batch-01/source.json')),
  readFileSync(file('src/data/units.json')));
const path = file('tools/wh3-importer/research-classifier/report.json');
const bytes = JSON.stringify(report, null, 2) + '\n';
if (process.argv.includes('--write')) writeFileSync(path, bytes);
else assert.equal(readFileSync(path, 'utf8'), bytes, 'Classifier report replay drift');
console.log('Research candidate replay PASS:', JSON.stringify(report.summary));
