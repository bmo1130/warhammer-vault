import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { prepareStaticIndex, json, verifyIndex } from './static-index.mjs';
import { generateJobs } from './jobs.mjs';
import { generateTriage, triageMarkdown, admissionDraft } from './triage.mjs';
import { loadRuntimeDocument, proposeResolutions, validateRuntimeEvidence } from './validate.mjs';
import { FORMAT } from './contract.mjs';

const importerRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function args(argv) {
  const command = argv[0], options = {};
  for (let i = 1; i < argv.length; i += 2) {
    if (!argv[i].startsWith('--') || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Use explicit --option value pairs.');
    const key = argv[i].slice(2); if (key in options) throw new Error(`Duplicate ${key}`); options[key] = argv[i + 1];
  }
  return { command, options };
}
export async function saveJSON(dir, name, value) { await writeFile(resolve(dir, name), JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' }); }
export async function main(argv = process.argv.slice(2)) {
  const { command, options: o } = args(argv);
  if (command === 'prepare') {
    for (const key of ['context-dir', 'entity-dir', 'missile-dir', 'pilot-dir']) if (!o[key]) throw new Error(`Required --${key}`);
    const out = resolve(o.out ?? `generated/wh3/runtime-evidence/${new Date().toISOString().replace(/[:]/g, '-')}`);
    await mkdir(out, { recursive: true });
    const prepared = await prepareStaticIndex({ contextDir: o['context-dir'], entityDir: o['entity-dir'], missileDir: o['missile-dir'], pilotDir: o['pilot-dir'] });
    const jobs = generateJobs(prepared.index), triage = generateTriage(prepared.channels, prepared.index);
    const factions = await json(resolve(importerRoot, '../../src/data/factions.json'));
    const gates = admissionDraft(prepared.index, triage, factions.map(f => f.id));
    await saveJSON(out, 'static-index.json', prepared.index);
    await saveJSON(out, 'runtime-jobs.json', jobs.manifest);
    await saveJSON(out, 'recording-template.json', jobs.template);
    await saveJSON(out, 'runtime-evidence.json', { format: FORMAT, observations: [] });
    await saveJSON(out, 'unresolved-triage.json', triage);
    await writeFile(resolve(out, 'unresolved-triage.md'), triageMarkdown(triage), { flag: 'wx' });
    await saveJSON(out, 'admission-gates.json', gates);
    const smoke = validateRuntimeEvidence({ format: FORMAT, observations: [] }, prepared.index);
    const manifest = { format: 'warhammer-vault-runtime-preparation-v1', status: 'COMPLETE', output: out, snapshotId: prepared.index.snapshotId,
      subjects: prepared.index.subjects.length, jobs: jobs.manifest.jobs.length, priorities: jobs.manifest.counts, observationSlots: jobs.template.jobs.reduce((n, j) => n + j.observations.length, 0),
      triage: Object.fromEntries(Object.entries(triage.buckets).map(([k, v]) => [k, v.count])), mappingProposals: triage.mappingProposals.length,
      actualRuntimeObservations: 0, validationFailures: smoke.errors.length, baseline: prepared.baseline,
      gameExecuted: false, fullImport: false, staticModified: false, productionModified: false, productionEligible: false };
    await saveJSON(out, 'manifest.json', manifest); console.log(JSON.stringify(manifest, null, 2)); return manifest;
  }
  if (command === 'ingest') {
    if (!o['bundle-dir'] || (!o.evidence && !o.inputs) || (o.evidence && o.inputs)) throw new Error('ingest --bundle-dir <prepared directory> --evidence <JSON file> OR --inputs "session1.json|session2.json"');
    const inputFiles = o.evidence ? [o.evidence] : o.inputs.split('|');
    const documents = await Promise.all(inputFiles.map(loadRuntimeDocument));
    if (documents.some(d => d?.format !== FORMAT || !Array.isArray(d.observations))) throw new Error('Invalid runtime input format.');
    const combined = { format: FORMAT, observations: documents.flatMap(d => d.observations) };
    const index = verifyIndex(await json(resolve(o['bundle-dir'], 'static-index.json'))), validation = validateRuntimeEvidence(combined, index);
    const resolutions = proposeResolutions(validation), out = resolve(o.out ?? `generated/wh3/runtime-evidence/ingestion-${new Date().toISOString().replace(/[:]/g, '-')}`);
    await mkdir(out, { recursive: true }); await saveJSON(out, 'combined-runtime-evidence.json', combined); await saveJSON(out, 'validated-evidence.json', validation); await saveJSON(out, 'resolution-proposals.json', resolutions);
    await saveJSON(out, 'inputs.json', { files: inputFiles.map(file => resolve(file)), policy: 'All observations retained; duplicate IDs reject. For each recorder session use only its latest cumulative file.' });
    console.log(JSON.stringify({ output: out, status: validation.status, observations: validation.records.length, errors: validation.errors.length, conflicts: validation.conflicts.length, proposals: resolutions.proposals.length, held: resolutions.held.length, productionEligible: false }, null, 2));
    if (validation.status === 'REJECTED') process.exitCode = 1;
    return { validation, resolutions };
  }
  throw new Error('Commands: prepare --context-dir ... --entity-dir ... --missile-dir ... --pilot-dir ... [--out ...]; ingest --bundle-dir ... --evidence ... [--out ...]. Recording: node tools/wh3-importer/runtime-evidence/record.mjs --bundle-dir ...');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(e => { console.error(e.message); process.exitCode = 1; });
