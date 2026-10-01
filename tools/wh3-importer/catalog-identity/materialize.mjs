import { EvidenceProbe, rawFact, connected } from '../blocker-review/evidence.mjs';
import { discoverExactRoot, traceUnitByMainKey } from '../trace-unit.mjs';
import { discoverScope, inspectMissileExtras } from '../pilot-discovery.mjs';
import { normalizeUnit } from '../normalization/normalizer.mjs';
import { analyzeNormalized, coverageFor } from '../pilot-analysis.mjs';
import { approvedCatalogContext, assertCatalogSnapshot } from './normalization-context.mjs';
import { classifyCatalogCandidates } from './policy.mjs';
import { curatedDecisions } from './decisions.mjs';
import { inspectMissileSources } from '../missile-semantics/collect.mjs';
import { summarizeMissileSources } from '../missile-semantics/contract.mjs';

// Diagnostic registry only: never added to the production faction dataset.
export const diagnosticFactionIds = Object.freeze(['empire', 'khorne', 'vampire_counts', 'tomb_kings', 'beastmen', 'warriors_of_chaos', 'tzeentch']);

async function exactEvidence(source, identity, decision) {
  const { candidates: [root] } = await discoverExactRoot(source.reader, source.schema, source.localisation, identity);
  const p = new EvidenceProbe(source, { maxRows: 200, maxQueries: 30 });
  await p.select('main_units_tables', 'unit', [identity.mainKey]);
  await p.forward('main_units_tables', 'land_unit', 'land_units_tables');
  const probes = [
    ['units_to_groupings_military_permissions_tables', 'unit', 'main_units_tables'],
    ['unit_missile_weapon_junctions_tables', 'unit', 'main_units_tables'],
    ['land_units_to_unit_abilites_junctions_tables', 'land_unit', 'land_units_tables'],
    ...decision.checks.map(c => [c.table, c.via, c.target === 'main' ? 'main_units_tables' : 'land_units_tables']),
  ];
  for (const [table, field, target] of [...new Map(probes.map(p => [JSON.stringify(p), p])).values()]) await p.reverse(table, field, target);
  const evidence = p.artifact();
  const candidate = { mainKey: root.row.unit, landKey: root.landRow.key,
    localisation: { key: root.loc.key, text: root.loc.text, sourcePack: source.localisation.sourcePack, path: source.localisation.path },
    main: root.row, land: root.landRow, permissionGroups: p.rows('units_to_groupings_military_permissions_tables').map(r => r.row.military_group) };
  return { candidates: [candidate], evidence };
}

function checkTracedIdentity(dump, expected) {
  const mains = dump.rows.filter(r => r.table === 'main_units_tables'), main = mains.length === 1 ? mains[0] : null;
  const links = connected(dump, main, 'land_unit', 'land_units_tables'), land = links.length === 1 ? links[0].row : null;
  if (!main || main.id !== dump.rootRow || dump.unit.caKey !== expected.mainKey || rawFact(dump, main, 'unit')?.value !== expected.mainKey || rawFact(dump, land, 'key')?.value !== expected.landKey) throw new Error('Traced source differs from approved catalog identity.');
  // Tracer and inspection row IDs use different hashes. Compare stable pointers,
  // not incidental artifact IDs, and preserve both sets of raw row pointers.
  for (const [row, fact] of [[main, expected.mainFact], [land, expected.landFact]]) {
    if (!fact || row.sourcePack !== fact.source.sourcePack || row.path !== fact.source.path || row.tableVersion !== fact.source.schemaVersion || JSON.stringify(row.key) !== JSON.stringify(fact.source.rowKey)) throw new Error('Source row/schema/pack pointer drift.');
  }
  const locs = dump.rows.filter(r => r.table === 'Loc' && r.row.key === expected.localisationKey);
  if (locs.length !== 1 || locs[0].row.text !== expected.displayName || !dump.relationships.some(e => e.from === locs[0].id && e.to === land.id && e.direction === 'localisation')) throw new Error('Traced localisation identity drift.');
  return { mainKey: expected.mainKey, landKey: expected.landKey, localisationKey: expected.localisationKey,
    mainFact: rawFact(dump, main, 'unit'), landFact: rawFact(dump, land, 'key'), localisationFact: rawFact(dump, locs[0], 'text'), mainToLand: links[0].edge };
}

