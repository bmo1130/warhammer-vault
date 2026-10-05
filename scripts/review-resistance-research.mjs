import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sha256} from '../tools/wh3-importer/research-classifier/classify.mjs';
import {replay} from '../tools/wh3-importer/resistance-research/replay.mjs';
import {serialize} from '../tools/wh3-importer/resistance-research/policy.mjs';
const dir = new URL('../tools/wh3-importer/resistance-research/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', dir)));
const {outputs, result} = replay(manifest);
if (process.argv.includes('--write')) {
  for (const [name, bytes] of Object.entries(outputs)) fs.writeFileSync(new URL(name + '.json', dir), bytes);
  manifest.outputSha256 = Object.fromEntries(Object.entries(outputs).map(([name, bytes]) => [name, sha256(bytes)]));
  fs.writeFileSync(new URL('manifest.json', dir), serialize(manifest));
} else for (const [name, bytes] of Object.entries(outputs)) {
  assert.equal(sha256(bytes), manifest.outputSha256[name], `${name} hash drift`);
  assert.equal(fs.readFileSync(new URL(name + '.json', dir), 'utf8'), bytes, `${name} replay drift`);
}
if (process.argv.includes('--check-raw')) {
  const bytes = fs.readFileSync(new URL('../generated/wh3/resistance-research/raw.json', import.meta.url));
  assert.equal(sha256(bytes), manifest.rawSha256);
}
console.log(JSON.stringify({verdict: result.semantics.verdict, operation: result.semantics.operation,
  runtime: result.semantics.runtimeObservation, comparisonEffects: result.comparisons.comparisonEffects,
  comparisonConsumers: result.comparisons.comparisonConsumerRows, exactBonusJunctions: result.feedback.exactBonusFamily.junctions,
  broadResistanceJunctions: result.feedback.broadResistanceFamily.junctions, newAdmission: result.feedback.newAdmission,
  preservedFiles: Object.keys(manifest.preservedFiles).length}));
