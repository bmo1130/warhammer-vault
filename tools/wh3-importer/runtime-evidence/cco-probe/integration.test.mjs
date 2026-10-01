import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { json, verifyIndex } from '../static-index.mjs';
import { buildCandidateManifest, verifyCandidates } from './candidates.mjs';
import { parseProbeLogs, compareRuns, toRuntimeEvidence } from './ingest.mjs';
const dir = process.env.WH3_CCO_BUNDLE_DIR;
const ca = (name, fn) => test(name, { skip: !dir }, fn);
ca('actual P0 CA graph replays 32 entity and 18 missile paths, including absent-but-queried extra engines', async () => {
  const index = verifyIndex(await json(resolve(dir, 'static-index.json'))), m = verifyCandidates(await json(resolve(dir, 'static-candidates.json')));
  assert.deepEqual(buildCandidateManifest(index, m.extraEvidence), m);
  assert.equal(m.units.reduce((n, u) => n + u.subject.entity.paths.length, 0), 32);
  assert.equal(m.units.reduce((n, u) => n + u.views.AllMissileSources.length, 0), 18);
  assert(m.units.every(u => u.status === 'STATIC_CANDIDATES_PRESERVED' && !u.views.ExtraEnginesList.length));
  assert(m.units.every(u => u.extraEngineCoverage.every(c => c.tableFiles > 0)));
  assert.deepEqual(m.units.map(u => u.subject.entity.paths.length), [5, 6, 14, 7]);
  assert.deepEqual(m.units.map(u => u.views.AllMissileSources.length), [0, 0, 12, 6]);
  for (const u of m.units) {
    const expected = index.subjects.find(s => s.sourceMainKey === u.sourceMainKey && s.contextId === u.contextId);
    assert.deepEqual(u.subject, expected); assert.equal(u.productionEligible, false);
    for (const p of u.subject.entity.paths) assert(p.edges.length && p.entityKey && p.entity.fields);
    for (const p of u.views.AllMissileSources) assert(p.edges.length && p.ProjectileContextList.length && p.UseSecondaryAmmoPool.source && p.Precursor.source);
  }
});
ca('actual manifest jobs stay pending, no synthetic/in-game values are pre-filled', async () => {
  const jobs = await json(resolve(dir, 'runtime-jobs.json'));
  assert.equal(jobs.jobs.length, 8); assert(jobs.jobs.every(j => j.status === 'PENDING'));
  assert(jobs.phase2.every(p => p.packGenerated === false));
  const index = await json(resolve(dir, 'static-index.json')), m = await json(resolve(dir, 'static-candidates.json'));
  const report = compareRuns(parseProbeLogs([{ name: 'empty', text: '' }]), m), r = toRuntimeEvidence(report, index);
  assert.equal(r.validation.status, 'VALIDATED'); assert.equal(r.evidence.observations.length, 0); assert.equal(r.resolutions.proposals.length, 0);
});
