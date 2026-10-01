import { classifyCatalogCandidates, resolveCatalogRequest } from './policy.mjs';
import { curatedDecisions } from './decisions.mjs';
import { requireSameSource } from '../blocker-review/evidence.mjs';

export function assertCatalogSnapshot(kind, actual, expected, expectedKind = kind) {
  if (kind !== expectedKind || !['ca-pack', 'fixture'].includes(kind)) throw new Error('Source kind mismatch.');
  if (kind === 'ca-pack') {
    if (!actual.gameVersion || !actual.schemaSha256 || !actual.packs?.length || !expected.gameVersion || !expected.schemaSha256 || !expected.packs?.length) throw new Error('Missing source fingerprint.');
    requireSameSource(actual, expected);
  } else if (JSON.stringify([actual.gameVersion, actual.schemaSha256, actual.packs ?? []]) !== JSON.stringify([expected.gameVersion, expected.schemaSha256, expected.packs ?? []])) throw new Error('Synthetic source fingerprint drift.');
}

// Re-evaluate persisted evidence against the trusted registry. Never trust a
// serialized READY flag, presentation, or caller-provided faction override.
export function approvedCatalogContext(review, request, decisions = curatedDecisions) {
  if (review?.policyResolution !== 'RESOLVED') throw new Error('Catalog policy is unresolved.');
  const verified = classifyCatalogCandidates(review.candidates.map(c => c.candidate), review.evidence, decisions);
  const plan = resolveCatalogRequest(verified, request);
  if (plan.status !== 'CATALOG_PLAN_READY') throw new Error(plan.reason);
  const record = verified.candidates.find(c => c.source.mainKey === request.mainKey);
  return { review: verified, plan, record };
}
