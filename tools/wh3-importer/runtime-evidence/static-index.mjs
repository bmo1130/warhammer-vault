import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { digest, snapshotIdentity, sourceContextKey, stable } from './contract.mjs';
import { verifyEntityInspection } from '../entity-semantics/contract.mjs';
import { verifyMissileInspection } from '../missile-semantics/contract.mjs';
import { classifyCatalogCandidates, resolveCatalogRequest } from '../catalog-identity/policy.mjs';
import { collectIds } from '../pilot-analysis.mjs';

export async function json(path) { return JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/, '')); }
async function results(dir) {
  const manifest = await json(resolve(dir, 'manifest.json'));
  if (manifest.status !== 'COMPLETE') throw new Error(`Incomplete static run: ${dir}`);
  const items = [];
  for (const item of manifest.results) {
    const file = resolve(dir, item.file ?? item.result), rel = relative(resolve(dir), file);
    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('Static artifact escapes its run directory.');
    const value = await json(file); items.push({ value, file, sha256: digest(value) });
  }
  return { manifest, items };
}
export function verifyIndex(index) {
  const { integrity, ...body } = index;
  if (index.format !== 'warhammer-vault-runtime-static-index-v1' || integrity !== digest(body) || index.snapshotId !== digest(index.snapshot)) throw new Error('Static index integrity/snapshot drift. Re-prepare from reviewed artifacts.');
  const tuples = new Set(), ids = new Set();
  for (const s of index.subjects) {
    const key = sourceContextKey(s.sourceMainKey, s.contextId);
    if (tuples.has(key) || ids.has(s.catalogEntryId) || !s.sourceMainKey || !s.sourceLandKey || !s.catalogEntryId || !(s.contextId === null || typeof s.contextId === 'string' && s.contextId.length > 0) || s.gameVersion !== index.snapshot.gameVersion || s.staticSnapshotId !== index.snapshotId) throw new Error('Duplicate/drifted static identity.');
    tuples.add(key); ids.add(s.catalogEntryId);
  }
  return index;
}
export async function prepareStaticIndex({ contextDir, entityDir, missileDir, pilotDir }) {
  const [context, entity, missile, pilot] = await Promise.all([contextDir, entityDir, missileDir, pilotDir].map(results));
  if ([context, entity, missile, pilot].some(run => run.manifest.provenance?.sourceKind !== 'ca-pack')) throw new Error('Runtime preparation requires reviewed CA-pack evidence, not fixture rows.');
  const snapshot = snapshotIdentity(context.manifest.provenance), snapshotId = digest(snapshot);
  for (const run of [entity, missile, pilot]) if (stable(snapshotIdentity(run.manifest.provenance)) !== stable(snapshot)) throw new Error('Static run game/schema/pack mismatch.');
  const subjects = new Map(), traces = new Map(pilot.items.filter(x => x.value.dump).map(x => [x.value.dump.unit.caKey, x.value.dump]));
  function add(item, main, ctx, dump, normalized, ei, mi, presentation = null) {
    if (!dump || dump.unit.caKey !== main || stable(snapshotIdentity(dump.provenance)) !== stable(snapshot)) throw new Error('Missing/mismatched exact trace.');
    const root = dump.rows.find(r => r.id === dump.rootRow);
    if (root?.table !== 'main_units_tables' || root.row.unit !== main || !root.row.land_unit || !dump.relationships?.some(e => e.from === root.id && e.field === 'land_unit' && dump.rows.some(r => r.id === e.to && r.table === 'land_units_tables' && r.row.key === root.row.land_unit))) throw new Error('Exact main/land schema edge is missing.');
    const ec = ei ? verifyEntityInspection(ei, dump) : null, mc = mi ? verifyMissileInspection(mi, dump) : null;
    const key = sourceContextKey(main, ctx), previous = subjects.get(key);
    if (previous) {
      if (ec && stable(previous.entity) !== stable(ec) || mc && stable(previous.missile) !== stable(mc)) throw new Error('Conflicting static sidecars for one source/context.');
      previous.staticArtifacts.push({ file: item.file, sha256: item.sha256 }); return;
    }
    if (!normalized?.unit || (ctx !== null && (!presentation || normalized.unit.id !== presentation.id || normalized.unit.factionId !== presentation.factionId))) throw new Error('Materialized catalog identity mismatch.');
    const conditionKeys = new Set();
    for (const path of mc?.paths ?? []) for (const effect of path.condition?.enablingEffects ?? []) {
      const row = effect.raw?.row ?? effect.row ?? effect.raw;
      for (const k of ['effect', 'key']) if (typeof row?.[k] === 'string') conditionKeys.add(row[k]);
    }
    subjects.set(key, { sourceMainKey: main, sourceLandKey: root.row.land_unit, contextId: ctx, catalogEntryId: normalized.unit.id,
      displayName: dump.unit.displayName, factionId: normalized.unit.factionId, gameVersion: snapshot.gameVersion, staticSnapshotId: snapshotId,
      scope: ctx === null ? 'PRESERVED_PILOT_DIAGNOSTIC_SOURCE' : 'REVIEWED_CATALOG_CONTEXT', presentation,
      entity: ec, missile: mc, knownConditionKeys: [...conditionKeys].sort(), staticArtifacts: [{ file: item.file, sha256: item.sha256 }],
      staticUnitDigest: digest(normalized.unit), staticFieldProvenanceDigest: digest(normalized.provenance), productionEligible: false });
  }
  for (const item of context.items) {
    const r = item.value;
    if (r.status !== 'MATERIALIZED' || r.validation?.diagnostic?.passed !== true || r.validation.diagnostic.issues.length) throw new Error('Context diagnostic validation failed.');
    const review = classifyCatalogCandidates([r.planEvidence.candidate], r.planEvidence.evidence), plan = resolveCatalogRequest(review, r.request);
    if (plan.status !== 'CATALOG_PLAN_READY' || stable(plan.source) !== stable(r.plan.source) || stable(plan.presentation) !== stable(r.plan.presentation)) throw new Error('Catalog policy/source drift.');
    add(item, r.request.mainKey, r.request.contextId, r.dump, r.normalized, r.entityInspection, r.missileInspection, plan.presentation);
  }
  for (const item of entity.items) {
    const r = item.value;
    if (r.diagnostic?.status !== 'MATERIALIZED' || r.diagnostic.validation?.passed !== true || r.diagnostic.validation.issues.length) throw new Error('Entity diagnostic validation failed.');
    add(item, r.mainKey, r.contextId, r.dump, r.diagnostic.normalized, r.inspection, r.missileInspection);
  }
  for (const item of missile.items.filter(x => x.value.contextId === null)) {
    const r = item.value;
    if (r.diagnostic?.status !== 'MATERIALIZED' || r.diagnostic.validation?.passed !== true || r.diagnostic.validation.issues.length) throw new Error('Missile diagnostic validation failed.');
    // Existing entity review has the richer version of these sources. Replay only;
    // never replace its Unit/identity or borrow a sibling main's paths.
    add(item, r.mainKey, null, traces.get(r.mainKey), r.diagnostic.normalized, null, r.inspection);
  }
  const index = { format: 'warhammer-vault-runtime-static-index-v1', snapshot, snapshotId, source: 'REPLAYED_CA_ARTIFACTS',
    subjects: [...subjects.values()].sort((a, b) => sourceContextKey(a.sourceMainKey, a.contextId).localeCompare(sourceContextKey(b.sourceMainKey, b.contextId))),
    trustBoundary: 'Integrity detects accidental edits, not a signature. Re-prepare from trusted CA artifacts after changing source/game/schema/pack. Expected identity is not observed runtime identity.', productionEligible: false };
  index.integrity = digest(index);
  const contextTraces = new Map(context.items.map(x => [sourceContextKey(x.value.request.mainKey, x.value.request.contextId), x.value.dump]));
  const diagnosticChannel = (item, channel) => ({ ...item, channel, value: {
    ...item.value.diagnostic, request: { mainKey: item.value.mainKey, contextId: item.value.contextId },
    dump: item.value.dump ?? contextTraces.get(sourceContextKey(item.value.mainKey, item.value.contextId)) ?? traces.get(item.value.mainKey),
  } });
  const channels = [...pilot.items.map(x => ({ ...x, channel: 'NAME_PILOT' })), ...context.items.map(x => ({ ...x, channel: 'CONTEXT_MATERIALIZATION' })),
    ...entity.items.map(x => diagnosticChannel(x, 'ENTITY_REVIEW')), ...missile.items.map(x => diagnosticChannel(x, 'MISSILE_REVIEW'))];
  for (const x of channels) x.ids = x.value.ids ?? (x.value.dump && x.value.normalized ? collectIds(x.value.dump, x.value.normalized) : []);
  return { index: verifyIndex(index), channels, baseline: { namePilot: pilot.manifest.counts, context: context.manifest.metrics } };
}