export async function materializeCatalogRequest(source, review, request, validate, options = {}) {
  const decisions = options.decisions ?? curatedDecisions;
  const registry = options.diagnosticFactionIds ?? diagnosticFactionIds;
  const usedIds = options.usedIds ?? new Set();
  const result = { format: 'warhammer-vault-catalog-materialization-v1', request: structuredClone(request ?? {}),
    status: 'BLOCKED_POLICY', quality: 'BLOCKED', stage: 'policy', plan: null, tracedIdentity: null,
    traced: false, normalizationCompleted: false, normalized: null, unit: null, omissions: [], unmapped: [], provenance: null,
    exceptions: [], validation: { diagnostic: null, production: null }, productionEligible: false,
    productionReasons: ['DIAGNOSTIC_ONLY_PIPELINE'], error: null };
  let normalized;
  try {
    const approved = approvedCatalogContext(review, request, decisions);
    result.plan = approved.plan;
    result.planEvidence = { candidate: approved.record.candidate, decision: approved.record.decision, evidence: approved.review.evidence, provenance: approved.review.provenance };
    result.stage = 'source'; result.status = 'BLOCKED_SOURCE_DRIFT';
    assertCatalogSnapshot(source.metadata.sourceKind, source.metadata, approved.review.provenance, approved.review.evidence.sourceKind);
    result.discovery = await exactEvidence(source, approved.plan.source, approved.record.decision);
    const expectedLoc = approved.record.candidate.localisation, actualLoc = result.discovery.candidates[0].localisation;
    if (expectedLoc.sourcePack !== actualLoc.sourcePack || expectedLoc.path !== actualLoc.path) throw new Error('Localisation source pack/path drift.');
    const live = classifyCatalogCandidates(result.discovery.candidates, result.discovery.evidence, decisions);
    const fresh = approvedCatalogContext(live, request, decisions);
    // Retain the original reviewed candidate graph plus the fresh single-source
    // graph. Neither is allowed to substitute a different source or context.
    if (JSON.stringify(fresh.plan.presentation) !== JSON.stringify(approved.plan.presentation)) throw new Error('Catalog context drift.');
    result.scope = discoverScope(result.discovery, source.schema);
    result.stage = 'trace'; result.status = 'BLOCKED_TRACE';
    result.dump = await traceUnitByMainKey(source.reader, source.schema, source.localisation, source.metadata, approved.plan.source, result.scope.scopes, source.supplementalLocalisations ?? []);
    result.stage = 'source'; result.status = 'BLOCKED_SOURCE_DRIFT';
    assertCatalogSnapshot(result.dump.sourceKind, result.dump.provenance, approved.review.provenance, approved.review.evidence.sourceKind);
    result.tracedIdentity = checkTracedIdentity(result.dump, approved.plan.source);
    result.traced = true;
    result.stage = 'normalization'; result.status = 'BLOCKED_NORMALIZATION';
    result.missileExtras = await inspectMissileExtras(source, result.discovery, result.dump);
    result.missileInspection = await inspectMissileSources(source, result.dump);
    normalized = normalizeUnit(result.dump, { catalog: { review: live, request, decisions }, missileInspection: result.missileInspection,
      ...(options.idMappings ? { idMappings: options.idMappings } : {}) });
    result.normalizationCompleted = true;
    result.omissions = normalized.omitted; result.unmapped = normalized.unmapped; result.provenance = normalized.provenance;
    result.exceptions = analyzeNormalized({ displayName: normalized.unit.name, slug: normalized.unit.id }, result.dump, normalized, result.missileExtras, result.missileInspection);
    result.stage = 'validation'; result.status = 'BLOCKED_VALIDATION';
    const issues = validate([normalized.unit], registry);
    result.validation.diagnostic = { registryIds: [...registry], issues, passed: issues.length === 0 };
    const productionIds = options.productionFactionIds ?? [];
    const productionIssues = validate([normalized.unit], productionIds);
    result.validation.production = { registryIds: [...productionIds], issues: productionIssues, passed: productionIssues.length === 0 };
    if (issues.length) throw new Error('Diagnostic Unit validator rejected normalization.');
    result.stage = 'collision'; result.status = 'BLOCKED_ID_COLLISION';
    if (usedIds.has(normalized.unit.id)) throw new Error('Materialized presentation ID collides with an existing result/catalog ID.');
    result.stage = 'finalization'; result.status = 'BLOCKED_NORMALIZATION';
    // Materialized partial data is a successful diagnostic result, never clean
    // production data merely because its identity and validator passed.
    const quality = normalized.omitted.length || normalized.unmapped.length || result.exceptions.some(e => e.severity === 'OMISSION') ? 'PARTIAL' : 'CLEAN';
    result.coverage = coverageFor({ ...result, normalized, status: quality });
    if (!approved.plan.presentation.defaultVisible) result.productionReasons.push('CONTEXT_ONLY_PRESENTATION');
    if (productionIssues.length) result.productionReasons.push('PRODUCTION_VALIDATION_REJECTED');
    if (quality === 'PARTIAL') result.productionReasons.push('INCOMPLETE_UNIT_COVERAGE');
    usedIds.add(normalized.unit.id);
    result.normalized = normalized; result.unit = normalized.unit;
    result.status = 'MATERIALIZED'; result.quality = quality;
    result.stage = 'complete';
  } catch (error) {
    if (error.category === 'SOURCE_IDENTITY_DRIFT') result.status = 'BLOCKED_SOURCE_DRIFT';
    result.unit = null; result.normalized = null; result.quality = 'BLOCKED';
    result.error = { stage: result.stage, reason: error.message, name: error.name };
    if (normalized) result.rejectedNormalization = normalized;
  }
  return result;
}

