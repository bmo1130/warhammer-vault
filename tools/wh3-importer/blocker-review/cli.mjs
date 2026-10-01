import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { inspectIdentity, auditIdentityRules } from './identity.mjs';
import { inspectStructure } from './structure.mjs';
import { inspectOverrides } from './overrides.mjs';
import { requireSameSource } from './evidence.mjs';
import { pilotMetrics, comparePilots, renderReview } from './report.mjs';
import { applyReviewOverlay } from './overlay.mjs';

// Companion to the committed representative pilot baseline. The run artifacts
// and installed CA/RPFM environment remain separate from repository code.
async function main() {
  const { resolveOptions, openRawSource } = await import('../extract.mjs');
  if (typeof openRawSource !== 'function') throw new Error('Representative pilot baseline API is unavailable (openRawSource).');
  const { runPilot, summarize } = await import('../pilot.mjs');
  const { coverageFor } = await import('../pilot-analysis.mjs');
  const options = await resolveOptions(process.argv.slice(2));
  const generated = fileURLToPath(new URL('../../../generated/wh3/', import.meta.url));
  const baseline = path.join(generated, 'pilot');
  const read = async file => JSON.parse(await readFile(file, 'utf8'));
  const previous = { manifest: await read(path.join(baseline, 'manifest.json')), exceptions: await read(path.join(baseline, 'exceptions.json')), coverage: await read(path.join(baseline, 'coverage.json')) };
  if (previous.manifest.status !== 'COMPLETE' || previous.manifest.sourceKind !== 'ca-pack' || previous.manifest.unitsAttempted !== 24) throw new Error('Requires a complete actual 24-sample baseline, never fixtures.');
  const id = new Date().toISOString().replaceAll(':', '-');
  const output = path.join(generated, 'blocker-review', id);
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(output, { recursive: false });
  const save = (name, data) => writeFile(path.join(output, name), JSON.stringify(data, null, 2) + '\n');
  await save('manifest.json', { status: 'RUNNING', baseline, output });
  let source;
  try {
    const pilot = await runPilot({ ...options, outputDir: output });
    requireSameSource(previous.manifest.provenance, pilot.manifest.provenance);
    source = await openRawSource(options);
    requireSameSource(source.metadata, pilot.manifest.provenance);
    const report = { format: 'warhammer-vault-blocker-review-v1', sourceKind: 'ca-pack', provenance: source.metadata, identities: [], structures: [], overrides: [] };
    for (const result of pilot.results.filter(r => r.exceptions.some(e => e.category === 'IDENTITY_AMBIGUITY'))) {
      const identity = await inspectIdentity(source, result);
      report.identities.push(identity); await save(`${result.sample.slug}.identity.json`, identity);
      console.log(`${result.sample.displayName}: identity ${identity.classification}, ${identity.candidates.length} roots retained; catalog ${identity.catalogIdentity.policyResolution}`);
    }
    for (const name of ['Necrofex Colossus', 'Dread Saurian', 'Black Coach', 'Skeleton Chariots']) {
      const result = pilot.results.find(r => r.sample.displayName === name);
      if (!result?.dump) throw new Error(`Missing required structural sample ${name}.`);
      const structure = await inspectStructure(source, result);
      report.structures.push(structure); await save(`${result.sample.slug}.structure.json`, structure);
      console.log(`${name}: ${structure.missileContract.status}, ${structure.missileContract.paths.length} rider missile paths`);
    }
    const freeCompany = pilot.results.find(r => r.sample.displayName === 'Free Company Militia');
    if (!freeCompany?.dump) throw new Error('Missing Free Company trace.');
    const overrides = await inspectOverrides(source, freeCompany);
    report.overrides.push(overrides); await save(`${freeCompany.sample.slug}.overrides.json`, overrides);
    report.ruleAudit = auditIdentityRules(report.identities, pilot.results);
    const reviewedResults = applyReviewOverlay(pilot.results, report.structures);
    for (const result of reviewedResults) result.coverage = coverageFor(result);
    const reviewed = summarize(reviewedResults);
    report.comparison = comparePilots(pilotMetrics(previous.manifest, previous.exceptions, previous.coverage), pilotMetrics({ counts: reviewed.counts }, { issues: reviewed.exceptions }, reviewed.coverage), report);
    report.comparison.unmodifiedPilotRerun = pilotMetrics(pilot.manifest, { issues: pilot.report.exceptions }, pilot.report.coverage);
    await save('reviewed-coverage.json', reviewed.coverage);
    await save('reviewed-exceptions.json', { taxonomy: reviewed.taxonomy, issues: reviewed.exceptions });
    await save('reviewed-results.json', reviewedResults.map(r => ({ sample: r.sample, status: r.status, productionEligible: false, additionalReview: r.additionalReview, exceptions: r.exceptions, coverage: r.coverage })));
    await save('review.json', report);
    await save('comparison.json', report.comparison);
    await writeFile(path.join(output, 'summary.md'), renderReview(report));
    await save('manifest.json', { status: 'COMPLETE', sourceKind: 'ca-pack', provenance: source.metadata, baseline, output, pilot: 'pilot/manifest.json', review: 'review.json', comparison: 'comparison.json', derivedFormulasAdded: 0, unitCanonicalMappingsAdded: 0, catalogDecisionsApplied: report.comparison.catalogIdentity.resolvedCandidates, catalogIdentity: report.comparison.catalogIdentity, fullImport: false });
    console.log(`Blocker review: ${output}`);
  } catch (error) { await save('manifest.json', { status: 'FAILED', baseline, output, error: error.message }); throw error; }
  finally { await source?.client.close().catch(() => {}); }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
