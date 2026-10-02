import { mkdir, readFile, writeFile, stat, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { args, saveJSON } from '../cli.mjs';
import { json, verifyIndex } from '../static-index.mjs';
import { openRawSource, resolveOptions } from '../../extract.mjs';
import { inspectExtraComponents, buildCandidateManifest, verifyCandidates, bindUnitSize, requireUnitSize } from './candidates.mjs';
import { generateProbeJobs, jobsMarkdown } from './jobs.mjs';
import { parseProbeLogs, compareRuns, toRuntimeEvidence } from './ingest.mjs';
import { buildRuntimeBatch, batchMarkdown } from './batch.mjs';

export async function main(argv = process.argv.slice(2)) {
  const { command, options: o } = args(argv);
  const size = command === 'prepare' ? requireUnitSize(o['unit-size']) : null;
  if (!o['bundle-dir']) throw new Error('Required --bundle-dir <existing runtime evidence bundle>.');
  const index = verifyIndex(await json(resolve(o['bundle-dir'], 'static-index.json')));
  const out = resolve(o.out ?? `generated/wh3/runtime-evidence/cco-${command}${size ? '-'+size.toLowerCase() : ''}-${new Date().toISOString().replace(/:/g, '-')}`);
  if(out===resolve(o['bundle-dir']))throw Error('Output must be a new bundle; historical inputs cannot be overwritten.');
  await mkdir(dirname(out), {recursive:true});
  await mkdir(out);
  const captureCandidates = async () => {
    const manifest=verifyCandidates(await json(resolve(o['bundle-dir'],'static-candidates.json')));
    if(manifest.snapshotId!==index.snapshotId)throw Error('Candidate/index snapshot drift.');
    if(manifest.expectedUnitSize){
      const summary=await json(resolve(o['bundle-dir'],'manifest.json'));
      if(summary.expectedUnitSize!==manifest.expectedUnitSize)throw Error('Bundle expected Unit Size drift.');
    }
    return manifest;
  };
  if (command === 'prepare') {
    let source;
    try {
      let original;
      try { original = verifyCandidates(await json(resolve(o['bundle-dir'], 'static-candidates.json'))); }
      catch(error) { if(error.code!=='ENOENT')throw error; }
      if (!original) {
        source = await openRawSource(await resolveOptions(o.config ? ['--config', o.config] : []));
        original = buildCandidateManifest(index, await inspectExtraComponents(source, index));
      }
      if(original.snapshotId!==index.snapshotId)throw Error('Candidate/index snapshot drift.');
      const manifest = bindUnitSize(original,size), jobs = generateProbeJobs(manifest);
      await saveJSON(out, 'static-candidates.json', manifest); await saveJSON(out, 'runtime-jobs.json', jobs);
      await saveJSON(out, 'static-index.json', index);
      await writeFile(resolve(out, 'P0-CHECKLIST.md'), jobsMarkdown(jobs), { flag: 'wx' });
      const summary = { units: manifest.units.length, entityPaths: manifest.units.reduce((n, u) => n + u.subject.entity.paths.length, 0),
        missilePaths: manifest.units.reduce((n, u) => n + u.subject.missile.paths.length, 0), extraEngines: manifest.units.reduce((n, u) => n + u.views.ExtraEnginesList.length, 0),
        incomplete: manifest.units.filter(u => u.status === 'INCOMPLETE_DB_CHAIN').length, jobs: jobs.jobs.length,
        gameVersion: index.snapshot.gameVersion, staticSnapshotId: index.snapshotId, expectedUnitSize:size, unitSizeSource:'DECLARED_SETUP', actualRuntimeObservations: 0, gameExecuted: false, packGenerated: false, productionEligible: false };
      await saveJSON(out, 'manifest.json', summary); console.log(JSON.stringify({ output: out, ...summary }, null, 2)); return summary;
    } finally { await source?.client.close(); }
  }
  if (command === 'ingest-batch') {
    if (!o.declarations || !o['log-dirs']) throw new Error('Required --declarations <batch JSON> --log-dirs "game=<directory>|desktop=<directory>".');
    const declaration = await json(resolve(o.declarations));
    if (!/^script_log_\d{6}_$/.test(declaration.logFilenamePrefix)) throw new Error('Required bounded script_log date prefix.');
    const manifest = await captureCandidates();
    const inputs = [], aliases = new Set();
    for (const specification of o['log-dirs'].split('|')) {
      const separator = specification.indexOf('='), alias = specification.slice(0, separator), directory = resolve(specification.slice(separator + 1));
      if (separator < 1 || !/^[a-z][a-z0-9-]*$/.test(alias) || aliases.has(alias)) throw new Error('Invalid/duplicate log directory alias.');
      aliases.add(alias);
      for (const filename of (await readdir(directory)).filter(n => n.startsWith(declaration.logFilenamePrefix) && n.endsWith('.txt')).sort()) {
        const sourcePath = resolve(directory, filename);
        if ((await stat(sourcePath)).size > 50_000_000) throw new Error('Probe log exceeds 50 MB.');
        const bytes = await readFile(sourcePath);
        inputs.push({ name: `${alias}:${filename}`, sourcePath, bytes, text: bytes.toString('utf8'), sha256: createHash('sha256').update(bytes).digest('hex') });
      }
    }
    const result = buildRuntimeBatch(inputs, index, manifest, declaration);
    await mkdir(resolve(out, 'inputs'), { recursive: true });
    for (const input of inputs) await writeFile(resolve(out, 'inputs', input.name.replace(':', '__')), input.bytes, { flag: 'wx' });
    for (const [filename, document] of Object.entries({ 'raw-probe-events.json': result.parsed, 'comparison-report.json': result.comparison,
      'runtime-evidence.json': result.evidence, 'validated-evidence.json': result.validation, 'resolution-proposals.json': result.resolutions,
      'capture-triage.json': { held: result.held, ...result.triage, declarationProblems: result.manifest.declarationProblems },
      'manifest.json': result.manifest, 'declared-setups.json': declaration })) await saveJSON(out, filename, document);
    await writeFile(resolve(out, 'comparison-report.md'), batchMarkdown(result.manifest), { flag: 'wx' });
    console.log(JSON.stringify({ output: out, parsedEvents: result.manifest.parsedEvents, captures: result.manifest.captures,
      captureStatus:result.comparison.status, ...(manifest.expectedUnitSize?{expectedUnitSize:manifest.expectedUnitSize,unitSizeQuarantines:result.manifest.unitSizeQuarantines}:{}),
      observations: result.manifest.observations, validation: result.validation.status, missingInputs: result.manifest.missingInputs,
      declarationProblems: result.manifest.declarationProblems, precedence: result.manifest.precedence, productionEligible: false }, null, 2));
    if (result.validation.status === 'REJECTED' || result.comparison.status.startsWith('QUARANTINED_')) process.exitCode = 1;
    return result;
  }
  if (command === 'ingest') {
    if (!o.logs) throw new Error('Required --logs "script_log_1.txt|script_log_2.txt".');
    const manifest = await captureCandidates();
    if (manifest.snapshotId !== index.snapshotId) throw new Error('Candidate/index snapshot drift.');
    const files = o.logs.split('|').map(name => resolve(name)), inputs = await Promise.all(files.map(async name => {
      if ((await stat(name)).size > 50_000_000) throw new Error('Probe log exceeds 50 MB.');
      return { name, text: await readFile(name, 'utf8') };
    }));
    const parsed = parseProbeLogs(inputs), comparison = compareRuns(parsed, manifest), result = toRuntimeEvidence(comparison, index);
    await saveJSON(out, 'raw-probe-events.json', parsed); await saveJSON(out, 'comparison-report.json', comparison);
    await saveJSON(out, 'runtime-evidence.json', result.evidence); await saveJSON(out, 'validated-evidence.json', result.validation);
    await saveJSON(out, 'resolution-proposals.json', result.resolutions); await saveJSON(out, 'capture-triage.json', { held: result.held, ...result.triage });
    if(manifest.expectedUnitSize)await saveJSON(out,'manifest.json',{expectedUnitSize:manifest.expectedUnitSize, unitSizeSource:'DECLARED_SETUP',
      gameVersion:index.snapshot.gameVersion,staticSnapshotId:index.snapshotId,captureStatus:comparison.status,
      unitSizeQuarantines:comparison.reports.filter(r=>r.unitSizeFailures?.length).length,productionEligible:false});
    await writeFile(resolve(out, 'comparison-report.md'), '# CCO comparison\n\n' + comparison.reports.map(r =>
      `- ${r.sourceMainKey ?? 'unidentified'} / ${r.unitSize}: ${r.status}; frames ${r.frames.length}; complete ${r.complete}; projectile keys ${r.distinctObservedProjectileKeys.join(', ') || 'not observed'}; primary/secondary decrease ${r.ammo.map(a => a.decreaseObserved).join('/')}; reloading observations ${r.reloadingEntities.length}.`).join('\n') +
      '\n\nNOT_OBSERVED is limited to this capture. Simultaneous weapons and component HP contribution remain INCONCLUSIVE. See JSON for field failures, paths, list/index rows, pool flags and references.\n', { flag: 'wx' });
    console.log(JSON.stringify({ output: out, captureStatus: comparison.status, runs: comparison.reports.length, parseProblems: parsed.problems.length, repeatedEvents: parsed.repeats,
      validation: result.validation.status, observations: result.validation.records.length, held: result.held.length, productionEligible: false }, null, 2));
    if (result.validation.status === 'REJECTED' || comparison.status.startsWith('QUARANTINED_')) process.exitCode = 1;
    return { parsed, comparison, ...result };
  }
  throw new Error('Commands: prepare; ingest --logs "one.txt|two.txt"; ingest-batch --declarations <JSON> --log-dirs "game=<dir>|desktop=<dir>". All require --bundle-dir <preserved CCO bundle>; optional --out <new directory>.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(e => { console.error(e.message); process.exitCode = 1; });
