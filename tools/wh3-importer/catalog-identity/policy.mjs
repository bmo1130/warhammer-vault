import { connected, rawFact } from '../blocker-review/evidence.mjs';
import { curatedDecisions, reviewedGameVersion } from './decisions.mjs';

export const catalogPolicy = Object.freeze({ id: 'warhammer-vault-faction-roster-v1',
  defaultScope: 'Explicitly reviewed player faction-roster contexts, including independent cross-faction equivalents.',
  contextScope: 'Supply, ability-spawn and nonstandard roots remain separately addressable source contexts.',
  nameSelection: 'FORBIDDEN', landMerge: 'FORBIDDEN', runtimeAvailability: 'NOT_VERIFIED' });
const classifications = new Set(['PRIMARY_CATALOG_ENTRY', 'CONTEXT_VARIANT', 'SEPARATE_FACTION_ENTRY', 'SUMMONED_OR_SCRIPTED_VARIANT', 'PROLOGUE_OR_NONSTANDARD_CONTEXT']);

export function catalogEntryId(mainKey, contextId) {
  // Tuple encoding is injective even if a future CA key contains our separator.
  return `ca_catalog:${encodeURIComponent(mainKey)}:${encodeURIComponent(contextId)}`;
}
export function validateDecisions(decisions) {
  const keys = new Set();
  for (const d of decisions) {
    if (typeof d.mainKey !== 'string' || !d.mainKey || keys.has(d.mainKey) || typeof d.expectedLandKey !== 'string' || !d.expectedLandKey || !d.expectedLocalisationKey || !d.checks?.length || !d.presentations?.length || !d.rationale || !['EXPLICIT_FACTION_ROSTER', 'EXPLICIT_CONTEXT_ONLY'].includes(d.rule)) throw new Error('Invalid/duplicate exact-key catalog decision.');
    keys.add(d.mainKey);
    const contexts = new Set();
    for (const p of d.presentations) {
      if (!/^[a-z][a-z0-9_]*$/.test(p.contextId) || contexts.has(p.contextId) || !p.factionId || !p.context || !classifications.has(p.classification) || typeof p.defaultVisible !== 'boolean') throw new Error('Invalid/duplicate catalog presentation context.');
      if (p.defaultVisible !== ['PRIMARY_CATALOG_ENTRY', 'SEPARATE_FACTION_ENTRY'].includes(p.classification)) throw new Error('Context-only variants cannot overwrite default roster entries.');
      if ((d.rule === 'EXPLICIT_FACTION_ROSTER') !== p.defaultVisible) throw new Error('Catalog rule and presentation scope disagree.');
      contexts.add(p.contextId);
    }
    for (const check of d.checks) if (!check.table || !check.via || !['main', 'land'].includes(check.target) || !Object.keys(check.equals ?? {}).length) throw new Error('Missing explicit evidence guard.');
  }
  for (const d of decisions) if (d.relationship && (d.relationship.kind !== 'EDITORIAL_CONTEXT_OF' || d.relationship.mainKey === d.mainKey || !keys.has(d.relationship.mainKey))) throw new Error('Invalid editorial counterpart reference.');
}

