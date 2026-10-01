import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openRawSource, resolveOptions } from '../extract.mjs';
import { requireSameSource } from '../blocker-review/evidence.mjs';
import { inspectMissileSources } from './collect.mjs';
import { summarizeMissileSources, verifyMissileInspection } from './contract.mjs';
import { normalizeUnit } from '../normalization/normalizer.mjs';
import { loadUnitValidator } from '../normalization/validation.mjs';
import { classifyCatalogCandidates } from '../catalog-identity/policy.mjs';
import { diagnosticFactionIds } from '../catalog-identity/materialize.mjs';
import { pilotAffiliations } from '../pilot-catalog.mjs';

async function main(argv) {
  const flags = {}, remaining = [];
  for (let i = 0; i < argv.length; i++) {
    if (['--context-dir', '--pilot-dir'].includes(argv[i])) {
      const flag = argv[i], value = argv[++i];
      if (flags[flag] || !value || value.startsWith('--')) throw new Error(`Supply one ${flag} DIRECTORY.`);
      flags[flag] = path.resolve(value);
    } else remaining.push(argv[i]);
  }
  if (!flags['--context-dir'] || !flags['--pilot-dir']) throw new Error('Explicit COMPLETE --context-dir and --pilot-dir are required; no latest/root fallback.');
  const read = async file => JSON.parse(await readFile(file, 'utf8'));
  const contextManifest = await read(path.join(flags['--context-dir'], 'manifest.json'));
  const pilotManifest = await read(path.join(flags['--pilot-dir'], 'manifest.json'));
  for (const m of [contextManifest, pilotManifest]) if (m.status !== 'COMPLETE' || m.sourceKind !== 'ca-pack' && m.provenance?.sourceKind !== 'ca-pack') throw new Error('Only COMPLETE actual CA runs are accepted.');
  const contexts = await Promise.all(contextManifest.results.map(r => read(path.join(flags['--context-dir'], r.file))));
  const comparisons = ['Free Company Militia', 'Dread Saurian', 'Necrofex Colossus', 'Ratling Guns', 'Swordsmen'];
  const pilot = await Promise.all(pilotManifest.catalog.map(s => read(path.join(flags['--pilot-dir'], 'units', `${s.slug}.result.json`))));
  const extras = comparisons.map(name => {
    const matches = pilot.filter(r => r.sample.displayName === name && r.dump);
    if (matches.length !== 1) throw new Error(`Missing unique saved comparison trace: ${name}`);
    return matches[0];
  });
  const jobs = [...contexts, ...extras];
  if (!jobs.length || jobs.length > 30 || contexts.some(r => r.status !== 'MATERIALIZED' || !r.dump)) throw new Error('Requires 1–30 saved exact traced sources, no full import.');
  const options = await resolveOptions(remaining);
  const generated = fileURLToPath(new URL('../../../generated/wh3/', import.meta.url));
  const output = path.resolve(options.outputDir, 'missile-semantics', new Date().toISOString().replaceAll(':', '-'));
  const relative = path.relative(generated, output);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Outputs must remain under ignored generated/wh3/.');
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(output, { recursive: false });
  const save = (file, value) => writeFile(path.join(output, file), JSON.stringify(value, null, 2) + '\n');
  const header = { format: 'warhammer-vault-missile-review-v1', contextDir: flags['--context-dir'], pilotDir: flags['--pilot-dir'],
    fullImport: false, gameExecuted: false, limits: { units: 30, rowsPerUnit: 400, queriesPerUnit: 100 } };
  await save('manifest.json', { ...header, status: 'RUNNING' });
  let source;
  try {
    source = await openRawSource(options);
    requireSameSource(source.metadata, contextManifest.provenance); requireSameSource(source.metadata, pilotManifest.provenance);
    const results = [], validate = await loadUnitValidator();
    const registry = [...new Set([...diagnosticFactionIds, ...Object.values(pilotAffiliations)])];
    for (const [index, job] of jobs.entries()) {
      const inspection = await inspectMissileSources(source, job.dump);
      verifyMissileInspection(inspection, job.dump);
      const result = { mainKey: job.dump.unit.caKey, contextId: job.request?.contextId ?? null,
        displayName: job.dump.unit.displayName, inspection, productionEligible: false,
        diagnostic: { status: 'BLOCKED_NORMALIZATION', normalized: null, validation: null } };
      try {
        let context;
        if (job.request) context = { catalog: { review: classifyCatalogCandidates(job.discovery.candidates, job.discovery.evidence), request: job.request } };
        else {
          const militaryGroup = job.affiliation?.militaryGroup, factionId = pilotAffiliations[militaryGroup];
          if (!factionId || factionId !== job.affiliation.factionId) throw new Error('Comparison requires the preserved explicit pilot affiliation, not a new faction guess.');
          context = { militaryGroup, factionId, permissionTrace: job.discovery.evidence };
        }
        const normalized = normalizeUnit(job.dump, { ...context, missileInspection: inspection });
        result.diagnostic.status = 'BLOCKED_VALIDATION';
        const issues = validate([normalized.unit], registry);
        result.diagnostic.validation = { registryIds: registry, issues, passed: issues.length === 0 };
        if (issues.length) result.diagnostic.rejectedNormalization = normalized;
        else { result.diagnostic.status = 'MATERIALIZED'; result.diagnostic.normalized = normalized; }
      } catch (error) { result.diagnostic.error = error.message; }
      const file = `${String(index + 1).padStart(2, '0')}.result.json`;
      await save(file, result); results.push({ file, result });
      console.log(`${result.mainKey}: ${inspection.contract.completeness}, ${inspection.contract.paths.length} paths, ${inspection.contract.issues.length} issues`);
    }
    const metrics = summarizeMissileSources(results.map(r => r.result.inspection.contract));
    metrics.diagnosticNormalization = { attempted: results.length,
      validated: results.filter(r => r.result.diagnostic.validation?.passed).length,
      blocked: results.filter(r => r.result.diagnostic.status !== 'MATERIALIZED').length,
      withheldUnits: results.filter(r => r.result.diagnostic.normalized?.missilePresentation.withheldFields.length).length,
      withheldFields: results.reduce((n, r) => n + (r.result.diagnostic.normalized?.missilePresentation.withheldFields.length ?? 0), 0),
      fullMissileProfiles: results.filter(r => r.result.diagnostic.normalized?.unit.missile && !r.result.diagnostic.normalized.omitted.some(o => o.field.startsWith('missile.'))).length,
      productionEligible: 0 };
    await save('summary.json', metrics);
    await save('manifest.json', { ...header, status: 'COMPLETE', sourceKind: source.metadata.sourceKind, provenance: source.metadata, metrics,
      results: results.map(({ file, result }) => ({ file, mainKey: result.mainKey, contextId: result.contextId, displayName: result.displayName })) });
    console.log(JSON.stringify(metrics, null, 2)); console.log(`Missile review: ${output}`);
  } catch (error) { await save('manifest.json', { ...header, status: 'FAILED', error: error.message }); throw error; }
  finally { await source?.client.close().catch(() => {}); }
}
main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
