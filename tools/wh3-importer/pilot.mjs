import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openRawSource } from './extract.mjs';
import { traceUnit } from './trace-unit.mjs';
import { normalizeUnit } from './normalization/normalizer.mjs';
import { loadUnitValidator } from './normalization/validation.mjs';
import { representativeCatalog, pilotAffiliations, validateCatalog } from './pilot-catalog.mjs';
import { discoverSample, discoverScope, inspectMissileExtras } from './pilot-discovery.mjs';
import { categories, exception, classify, coverageFor, analyzeNormalized, collectIds, aggregateIds, aggregateCoverage } from './pilot-analysis.mjs';

export async function attemptSample(source, sample, validate, affiliations = pilotAffiliations) {
  const result = { sample, stage: 'discovery', status: 'BLOCKED', exceptions: [], validation: [], normalized: null };
  const start = performance.now();
  const add = (category, severity, field, reason, evidence = []) => result.exceptions.push(exception(sample, category, severity, field, reason, evidence, result.dump?.unit.caKey ?? (result.discovery?.candidates.length === 1 ? result.discovery.candidates[0].mainKey : null)));
  try {
    result.discovery = await discoverSample(source, sample);
    const candidates = result.discovery.candidates;
    for (const c of candidates) if (c.permissionGroups.length > 1) add('MULTI_FACTION_PERMISSION', 'INFO', 'military_group', 'Multiple permissions retained; not exclusive faction ownership.', [{ caKey: c.mainKey, groups: c.permissionGroups, rowId: c.mainRow }]);
    if (candidates.length !== 1) {
      add(candidates.length ? 'IDENTITY_AMBIGUITY' : 'ROOT_NOT_FOUND', 'BLOCKING', 'main_units.land_unit', `${candidates.length} localisation-confirmed roots; no candidate selected.`, candidates);
    } else {
      for (const missing of result.discovery.unavailableRelations) add('MISSING_REQUIRED_JOIN', 'OMISSION', missing.table, missing.reason, [missing]);
      result.scope = discoverScope(result.discovery, source.schema);
      result.stage = 'trace';
      const profile = { displayName: sample.displayName, slug: sample.slug, scopes: result.scope.scopes, rootSelection: 'unique' };
      result.dump = await traceUnit(source.reader, source.schema, source.localisation, source.metadata, profile, source.supplementalLocalisations);
      result.stage = 'missile-inspection';
      result.missileExtras = await inspectMissileExtras(source, result.discovery, result.dump);
      result.stage = 'permission-identity';
      const groups = candidates[0].permissionGroups.filter(group => Object.hasOwn(affiliations, group));
      if (groups.length !== 1) add('NO_PRIMARY_CATALOG_MAPPING', 'BLOCKING', 'factionId', `${groups.length} explicit pilot aliases match verified groups; cannot choose a primary catalog faction.`, [{ groups: candidates[0].permissionGroups }]);
      else {
        result.affiliation = { militaryGroup: groups[0], factionId: affiliations[groups[0]], kind: 'CURATED' };
        result.stage = 'normalization';
        const normalized = normalizeUnit(result.dump, { ...result.affiliation, permissionTrace: result.discovery.evidence });
        result.exceptions.push(...analyzeNormalized(sample, result.dump, normalized, result.missileExtras));
        result.stage = 'validation';
        result.validation = validate([normalized.unit], Object.values(affiliations));
        if (result.validation.length) {
          result.rejectedNormalization = normalized;
          add('VALIDATION_FAILURE', 'BLOCKING', 'Unit', 'Existing app validator rejected output; preserved separately, not a successful normalized Unit.', result.validation);
        } else result.normalized = normalized;
      }
    }
  } catch (error) {
    const category = error.category ?? (/exceeded|row limit/.test(error.message) ? 'RESOURCE_LIMIT' : result.stage === 'normalization' ? 'UNSUPPORTED_RAW_SHAPE' : 'SOURCE_FAILURE');
    add(category, 'BLOCKING', result.stage, error.message, [{ name: error.name }]);
  }
  result.status = classify(result.exceptions, result.normalized, result.validation);
  result.ids = collectIds(result.dump, result.normalized);
  result.coverage = coverageFor(result);
  if (result.normalized) add(result.normalized.omitted.length ? 'NORMALIZED_WITH_OMISSIONS' : 'NORMALIZED_CLEAN', 'INFO', 'Unit', `Validated ${result.status}; omissions are not automatically failures.`);
  result.elapsedMs = Math.round(performance.now() - start);
  result.stage = 'complete';
  return result;
}