export function summarizeMaterializations(results) {
  const success = results.filter(r => r.status === 'MATERIALIZED');
  return { attempted: results.length, planReady: results.filter(r => r.plan).length, traced: results.filter(r => r.traced).length,
    normalized: results.filter(r => r.normalizationCompleted).length, validated: results.filter(r => r.validation.diagnostic?.passed).length,
    materialized: success.length, partial: success.filter(r => r.quality === 'PARTIAL').length, blocked: results.length - success.length,
    defaultVisible: success.filter(r => r.plan.presentation.defaultVisible).length, contextOnly: success.filter(r => !r.plan.presentation.defaultVisible).length,
    validationFailures: results.filter(r => r.status === 'BLOCKED_VALIDATION').length,
    validationIssueEvents: results.reduce((n, r) => n + (r.validation.diagnostic?.issues.length ?? 0), 0),
    productionValidationRejections: results.filter(r => r.validation.production?.issues.length).length, productionEligible: results.filter(r => r.productionEligible).length,
    structuralOmissionEvents: success.reduce((n, r) => n + r.exceptions.filter(e => e.severity === 'OMISSION' && e.category !== 'SEMANTICS_BLOCKED').length, 0),
    semanticsOmissionEvents: success.reduce((n, r) => n + r.exceptions.filter(e => e.category === 'SEMANTICS_BLOCKED').length, 0),
    omittedFieldEvents: success.reduce((n, r) => n + r.omissions.length, 0),
    unitFieldProvenance: Object.fromEntries(['DIRECT', 'GENERATED', 'CURATED'].map(kind => [kind, success.reduce((n, r) => n + r.provenance.fields.filter(f => f.kind === kind).length, 0)])),
    blockedReasons: Object.fromEntries([...new Set(results.filter(r => r.status !== 'MATERIALIZED').map(r => r.status))].map(status => [status, results.filter(r => r.status === status).length])),
    missileSources: summarizeMissileSources(results.flatMap(r => r.missileInspection ? [r.missileInspection.contract] : [])) };
}
