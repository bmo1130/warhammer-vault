import type { CatalogDecision, CatalogIdentityReview, SourceIdentity } from '../../tools/wh3-importer/catalog-identity/policy.mjs';
import { resolveCatalogRequest } from '../../tools/wh3-importer/catalog-identity/policy.mjs';

// Compile-time API usage; this fixture module is not loaded by tests or the app.
export function sourceIdentities(review: CatalogIdentityReview): SourceIdentity[] {
  return review.candidates.map(candidate => candidate.source);
}
export function contextPlan(review: CatalogIdentityReview, decision: CatalogDecision) {
  const plan = resolveCatalogRequest(review, { mainKey: decision.mainKey, contextId: decision.presentations[0].contextId });
  return plan.status === 'CATALOG_PLAN_READY' ? plan.presentation.id : null;
}