// Injected operation permits honest fixture tests of batch fault isolation.
export async function runSequential(catalog, operation, persist = async () => {}) {
  validateCatalog(catalog);
  const results = [];
  for (const sample of catalog) {
    let result;
    try { result = await operation(sample); }
    catch (error) {
      result = { sample, status: 'BLOCKED', normalized: null, exceptions: [exception(sample, 'SOURCE_FAILURE', 'BLOCKING', 'sample', error.message)], ids: [] };
      result.coverage = coverageFor(result);
    }
    results.push(result);
    await persist(result); // Persistence failures abort loudly; do not fake saved results.
  }
  return results;
}

function rawCoverage(results) {
  const tables = new Map(), relationships = new Map(), skipped = new Map();
  const add = (map, key, slug, detail) => { const record = map.get(key) ?? { ...detail, samples: [] }; if (!record.samples.includes(slug)) record.samples.push(slug); map.set(key, record); };
  const sizes = new Map();
  for (const r of results) {
    for (const data of [r.dump, r.discovery?.evidence, r.missileExtras].filter(Boolean)) {
      const byId = new Map(data.rows.map(row => [row.id, row]));
      for (const row of data.rows) {
        add(tables, row.table, r.sample.slug, { table: row.table });
        if (row.table === 'battle_entities_tables') add(sizes, row.row.size, r.sample.slug, { value: row.row.size });
      }
      for (const e of data.relationships) { const key = `${byId.get(e.from)?.table}.${e.field} -> ${byId.get(e.to)?.table}.${e.targetField}`; add(relationships, key, r.sample.slug, { path: key }); }
    }
    for (const e of r.dump?.skippedReferences ?? []) { const from = r.dump.rows.find(row => row.id === e.from); const key = `${from?.table}.${e.field} -> ${e.targetTable}`; add(skipped, key, r.sample.slug, { path: key, example: e }); }
  }
  return { tables: [...tables.values()], relationships: [...relationships.values()], outsideAllowlist: [...skipped.values()], entitySizes: [...sizes.values()], newInspectionPaths: ['main_units <- unit_missile_weapon_junctions -> missile_weapons', 'missile_weapons <- missile_weapons_to_projectiles -> projectiles', 'main_units <- unit_set_to_unit_junctions', 'main_units <- unit_recruitment_source_overrides'], limitations: 'Only explicit bounded probes. No unrestricted reverse-reference search; uninspected paths cannot be declared absent.' };
}

export function summarize(results) {
  const exceptions = results.flatMap(r => r.exceptions);
  const counts = Object.fromEntries(['CLEAN', 'PARTIAL', 'BLOCKED'].map(status => [status, results.filter(r => r.status === status).length]));
  const taxonomy = categories.map(category => { const rows = exceptions.filter(e => e.category === category); return { category, count: rows.length, units: [...new Set(rows.map(e => e.unit))].length, severity: [...new Set(rows.map(e => e.severity))] }; });
  return { counts, taxonomy, exceptions, coverage: { ...aggregateCoverage(results), raw: rawCoverage(results) }, ids: aggregateIds(results) };
}

export function renderPilotSummary(manifest, report, results) {
  return [
    '# Representative actual CA pilot', '',
    `Source: ${manifest.sourceKind}; WH3 ${manifest.provenance.gameVersion}; RPFM ${manifest.provenance.rpfmVersion}; schema ${manifest.provenance.schemaFormatVersion}.`,
    `Attempted ${results.length}; validated ${manifest.unitsCompleted}; CLEAN ${report.counts.CLEAN}, PARTIAL ${report.counts.PARTIAL}, BLOCKED ${report.counts.BLOCKED}.`,
    `Elapsed ${manifest.elapsedMs} ms; traced ${manifest.rowsTraced} rows; ${report.coverage.raw.tables.length} selected table names; ${manifest.decodedTableFiles} cached decoded files.`,
    '', 'Partial results are diagnostic artifacts, never production-ready Units. Identity ambiguity is retained; core paid policies run only in separate regression integration.', '',
    '| Sample | Discovered roots | Outcome | Reason |', '| --- | --- | --- | --- |',
    ...results.map(r => `| ${r.sample.displayName} | ${r.discovery?.candidates.map(c => c.mainKey).join('; ') ?? 'unavailable'} | ${r.status} | ${r.sample.reason} |`),
    '', '| Exception category | Count | Severity | Common cause | Required before full import? |', '| --- | ---: | --- | --- | --- |',
    ...report.taxonomy.map(t => `| ${t.category} | ${t.count} | ${t.severity.join('/') || '—'} | ${report.exceptions.find(e => e.category === t.category)?.reason ?? 'Not observed in bounded scope'} | ${t.severity.includes('BLOCKING') ? 'Yes' : t.category === 'SEMANTICS_BLOCKED' ? 'Preserve gate' : t.severity.includes('OMISSION') ? 'Review before affected imports' : 'No automatic expansion'} |`),
    '', '| Field group | Applicable samples | Fully mapped | Semantics blocked | Structural failure |', '| --- | ---: | ---: | ---: | ---: |',
    ...Object.entries(report.coverage.groups).map(([name, c]) => `| ${name} | ${c.applicableSamples} (+${c.unknownApplicability} unknown) | ${c.fullyMapped} | ${c.semanticsBlocked} | ${c.structuralFailure} |`),
    '', report.coverage.note, '', '## Unknown IDs (selected trace membership only)',
    ...report.ids.filter(r => !r.mappingExists).map(r => `- ${r.kind} ${r.caId}: ${r.frequency} samples`), '',
  ].join('\n');
}