// A classification sidecar, never a Unit writer or name-to-root selector.
export function classifyCatalogCandidates(candidates, evidence, decisions = curatedDecisions) {
  validateDecisions(decisions);
  const byKey = new Map(decisions.map(d => [d.mainKey, d]));
  const counts = new Map();
  for (const c of candidates) {
    if (typeof c.mainKey !== 'string' || !c.mainKey) throw new Error('Every source candidate requires an exact nonempty CA main key.');
    counts.set(c.mainKey, (counts.get(c.mainKey) ?? 0) + 1);
  }
  const records = candidates.map(candidate => {
    const roots = evidence.rows.filter(r => r.table === 'main_units_tables' && r.row.unit === candidate.mainKey);
    const main = roots.length === 1 ? roots[0] : null;
    const links = connected(evidence, main, 'land_unit', 'land_units_tables');
    const land = links.length === 1 ? links[0].row : null;
    const sourceValid = Boolean(counts.get(candidate.mainKey) === 1 && rawFact(evidence, main, 'unit') && rawFact(evidence, land, 'key') && land.row.key === candidate.landKey && candidate.localisation?.key === `land_units_onscreen_name_${candidate.landKey}`);
    const decision = byKey.get(candidate.mainKey), reasons = [];
    if (!sourceValid) reasons.push('SOURCE_IDENTITY_INCOMPLETE_OR_DUPLICATED');
    if (!decision) reasons.push('NO_EXACT_KEY_CURATED_DECISION');
    if (evidence.issues?.length) reasons.push('INCOMPLETE_DB_EVIDENCE');
    if (evidence.sourceKind === 'ca-pack' && evidence.provenance?.gameVersion !== reviewedGameVersion) reasons.push('UNREVIEWED_GAME_VERSION');
    if (decision && (decision.expectedLandKey !== candidate.landKey || decision.expectedLocalisationKey !== candidate.localisation?.key)) reasons.push('CURATED_IDENTITY_DRIFT');
    const checkedEvidence = [];
    if (sourceValid && decision) for (const check of decision.checks) {
      const target = check.target === 'main' ? main : land;
      const matches = evidence.rows.filter(r => r.table === check.table && Object.entries(check.equals).every(([field, value]) => rawFact(evidence, r, field)?.value === value) && connected(evidence, r, check.via, target.table).some(x => x.row.id === target.id));
      if (!matches.length) reasons.push(`EVIDENCE_GUARD_FAILED:${check.table}.${check.via}`);
      checkedEvidence.push({ check, rows: matches.map(r => ({ rowId: r.id, facts: Object.fromEntries([...new Set([check.via, ...Object.keys(check.equals)])].map(f => [f, rawFact(evidence, r, f)])), edge: connected(evidence, r, check.via, target.table).find(x => x.row.id === target.id).edge })) });
    }
    const resolved = reasons.length === 0;
    return { candidate, source: { mainKey: candidate.mainKey, landKey: candidate.landKey, localisationKey: candidate.localisation?.key ?? null, displayName: candidate.localisation?.text ?? null,
      mainFact: rawFact(evidence, main, 'unit'), landFact: rawFact(evidence, land, 'key'), mainToLand: links.length === 1 ? links[0].edge : null },
      statIdentity: { landKey: candidate.landKey, referenceVerified: !!sourceValid, sharedWithMainKeys: [], fullBattleProfileEquivalence: 'NOT_ESTABLISHED' },
      policyStatus: resolved ? 'RESOLVED' : 'POLICY_STILL_UNRESOLVED', reasons,
      presentations: resolved ? decision.presentations.map(p => ({ ...p, id: catalogEntryId(candidate.mainKey, p.contextId), idKind: 'GENERATED', sourceMainKey: candidate.mainKey, kind: 'CURATED' })) : [],
      decision: decision ? { ...structuredClone(decision), kind: 'CURATED', checkedEvidence } : null,
      // Do not infer this relation from equal names or shared entity rows.
      relationship: resolved ? decision.relationship ?? null : null };
  }).sort((a, b) => a.source.mainKey.localeCompare(b.source.mainKey));
  for (const record of records) if (record.statIdentity.referenceVerified) record.statIdentity.sharedWithMainKeys = records.filter(other => other !== record && other.statIdentity.referenceVerified && other.source.landKey === record.source.landKey).map(other => other.source.mainKey);
  const resolved = records.length > 0 && records.every(r => r.policyStatus === 'RESOLVED');
  return { format: 'warhammer-vault-catalog-identity-v1', policy: catalogPolicy, candidates: records,
    evidence, provenance: evidence.provenance, policyResolution: resolved ? 'RESOLVED' : 'POLICY_STILL_UNRESOLVED',
    resolvedCandidates: records.filter(r => r.policyStatus === 'RESOLVED').length, unresolvedCandidates: records.filter(r => r.policyStatus !== 'RESOLVED').length,
    importStatus: 'BLOCKED', selectedKey: null, reason: 'Name-only discovery has no explicit source/context request. Separate diagnostic materialization does not select a global name root.' };
}

// Explicit context planning only; does not trace, normalize, or alter candidates.
export function resolveCatalogRequest(review, request) {
  if (!request?.mainKey || !request?.contextId) return { status: 'BLOCKED', reason: 'EXACT_SOURCE_AND_CONTEXT_REQUIRED', selectedKey: null };
  if (review.policyResolution !== 'RESOLVED') return { status: 'BLOCKED', reason: 'UNRESOLVED_CANDIDATE_SET', selectedKey: null };
  const matches = review.candidates.filter(c => c.source.mainKey === request.mainKey && c.policyStatus === 'RESOLVED').flatMap(c => c.presentations.filter(p => p.contextId === request.contextId).map(p => ({ source: c.source, presentation: p })));
  if (matches.length !== 1) return { status: 'BLOCKED', reason: 'NO_UNIQUE_EXACT_CURATED_CONTEXT', selectedKey: null };
  return { status: 'CATALOG_PLAN_READY', ...matches[0], selectedKey: request.mainKey, unitMaterialized: false };
}
