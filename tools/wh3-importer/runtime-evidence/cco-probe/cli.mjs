import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { args, saveJSON } from '../cli.mjs';
import { json, verifyIndex } from '../static-index.mjs';
import { openRawSource, resolveOptions } from '../../extract.mjs';
import { inspectExtraComponents, buildCandidateManifest, verifyCandidates } from './candidates.mjs';
import { generateProbeJobs, jobsMarkdown } from './jobs.mjs';
import { parseProbeLogs, compareRuns, toRuntimeEvidence } from './ingest.mjs';

export async function main(argv = process.argv.slice(2)) {
  const { command, options: o } = args(argv);
  if (!o['bundle-dir']) throw new Error('Required --bundle-dir <existing runtime evidence bundle>.');
  const index = verifyIndex(await json(resolve(o['bundle-dir'], 'static-index.json')));
  const out = resolve(o.out ?? `generated/wh3/runtime-evidence/cco-${command}-${new Date().toISOString().replace(/:/g, '-')}`);
  await mkdir(out, { recursive: true });
  if (command === 'prepare') {
    const source = await openRawSource(await resolveOptions(o.config ? ['--config', o.config] : []));
    try {
      const manifest = buildCandidateManifest(index, await inspectExtraComponents(source, index)), jobs = generateProbeJobs(manifest);
      await saveJSON(out, 'static-candidates.json', manifest); await saveJSON(out, 'runtime-jobs.json', jobs);
      await saveJSON(out, 'static-index.json', index);
      await writeFile(resolve(out, 'P0-CHECKLIST.md'), jobsMarkdown(jobs), { flag: 'wx' });
      const summary = { units: manifest.units.length, entityPaths: manifest.units.reduce((n, u) => n + u.subject.entity.paths.length, 0),
        missilePaths: manifest.units.reduce((n, u) => n + u.subject.missile.paths.length, 0), extraEngines: manifest.units.reduce((n, u) => n + u.views.ExtraEnginesList.length, 0),
        incomplete: manifest.units.filter(u => u.status === 'INCOMPLETE_DB_CHAIN').length, jobs: jobs.jobs.length,
        gameVersion: index.snapshot.gameVersion, staticSnapshotId: index.snapshotId, actualRuntimeObservations: 0, gameExecuted: false, packGenerated: false, productionEligible: false };
      await saveJSON(out, 'manifest.json', summary); console.log(JSON.stringify({ output: out, ...summary }, null, 2)); return summary;
    } finally { await source.client.close(); }
  }
  if (command === 'ingest') {
    if (!o.logs) throw new Error('Required --logs "script_log_1.txt|script_log_2.txt".');
    const manifest = verifyCandidates(await json(resolve(o['bundle-dir'], 'static-candidates.json')));
    if (manifest.snapshotId !== index.snapshotId) throw new Error('Candidate/index snapshot drift.');
    const files = o.logs.split('|').map(name => resolve(name)), inputs = await Promise.all(files.map(async name => {
      if ((await stat(name)).size > 50_000_000) throw new Error('Probe log exceeds 50 MB.');
      return { name, text: await readFile(name, 'utf8') };
    }));
    const parsed = parseProbeLogs(inputs), comparison = compareRuns(parsed, manifest), result = toRuntimeEvidence(comparison, index);
    await saveJSON(out, 'raw-probe-events.json', parsed); await saveJSON(out, 'comparison-report.json', comparison);
    await saveJSON(out, 'runtime-evidence.json', result.evidence); await saveJSON(out, 'validated-evidence.json', result.validation);
    await saveJSON(out, 'resolution-proposals.json', result.resolutions); await saveJSON(out, 'capture-triage.json', { held: result.held, ...result.triage });
    await writeFile(resolve(out, 'comparison-report.md'), '# CCO comparison\n\n' + comparison.reports.map(r =>
      `- ${r.sourceMainKey ?? 'unidentified'} / ${r.unitSize}: ${r.status}; frames ${r.frames.length}; complete ${r.complete}; projectile keys ${r.distinctObservedProjectileKeys.join(', ') || 'not observed'}; primary/secondary decrease ${r.ammo.map(a => a.decreaseObserved).join('/')}; reloading observations ${r.reloadingEntities.length}.`).join('\n') +
      '\n\nNOT_OBSERVED is limited to this capture. Simultaneous weapons and component HP contribution remain INCONCLUSIVE. See JSON for field failures, paths, list/index rows, pool flags and references.\n', { flag: 'wx' });
    console.log(JSON.stringify({ output: out, captureStatus: comparison.status, runs: comparison.reports.length, parseProblems: parsed.problems.length, repeatedEvents: parsed.repeats,
      validation: result.validation.status, observations: result.validation.records.length, held: result.held.length, productionEligible: false }, null, 2));
    if (result.validation.status === 'REJECTED') process.exitCode = 1;
    return { parsed, comparison, ...result };
  }
  throw new Error('Commands: prepare --bundle-dir <preserved bundle> [--config <local config>] [--out <new directory>]; ingest --bundle-dir <CCO prepared bundle> --logs "one.txt|two.txt" [--out <new directory>].');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(e => { console.error(e.message); process.exitCode = 1; });