export async function runPilot(options, catalog = representativeCatalog, log = console.log) {
  validateCatalog(catalog);
  const output = path.resolve(options.outputDir, 'pilot');
  const staging = fileURLToPath(new URL('../../generated/wh3/', import.meta.url));
  const relative = path.relative(staging, output);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Pilot outputs must remain under ignored generated/wh3/.');
  await mkdir(path.join(output, 'units'), { recursive: true });
  const save = async (name, value) => writeFile(path.join(output, name), JSON.stringify(value, null, 2) + '\n');
  const startedAt = new Date().toISOString(), start = performance.now();
  await save('manifest.json', { status: 'RUNNING', startedAt, catalog, limits: { maximumSamples: 30, traceRows: 250, identityInspectionRows: 400, missileInspectionRows: 150, concurrency: 1 } });
  let source;
  try {
    source = await openRawSource(options, log);
    // Actual attribute localisation file is optional; only schema-linked names
    // for traced IDs are retained. Lack of this file never invents a name.
    const attributeLoc = source.local.files.filter(f => f.path === 'text/db/unit_attributes__.loc');
    if (attributeLoc.length === 1) source.supplementalLocalisations.push(await source.reader.decode(source.local, attributeLoc[0].path));
    const validate = await loadUnitValidator();
    const results = await runSequential(catalog, sample => attemptSample(source, sample, validate), async result => {
      await save(`units/${result.sample.slug}.result.json`, result);
      log(`${result.sample.displayName}: ${result.status}; ${result.discovery?.candidates.length ?? '?'} roots; ${result.dump?.rows.length ?? 0} traced rows`);
    });
    const report = summarize(results);
    const manifest = { status: 'COMPLETE', sourceKind: 'ca-pack', startedAt, completedAt: new Date().toISOString(), provenance: source.metadata,
      unitsAttempted: results.length, unitsCompleted: results.filter(r => r.normalized && r.status !== 'BLOCKED').length, unitsReported: results.length,
      elapsedMs: Math.round(performance.now() - start), rowsTraced: results.reduce((n, r) => n + (r.dump?.rows.length ?? 0), 0), tablesTouched: report.coverage.raw.tables.length,
      decodedTableFiles: source.reader.cache.size, exceptions: report.exceptions.length, counts: report.counts, catalog,
      limits: { maximumSamples: 30, traceRows: 250, identityInspectionRows: 400, missileInspectionRows: 150, concurrency: 1 },
      results: results.map(r => ({ slug: r.sample.slug, status: r.status, result: `units/${r.sample.slug}.result.json` })) };
    await save('coverage.json', report.coverage);
    await save('exceptions.json', { taxonomy: report.taxonomy, issues: report.exceptions });
    await save('unknown-ids.json', { scope: 'Selected successfully traced roots; ambiguous candidates not included. Frequency is distinct sample count, not occurrence count.', ids: report.ids });
    await writeFile(path.join(output, 'summary.md'), renderPilotSummary(manifest, report, results));
    await save('manifest.json', manifest);
    log(`Pilot complete: ${JSON.stringify(report.counts)}; ${output}`);
    return { manifest, report, results };
  } catch (error) {
    await save('manifest.json', { status: 'FAILED', startedAt, catalog, reason: error.message });
    throw error;
  } finally { await source?.client.close().catch(() => undefined); }
}
