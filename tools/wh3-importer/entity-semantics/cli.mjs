import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { openRawSource, resolveOptions } from '../extract.mjs';
import { requireSameSource } from '../blocker-review/evidence.mjs';
import { inspectEntityStructure, inspectUnitSizeEvidence } from './collect.mjs';
import { summarizeEntityStructures, entityPresentationFields } from './contract.mjs';
import { inspectMissileSources } from '../missile-semantics/collect.mjs';
import { normalizeUnit } from '../normalization/normalizer.mjs';
import { loadUnitValidator } from '../normalization/validation.mjs';
import { classifyCatalogCandidates } from '../catalog-identity/policy.mjs';
import { diagnosticFactionIds } from '../catalog-identity/materialize.mjs';
import { pilotAffiliations } from '../pilot-catalog.mjs';

export function compareEntityNormalization(before, after) {
  const strip = unit => {
    unit = structuredClone(unit);
    for (const field of entityPresentationFields) { const keys = field.split('.'); delete unit[keys[0]][keys[1]]; }
    return unit;
  };
  const nonEntity = fields => fields.filter(f => !entityPresentationFields.includes(f.field));
  return { nonEntityValuesUnchanged: isDeepStrictEqual(strip(before.unit), strip(after.unit)),
    nonEntityProvenanceUnchanged: isDeepStrictEqual(nonEntity(before.provenance.fields), nonEntity(after.provenance.fields)),
    nonEntityOmissionsUnchanged: isDeepStrictEqual(nonEntity(before.omitted), nonEntity(after.omitted)),
    missilePresentationUnchanged: isDeepStrictEqual(before.missilePresentation, after.missilePresentation),
    changedEntityFields: entityPresentationFields.filter(f => { const [group, field] = f.split('.'); return !isDeepStrictEqual(before.unit[group]?.[field], after.unit[group]?.[field]); }) };
}

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
  for (const m of [contextManifest, pilotManifest]) if (m.status !== 'COMPLETE' || (m.sourceKind ?? m.provenance?.sourceKind) !== 'ca-pack') throw new Error('Requires COMPLETE actual CA inputs.');
  const contexts = await Promise.all(contextManifest.results.map(r => read(path.join(flags['--context-dir'], r.file))));
  const pilot = await Promise.all(pilotManifest.catalog.map(s => read(path.join(flags['--pilot-dir'], 'units', `${s.slug}.result.json`))));
  const extras = ['Necrofex Colossus', 'Dread Saurian', 'Black Coach', 'Skeleton Chariots', 'Swordsmen', 'Grail Knights'].map(name => {
    const matches = pilot.filter(r => r.sample.displayName === name && r.dump);
    if (matches.length !== 1) throw new Error(`Missing unique saved comparison trace: ${name}`);
    return matches[0];
  });
  const jobs = [...contexts, ...extras];
  if (!jobs.length || jobs.length > 30 || contexts.some(r => r.status !== 'MATERIALIZED' || !r.dump)) throw new Error('Requires 1–30 exact saved traced sources, never full import.');
  const options = await resolveOptions(remaining);
  const generated = fileURLToPath(new URL('../../../generated/wh3/', import.meta.url));
  const output = path.resolve(options.outputDir, 'entity-semantics', new Date().toISOString().replaceAll(':', '-'));
  const relative = path.relative(generated, output);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Outputs must remain under ignored generated/wh3/.');
  await mkdir(path.dirname(output), { recursive: true }); await mkdir(output, { recursive: false });
  const save = (file, value) => writeFile(path.join(output, file), JSON.stringify(value, null, 2) + '\n');
  const header = { format: 'warhammer-vault-entity-review-v1', contextDir: flags['--context-dir'], pilotDir: flags['--pilot-dir'],
    fullImport: false, gameExecuted: false, limits: { units: 30, entityRowsPerUnit: 400, entityQueriesPerUnit: 60 } };
  await save('manifest.json', { ...header, status: 'RUNNING' });
  let source;
  try {
    source = await openRawSource(options);
    requireSameSource(source.metadata, contextManifest.provenance); requireSameSource(source.metadata, pilotManifest.provenance);
    const unitSizeEvidence = await inspectUnitSizeEvidence(source);
    await save('unit-size-evidence.json', unitSizeEvidence);
    const results = [], validate = await loadUnitValidator();
    const registry = [...new Set([...diagnosticFactionIds, ...Object.values(pilotAffiliations)])];
    for (const [index, job] of jobs.entries()) {
      const inspection = await inspectEntityStructure(source, job.dump);
      const missileInspection = job.missileInspection ?? await inspectMissileSources(source, job.dump);
      const result = { mainKey: job.dump.unit.caKey, contextId: job.request?.contextId ?? null, displayName: job.dump.unit.displayName,
        dump: job.dump, inspection, missileInspection, productionEligible: false,
        diagnostic: { status: 'BLOCKED_NORMALIZATION', normalized: null, validation: null } };
      try {
        let context;
        if (job.request) context = { catalog: { review: classifyCatalogCandidates(job.discovery.candidates, job.discovery.evidence), request: job.request } };
        else {
          const militaryGroup = job.affiliation?.militaryGroup, factionId = pilotAffiliations[militaryGroup];
          if (!factionId || factionId !== job.affiliation.factionId) throw new Error('Comparison requires preserved explicit pilot affiliation.');
          context = { militaryGroup, factionId, permissionTrace: job.discovery.evidence };
        }
        const before = normalizeUnit(job.dump, { ...context, missileInspection });
        result.beforeNormalization = before;
        const normalized = normalizeUnit(job.dump, { ...context, missileInspection, entityInspection: inspection });
        result.comparison = compareEntityNormalization(before, normalized);
        if (Object.entries(result.comparison).some(([k, v]) => k !== 'changedEntityFields' && v !== true)) throw new Error('Entity gate changed non-entity values/provenance/omissions or missile presentation.');
        result.diagnostic.status = 'BLOCKED_VALIDATION';
        const issues = validate([normalized.unit], registry);
        result.diagnostic.validation = { registryIds: registry, issues, passed: issues.length === 0 };
        if (issues.length) result.diagnostic.rejectedNormalization = normalized;
        else { result.diagnostic.status = 'MATERIALIZED'; result.diagnostic.quality = 'PARTIAL'; result.diagnostic.normalized = normalized; }
      } catch (error) { result.diagnostic.error = error.message; }
      const file = `${String(index + 1).padStart(2, '0')}.result.json`;
      await save(file, result); results.push({ file, result });
      console.log(`${result.mainKey}: ${inspection.contract.completeness}, ${inspection.contract.paths.length} paths, ${result.diagnostic.status}`);
    }
    const metrics = summarizeEntityStructures(results.map(r => r.result.inspection.contract));
    metrics.diagnosticNormalization = { attempted: results.length, validated: results.filter(r => r.result.diagnostic.validation?.passed).length,
      blocked: results.filter(r => r.result.diagnostic.status !== 'MATERIALIZED').length,
      validationFailures: results.filter(r => r.result.diagnostic.validation?.passed === false).length,
      withheldUnits: results.filter(r => r.result.diagnostic.normalized?.entityPresentation.withheldFields.length).length,
      withheldFields: results.reduce((n, r) => n + (r.result.diagnostic.normalized?.entityPresentation.withheldFields.length ?? 0), 0),
      changedEntityFields: results.reduce((n, r) => n + (r.result.comparison?.changedEntityFields.length ?? 0), 0),
      nonEntityChangedUnits: results.filter(r => r.result.comparison && Object.entries(r.result.comparison).some(([k, v]) => k !== 'changedEntityFields' && v !== true)).length,
      productionEligible: 0 };
    await save('summary.json', metrics);
    await save('manifest.json', { ...header, status: 'COMPLETE', sourceKind: source.metadata.sourceKind, provenance: source.metadata, metrics,
      results: results.map(({ file, result }) => ({ file, mainKey: result.mainKey, contextId: result.contextId, displayName: result.displayName })) });
    console.log(JSON.stringify(metrics, null, 2)); console.log(`Entity review: ${output}`);
  } catch (error) { await save('manifest.json', { ...header, status: 'FAILED', error: error.message }); throw error; }
  finally { await source?.client.close().catch(() => {}); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
