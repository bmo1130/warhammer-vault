import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { mkdtemp, copyFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { json, verifyIndex } from './static-index.mjs';
import { validateRuntimeEvidence, loadRuntimeEvidence, proposeResolutions, parseRuntimeDocument } from './validate.mjs';
import { FORMAT, digest } from './contract.mjs';
import { generateJobs } from './jobs.mjs';
import { record } from './record.mjs';
import { main } from './cli.mjs';

const dir = process.env.WH3_RUNTIME_BUNDLE_DIR;
const ca = (name, fn) => test(name, { skip: !dir }, fn);
const read = name => json(resolve(dir, name));
ca('runtime preparation replays CA snapshot with all 19 contexts and preserves baseline metrics', async () => {
  const index = verifyIndex(await read('static-index.json')), m = await read('manifest.json');
  assert.equal(index.subjects.length, 27); assert.equal(index.subjects.filter(s => s.contextId !== null).length, 19);
  assert.deepEqual(m.baseline.namePilot, { CLEAN: 1, PARTIAL: 14, BLOCKED: 9 });
  assert.equal(m.baseline.context.materialized, 19); assert.equal(m.baseline.context.partial, 19); assert.equal(m.baseline.context.validationFailures, 0);
  assert.deepEqual(m.baseline.context.unitFieldProvenance, { DIRECT: 497, GENERATED: 19, CURATED: 80 }); assert(index.subjects.every(s => !s.productionEligible));
});
ca('all 35 jobs are pending and 182 typed slots link valid static identities without observed results', async () => {
  const index = verifyIndex(await read('static-index.json')), jobs = await read('runtime-jobs.json'), template = await read('recording-template.json');
  assert.equal(jobs.jobs.length, 35); assert.deepEqual(jobs.counts, { P0: 8, P1: 16, P2: 2, P3: 9 });
  assert(jobs.jobs.every(j => j.status === 'PENDING')); const slots = template.jobs.flatMap(j => j.observations);
  assert.equal(slots.length, 182); assert(slots.every(o => o.observation.result === 'INCONCLUSIVE' && o.identityVerification.level === 'CONTEXT_ONLY'));
  assert.equal(validateRuntimeEvidence({ format: FORMAT, observations: slots }, index).errors.length, 0);
  assert.equal(parseRuntimeDocument(template).observations.length, 0); assert.deepEqual(generateJobs(index).manifest, jobs);
});
ca('ordinary main junctions do not propagate to shared-land Supply runtime subjects', async () => {
  const index = await read('static-index.json'), ordinary = index.subjects.filter(s => s.contextId === 'empire_roster');
  for (const s of ordinary) { const supply = index.subjects.find(x => x.contextId === 'empire_imperial_supply' && x.sourceLandKey === s.sourceLandKey);
    assert(supply); assert(s.missile.paths.some(p => p.role === 'MAIN_SPECIFIC_JUNCTION')); assert(!supply.missile.paths.some(p => p.role === 'MAIN_SPECIFIC_JUNCTION'));
    assert.notEqual(s.catalogEntryId, supply.catalogEntryId);
  }
});
ca('triage counts are reproducible, mapping proposals preserve exact IDs/localisation without aliases', async () => {
  const report = await read('unresolved-triage.json'), m = await read('manifest.json');
  assert.equal(Object.values(report.buckets).reduce((n, b) => n + b.count, 0), report.total);
  assert.deepEqual(Object.fromEntries(Object.entries(report.buckets).map(([k, v]) => [k, v.count])), m.triage);
  assert.equal(report.mappingProposals.length, 37); assert(report.mappingProposals.every(p => p.caId && p.localisationAvailable && p.internalId === null && !p.productionMappingAdded));
});
ca('empty runtime ingestion and proposals do not change CA sidecars/provenance or Units', async () => {
  const index = await read('static-index.json'), before = digest(index), v = await loadRuntimeEvidence(resolve(dir, 'runtime-evidence.json'), index);
  assert.equal(v.status, 'VALIDATED'); assert.equal(v.records.length, 0); assert.equal(proposeResolutions(v).proposals.length, 0); assert.equal(digest(index), before);
});
ca('interactive recording writes a diagnostic JSON readable by ingestion without additional coding', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'wh3-runtime-recorder-'));
  try {
    for (const name of ['static-index.json', 'runtime-jobs.json', 'recording-template.json']) await copyFile(resolve(dir, name), join(temp, name));
    let selected = false, answered = false;
    const io = { write() {}, async question(prompt) {
      if (prompt.startsWith('job 번호')) { if (!selected) { selected = true; return '1'; } return 'q'; }
      if (prompt.startsWith('관찰자')) return 'SYNTHETIC_RECORDER_TEST';
      if (prompt.startsWith('기록할까요')) { if (!answered) { answered = true; return 'y'; } return 'n'; }
      if (prompt.startsWith('관찰 숫자')) return '12';
      return '';
    } };
    const result = await record(temp, io); assert.equal(result.observations, 1);
    const index = verifyIndex(await json(join(temp, 'static-index.json'))), v = await loadRuntimeEvidence(result.latestFile, index);
    assert.equal(v.status, 'VALIDATED'); assert.equal(v.records[0].status, 'VALIDATED_IDENTITY_PENDING'); assert.equal(proposeResolutions(v).proposals.length, 0);
  } finally { await rm(temp, { recursive: true }); }
});
ca('CLI ingests two independent session files together and retains contradictory values', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'wh3-runtime-merge-'));
  try {
    const template = await read('recording-template.json'), a = structuredClone(template.jobs[0].observations[0]), b = structuredClone(a);
    a.id = 'SYNTHETIC_MERGE_TEST_A'; a.trialId = 'synthetic-a'; a.confidence = 'OBSERVED_ONCE'; a.observation = { result: 'CONCLUSIVE', value: 12, unit: 'models' };
    b.id = 'SYNTHETIC_MERGE_TEST_B'; b.trialId = 'synthetic-b'; b.confidence = 'OBSERVED_ONCE'; b.observation = { result: 'CONCLUSIVE', value: 16, unit: 'models' };
    const paths = [join(temp, 'a.json'), join(temp, 'b.json')];
    for (const [i, o] of [a, b].entries()) await writeFile(paths[i], JSON.stringify({ format: FORMAT, observations: [o] }));
    const result = await main(['ingest', '--bundle-dir', dir, '--inputs', paths.join('|'), '--out', join(temp, 'merged')]);
    assert.equal(result.validation.status, 'CONFLICTING_RUNTIME_EVIDENCE'); assert.equal(result.validation.records.length, 2); assert.equal(result.resolutions.proposals.length, 0);
    assert.equal((await json(join(temp, 'merged', 'combined-runtime-evidence.json'))).observations.length, 2);
  } finally { await rm(temp, { recursive: true }); }
});
