import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sha256} from '../research-classifier/classify.mjs';
import {fileHash} from '../research-admission-batch-01/protected.mjs';
import {verifySource} from '../skill-production-bretonnia/source.mjs';
import {scan} from '../skill-production-bretonnia/scan.mjs';
import {classify} from '../skill-production-bretonnia/classify.mjs';
import {baselineCommit, serialize} from './policy.mjs';
import {research} from './research.mjs';
const root = new URL('../../../', import.meta.url), read = path => fs.readFileSync(new URL(path, root));
export function replay(manifest) {
  assert.equal(manifest.baselineCommit, baselineCommit);
  assert.equal(Object.keys(manifest.preservedFiles).length, 532);
  for (const [path, hash] of Object.entries(manifest.preservedFiles)) assert.equal(fileHash(path, read(path)), hash, `Protected file changed: ${path}`);
  const priorManifest = JSON.parse(read('tools/wh3-importer/skill-production-bretonnia/manifest.json'));
  const prior = verifySource(read('tools/wh3-importer/skill-production-bretonnia/source.json'), priorManifest);
  const bytes = read('tools/wh3-importer/resistance-research/source.json');
  assert.equal(sha256(bytes), manifest.sourceSha256, 'Resistance source drift');
  const supplement = JSON.parse(bytes); assert.equal(supplement.sourceSha256, priorManifest.sourceSha256);
  assert.equal(supplement.originalExtraction.sha256, manifest.rawSha256);
  const units = JSON.parse(read('src/data/units.json'));
  const {inventory, memberships} = scan(prior, units), classification = classify(inventory, memberships);
  const result = research(prior, supplement, inventory, classification, memberships, units);
  return {prior, supplement, inventory, classification, memberships, units, result,
    outputs: Object.fromEntries(Object.entries(result).map(([name, value]) => [name, serialize(value)]))};
}
