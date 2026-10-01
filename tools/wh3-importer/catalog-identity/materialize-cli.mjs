import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { openRawSource, resolveOptions } from '../extract.mjs';
import { loadUnitValidator } from '../normalization/validation.mjs';
import { requireSameSource } from '../blocker-review/evidence.mjs';
import { materializeCatalogRequest, summarizeMaterializations } from './materialize.mjs';

// Explicitly selected COMPLETE review; no latest-directory/name/root fallback.
async function main(argv) {
  const remaining = []; let reviewDir;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--review-dir') {
      if (reviewDir || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Supply one --review-dir COMPLETE_REVIEW_DIRECTORY.');
      reviewDir = path.resolve(argv[++i]);
    } else remaining.push(argv[i]);
  }
  if (!reviewDir) throw new Error('Explicit --review-dir is required before any CA access.');
  const read = async file => JSON.parse(await readFile(file, 'utf8'));
  const manifest = await read(path.join(reviewDir, 'manifest.json')), review = await read(path.join(reviewDir, 'review.json'));
  if (manifest.status !== 'COMPLETE' || manifest.sourceKind !== 'ca-pack' || review.sourceKind !== 'ca-pack') throw new Error('Only a complete actual CA blocker review is accepted.');
  requireSameSource(manifest.provenance, review.provenance);
  if (review.identities.some(i => !i.catalogIdentity?.candidates.length || i.catalogIdentity.candidates.some(c => !c.presentations.length))) throw new Error('Cannot generate explicit requests for unresolved candidate contexts; no candidates skipped.');
  const jobs = review.identities.flatMap(identity => identity.catalogIdentity.candidates.flatMap(c => c.presentations.map(p => ({ review: identity.catalogIdentity, request: { mainKey: c.source.mainKey, contextId: p.contextId } }))));
  if (!jobs.length || jobs.length > 30) throw new Error('Bounded materialization requires 1–30 explicit reviewed presentations; no full import.');
  const options = await resolveOptions(remaining);
  const generated = fileURLToPath(new URL('../../../generated/wh3/', import.meta.url));
  const output = path.resolve(options.outputDir, 'context-materialization', new Date().toISOString().replaceAll(':', '-'));
  const relative = path.relative(generated, output);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Materialization outputs must stay under ignored generated/wh3/.');
  await mkdir(output, { recursive: true });
  const save = async (file, value) => writeFile(path.join(output, file), JSON.stringify(value, null, 2) + '\n');
  const header = { format: 'warhammer-vault-context-materialization-run-v1', reviewDir, output, fullImport: false, gameExecuted: false,
    limits: { requests: 30, traceRows: 250, exactEvidenceRows: 200, exactEvidenceQueries: 30, concurrency: 1 }, requested: jobs.map(j => j.request) };
  await save('manifest.json', { ...header, status: 'RUNNING' });
  let source;
  try {
    source = await openRawSource(options);
    const attributeLoc = source.local.files.filter(f => f.path === 'text/db/unit_attributes__.loc');
    if (attributeLoc.length === 1) source.supplementalLocalisations.push(await source.reader.decode(source.local, attributeLoc[0].path));
    const validate = await loadUnitValidator();
    const factions = await read(new URL('../../../src/data/factions.json', import.meta.url));
    const productionUnits = await read(new URL('../../../src/data/units.json', import.meta.url));
    const usedIds = new Set(productionUnits.map(u => u.id)), results = [];
    for (const [index, job] of jobs.entries()) {
      const result = await materializeCatalogRequest(source, job.review, job.request, validate, { usedIds, productionFactionIds: factions.map(f => f.id) });
      const filename = `${String(index + 1).padStart(2, '0')}.result.json`;
      await save(filename, result); results.push({ filename, result });
      console.log(`${job.request.mainKey} / ${job.request.contextId}: ${result.status} ${result.quality}`);
    }
    const metrics = summarizeMaterializations(results.map(r => r.result));
    await save('summary.json', metrics);
    await writeFile(path.join(output, 'summary.md'), ['# Explicit context diagnostic materialization', '',
      'No production catalog write, name selection, game execution or full import.', '', '```json', JSON.stringify(metrics, null, 2), '```', '',
      '| Source main key | Context | Outcome | Quality | Default-visible |', '| --- | --- | --- | --- | --- |',
      ...results.map(({ result: r }) => `| ${r.request.mainKey} | ${r.request.contextId} | ${r.status} | ${r.quality} | ${r.plan?.presentation.defaultVisible ?? 'unknown'} |`), '',
      'Production eligibility is false for every diagnostic result, including registered factions and default-visible entries.', ''].join('\n'));
    await save('manifest.json', { ...header, status: 'COMPLETE', provenance: source.metadata, metrics, results: results.map(({ filename, result }) => ({ file: filename, request: result.request, status: result.status, quality: result.quality })) });
    console.log(`Context materialization: ${output}`);
  } catch (error) { await save('manifest.json', { ...header, status: 'FAILED', error: error.message }); throw error; }
  finally { await source?.client.close().catch(() => {}); }
}
main(process.argv.slice(2)).catch(error => { console.error(`Context materialization failed: ${error.message}`); process.exitCode = 1; });
